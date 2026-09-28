import { Location } from "@angular/common";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { AlertService } from "app/core/alert/alert.service";
import { FuseAlertService } from "@fuse/components/alert";
import { NavigationService } from "app/core/navigation/navigation.service";
import { RouteAclService } from "app/core/route-acl/route-acl.service";
import {
  DiscoveredRoute,
  RouteAclMapping,
  RouteAclScope,
  RouteAclSection,
} from "app/core/route-acl/route-acl.types";
import { Subject, takeUntil } from "rxjs";

@Component({
  standalone: false,
  selector: "app-manage-seller-route-acl",
  templateUrl: "./manage-seller-route-acl.component.html",
  styleUrls: ["./manage-seller-route-acl.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageSellerRouteAclComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isLoading = false;
  btnDisable = false;
  mappingId = "";
  discoveredRoutes: DiscoveredRoute[] = [];
  filteredRoutes: DiscoveredRoute[] = [];
  sections: RouteAclSection[] = [];
  methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "*"];
  methodSearchControl = new FormControl<string>("");
  filteredMethods: string[] = [];

  sectionSearchControl = new FormControl<string>("");
  filteredSections: RouteAclSection[] = [];

  actions = ["view", "add", "update", "delete"];
  routeSearchFilter = "";
  routeSearchControl = new FormControl<string>("");
  readonly scope: RouteAclScope = "seller";
  private _unsubscribeAll = new Subject<void>();

  constructor(
    private _routeAclService: RouteAclService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _route: ActivatedRoute,
    private _router: Router,
    private _formBuilder: FormBuilder,
    private _location: Location,
    private _alertService: AlertService,
    private _fuseAlertService: FuseAlertService,
    private _navigationService: NavigationService,
  ) {
    if (
      !this._navigationService.isSuperAdmin &&
      !this._navigationService.isDeveloper
    ) {
      this._router.navigate(["/404-not-found"]);
    }
  }

  ngOnInit(): void {
    this.filteredMethods = [...this.methods];

    this.form = this._formBuilder.group({
      method: ["GET", Validators.required],
      path_pattern: ["", [Validators.required, Validators.maxLength(300)]],
      section_id: ["", Validators.required],
      action: ["view", Validators.required],
      scope: ["seller", Validators.required],
      status: [1, Validators.required],
      route_picker: [""],
    });

    this.mappingId = this._route.snapshot.paramMap.get("id") || "";

    this.loadDiscoveredRoutes();
    this.loadSections();

    this.routeSearchControl.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((query: string | null) => {
        this.filterRoutes(query || "");
      });

    this.form
      .get("route_picker")
      ?.valueChanges.pipe(takeUntil(this._unsubscribeAll))
      .subscribe((value: string) => {
        if (!value) {
          return;
        }
        const [method, ...pathParts] = value.split(" ");
        const path = pathParts.join(" ");
        this.form.patchValue({
          method: method || "GET",
          path_pattern: path || "",
        });
      });

    if (this.mappingId) {
      this.isLoading = true;
      this._routeAclService
        .getMappingById(this.mappingId)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (res) => {
            if (res?.status === 200 && res.data) {
              this.patchForm(res.data);
            } else {
              this._alertService.message = "Mapping not found";
              this._fuseAlertService.show("alert_error");
              setTimeout(
                () => this._fuseAlertService.dismiss("alert_error"),
                2500,
              );
              this._router.navigate(["/master/seller-route-acl"]);
            }
            this.isLoading = false;
            this._changeDetectorRef.markForCheck();
          },
          error: () => {
            this.isLoading = false;
            this._changeDetectorRef.markForCheck();
          },
        });
    }
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  private patchForm(row: RouteAclMapping): void {
    this.form.patchValue({
      method: row.method,
      path_pattern: row.path_pattern,
      section_id: String(row.section_id),
      action: row.action,
      scope: "seller",
      status: row.status,
      route_picker: `${row.method} ${row.path_pattern}`,
    });
  }

  private loadDiscoveredRoutes(): void {
    this._routeAclService
      .getDiscoveredRoutes()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res) => {
          this.discoveredRoutes = res.data || [];
          this.filteredRoutes = this.discoveredRoutes;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  private loadSections(): void {
    this._routeAclService
      .getSections("seller")
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res) => {
          this.sections = res.data || [];
          this.filteredSections = [...this.sections];
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  filterMethods(query: string): void {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      this.filteredMethods = [...this.methods];
    } else {
      this.filteredMethods = this.methods.filter((m) =>
        m.toLowerCase().includes(q),
      );
    }
    this._changeDetectorRef.markForCheck();
  }

  onMethodSelectOpened(opened: boolean): void {
    this.filteredMethods = [...this.methods];
    this.methodSearchControl.setValue("", { emitEvent: false });
  }

  filterSections(query: string): void {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      this.filteredSections = [...this.sections];
    } else {
      this.filteredSections = this.sections.filter(
        (s) => s.name && s.name.toLowerCase().includes(q),
      );
    }
    this._changeDetectorRef.markForCheck();
  }

  onSectionSelectOpened(opened: boolean): void {
    this.filteredSections = [...this.sections];
    this.sectionSearchControl.setValue("", { emitEvent: false });
  }

  filterRoutes(query: string): void {
    this.routeSearchFilter = query || "";
    const q = this.routeSearchFilter.toLowerCase().trim();
    if (!q) {
      this.filteredRoutes = this.discoveredRoutes;
    } else {
      this.filteredRoutes = this.discoveredRoutes.filter((r) => {
        const matchMethod = (r.method || "").toLowerCase().includes(q);
        const matchPath = (r.path || "").toLowerCase().includes(q);
        const matchCtrl = (r.controller || "").toLowerCase().includes(q);
        const matchHandler = (r.handler || "").toLowerCase().includes(q);
        return matchMethod || matchPath || matchCtrl || matchHandler;
      });
    }
    this._changeDetectorRef.markForCheck();
  }

  clearRouteSearch(inputElem?: HTMLInputElement): void {
    this.routeSearchFilter = "";
    this.routeSearchControl.setValue("", { emitEvent: false });
    if (inputElem) {
      inputElem.value = "";
    }
    this.filteredRoutes = this.discoveredRoutes;
    this._changeDetectorRef.markForCheck();
  }

  onRouteSelectOpened(opened: boolean): void {
    this.clearRouteSearch();
  }

  goBack(): void {
    this._router.navigate(["/master/seller-route-acl"]);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.btnDisable = true;
    const { route_picker, ...payload } = this.form.getRawValue();
    payload.scope = "seller";
    const request$ = this.mappingId
      ? this._routeAclService.updateMapping(this.mappingId, payload)
      : this._routeAclService.createMapping(payload);

    request$.subscribe({
      next: () => {
        this._alertService.message = this.mappingId
          ? "Seller mapping updated successfully."
          : "Seller mapping created successfully.";
        this._fuseAlertService.show("alert_success");
        setTimeout(() => this._fuseAlertService.dismiss("alert_success"), 2500);
        this._router.navigate(["/master/seller-route-acl"]);
      },
      error: (err) => {
        this.btnDisable = false;
        this._alertService.message = err?.message || "Save failed";
        this._fuseAlertService.show("alert_error");
        setTimeout(() => this._fuseAlertService.dismiss("alert_error"), 2500);
        this._changeDetectorRef.markForCheck();
      },
    });
  }

  sectionId(section: RouteAclSection): string {
    return String(section.id || section._id);
  }
}
