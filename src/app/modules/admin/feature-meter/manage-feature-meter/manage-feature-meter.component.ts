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
import { FuseAlertService } from "@fuse/components/alert";
import { AlertService } from "app/core/alert/alert.service";
import { FeatureMeterService } from "app/core/feature-meter/feature-meter.service";
import {
  DiscoveredRoute,
  FeatureMeterCountMode,
  FeatureMeterMapping,
  MeterFeature,
  ResourceFieldInfo,
  ResourceModuleInfo,
} from "app/core/feature-meter/feature-meter.types";
import { NavigationService } from "app/core/navigation/navigation.service";
import { Subject, takeUntil } from "rxjs";

@Component({
  standalone: false,
  selector: "app-manage-feature-meter",
  templateUrl: "./manage-feature-meter.component.html",
  styleUrls: ["./manage-feature-meter.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageFeatureMeterComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isLoading = false;
  btnDisable = false;
  mappingId = "";
  discoveredRoutes: DiscoveredRoute[] = [];
  filteredRoutes: DiscoveredRoute[] = [];
  features: MeterFeature[] = [];
  methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "*"];
  methodSearchControl = new FormControl<string>("");
  filteredMethods: string[] = [];

  featureSearchControl = new FormControl<string>("");
  filteredFeatures: MeterFeature[] = [];

  countModes: FeatureMeterCountMode[] = [
    "per_request",
    "file_rows",
    "body_array",
    "response_field",
    "resource_count",
  ];
  routeSearchFilter = "";
  routeSearchControl = new FormControl<string>("");

  resourceModules: ResourceModuleInfo[] = [];
  filteredResourceModules: ResourceModuleInfo[] = [];
  resourceFields: ResourceFieldInfo[] = [];
  filteredResourceFields: ResourceFieldInfo[] = [];
  resourceModulesLoading = false;
  resourceFieldsLoading = false;
  moduleSearchControl = new FormControl<string>("");
  savedResourceConfig: Record<string, any> = {};
  private _unsubscribeAll = new Subject<void>();

  constructor(
    private _featureMeterService: FeatureMeterService,
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
      method: ["POST", Validators.required],
      path_pattern: ["", [Validators.required, Validators.maxLength(300)]],
      feature_id: ["", Validators.required],
      count_mode: ["per_request", Validators.required],
      config_path: [""],
      file_field: ["file"],
      status: [1, Validators.required],
      enforce_window: [false],
      route_picker: [""],
      target_module: [""],
      target_field: [""],
      resource_status: [1],
      count_field: [""],
    });

    this.mappingId = this._route.snapshot.paramMap.get("id") || "";

    this.loadDiscoveredRoutes();
    this.loadFeatures();

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
        this.form.patchValue({
          method: method || "POST",
          path_pattern: pathParts.join(" ") || "",
        });
      });

    this.form
      .get("count_mode")
      ?.valueChanges.pipe(takeUntil(this._unsubscribeAll))
      .subscribe((mode: string) => {
        this.updateFormValidators(mode);
        if (mode === "resource_count") {
          this.loadResourceModules();
          this.form.patchValue({ enforce_window: false }, { emitEvent: false });
          const currentModule = this.form.get("target_module")?.value;
          if (!currentModule && this.savedResourceConfig.target_module) {
            this.form.patchValue(
              {
                target_module: this.savedResourceConfig.target_module || "",
                target_field: this.savedResourceConfig.target_field || "",
                resource_status:
                  this.savedResourceConfig.status === undefined ||
                  this.savedResourceConfig.status === null
                    ? 1
                    : Number(this.savedResourceConfig.status),
                count_field: this.savedResourceConfig.count_field || "",
              },
              { emitEvent: false },
            );
            this.loadResourceFields(
              String(this.savedResourceConfig.target_module),
            );
          }
        }
        this._changeDetectorRef.markForCheck();
      });

    // Load fields for the selected target module
    this.form
      .get("target_module")
      ?.valueChanges.pipe(takeUntil(this._unsubscribeAll))
      .subscribe((moduleName: string) => {
        if (moduleName) {
          this.loadResourceFields(moduleName);
        } else {
          this.resourceFields = [];
          this.filteredResourceFields = [];
        }
        if (
          this.savedResourceConfig.target_module === moduleName &&
          this.savedResourceConfig.target_field
        ) {
          this.form.patchValue(
            { target_field: this.savedResourceConfig.target_field },
            { emitEvent: false },
          );
        } else if (moduleName !== this.savedResourceConfig.target_module) {
          this.form.patchValue({ target_field: "" }, { emitEvent: false });
        }
        this._changeDetectorRef.markForCheck();
      });

    if (this.mappingId) {
      this.isLoading = true;
      this._featureMeterService
        .getMappingById(this.mappingId)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (res) => {
            if (res?.status === 200 && res.data) {
              this.patchForm(res.data);
            } else {
              this._alertService.message = "Meter not found.";
              this._fuseAlertService.show("alert_error");
              setTimeout(
                () => this._fuseAlertService.dismiss("alert_error"),
                2500,
              );
              this._router.navigate(["/master/feature-meter"]);
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

  get showConfigPath(): boolean {
    const mode = this.form?.get("count_mode")?.value;
    return mode === "body_array" || mode === "response_field";
  }

  get showFileField(): boolean {
    return this.form?.get("count_mode")?.value === "file_rows";
  }

  get showResourceConfig(): boolean {
    return this.form?.get("count_mode")?.value === "resource_count";
  }

  private updateFormValidators(mode: string): void {
    const targetModuleControl = this.form.get("target_module");
    const targetFieldControl = this.form.get("target_field");

    if (mode === "resource_count") {
      targetModuleControl?.setValidators([Validators.required]);
      targetFieldControl?.setValidators([Validators.required]);
    } else {
      targetModuleControl?.clearValidators();
      targetFieldControl?.clearValidators();
    }
    targetModuleControl?.updateValueAndValidity({ emitEvent: false });
    targetFieldControl?.updateValueAndValidity({ emitEvent: false });
  }

  private patchForm(row: FeatureMeterMapping): void {
    const config = row.count_config || {};
    this.savedResourceConfig = { ...config };
    const isResource = row.count_mode === "resource_count";
    this.updateFormValidators(row.count_mode);
    this.form.patchValue(
      {
        method: row.method,
        path_pattern: row.path_pattern,
        feature_id: String(row.feature_id),
        count_mode: row.count_mode,
        config_path: config.path || "",
        file_field: config.file_field || "file",
        status: row.status,
        enforce_window: isResource ? false : !!row.enforce_window,
        route_picker: `${row.method} ${row.path_pattern}`,
        target_module: config.target_module || "",
        target_field: config.target_field || "",
        resource_status:
          config.status === undefined || config.status === null
            ? 1
            : Number(config.status),
        count_field: config.count_field || "",
      },
      { emitEvent: false },
    );

    if (isResource && config.target_module) {
      this.loadResourceModules();
      this.loadResourceFields(String(config.target_module));
    }
  }

  private loadResourceModules(): void {
    if (this.resourceModules.length) {
      this.filteredResourceModules = this.resourceModules;
      return;
    }
    this.resourceModulesLoading = true;
    this._featureMeterService
      .getResourceModules()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res) => {
          this.resourceModules = res.data || [];
          this.filteredResourceModules = [...this.resourceModules];
          this.resourceModulesLoading = false;
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.resourceModules = [];
          this.filteredResourceModules = [];
          this.resourceModulesLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  private loadResourceFields(modelName: string): void {
    this.resourceFieldsLoading = true;
    this.resourceFields = [];
    this.filteredResourceFields = [];
    this._featureMeterService
      .getResourceModuleFields(modelName)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res) => {
          this.resourceFields = res.data || [];
          this.filteredResourceFields = [...this.resourceFields];
          this.resourceFieldsLoading = false;
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.resourceFields = [];
          this.filteredResourceFields = [];
          this.resourceFieldsLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  private resetResourceConfigControls(): void {
    this.form.patchValue(
      {
        target_module: "",
        target_field: "",
        resource_status: 1,
        count_field: "",
      },
      { emitEvent: false },
    );
  }

  filterResourceModules(query: string): void {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      this.filteredResourceModules = this.resourceModules;
    } else {
      this.filteredResourceModules = this.resourceModules.filter((m) =>
        (m.name || "").toLowerCase().includes(q),
      );
    }
    this._changeDetectorRef.markForCheck();
  }

  private loadDiscoveredRoutes(): void {
    this._featureMeterService
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

  private loadFeatures(): void {
    this._featureMeterService
      .getFeatures()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res) => {
          this.features = res.data || [];
          this.filteredFeatures = [...this.features];
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

  filterFeatures(query: string): void {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      this.filteredFeatures = [...this.features];
    } else {
      this.filteredFeatures = this.features.filter(
        (f) =>
          (f.name && f.name.toLowerCase().includes(q)) ||
          (f.sectionName && f.sectionName.toLowerCase().includes(q)),
      );
    }
    this._changeDetectorRef.markForCheck();
  }

  onFeatureSelectOpened(opened: boolean): void {
    this.filteredFeatures = [...this.features];
    this.featureSearchControl.setValue("", { emitEvent: false });
  }

  goBack(): void {
    this._location.back();
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

  featureId(feature: MeterFeature): string {
    return String(feature.id || feature._id);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.btnDisable = true;
    const raw = this.form.getRawValue();
    const count_config: Record<string, any> = {};
    if (
      raw.count_mode === "body_array" ||
      raw.count_mode === "response_field"
    ) {
      count_config.path =
        raw.config_path ||
        (raw.count_mode === "body_array" ? "masterIds" : "importedCount");
    }
    if (raw.count_mode === "file_rows") {
      count_config.file_field = raw.file_field || "file";
    }
    if (raw.count_mode === "resource_count") {
      count_config.target_module = raw.target_module || undefined;
      count_config.target_field = raw.target_field || undefined;
      count_config.status =
        raw.resource_status === undefined || raw.resource_status === null
          ? undefined
          : Number(raw.resource_status);
      count_config.count_field = raw.count_field || undefined;
    }

    const payload = {
      method: raw.method,
      path_pattern: raw.path_pattern,
      feature_id: raw.feature_id,
      count_mode: raw.count_mode,
      count_config,
      status: raw.status,
      enforce_window:
        raw.count_mode === "resource_count" ? false : !!raw.enforce_window,
    };

    const request$ = this.mappingId
      ? this._featureMeterService.updateMapping(this.mappingId, payload)
      : this._featureMeterService.createMapping(payload);

    request$.subscribe({
      next: () => {
        this._alertService.message = this.mappingId
          ? "Meter updated successfully."
          : "Meter created successfully.";
        this._fuseAlertService.show("alert_success");
        setTimeout(() => this._fuseAlertService.dismiss("alert_success"), 2500);
        this._router.navigate(["/master/feature-meter"]);
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
}
