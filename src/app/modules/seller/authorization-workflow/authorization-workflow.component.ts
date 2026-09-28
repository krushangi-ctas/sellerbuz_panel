import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { Constants } from "app/shared/constants";
import { IAuthorizeAccount, inits } from "./create-authentication.helper";
import { MatStepper } from "@angular/material/stepper";
import { FuseUtilsService } from "@fuse/services/utils";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { BehaviorSubject, Subject, takeUntil } from "rxjs";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { environment } from "environments/environment";
import { AmazonService } from "app/core/amazon/amazon.service";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { NavigationService } from "app/core/navigation/navigation.service";

@Component({
  standalone: false,
  selector: "app-authorization-workflow",
  templateUrl: "./authorization-workflow.component.html",
  styleUrls: ["./authorization-workflow.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthorizationWorkflowComponent implements OnInit, OnDestroy {
  @ViewChild("verticalStepper") verticalStepper: MatStepper;
  allMarketplaces = Constants.amazonMarketplaces;
  marcketPlaceConfirmation: any;
  selectedMarketplace: any = "US";
  currentAccount: any;
  data: SafeHtml;
  amazonButtonClicked: boolean = false;
  account$: BehaviorSubject<IAuthorizeAccount> =
    new BehaviorSubject<IAuthorizeAccount>(inits);
  marketplaceConfirmed: boolean;
  selectedContry: string;
  form: boolean = false;
  storeName: string = "";
  isAuthorize: boolean = false;
  groupedMarketplaces: { regionName: string; marketplaces: any[] }[] = [];
  displayedColumns: string[] = [
    "store_name",
    "selling_partner_id",
    "aws_region",
    "marketplace",
    "status",
    "actions",
  ];
  storeDetails: any[]; // Changed from void to any[]
  regions: any;
  disableAuthorizeFlow: boolean = false;
  sellerId: string = "";
  permission: any = {};
  tmpStoreDetails: any = [];
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _utilService: FuseUtilsService,
    private sanitizer: DomSanitizer,
    private _confirmationService: FuseConfirmationService,
    private _amazonService: AmazonService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _localService: LocalStorageService,
    private _navigationService: NavigationService,
    private _route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this._route.paramMap
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((params) => {
        const paramSellerId = params.get("sellerId") || params.get("id");
        this.sellerId =
          paramSellerId || this._amazonService.activeSellerId || "";
        this.getSellerCrendetialById();
      });

    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.permission = this._navigationService.getPermissionByRoute(
          data,
          "/authorization-workflow",
        );
        this._changeDetectorRef.markForCheck();
      });
    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (!this.permission || !Object.keys(this.permission).length) {
          this.permission = this._navigationService.getPermissionByRoute(
            data,
            "/authorization-workflow",
          );
          this._changeDetectorRef.markForCheck();
        }
      });
    this.groupMarketplacesByRegion();
  }

  toggleMode(): void {
    this.isAuthorize = !this.isAuthorize;
  }

  groupMarketplacesByRegion(): void {
    let regionMap: { [key: string]: string } = {
      "us-east-1": "North America",
      "eu-west-1": "Europe",
      "us-west-2": "Far East",
    };

    if (this.regions) {
      regionMap = Object.fromEntries(
        Object.entries(regionMap).filter(
          ([key]) => !this.regions.includes(key),
        ),
      );
    }

    const grouped = this.allMarketplaces.reduce(
      (acc, marketplace) => {
        const regionName = regionMap[marketplace.awsRegion] || "";
        if (!regionName) {
          return acc;
        }
        if (!acc[regionName]) {
          acc[regionName] = [];
        }
        acc[regionName].push(marketplace);
        return acc;
      },
      {} as { [key: string]: any[] },
    );

    // Transform the grouped object into an array
    this.groupedMarketplaces = Object.entries(grouped).map(
      ([regionName, marketplaces]) => ({
        regionName,
        marketplaces,
      }),
    );
  }

  getUniqueRegions(allMarketplaces: any[]): string[] {
    const uniqueRegions = new Set<string>();
    allMarketplaces.forEach((country) => uniqueRegions.add(country.awsRegion));
    return Array.from(uniqueRegions);
  }

  getCountriesForRegion(allMarketplaces: any[], region: string): any[] {
    return allMarketplaces.filter((country) => country.awsRegion === region);
  }
  getRegionDisplayName(region: string): string {
    switch (region) {
      case "us-east-1":
        return "North America";
      case "eu-west-1":
        return "Europe";
      case "us-west-2":
        return "Far East";
      default:
        return region;
    }
  }

  selectMarketplace(marketplace: any): any {
    this.selectedMarketplace = marketplace;
  }

  nextStep(): any {
    const nextStep = this.verticalStepper.selectedIndex + 1;
    this.verticalStepper.selectedIndex = nextStep;
  }

  getMarketPlace(marketplace: any): any {
    if (!this.storeName) {
      this._utilService.onError("Please enter store name first!");
      return;
    }
    const marketPlace = marketplace;
    const updatedAccount = {
      ...this.account$.value,
      marketplaceChannel: marketPlace,
    };
    this.account$.next(updatedAccount);
    this.currentAccount = this.account$.value;
    const message = `Are you sure you want to proceed with <span><strong style='color:green; font-size:18px'>${marketPlace}</strong></span> marketplace?`;
    this.data = this.sanitizer.bypassSecurityTrustHtml(message);
    this.marcketPlaceConfirmation = this._utilService.confirmMessage(
      "Confirmation",
      this.data,
      "Yes",
    );
    const dialogRef = this._confirmationService.open(
      this.marcketPlaceConfirmation.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          const currentSelectedChannel = Constants.amazonMarketplaces.find(
            (amzmarketplace) => amzmarketplace.countryCode === marketPlace,
          );
          if (!currentSelectedChannel) {
            return;
          }
          this._localService.setItem(
            "marketplace-channel",
            this.currentAccount.marketplaceChannel,
          );
          this.selectedContry = currentSelectedChannel.countryCode;
          this.marketplaceConfirmed = true;
          this._amazonService
            .storeCustomersSelectedMarketplace(
              {
                channel: this.currentAccount.marketplaceType,
                marketplace: this.currentAccount.marketplaceChannel,
                store_name: this.storeName,
                seller_central_url: currentSelectedChannel.sellerCentralURL,
                sp_api_end_point: currentSelectedChannel.spApiEndPoint,
                aws_region: currentSelectedChannel.awsRegion,
                marketplace_id: currentSelectedChannel.id,
              },
              this.sellerId,
            )
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
              next: (payload: any) => {
                this.verticalStepper.selectedIndex =
                  this.verticalStepper.selectedIndex + 1;
                this._utilService.onSuccess("Marketplace Added Successfully");
                this._changeDetectorRef.markForCheck();
                this.storeName = "";
              },
              error: ({ error }) => {
                this._utilService.onError(error.message);
              },
            });
        } else {
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  getMarketplaceByCountryCode(countryCode: string): any {
    return this.allMarketplaces.find(
      (marketplace) => marketplace.countryCode === countryCode,
    );
  }

  connectToAmazon(): any {
    const marketplace = this.getMarketplaceByCountryCode(
      this.currentAccount.marketplaceChannel,
    );
    if (marketplace) {
      // Redirect to the selected country's seller central URL in a new tab
      window.open(
        marketplace.sellerCentralURL +
          `/apps/authorize/consent?application_id=${environment.applicationId}&state=-37131022&scope=
        sellingpartnerapi::migration&version=beta&redirect_uri=${environment.redirectURI}`,
        "_blank",
      );
    } else {
      // Handle the case when the selected country is not found in the marketplace data
      console.log(
        `Seller central URL for country ${this.currentAccount.marketplaceChannel} not found.`,
      );
    }
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  isLoading: boolean = true;

  getSellerCrendetialById(): any {
    this.isLoading = true;
    this._amazonService
      .getSellerCrendetialsBySellerId(this.sellerId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (data: any) => {
          this.isLoading = false;
          if (data?.status === 200) {
            if (data?.data?.length > 0) {
              this.storeDetails = data.data;
              this.tmpStoreDetails = JSON.parse(JSON.stringify([...data.data]));
              this.regions = this.storeDetails.map(
                (item: any) => item.aws_region,
              );
              if (this.regions && this.regions.length === 3) {
                this.disableAuthorizeFlow = true;
              }
              this.groupMarketplacesByRegion();
            } else {
              this.isAuthorize = true;
            }
          }
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  getMarketplacesByRegion(region: string): any {
    return this.allMarketplaces.filter(
      (marketplace) => marketplace.awsRegion === region,
    );
  }
  shouldDisableMarketplace(marketplaceId: string, awsRegion: string): boolean {
    return this.tmpStoreDetails.some(
      (store) =>
        store.aws_region === awsRegion &&
        store.marketplace_ids.includes(marketplaceId),
    );
  }

  disableSaveButton(element: any): boolean {
    const store = this.tmpStoreDetails.find(
      (store) => store.aws_region === element.aws_region,
    );
    return store
      ? this.arraysAreEqual(store.marketplace_ids, element.marketplace_ids) &&
          store.status === element.status
      : true;
  }

  toggleStoreStatus(element: any, isChecked: boolean): void {
    const newStatus = isChecked ? 1 : 0;
    const actionText = newStatus === 1 ? "activate" : "deactivate";

    this.marcketPlaceConfirmation = this._utilService.confirmMessage(
      "Change Store Status",
      `Are you sure you want to ${actionText} this store?`,
      "Yes",
    );
    const dialogRef = this._confirmationService.open(
      this.marcketPlaceConfirmation.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          element.status = newStatus;
          const bodyData = {
            aws_region: element.aws_region,
            marketplace_ids: element.marketplace_ids || [],
            status: newStatus,
          };
          this._amazonService
            .updateSellerCrendetials(bodyData, this.sellerId)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
              next: (payload: any) => {
                this._utilService.onSuccess(
                  `Store status updated to ${newStatus === 1 ? "Active" : "Inactive"} successfully.`,
                );
                this._changeDetectorRef.markForCheck();
                this.getSellerCrendetialById();
              },
              error: ({ error }) => {
                element.status = newStatus === 1 ? 0 : 1;
                this._utilService.onError(
                  error?.message || "Failed to update store status.",
                );
                this._changeDetectorRef.markForCheck();
              },
            });
        } else {
          element.status = newStatus === 1 ? 0 : 1;
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  private arraysAreEqual(arr1: any[], arr2: any[]): boolean {
    return (
      Array.isArray(arr1) &&
      Array.isArray(arr2) &&
      arr1.length === arr2.length &&
      arr1.every((val) => arr2.includes(val))
    );
  }

  updateStore(bodyData: any): void {
    this.marcketPlaceConfirmation = this._utilService.confirmMessage(
      "Add new marketplace",
      "Are you sure you want to add new marketplace?",
      "Yes",
    );
    const dialogRef = this._confirmationService.open(
      this.marcketPlaceConfirmation.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        (result) => {
          if (result === "confirmed") {
            this._amazonService
              .updateSellerCrendetials(bodyData, this.sellerId)
              .pipe(takeUntil(this._unsubscribeAll))
              .subscribe({
                next: (payload: any) => {
                  this._utilService.onSuccess(
                    "Multiple Marketplace Added Successfully",
                  );
                  this._changeDetectorRef.markForCheck();
                },
                error: ({ error }) => {
                  this._utilService.onError(error.message);
                },
              });
          } else {
            this._changeDetectorRef.markForCheck();
          }
          this.getSellerCrendetialById();
        },
        (errr) => {
          console.error(errr);
        },
      );
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
