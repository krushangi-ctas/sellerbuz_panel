import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  TemplateRef,
  ViewChild,
  OnInit,
  OnDestroy,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { FuseUtilsService } from "@fuse/services/utils";
import { GuideDocumentsService } from "app/core/guide-documents/guide-documents.service";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-guide-documents-admin",
  templateUrl: "./guide-documents-admin.component.html",
  styleUrls: ["./guide-documents-admin.component.scss"],
  standalone: false,
})
export class GuideDocumentsAdminComponent implements OnInit, OnDestroy {
  @ViewChild("moduleDialog") moduleDialog!: TemplateRef<any>;
  @ViewChild("screenshotInput") screenshotInput!: ElementRef<HTMLInputElement>;
  parents: any[] = [];
  expandedParents = new Set<string>();
  selectedParent: any = null;
  selectedChild: any = null;
  steps: any[] = [];

  searchTerm = "";

  moduleForm: FormGroup;
  stepForm: FormGroup;
  configForm!: FormGroup;

  editingModule: any | null = null;
  editingStep: any | null = null;

  isLoading = false;
  isProcessing = false;
  isSearchApplied = false;

  currentDialogRef!: MatDialogRef<any>;

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _guideDocumentsService: GuideDocumentsService,
    private _dialog: MatDialog,
    private _fb: FormBuilder,
    private _utilService: FuseUtilsService,
    private _confirmationService: FuseConfirmationService,
    private _cdr: ChangeDetectorRef,
  ) {
    this.moduleForm = this._fb.group({
      title: ["", [Validators.required, Validators.minLength(2)]],
      description: [""],
      isPublished: [false],
      isAdminSection: [true],
      parentId: [null],
    });

    this.stepForm = this._fb.group({
      title: [""],
      description: [""],
      screenshotUrl: [""],
      stepOrder: [1, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.loadTree();
  }

  _getId(item: any): string {
    return item?.id || item?._id || "";
  }

  _getTitle(item: any): string {
    return item?.title || item?.moduleName || "";
  }

  private _reindexSteps(): void {
    this.steps = (this.steps || []).map((s, idx) => ({
      ...s,
      stepOrder: idx + 1,
    }));
  }

  private _resetStepForm(): void {
    this.editingStep = null;
    this.stepForm.reset({
      title: "",
      description: "",
      screenshotUrl: "",
      stepOrder: 1,
    });
    if (this.screenshotInput) {
      this.screenshotInput.nativeElement.value = "";
    }
  }

  loadTree(): void {
    this.isLoading = true;
    this._guideDocumentsService
      .getModulesTree(this.searchTerm || "")
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (resp: any) => {
          this.parents = resp.data || [];
          this.isLoading = false;
          this._cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this._cdr.markForCheck();
        },
      });
  }

  applySearch(): void {
    this.isSearchApplied = true;
    if (!this.searchTerm || this.searchTerm.trim() === "") {
      this.loadTree();
      return;
    }
    this.selectedParent = null;
    this.selectedChild = null;
    this.steps = [];
    this.loadTree();
  }

  toggleParent(parent: any): void {
    const id = this._getId(parent);
    if (this.expandedParents.has(id)) this.expandedParents.delete(id);
    else this.expandedParents.add(id);
    this._cdr.markForCheck();
  }

  selectChild(parent: any, child: any): void {
    this.selectedParent = parent;
    this.selectedChild = child;
    this.steps = [];
    this._resetStepForm();
    const id = this._getId(child);
    this.isLoading = true;
    this._guideDocumentsService
      .getModuleDetails(id)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (resp: any) => {
          this.steps = (resp.data?.steps || []).sort(
            (a: any, b: any) => (a.stepOrder || 0) - (b.stepOrder || 0),
          );
          this.isLoading = false;
          this._cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this._cdr.markForCheck();
        },
      });
  }

  openCreateParent(): void {
    this.editingModule = null;
    this.moduleForm.reset({
      title: "",
      description: "",
      isPublished: false,
      isAdminSection: true,
      parentId: null,
    });
    this.currentDialogRef = this._dialog.open(this.moduleDialog, {
      disableClose: true,
      width: "700px",
    });
  }

  openCreateChild(parent: any): void {
    this.editingModule = null;
    const parentIsAdmin =
      parent.isAdminSection !== undefined ? parent.isAdminSection : true;
    this.moduleForm.reset({
      title: "",
      description: "",
      isPublished: false,
      isAdminSection: parentIsAdmin,
      parentId: this._getId(parent),
    });
    this.currentDialogRef = this._dialog.open(this.moduleDialog, {
      disableClose: true,
      width: "700px",
    });
  }

  openEditModule(m: any): void {
    this.editingModule = m;
    this.moduleForm.reset({
      title: this._getTitle(m),
      description: m.description || "",
      isPublished: !!m.isPublished,
      isAdminSection: m.isAdminSection !== undefined ? m.isAdminSection : true,
      parentId: m.parentId ?? null,
    });
    this.currentDialogRef = this._dialog.open(this.moduleDialog, {
      disableClose: true,
      width: "700px",
    });
  }

  saveModule(): void {
    if (this.moduleForm.invalid || this.isProcessing) return;
    this.isProcessing = true;

    const payload = this.moduleForm.getRawValue();
    const req$ = this.editingModule
      ? this._guideDocumentsService.updateModule(
          this._getId(this.editingModule),
          payload,
        )
      : this._guideDocumentsService.createModule(payload);

    req$.pipe(takeUntil(this._unsubscribeAll)).subscribe({
      next: () => {
        this.isProcessing = false;
        this.currentDialogRef?.close();
        this.editingModule = null;
        this.loadTree();
        this._utilService.onSuccess(
          this.editingModule ? "Guide module updated" : "Guide module created",
        );
        this._cdr.markForCheck();
      },
      error: (err) => {
        this.isProcessing = false;
        this._utilService.onError(
          err?.error?.message ||
            (this.editingModule
              ? "Failed to update module"
              : "Failed to create module"),
        );
        this._cdr.markForCheck();
      },
    });
  }

  togglePublish(m: any, event: any): void {
    const id = this._getId(m);
    const newStatus = event.checked;

    this.configForm = this._utilService.confirmMessage(
      "Change Publish Status",
      `Are you sure you want to ${
        newStatus ? "publish" : "unpublish"
      } this module?`,
      "Change Status",
    );

    const dialogRef = this._confirmationService.open(this.configForm.value);

    dialogRef.afterClosed().subscribe((result) => {
      if (result === "confirmed") {
        this._guideDocumentsService
          .updateModule(id, { isPublished: newStatus })
          .subscribe({
            next: () => {
              m.isPublished = newStatus;
              this._utilService.onSuccess(
                `Module has been ${
                  newStatus ? "published" : "unpublished"
                } successfully!`,
              );
              this._cdr.markForCheck();
            },
            error: ({ error }) => {
              event.source.checked = !newStatus;
              this._utilService.onError(error?.message);
              this._cdr.markForCheck();
            },
          });
      } else {
        event.source.checked = !newStatus;
        this._cdr.markForCheck();
      }
    });
  }

  deleteModule(m: any): void {
    this.configForm = this._utilService.confirmMessage(
      "Delete Module",
      "Are you sure you want to delete this module? This will also remove its steps.",
      "Delete",
    );
    const dialogRef = this._confirmationService.open(this.configForm.value);

    dialogRef.afterClosed().subscribe((result) => {
      if (result === "confirmed") {
        this._guideDocumentsService.deleteModule(this._getId(m)).subscribe({
          next: () => {
            const deletedId = this._getId(m);
            if (
              this.selectedChild &&
              this._getId(this.selectedChild) === deletedId
            ) {
              this.selectedChild = null;
              this.selectedParent = null;
              this.steps = [];
            }

            if (
              this.selectedParent &&
              this._getId(this.selectedParent) === deletedId
            ) {
              this.selectedChild = null;
              this.selectedParent = null;
              this.steps = [];
            }
            this.loadTree();
            this._utilService.onSuccess("Module deleted");
            this._cdr.markForCheck();
          },
          error: (err) => {
            this._utilService.onError(
              err?.error?.message || "Failed to delete module",
            );
            this._cdr.markForCheck();
          },
        });
      }
    });
  }

  onStepDrop(event: CdkDragDrop<any[]>): void {
    if (!this.selectedChild) return;
    moveItemInArray(this.steps, event.previousIndex, event.currentIndex);
    this._reindexSteps();
    const payload = this.steps.map((s: any) => ({
      id: this._getId(s),
      stepOrder: s.stepOrder,
    }));
    const moduleId = this._getId(this.selectedChild);
    this._guideDocumentsService.reorderSteps(moduleId, payload).subscribe({
      next: () => this._cdr.markForCheck(),
    });
  }

  onParentDrop(event: CdkDragDrop<any[]>): void {
    moveItemInArray(this.parents, event.previousIndex, event.currentIndex);
    const parentsPayload = this.parents.map((p: any, idx: number) => ({
      id: this._getId(p),
      sortOrder: idx,
    }));
    this._guideDocumentsService
      .reorderModules({ parents: parentsPayload, children: [] })
      .subscribe({ next: () => this._cdr.markForCheck() });
  }

  onChildDrop(parent: any, event: CdkDragDrop<any[]>): void {
    const children = parent.children || [];
    moveItemInArray(children, event.previousIndex, event.currentIndex);
    parent.children = children;

    const childrenPayload = children.map((c: any, idx: number) => ({
      id: this._getId(c),
      parentId: this._getId(parent),
      sortOrder: idx,
    }));

    this._guideDocumentsService
      .reorderModules({ parents: [], children: childrenPayload })
      .subscribe({ next: () => this._cdr.markForCheck() });
  }

  onScreenshotPicked(event: any): void {
    const file: File = event?.target?.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      this._utilService.onError("Please select only PNG/JPG image");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this._utilService.onError("Image size must be less than 2MB");
      return;
    }
    this._guideDocumentsService.uploadScreenshot(file).subscribe({
      next: (resp: any) => {
        const url = resp.data?.screenshotUrl;
        if (url) {
          this.stepForm.patchValue({ screenshotUrl: url });
          this._cdr.markForCheck();
        }
      },
    });
  }

  addStep(): void {
    if (!this.selectedChild || this.stepForm.invalid) return;
    const moduleId = this._getId(this.selectedChild);

    if (this.editingStep) {
      const stepId = this._getId(this.editingStep);
      const payload = {
        title: this.stepForm.value.title,
        description: this.stepForm.value.description,
        screenshotUrl: this.stepForm.value.screenshotUrl,
      };

      this._guideDocumentsService.updateStep(stepId, payload).subscribe({
        next: () => {
          this._utilService.onSuccess("Step updated");
          this.selectChild(this.selectedParent, this.selectedChild);
        },
        error: (err) => {
          this._utilService.onError(
            err?.error?.message || "Failed to update step",
          );
        },
      });
      return;
    }

    const nextOrder = (this.steps?.length || 0) + 1;
    const payload = {
      title: this.stepForm.value.title,
      description: this.stepForm.value.description,
      screenshotUrl: this.stepForm.value.screenshotUrl,
      stepOrder: nextOrder,
    };

    this._guideDocumentsService.createStep(moduleId, payload).subscribe({
      next: () => {
        this._resetStepForm();
        this.selectChild(this.selectedParent, this.selectedChild);
        this._utilService.onSuccess("Step added");
      },
      error: (err) => {
        this._utilService.onError(err?.error?.message || "Failed to add step");
      },
    });
  }

  editStep(step: any): void {
    this.editingStep = step;
    this.stepForm.reset({
      title: step.title || "",
      description: step.description || "",
      screenshotUrl: step.screenshotUrl || "",
      stepOrder: step.stepOrder || 1,
    });
    this._cdr.markForCheck();
  }

  cancelEditStep(): void {
    this._resetStepForm();
    this._cdr.markForCheck();
  }

  deleteStep(step: any): void {
    this.configForm = this._utilService.confirmMessage(
      "Delete Module",
      "Are you sure you want to delete this step?",
      "Delete",
    );
    const dialogRef = this._confirmationService.open(this.configForm.value);

    dialogRef.afterClosed().subscribe((result) => {
      if (result === "confirmed") {
        this._guideDocumentsService.deleteStep(this._getId(step)).subscribe({
          next: () => {
            if (
              this.editingStep &&
              this._getId(this.editingStep) === this._getId(step)
            ) {
              this._resetStepForm();
            }
            this.selectChild(this.selectedParent, this.selectedChild);
            this._utilService.onSuccess("Step deleted");
            this._cdr.markForCheck();
          },
          error: (err) => {
            this._utilService.onError(
              err?.error?.message || "Failed to delete step",
            );
            this._cdr.markForCheck();
          },
        });
      }
    });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
