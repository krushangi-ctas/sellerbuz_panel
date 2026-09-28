import { takeUntil, finalize } from "rxjs";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatSort } from "@angular/material/sort";
import { Observable, Subject, debounceTime, merge, of, switchMap } from "rxjs";
import { MatPaginator } from "@angular/material/paginator";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { Pagination } from "app/core/pagination/pagination.types";
import { BannedService } from "app/core/banned/banned.service";
import { Asin, Keyword, Brand } from "app/core/banned/banned.types";
import { AmazonService } from "app/core/amazon/amazon.service";
import { FuseUtilsService } from "@fuse/services/utils";
import { NavigationService } from "app/core/navigation/navigation.service";

@Component({
  standalone: false,
  selector: "app-banned",
  templateUrl: "./banned.component.html",
  styleUrls: ["./banned.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannedComponent implements OnInit, OnDestroy {
  selectedTabIndex: number = 0;
  @ViewChild("asinTemplate") asinTemplate: TemplateRef<any>;
  @ViewChild("keywordTemplate") keywordTemplate: TemplateRef<any>;
  @ViewChild("brandTemplate") brandTemplate: TemplateRef<any>;
  @ViewChild("commentTemplate") commentTemplate: TemplateRef<any>;
  @ViewChild("_paginatorAsin") private _paginator: MatPaginator;
  @ViewChild("_paginatorOld") private _paginator_keyword: MatPaginator;
  @ViewChild("_paginatorBrand") private _paginator_brand: MatPaginator;
  @ViewChild(MatSort) private _sort: MatSort;
  @ViewChild(MatSort) private _sort_keyword: MatSort;
  @ViewChild(MatSort) private _sort_brand: MatSort;
  isLoading: boolean = false;
  isLoading1: boolean = false;
  isLoading2: boolean = false;
  isSubmitting: boolean = false;
  selectedAsinId: string = "";
  selectedKeywordId: string = "";
  selectedBrandId: string = "";
  asinForm: FormGroup;
  keywordForm: FormGroup;
  brandForm: FormGroup;
  asin_list: Observable<Asin[]> = of([]);
  keyword_list: Observable<Keyword[]> = of([]);
  brand_list: Observable<Brand[]> = of([]);
  pagination: Pagination;
  keywordPagination: Pagination;
  brandPagination: Pagination;
  removeConfirm: FormGroup;
  searchValue: any = "";
  selectedFile: File;
  pageLimit: number = Constants.pageLimit;
  tooltip: string = Constants.amazonComplianceDetails;
  searchInputControl: FormControl = new FormControl();
  searchInput1Control: FormControl = new FormControl();
  searchInput2Control: FormControl = new FormControl();
  comment: FormControl = new FormControl("", Validators.required);
  selectedMarketplaceId: string;
  allMarketplaces = Constants.amazonMarketplaces;
  authorizedMarketplaces: any[] = [];
  filteredMarketplaces: any[] = [];
  filterQry: any = {};
  permission: any = {};
  isSuperAdmin: boolean = false;
  event: any;
  keywordEvent: any;
  brandEvent: any;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  constructor(
    private _matDialog: MatDialog,
    private _bannedService: BannedService,
    // private _fileDownloadService: FileDownloadService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _formBuilder: FormBuilder,
    private _amazonService: AmazonService,
    private _utilService: FuseUtilsService,
    private _confirmationService: FuseConfirmationService,
    private _navigationService: NavigationService,
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this._navigationService.isSuperAdmin;
    this.loadSellerMarketplaces();
    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.permission = this._navigationService.getPermissionByRoute(
          data,
          "/master/amazon/compliance",
        );
      });
    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (!this.permission || !Object.keys(this.permission).length) {
          this.permission = this._navigationService.getPermissionByRoute(
            data,
            "/master/amazon/compliance",
          );
        }
      });
    this._amazonService.selectedMarketplaceId$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((id) => {
        this.selectedMarketplaceId = id;
        this.filterQry["marketplaceId"] = this.selectedMarketplaceId;
        this.asinList();
        this.keywordList();
        this.brandList();
      });
    // Initial load to ensure data loads on page load
    // this.asinList();
    // this.keywordList();
    this.removeConfirm = this._formBuilder.group({
      title: "Remove ASIN from banned",
      message:
        "Are you sure you want to release the ASIN to sync and remove from banned?",
      icon: this._formBuilder.group({
        show: true,
        name: "heroicons_outline:exclamation",
        color: "warn",
      }),
      actions: this._formBuilder.group({
        confirm: this._formBuilder.group({
          show: true,
          label: "Remove",
          color: "warn",
        }),
        cancel: this._formBuilder.group({
          show: true,
          label: "Cancel",
        }),
      }),
      dismissible: true,
    });

    this.asinForm = new FormGroup({
      marketplace_id: new FormControl("", [Validators.required]),
      asin: new FormControl("", [
        Validators.required,
        Validators.maxLength(10),
        Validators.pattern("^[a-zA-Z0-9]{10}$"),
      ]),
      comment: new FormControl("", [
        Validators.required,
        Validators.maxLength(200),
      ]),
    });
    this.asin_list = this._bannedService.asin$;
    // this.asinList();
    this.keywordForm = new FormGroup({
      marketplace_id: new FormControl("", [Validators.required]),
      keyword: new FormControl("", [
        Validators.required,
        Validators.maxLength(20),
      ]),
      comment: new FormControl("", [
        Validators.required,
        Validators.maxLength(200),
      ]),
    });
    this.keyword_list = this._bannedService.keyword$;

    this.brandForm = new FormGroup({
      marketplace_id: new FormControl("", [Validators.required]),
      brand_name: new FormControl("", [
        Validators.required,
        Validators.maxLength(100),
      ]),
      comment: new FormControl("", [
        Validators.required,
        Validators.maxLength(200),
      ]),
    });
    this.brand_list = this._bannedService.brand$;

    this._bannedService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        this.pagination = pagination;
      });
    this._bannedService.key_pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        this.keywordPagination = pagination;
      });
    this._bannedService.brand_pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        this.brandPagination = pagination;
      });

    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.searchValue = query;
          if (this._paginator) {
            this._paginator.pageIndex = 0;
          }
          return this._bannedService.asinList(
            1,
            (this.pageLimit = this._paginator?.pageSize || 100),
            "createdAt",
            "desc",
            this.searchValue,
            this.filterQry,
          );
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    this.searchInput1Control.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.searchValue = query;
          if (this._paginator_keyword) {
            this._paginator_keyword.pageIndex = 0;
          }
          return this._bannedService.keywordList(
            1,
            (this.pageLimit = this._paginator_keyword?.pageSize || 100),
            "createdAt",
            "desc",
            this.searchValue,
            this.filterQry,
          );
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    this.searchInput2Control.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.searchValue = query;
          if (this._paginator_brand) {
            this._paginator_brand.pageIndex = 0;
          }
          return this._bannedService.brandList(
            1,
            (this.pageLimit = this._paginator_brand?.pageSize || 100),
            "createdAt",
            "desc",
            this.searchValue,
            this.filterQry,
          );
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    this._changeDetectorRef.markForCheck();
  }

  loadSellerMarketplaces(): void {
    this.authorizedMarketplaces = [];
    this.filteredMarketplaces = [];
    this._amazonService
      .getMarketplaceBaseOnSeller()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response: any) => {
        if (response?.status === 200 && response?.data) {
          const ids = new Set<string>();
          response.data.forEach((store: any) => {
            if (store.marketplace_ids) {
              if (Array.isArray(store.marketplace_ids)) {
                store.marketplace_ids.forEach((id: string) => ids.add(id));
              } else if (typeof store.marketplace_ids === "string") {
                ids.add(store.marketplace_ids);
              }
            }
          });
          const matched = this.allMarketplaces.filter((m) => ids.has(m.id));
          this.authorizedMarketplaces =
            matched.length > 0 ? matched : [...this.allMarketplaces];
          this.filteredMarketplaces = [...this.authorizedMarketplaces];
          this._changeDetectorRef.markForCheck();
        } else {
          this.authorizedMarketplaces = [...this.allMarketplaces];
          this.filteredMarketplaces = [...this.authorizedMarketplaces];
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  filterMarketplaceData(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === "") {
      this.filteredMarketplaces = [...this.authorizedMarketplaces];
    } else {
      const lower = searchTerm.toLowerCase();
      this.filteredMarketplaces = this.authorizedMarketplaces.filter(
        (m) =>
          m.countryName.toLowerCase().includes(lower) ||
          m.countryCode.toLowerCase().includes(lower) ||
          m.id.toLowerCase().includes(lower),
      );
    }
    this._changeDetectorRef.markForCheck();
  }

  triggerMarketplaceEvent(): void {
    this.filteredMarketplaces = [...this.authorizedMarketplaces];
  }

  /**
   * Open compose dialog
   */
  addUpdateAsin(selectedAsinId): void {
    // Open the dialog
    this.selectedAsinId = selectedAsinId ? selectedAsinId : "";
    this.loadSellerMarketplaces();
    this._matDialog.open(this.asinTemplate);
    if (selectedAsinId) {
      this._bannedService
        .getAsinById(selectedAsinId)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (data: any) => {
            this.asinForm.patchValue(data.data);
            if (data.data?.marketplace_id) {
              this.asinForm.patchValue({
                marketplace_id: data.data.marketplace_id,
              });
            }
            this._changeDetectorRef.markForCheck();
          },
          error: (err) => {
            this._utilService.onError(
              err?.error?.message || "Failed to fetch ASIN details.",
            );
          },
        });
    } else {
      this.asinForm.reset();
      if (this.authorizedMarketplaces.length === 1) {
        this.asinForm.patchValue({
          marketplace_id: this.authorizedMarketplaces[0].id,
        });
      }
    }
  }

  openCommentDialog(): void {
    this._matDialog.open(this.commentTemplate);
  }

  saveFileData(): void {
    if (this.comment.valid) {
      this.OnUploadFile();
    }
  }

  closeDialog(): void {
    this._matDialog.closeAll();
  }

  createAsin(): void {
    if (this.asinForm.invalid || this.isSubmitting) {
      return;
    }

    const { asin, comment, marketplace_id } = this.asinForm.value;
    const asinList = asin.split(",").map((a) => a.trim());

    if (asinList.some((a) => a.length < 10)) {
      this._utilService.onError(
        "ASIN not valid from list, please check again!",
      );
      this._changeDetectorRef.markForCheck();
      return;
    }

    this.isSubmitting = true;
    this._bannedService
      .bannedAsin({
        asinList,
        comment,
        marketplace_id,
      })
      .pipe(
        takeUntil(this._unsubscribeAll),
        finalize(() => {
          this.isSubmitting = false;
          this._changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this._utilService.onSuccess("ASIN has been banned successfully.");
          this.asinList();
          this.closeDialog();
        },
        error: (err) => {
          this._utilService.onError(
            err?.error?.message || "Failed to ban ASIN. Please try again.",
          );
        },
      });
  }

  updateAsin(): void {
    if (this.asinForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this._bannedService
      .updateAsinById(this.selectedAsinId, this.asinForm.value)
      .pipe(
        takeUntil(this._unsubscribeAll),
        finalize(() => {
          this.isSubmitting = false;
          this._changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this._utilService.onSuccess("Asin has been updated successfully.");
          this.asinList();
          this.closeDialog();
        },
        error: (e) => {
          this._utilService.onError(
            e?.error?.message || "Failed to update ASIN.",
          );
        },
      });
  }

  asinList(): void {
    this.isLoading = true;
    const pageIndex = (this._paginator ? this._paginator.pageIndex : 0) + 1;
    const pageSize = this._paginator
      ? this._paginator.pageSize
      : this.pagination?.size || 100;
    this._bannedService
      .asinList(
        pageIndex,
        pageSize,
        "createdAt",
        "desc",
        this.searchValue,
        this.filterQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
        error: (e) => {
          this.isLoading = false;
          this._utilService.onError(
            e?.error?.message || "Failed to load ASIN list.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  deleteAsin(selectedAsinId): void {
    const dialogRef = this._confirmationService.open(this.removeConfirm.value);

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          // Delete the user on the server
          this._bannedService
            .deleteAsinById(selectedAsinId)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
              next: () => {
                this.asinList();
                this._changeDetectorRef.markForCheck();
                this._utilService.onSuccess(
                  "Asin has been released successfully!",
                );
              },
              error: (err) => {
                this._utilService.onError(
                  err?.error?.message || "Failed to release ASIN.",
                );
              },
            });
        }
      });
  }

  onFileUpload(event): any {
    this.selectedFile = event?.target?.files?.[0];
    if (!this.selectedFile) {
      return;
    }
    if (this.selectedFile.type !== "text/plain") {
      this._utilService.onError("Please select only TXT file");
      this._changeDetectorRef.markForCheck();
      return;
    }

    const readers = new FileReader();
    readers.readAsDataURL(this.selectedFile);
    this.openCommentDialog();
    // this.OnUploadFile();
  }

  OnUploadFile(): void {
    const uploadFormData = new FormData();
    uploadFormData.append("file", this.selectedFile);
    uploadFormData.append("comment", this.comment.value);

    this._bannedService
      .importAsin(uploadFormData)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (data: any) => {
          this._utilService.onSuccess("File imported successfully.");
          this.asinList();
          this.closeDialog();
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this._utilService.onError(
            err?.error?.message || "Failed to import file.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  // downloadFile(): void {
  //     this._fileDownloadService.dynamicDownloadTxt(AsinList, 'Asin');
  // }

  keywordList(): void {
    this.isLoading1 = true;
    const pageIndex =
      (this._paginator_keyword ? this._paginator_keyword.pageIndex : 0) + 1;
    const pageSize = this._paginator_keyword
      ? this._paginator_keyword.pageSize
      : this.keywordPagination?.size || 100;
    this._bannedService
      .keywordList(
        pageIndex,
        pageSize,
        "createdAt",
        "desc",
        this.searchValue,
        this.filterQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: () => {
          this.isLoading1 = false;
          this._changeDetectorRef.markForCheck();
        },
        error: (e) => {
          this.isLoading1 = false;
          this._utilService.onError(
            e?.error?.message || "Failed to load keyword list.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  /**
   * Open compose dialog
   */
  addUpdateKeyword(selectedKeywordId): void {
    // Open the dialog
    this.selectedKeywordId = selectedKeywordId ? selectedKeywordId : "";
    this.loadSellerMarketplaces();
    this._matDialog.open(this.keywordTemplate);
    if (selectedKeywordId) {
      this._bannedService
        .getKeywordById(selectedKeywordId)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (data: any) => {
            this.keywordForm.patchValue(data.data);
            if (data.data?.marketplace_id) {
              this.keywordForm.patchValue({
                marketplace_id: data.data.marketplace_id,
              });
            }
            this._changeDetectorRef.markForCheck();
          },
          error: (err) => {
            this._utilService.onError(
              err?.error?.message || "Failed to fetch keyword details.",
            );
          },
        });
    } else {
      this.keywordForm.reset();
      if (this.authorizedMarketplaces.length === 1) {
        this.keywordForm.patchValue({
          marketplace_id: this.authorizedMarketplaces[0].id,
        });
      }
    }
  }

  createKeyword(): void {
    if (this.keywordForm.invalid || this.isSubmitting) {
      return;
    }
    const formData = this.keywordForm.value;

    this.isSubmitting = true;
    this._bannedService
      .createKeyword({
        keyword: formData.keyword,
        comment: formData.comment,
        marketplaceId: formData.marketplace_id,
        marketplace_id: formData.marketplace_id,
      })
      .pipe(
        takeUntil(this._unsubscribeAll),
        finalize(() => {
          this.isSubmitting = false;
          this._changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this._utilService.onSuccess("Keyword has been added successfully.");
          this.keywordList();
          this.closeDialog();
        },
        error: (e) => {
          this._utilService.onError(
            e?.error?.message || "Failed to add keyword.",
          );
        },
      });
  }

  updateKeyword(): void {
    if (this.keywordForm.invalid || this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;
    this._bannedService
      .updateKeywordById(this.selectedKeywordId, this.keywordForm.value)
      .pipe(
        takeUntil(this._unsubscribeAll),
        finalize(() => {
          this.isSubmitting = false;
          this._changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this._utilService.onSuccess("Keyword has been updated successfully.");
          this.keywordList();
          this.closeDialog();
        },
        error: (e) => {
          this._utilService.onError(
            e?.error?.message || "Failed to update keyword.",
          );
        },
      });
  }

  deleteKeyword(selectedKeywordId: string): void {
    this.removeConfirm.patchValue({
      title: "Remove Keyword",
      message: "Are you sure you want to remove Keyword details permanently?",
      actions: {
        confirm: { label: "Remove" },
      },
    });

    const dialogRef = this._confirmationService.open(this.removeConfirm.value);

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          // Delete the user on the server
          this._bannedService
            .deleteKeywordById(selectedKeywordId)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
              next: (res: any) => {
                if (res.isWarn) {
                  this._confirmationService.open({
                    title: "Alert",
                    message:
                      res.message +
                      "\n AND Keyword has been release successfully!",
                    icon: { show: true, color: "info" },
                    actions: {
                      confirm: { show: false },
                      cancel: { show: true, label: "Ok" },
                    },
                  });
                  this.keywordList();
                  this._changeDetectorRef.markForCheck();
                } else {
                  this.keywordList();
                  this._changeDetectorRef.markForCheck();
                  this._utilService.onSuccess(
                    "Keyword has been release successfully!",
                  );
                }
              },
              error: (err) => {
                this._utilService.onError(
                  err?.error?.message || "Failed to delete keyword.",
                );
                this._changeDetectorRef.markForCheck();
              },
            });
        }
      });
  }

  brandList(): void {
    this.isLoading2 = true;
    const pageIndex =
      (this._paginator_brand ? this._paginator_brand.pageIndex : 0) + 1;
    const pageSize = this._paginator_brand
      ? this._paginator_brand.pageSize
      : this.brandPagination?.size || 100;
    this._bannedService
      .brandList(
        pageIndex,
        pageSize,
        "createdAt",
        "desc",
        this.searchValue,
        this.filterQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: () => {
          this.isLoading2 = false;
          this._changeDetectorRef.markForCheck();
        },
        error: (e) => {
          this.isLoading2 = false;
          this._utilService.onError(
            e?.error?.message || "Failed to load brand list.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  addUpdateBrand(selectedBrandId?: string): void {
    this.selectedBrandId = selectedBrandId ? selectedBrandId : "";
    this.loadSellerMarketplaces();
    this._matDialog.open(this.brandTemplate);
    if (selectedBrandId) {
      this._bannedService
        .getBrandById(selectedBrandId)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (data: any) => {
            this.brandForm.patchValue(data.data);
            if (data.data?.marketplace_id) {
              this.brandForm.patchValue({
                marketplace_id: data.data.marketplace_id,
              });
            }
            this._changeDetectorRef.markForCheck();
          },
          error: (err) => {
            this._utilService.onError(
              err?.error?.message || "Failed to fetch brand details.",
            );
          },
        });
    } else {
      this.brandForm.reset();
      if (this.authorizedMarketplaces.length === 1) {
        this.brandForm.patchValue({
          marketplace_id: this.authorizedMarketplaces[0].id,
        });
      }
    }
  }

  createBrand(): void {
    if (this.brandForm.invalid || this.isSubmitting) {
      return;
    }
    const formData = this.brandForm.value;

    this.isSubmitting = true;
    this._bannedService
      .createBrand({
        brand_name: formData.brand_name,
        comment: formData.comment,
        marketplaceId: formData.marketplace_id,
        marketplace_id: formData.marketplace_id,
      })
      .pipe(
        takeUntil(this._unsubscribeAll),
        finalize(() => {
          this.isSubmitting = false;
          this._changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this._utilService.onSuccess("Brand has been banned successfully.");
          this.brandList();
          this.closeDialog();
        },
        error: (e) => {
          this._utilService.onError(
            e?.error?.message || "Failed to add brand.",
          );
        },
      });
  }

  updateBrand(): void {
    if (this.brandForm.invalid || this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;
    this._bannedService
      .updateBrandById(this.selectedBrandId, this.brandForm.value)
      .pipe(
        takeUntil(this._unsubscribeAll),
        finalize(() => {
          this.isSubmitting = false;
          this._changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this._utilService.onSuccess("Brand has been updated successfully.");
          this.brandList();
          this.closeDialog();
        },
        error: (e) => {
          this._utilService.onError(
            e?.error?.message || "Failed to update brand.",
          );
        },
      });
  }

  deleteBrand(selectedBrandId: string): void {
    this.removeConfirm.patchValue({
      title: "Remove Brand",
      message: "Are you sure you want to remove Brand details permanently?",
      actions: {
        confirm: { label: "Remove" },
      },
    });

    const dialogRef = this._confirmationService.open(this.removeConfirm.value);

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._bannedService
            .deleteBrandById(selectedBrandId)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
              next: (res: any) => {
                this.brandList();
                this._changeDetectorRef.markForCheck();
                this._utilService.onSuccess(
                  "Brand has been released successfully!",
                );
              },
              error: (err) => {
                this._utilService.onError(
                  err?.error?.message || "Failed to delete brand.",
                );
                this._changeDetectorRef.markForCheck();
              },
            });
        }
      });
  }

  refresh(type?: "asin" | "keyword" | "brand"): void {
    if (!type || type === "asin") {
      this.searchInputControl.setValue("", { emitEvent: false });
      this.searchValue = "";
      if (this._paginator) {
        this._paginator.pageIndex = 0;
      }
      this.asinList();
    }
    if (!type || type === "keyword") {
      this.searchInput1Control.setValue("", { emitEvent: false });
      this.searchValue = "";
      if (this._paginator_keyword) {
        this._paginator_keyword.pageIndex = 0;
      }
      this.keywordList();
    }
    if (!type || type === "brand") {
      this.searchInput2Control.setValue("", { emitEvent: false });
      this.searchValue = "";
      if (this._paginator_brand) {
        this._paginator_brand.pageIndex = 0;
      }
      this.brandList();
    }
  }

  sortData(event, type: "asin" | "keyword" | "brand"): void {
    let currentEvent = this.event;
    if (type === "keyword") {
      currentEvent = this.keywordEvent;
    } else if (type === "brand") {
      currentEvent = this.brandEvent;
    }
    this.loadData(
      type,
      currentEvent ? currentEvent.pageIndex + 1 : 1,
      currentEvent ? currentEvent.pageSize : getPageSize(this._paginator),
      event.active,
      event.direction,
    );
  }

  pageChangeEvent(event, type: "asin" | "keyword" | "brand"): void {
    if (type === "asin") {
      this.event = event;
    } else if (type === "keyword") {
      this.keywordEvent = event;
    } else {
      this.brandEvent = event;
    }
    this.loadData(
      type,
      event.pageIndex + 1,
      event.pageSize,
      "createdAt",
      "desc",
    );
  }

  loadData(
    type: "asin" | "keyword" | "brand",
    pageIndex: number,
    pageSize: number,
    sortBy: string,
    sortOrder: any,
  ): void {
    if (type === "asin") {
      this.isLoading = true;
      this._changeDetectorRef.markForCheck();
      this._bannedService
        .asinList(
          pageIndex,
          pageSize,
          sortBy,
          sortOrder,
          this.searchValue,
          this.filterQry,
        )
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (data) => {
            this.isLoading = false;
            this.asin_list = this._bannedService.asin$;
            this._changeDetectorRef.markForCheck();
          },
          error: (err) => {
            this.isLoading = false;
            this._utilService.onError(
              err?.error?.message || "Failed to load ASIN data.",
            );
            this._changeDetectorRef.markForCheck();
          },
        });
    } else if (type === "keyword") {
      this.isLoading1 = true;
      this._changeDetectorRef.markForCheck();
      this._bannedService
        .keywordList(
          pageIndex,
          pageSize,
          sortBy,
          sortOrder,
          this.searchValue,
          this.filterQry,
        )
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (data) => {
            this.isLoading1 = false;
            this.keyword_list = this._bannedService.keyword$;
            this._changeDetectorRef.markForCheck();
          },
          error: (err) => {
            this.isLoading1 = false;
            this._utilService.onError(
              err?.error?.message || "Failed to load keyword data.",
            );
            this._changeDetectorRef.markForCheck();
          },
        });
    } else {
      this.isLoading2 = true;
      this._changeDetectorRef.markForCheck();
      this._bannedService
        .brandList(
          pageIndex,
          pageSize,
          sortBy,
          sortOrder,
          this.searchValue,
          this.filterQry,
        )
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (data) => {
            this.isLoading2 = false;
            this.brand_list = this._bannedService.brand$;
            this._changeDetectorRef.markForCheck();
          },
          error: (err) => {
            this.isLoading2 = false;
            this._utilService.onError(
              err?.error?.message || "Failed to load brand data.",
            );
            this._changeDetectorRef.markForCheck();
          },
        });
    }
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
