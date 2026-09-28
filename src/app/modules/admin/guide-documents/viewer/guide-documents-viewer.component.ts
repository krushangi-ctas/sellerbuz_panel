import {
  AfterViewInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  OnInit,
  OnDestroy,
} from "@angular/core";
import { GuideDocumentsService } from "app/core/guide-documents/guide-documents.service";
import { Subject, takeUntil } from "rxjs";

import { ActivatedRoute } from "@angular/router";

@Component({
  selector: "app-guide-documents-viewer",
  templateUrl: "./guide-documents-viewer.component.html",
  styleUrls: ["./guide-documents-viewer.component.scss"],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuideDocumentsViewerComponent
  implements AfterViewInit, OnInit, OnDestroy
{
  parents: any[] = [];
  expandedParents = new Set<string>();
  selectedParent: any = null;
  selectedChild: any = null;
  steps: any[] = [];
  isTreeLoading = false;
  isChildLoading = false;
  activeStepKey: string | null = null;
  isAdminSection: boolean = true;
  @ViewChild("scrollContainer", { static: false })
  scrollContainer?: ElementRef<HTMLElement>;
  @ViewChildren("stepCard")
  stepCards?: QueryList<ElementRef<HTMLElement>>;
  private readonly _expandedStorageKey = "guide_docs_expanded_parents";
  private _stepObserver?: IntersectionObserver;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _guideDocumentsService: GuideDocumentsService,
    private _route: ActivatedRoute,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._resolveAdminSectionFilter();
    this._loadExpandedState();
    this.loadTree();
  }

  private _resolveAdminSectionFilter(): void {
    const dataSection = this._route.snapshot.data?.["isAdminSection"];
    if (dataSection !== undefined) {
      this.isAdminSection = !!dataSection;
      return;
    }

    const querySection =
      this._route.snapshot.queryParams?.["section"] ||
      this._route.snapshot.queryParams?.["type"] ||
      this._route.snapshot.queryParams?.["isAdminSection"];
    if (querySection !== undefined && querySection !== null) {
      this.isAdminSection =
        String(querySection).toLowerCase() === "admin" ||
        String(querySection).toLowerCase() === "true";
      return;
    }

    const url = this._route.snapshot.pathFromRoot
      .map((p) => p.routeConfig?.path)
      .join("/");
    if (url.includes("seller")) {
      this.isAdminSection = false;
    } else {
      this.isAdminSection = true;
    }
  }

  ngAfterViewInit(): void {
    this.stepCards?.changes
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this._initStepObserver();
      });

    this._initStepObserver();
  }

  getId(item: any): string {
    return item?.id || item?._id || "";
  }

  trackById = (_: number, item: any): string => this.getId(item);

  trackByStep = (_: number, step: any): string => this.getStepKey(step);

  getStepKey(step: any): string {
    return step?.id || step?._id || String(step?.stepOrder ?? "");
  }

  private _initStepObserver(): void {
    if (!this.scrollContainer?.nativeElement) return;
    if (this.isChildLoading) return;
    const cards = this.stepCards?.toArray() ?? [];
    if (!cards.length) return;

    this._stepObserver?.disconnect();
    this._stepObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0),
          )[0];

        const key = (visible?.target as HTMLElement | undefined)?.dataset?.[
          "stepKey"
        ];
        if (!key) return;
        if (this.activeStepKey !== key) {
          this.activeStepKey = key;
          this._cdr.markForCheck();
        }
      },
      {
        root: this.scrollContainer.nativeElement,
        threshold: [0.25, 0.5, 0.75],
        rootMargin: "0px 0px -55% 0px",
      },
    );

    for (const ref of cards) {
      this._stepObserver.observe(ref.nativeElement);
    }

    if (!this.activeStepKey) {
      const firstKey = cards[0]?.nativeElement.dataset?.["stepKey"];
      if (firstKey) this.activeStepKey = firstKey;
    }
  }

  jumpToStep(step: any): void {
    const key = this.getStepKey(step);
    if (!key) return;
    this.activeStepKey = key;
    this._cdr.markForCheck();

    const el = this.scrollContainer?.nativeElement.querySelector(
      `#step-${CSS.escape(key)}`,
    ) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  onMobileStepSelect(evt: Event): void {
    const select = evt.target as HTMLSelectElement | null;
    const key = select?.value;
    if (!key) return;
    const step = this.steps?.find((s) => this.getStepKey(s) === key);
    if (!step) {
      this.activeStepKey = key;
      this._cdr.markForCheck();
      const el = this.scrollContainer?.nativeElement.querySelector(
        `#step-${CSS.escape(key)}`,
      ) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    this.jumpToStep(step);
  }

  private _loadExpandedState(): void {
    try {
      const raw = localStorage.getItem(this._expandedStorageKey);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) this.expandedParents = new Set(arr);
    } catch {
      // ignore
    }
  }

  private _persistExpandedState(): void {
    try {
      localStorage.setItem(
        this._expandedStorageKey,
        JSON.stringify(Array.from(this.expandedParents)),
      );
    } catch {
      // ignore
    }
  }

  loadTree(): void {
    this.isTreeLoading = true;
    this._guideDocumentsService
      .getPublishedTree(this.isAdminSection)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (resp: any) => {
          this.parents = resp.data || [];
          this.isTreeLoading = false;
          if (!this.selectedChild && this.parents.length > 0) {
            const firstParent = this.parents[0];
            const pid = this.getId(firstParent);
            this.expandedParents.add(pid);
            this._persistExpandedState();
            const firstChild = firstParent.children?.[0];
            if (firstChild) {
              this.selectChild(firstParent, firstChild);
            }
          }
          this._cdr.markForCheck();
        },
        error: () => {
          this.isTreeLoading = false;
          this._cdr.markForCheck();
        },
      });
  }

  toggleParent(parent: any): void {
    const id = this.getId(parent);
    if (this.expandedParents.has(id)) this.expandedParents.delete(id);
    else this.expandedParents.add(id);
    this._persistExpandedState();
    this._cdr.markForCheck();
  }

  selectChild(parent: any, child: any): void {
    if (!parent || !child) return;
    if (
      this.selectedChild &&
      this.getId(this.selectedChild) === this.getId(child)
    ) {
      return;
    }
    this.selectedParent = parent;
    this.selectedChild = child;
    this.activeStepKey = null;
    this.isChildLoading = true;
    this._stepObserver?.disconnect();

    const childId = this.getId(child);
    this._guideDocumentsService
      .getPublishedChildDetails(childId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (resp: any) => {
          this.steps = resp.data?.steps || [];
          this.isChildLoading = false;
          this._cdr.markForCheck();

          requestAnimationFrame(() => {
            this._initStepObserver();
            if (this.steps?.length) {
              this.jumpToStep(this.steps[0]);
            }
          });
        },
        error: () => {
          this.isChildLoading = false;
          this._cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this._stepObserver?.disconnect();
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
