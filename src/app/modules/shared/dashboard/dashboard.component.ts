import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { DashbordService } from "app/core/dashbord/dashbord.service";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { Subject, debounceTime, takeUntil } from "rxjs";

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexLegend,
  ApexOptions,
  ApexPlotOptions,
  ApexResponsive,
  ApexTitleSubtitle,
  ApexXAxis,
  ApexYAxis,
  ApexStroke,
  ApexGrid,
  ApexTooltip,
  ChartComponent,
} from "ng-apexcharts";
import { AmazonService } from "app/core/amazon/amazon.service";
import { ActivatedRoute } from "@angular/router";
import { environment } from "environments/environment";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { User } from "app/core/user/user.types";
import { Constants } from "app/shared/constants";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { Pagination } from "app/core/pagination/pagination.types";
import {
  UploadedFileItem,
  UploadedFilesService,
} from "app/core/uploaded-files/uploaded-files.service";
import { FileProgressService } from "app/core/file-progress/file-progress.service";
import { SupportTicketService } from "app/core/support/support-ticket.service";

export type ChartOptions = {
  series: ApexAxisChartSeries | number[]; // Pie chart uses number[]
  chart: ApexChart;
  dataLabels?: ApexDataLabels; // Optional for pie charts
  plotOptions?: ApexPlotOptions; // Optional for pie charts
  responsive: ApexResponsive[];
  xaxis?: ApexXAxis; // Optional for pie charts
  yaxis?: ApexYAxis; // Optional for bar charts
  legend: ApexLegend;
  fill?: ApexFill;
  title?: ApexTitleSubtitle; // Optional if not using a title
  labels?: string[]; // Add this property
  colors?: any; // Chart colors
};

export type ChartOptions2 = {
  series: ApexAxisChartSeries | number[]; // Pie chart uses number[]
  chart: ApexChart;
  dataLabels?: ApexDataLabels; // Optional for pie charts
  plotOptions?: ApexPlotOptions; // Optional for pie charts
  responsive: ApexResponsive[];
  xaxis?: ApexXAxis; // Optional for pie charts
  yaxis?: ApexYAxis; // Optional for bar charts
  legend: ApexLegend;
  fill?: ApexFill;
  stroke?: ApexStroke;
  title?: ApexTitleSubtitle; // Optional if not using a title
  labels?: string[]; // Add this property
  colors?: any;
};

export type ChartOptions3 = {
  series: ApexAxisChartSeries | number[]; // Pie chart uses number[]
  chart: ApexChart;
  dataLabels?: ApexDataLabels; // Optional for pie charts
  plotOptions?: ApexPlotOptions; // Optional for pie charts
  responsive?: ApexResponsive[];
  xaxis?: ApexXAxis; // Optional for pie charts
  yaxis?: ApexYAxis;
  grid?: ApexGrid;
  legend?: ApexLegend;
  fill?: ApexFill;
  stroke?: ApexStroke;
  title?: ApexTitleSubtitle; // Optional if not using a title
  labels?: string[]; // Add this property
  colors?: string[];
};

export type ChartOptions4 = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions?: ApexPlotOptions;
  responsive?: ApexResponsive[];
  xaxis: ApexXAxis;
  legend?: ApexLegend;
  fill?: ApexFill;
  title?: ApexTitleSubtitle;
  colors?: string[];
  stroke?: ApexStroke;
  grid?: ApexGrid;
  yaxis?: ApexYAxis;
  tooltip?: ApexTooltip;
};

@Component({
  standalone: false,
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private _unsubscribeAll: Subject<void> = new Subject<void>();
  @ViewChild("chart") chart: ChartComponent;
  public chartOptions: Partial<ChartOptions>;
  public chartOptions2: Partial<ChartOptions2>;
  public chartOptions3: Partial<ChartOptions3>;
  public chartOptions4: Partial<ChartOptions4>;
  chartVisitors: ApexOptions;
  chartTopSellers: any;
  public chartOptions5: Partial<ChartOptions2>;
  public chartOptions6: Partial<any>;
  public chartOptions7: Partial<any>;
  public chartOptions8: Partial<any>;

  activeTab: string = "overview";
  cronLogs: any[] = [];
  cronPage: number = 1;
  cronLimit: number = 10;
  cronTotalResults: number = 0;
  cronTotalPages: number = 1;
  cronSearch: string = "";
  cronStatus: string = "all";
  cronTimeFilter: string = "all";
  cronSearchControl: FormControl = new FormControl("");
  cronStartDateControl: FormControl = new FormControl("");
  cronEndDateControl: FormControl = new FormControl("");
  cronMaxDate = new Date();
  isCronResetDate: boolean = false;
  cronSortBy: string = "startTime:desc";
  isLoadingCron: boolean = false;

  sellerInfo: any = {};
  isLoading = true;
  userActivity: number;
  isSuperAdmin: boolean;
  isPremisesUser: boolean;
  isDeveloper: boolean = false;
  permission: any;
  data: any;
  imagePath = environment.uploadPath;
  sellers: User[] = [];
  numberOfSellers: number;
  authorizedSeller: number;
  activeSellers: number = 0;
  activeSubscriptionsCount: number = 0;
  sellerStores: Array<any> = [];
  form: FormGroup;
  authData: any;
  isCustomerAuthorized: boolean = false;
  selectedMarketPlace: any = "";
  marcketPlaceConfirmation: FormGroup;
  noAuthorised: any;
  storeDetailsList: any;
  selectedMarketplaceId: string;
  allMarketplaces = Constants.amazonMarketplaces;
  amazonAuthorizedCount: any;
  totalStoreCount: any;
  amazonAuthorizedPercentage: any;
  isLoadingSellerWiseInventoryCount: boolean = true;
  isLoadBarChart: boolean = true;
  totalSellerWiseInventoryCounts: any;
  range = new FormGroup({
    startDate: new FormControl(),
    endDate: new FormControl(),
  });
  range1 = new FormGroup({
    start_date: new FormControl(),
    end_date: new FormControl(),
  });
  chartData: any[] = [];
  inventoryData: any;
  searchQry: any;
  tmpQry: object = {};
  startDate = new FormControl(new Date());
  endDate: FormControl = new FormControl(new Date());
  isSyncingInventory: boolean = false;
  isFullfilmentLoading: boolean = false;
  hasFullfillmentData: boolean = false;
  fulfillmentCounts = { FBM: 0, FBA: 0 };
  isLoadingProductTypeChartData: boolean = true;
  hasProductTypeData: boolean = false;
  isLoadingBrandsBarChart: boolean = true;
  isLoadingBrandsBarChart2: boolean = true;
  isLoadingBrandsBarChart3: boolean = true;
  hasProductCategoryData: boolean = false;
  isLoadingBrandsBarChart5: boolean = true;
  isLoadingMarketplaceChart: boolean = true;
  hasMarketplaceData: boolean = false;
  defaultColorsForCharts = [
    {
      amazon: "#ffce30",
    },
    { eBay: "#f794c6" },
  ];
  sellerInventoryCount: any;
  sellerInventoryDateWiseCount: any;
  isRouteImpornated: boolean = false;
  imageError = false;
  imageLoaded = false;
  topBrandsList: any[] = [];
  leastBrandsList: any[] = [];
  // File Upload tab state
  fileUploadLogs: UploadedFileItem[] = [];
  fileUploadPage: number = 1;
  fileUploadLimit: number = 10;
  fileUploadTotalResults: number = 0;
  fileUploadTotalPages: number = 1;
  fileUploadSearch: string = "";
  fileUploadStatus: string = "all";
  fileUploadSearchControl: FormControl = new FormControl("");
  isLoadingFileUpload: boolean = false;
  fileUploadSortBy: string = "createdAt:desc";
  fileUploadPagination: Pagination | null = null;

  ticketSummary: any = null;
  isLoadingTicketChart: boolean = true;
  ticketChartOptions: any = {
    series: [0, 0, 0, 0, 0],
    chart: {
      type: "radialBar",
      height: 280,
      fontFamily: "inherit",
    },
    plotOptions: {
      radialBar: {
        offsetY: 0,
        startAngle: 0,
        endAngle: 270,
        hollow: {
          margin: 5,
          size: "25%",
          background: "transparent",
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: "12px",
            fontWeight: 700,
            color: "#64748b",
          },
          value: {
            show: true,
            fontSize: "18px",
            fontWeight: 800,
            color: "#0f172a",
            formatter: (val: any) => `${val}`,
          },
          total: {
            show: true,
            label: "TOTAL",
            fontSize: "11px",
            fontWeight: 800,
            color: "#64748b",
            formatter: () => {
              return (this.ticketSummary?.all || 0).toString();
            },
          },
        },
        track: {
          background: "#f1f5f9",
          strokeWidth: "100%",
          margin: 4,
        },
      },
    },
    colors: ["#3b82f6", "#f59e0b", "#10b981", "#64748b", "#ef4444"],
    labels: ["Open", "Pending", "Resolved", "Closed", "Unassigned"],
    legend: {
      show: true,
      floating: true,
      fontSize: "12px",
      position: "left",
      offsetX: 0,
      offsetY: 10,
      labels: {
        useSeriesColors: true,
      },
      markers: {
        width: 10,
        height: 10,
      },
      formatter: (seriesName: string, opts: any) => {
        const val = opts.w.globals.series[opts.seriesIndex] || 0;
        return `${seriesName}: ${val}`;
      },
      itemMargin: {
        vertical: 3,
      },
    },
  };

  loadTicketSummary(sellerId?: string): void {
    this.isLoadingTicketChart = true;
    this._changeDetectorRef.markForCheck();
    const routeSellerId = this._userSessionService.getSellerIdFromUrl();
    const targetSellerId = sellerId || routeSellerId;
    const params = targetSellerId ? { sellerId: targetSellerId } : undefined;

    this._supportTicketService
      .getSummary(params)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.isLoadingTicketChart = false;
          if (res?.data) {
            this.ticketSummary = res.data;
          } else if (res && typeof res === "object") {
            this.ticketSummary = res;
          }
          if (this.ticketSummary) {
            const series = [
              this.ticketSummary.open || 0,
              this.ticketSummary.pending || 0,
              this.ticketSummary.resolved || 0,
              this.ticketSummary.closed || 0,
              this.ticketSummary.unassigned || 0,
            ];
            this.ticketChartOptions = {
              ...this.ticketChartOptions,
              series,
            };
          }
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isLoadingTicketChart = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  constructor(
    private route: ActivatedRoute,
    private _changeDetectorRef: ChangeDetectorRef,
    private _localService: LocalStorageService,
    private _dashboardService: DashbordService,
    private fb: FormBuilder,
    private _amazonService: AmazonService,
    private _userSessionService: UserSessionsService,
    private _navigationService: NavigationService,
    private _uploadedFilesService: UploadedFilesService,
    private _fileProgressService: FileProgressService,
    private _supportTicketService: SupportTicketService,
  ) {
    this.checkUserRoleAndSellerContext();
    this._userSessionService.currentSellerId$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.checkUserRoleAndSellerContext();
        this.loadTicketSummary(data);
        if (this.isLoading === false) {
          this.loadDashboard();
        }
        this._changeDetectorRef.markForCheck();
      });

    /* For Marketplace-Wise Inventory Sleek Horizontal Capsule Bar Chart */
    this.chartOptions3 = {
      series: [
        {
          name: "Inventory Count",
          data: [],
        },
      ],
      chart: {
        type: "bar",
        height: 230,
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: [
        "#6366f1", // Indigo
        "#06b6d4", // Cyan
        "#3b82f6", // Royal Blue
        "#10b981", // Emerald
        "#f59e0b", // Amber
        "#ec4899", // Pink
      ],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "32%",
          distributed: true,
          borderRadius: 10,
          borderRadiusApplication: "end",
          dataLabels: {
            position: "top",
          },
        },
      },
      dataLabels: {
        enabled: true,
        textAnchor: "start",
        style: {
          fontSize: "12px",
          fontWeight: "bold",
          colors: ["#1e293b"],
        },
        formatter: (val: number): string => ` ${val}`,
        offsetX: 5,
      },
      xaxis: {
        categories: [],
        labels: {
          style: {
            colors: "#64748b",
            fontSize: "11px",
          },
          formatter: (val: any): string => `${Math.round(val)}`,
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: ["#1e293b"],
            fontSize: "12px",
            fontWeight: "700",
          },
        },
      },
      grid: {
        borderColor: "#f1f5f9",
        strokeDashArray: 4,
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
      },
      legend: {
        show: false,
      },
    };
    /* For Fulfillment Type Chart - Red-Orange Theme */
    this.chartOptions = {
      series: [
        {
          name: "Count",
          data: [],
        },
      ],
      chart: {
        type: "bar",
        height: 280,
        toolbar: {
          show: false,
        },
      },
      colors: ["#EF4444", "#F97316"], // Red-Orange shades
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "25%",
          borderRadius: 4,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number): string => `${val}`,
      },
      xaxis: {
        categories: [],
        labels: {
          style: {
            fontSize: "12px",
          },
        },
      },
      yaxis: {
        labels: {
          formatter: (val: number): string => `${val}`,
        },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 300,
            },
            legend: {
              position: "bottom",
            },
          },
        },
      ],
      legend: {
        show: false,
      },
    };
    /* For Product Type Polar Area Chart (matching Image 1) */
    this.chartOptions2 = {
      series: [], // Data set dynamically
      chart: {
        type: "polarArea",
        height: 250,
        fontFamily: "inherit",
      },
      colors: ["#ec4899", "#f59e0b", "#8b5cf6", "#10b981"],
      stroke: {
        colors: ["#ffffff"],
        width: 2,
      },
      fill: {
        opacity: 0.85,
      },
      labels: [],
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        fontSize: "12px",
        labels: {
          colors: "#64748b",
        },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 250,
            },
            legend: {
              position: "bottom",
            },
          },
        },
      ],
    };
    /* For Bar-chart (Weekly Inventory Count - smooth area chart style) */
    this.chartOptions4 = {
      series: [
        {
          name: "-",
          data: [],
        },
      ],
      chart: {
        type: "area",
        height: 240,
        toolbar: {
          show: false,
        },
        fontFamily: "inherit",
        foreColor: "inherit",
        zoom: {
          enabled: false,
        },
      },
      colors: ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b"], // Indigo/Purple primary with supportive color accents
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "smooth",
        width: 3,
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
        },
      },
      grid: {
        borderColor: "#e5e7eb",
        strokeDashArray: 4,
        padding: {
          top: 10,
          bottom: 10,
          left: 10,
          right: 10,
        },
      },
      xaxis: {
        type: "category",
        categories: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        labels: {
          style: {
            colors: "#6b7280",
            fontSize: "12px",
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: "#6b7280",
          },
          formatter: (value: number): string => `${value}`,
        },
      },
      tooltip: {
        theme: "light",
      },
    };
    /* For Total Products Chart - Yellow-Gold Theme */
    this.chartOptions5 = {
      series: [
        {
          name: "Products",
          data: [],
        },
      ],
      chart: {
        type: "bar",
        height: 280,
        toolbar: {
          show: false,
        },
      },
      colors: ["#EAB308", "#F59E0B"], // Yellow-Gold shades
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "30%",
          borderRadius: 8,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number): string => `${val}`,
      },
      xaxis: {
        categories: [],
        labels: {
          style: {
            fontSize: "12px",
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            fontSize: "12px",
          },
        },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 300,
            },
          },
        },
      ],
      legend: {
        show: false,
      },
    };
    this.chartOptions6 = {
      series: [
        {
          data: [],
        },
      ],
      chart: {
        type: "bar",
        height: 350,
      },
      colors: ["#3b82f6"],
      plotOptions: {
        bar: {
          borderRadius: 8,
          borderRadiusApplication: "end",
          horizontal: true,
          barHeight: "35%",
        },
      },
      dataLabels: {
        enabled: true,
      },
      legend: {
        show: true,
      },
      xaxis: {
        categories: [],
      },
    };
    this.chartOptions7 = {
      series: [
        {
          name: "Depleted Units",
          data: [],
        },
      ],
      chart: {
        type: "radar",
        height: 320,
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: ["#f59e0b"], // Amber warning color
      stroke: { width: 3 },
      markers: { size: 5 },
      fill: { opacity: 0.45 },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: "11px",
          fontWeight: "bold",
          colors: ["#b45309"],
        },
      },
      plotOptions: {
        radar: {
          size: 105,
          polygons: {
            strokeColors: "#cbd5e1",
            strokeWidth: "1",
            connectorColors: "#cbd5e1",
            fill: {
              colors: ["#fffbeb", "#ffffff"],
            },
          },
        },
      },
      legend: {
        show: false,
      },
      xaxis: {
        categories: [],
        labels: {
          style: { colors: ["#1e293b"], fontSize: "12px", fontWeight: "700" },
        },
      },
    };
    this.chartOptions8 = {
      series: [],
      chart: {
        height: 350,
        type: "bar",
        stacked: true,
        fontFamily: "inherit",
        toolbar: {
          show: false,
        },
      },
      colors: ["#6366f1", "#14b8a6", "#3b82f6"],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "60%",
          borderRadius: 4,
        },
      },
      stroke: {
        width: 1,
        colors: ["#fff"],
      },
      dataLabels: {
        enabled: false,
      },
      grid: {
        borderColor: "#f1f5f9",
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
      },
      xaxis: {
        categories: [],
        labels: {
          style: {
            colors: "#64748b",
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: "#64748b",
          },
        },
      },
      legend: {
        position: "top",
        horizontalAlign: "left",
        fontSize: "12px",
        labels: {
          colors: "#64748b",
        },
      },
    };
  }

  getSellerId(): string {
    const currentSellerId = this._userSessionService.getCurrentSellerId();
    if (currentSellerId) {
      return currentSellerId;
    }
    return this.sellerInfo?.id || this.sellerInfo?._id || "";
  }

  private checkUserRoleAndSellerContext(): void {
    const currentSellerId = this._userSessionService.getCurrentSellerId();
    const loggedInUser = this._localService.getItem("user");

    if (currentSellerId) {
      this.isRouteImpornated = true;
      this.isSuperAdmin = false;
      this.isPremisesUser = false;
      this.isDeveloper = false;
      const currentUser = this._userSessionService.getCurrentUser();
      this.sellerInfo = {
        ...(currentUser || {}),
        id: currentSellerId,
        _id: currentSellerId,
      };
    } else {
      this.sellerInfo = loggedInUser || {};
      this.isSuperAdmin = !!this.sellerInfo?.isSuperAdmin;
      this.isPremisesUser = !!this.sellerInfo?.isPremisesUser;
      this.isDeveloper = !!this.sellerInfo?.isDeveloper;
    }
  }

  ngOnInit(): void {
    this.checkUserRoleAndSellerContext();
    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.permission = this._navigationService.getPermissionByRoute(
          data,
          "/dashboard",
        );
        this._changeDetectorRef.markForCheck();
      });

    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (!this.permission || !Object.keys(this.permission).length) {
          this.permission = this._navigationService.getPermissionByRoute(
            data,
            "/dashboard",
          );
          this._changeDetectorRef.markForCheck();
        }
      });

    if (!this.isSuperAdmin && !this.isPremisesUser) {
      this.route.queryParams
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((params) => {
          this.handleQueryParams(params);
          this._changeDetectorRef.markForCheck();
        });
      const storedMarketplaceId = localStorage.getItem("selected-marketplace");
      if (storedMarketplaceId) {
        this.selectedMarketplaceId = storedMarketplaceId;
      }
    }

    this.cronSearchControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this._unsubscribeAll))
      .subscribe((query: string) => {
        this.cronSearch = (query && query.trim()) || "";
        this.cronPage = 1;
        this.fetchCronLogs();
      });

    this.fileUploadSearchControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this._unsubscribeAll))
      .subscribe((query: string) => {
        this.fileUploadSearch = (query && query.trim()) || "";
        this.fileUploadPage = 1;
        this.fetchFileUploadLogs();
      });

    const currentSellerId = this.getSellerId();
    if (currentSellerId) {
      this._fileProgressService.connect(currentSellerId);
    }

    this._fileProgressService.fileProgress$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((event) => {
        const itemIndex = this.fileUploadLogs.findIndex(
          (f) => f._id === event.fileId,
        );
        if (itemIndex !== -1) {
          const updated = [...this.fileUploadLogs];
          if (event.type === "progress") {
            updated[itemIndex] = {
              ...updated[itemIndex],
              process_status: "PROCESSING",
              total_record: event.total,
              processed_records: event.processed,
            };
          } else if (event.type === "completed") {
            updated[itemIndex] = {
              ...updated[itemIndex],
              process_status: "COMPLETED",
              total_record: event.total,
              processed_records: event.total,
              total_success: event.totalSuccess,
              total_fail: event.totalFail,
              file_imported: true,
            };
          } else if (event.type === "failed") {
            updated[itemIndex] = {
              ...updated[itemIndex],
              process_status: "FAILED",
              error_message: event.error,
            };
          }
          this.fileUploadLogs = updated;
          this._changeDetectorRef.markForCheck();
        }
      });

    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  loadDashboard(): void {
    this.isLoading = true;
    if (this.isDeveloper && !this.isSuperAdmin && !this.isPremisesUser) {
      this.isLoading = false;
      this._changeDetectorRef.markForCheck();
      return;
    }
    this.loadTicketSummary();
    this.isLoadingSellerWiseInventoryCount = true;
    this.isFullfilmentLoading = true;
    this.isLoadingProductTypeChartData = true;
    this.isLoadingBrandsBarChart = true;
    this.isLoadingBrandsBarChart2 = true;
    this.isLoadingBrandsBarChart3 = true;
    this.isLoadingBrandsBarChart5 = true;
    this.isLoadingMarketplaceChart = true;
    this.isLoadBarChart = true;
    this._changeDetectorRef.markForCheck();

    if (this.isSuperAdmin || this.isPremisesUser) {
      this.getDashboardStatistics();
      this._dashboardService
        .getSellerBaseInventoryCount()
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((response: any) => {
          this.sellerInventoryCount = response.data;
          this._prepareChartData();
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        });

      this._dashboardService
        .getSellerAndDateBaseInventoryCount()
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(
          (response: any) => {
            this.sellerInventoryDateWiseCount = Array.isArray(response.data)
              ? response.data
              : [];

            this.sellerInventoryDateWiseCount.forEach((seller: any) => {
              const maxVal =
                Array.isArray(seller.totalCount) && seller.totalCount.length > 0
                  ? Math.max(...seller.totalCount)
                  : 43;
              seller.chartConfig = {
                chart: {
                  animations: {
                    enabled: false,
                  },
                  fontFamily: "inherit",
                  foreColor: "inherit",
                  height: "100%",
                  type: "area",
                  sparkline: {
                    enabled: true,
                  },
                },
                colors: ["#0EA5E9"],
                fill: {
                  colors: ["#0EA5E9"],
                  opacity: 0.5,
                },
                series: [
                  {
                    name: seller.sellerName,
                    data: seller.totalCount,
                  },
                ],
                stroke: {
                  curve: "smooth",
                },
                tooltip: {
                  followCursor: true,
                  theme: "dark",
                },
                xaxis: {
                  type: "category",
                  categories: seller.date,
                },
                yaxis: {
                  labels: {
                    formatter: (val): string => val.toString(),
                  },
                  min: 0,
                  max: maxVal + 10,
                },
              };
            });
            this._changeDetectorRef.markForCheck();
          },
          (error) => {
            console.error("Error fetching data", error);
          },
        );
    } else {
      const sellerId = this.getSellerId();
      this.fetchSellerWiseTotalInventoryCounts();
      this.fetchAndProcessChartData(sellerId);
      this.getDashboardStatisticsForrStockOfTopBrands(sellerId);
      this.getDashboardStatisticsForrStockOfTopBrandsForLeastStocks(sellerId);
      this.getInventoryStaticstForProductType(sellerId);
      this.fetchAndProcessInventoryChartData();
      this.fetchAndProcessProductTypeChartData();
      this.searchByDateAndDays("");
      this.getStoreDetails();
    }
  }

  getQuickLinks(): any[] {
    if (this.isSuperAdmin || this.isPremisesUser) {
      return [
        {
          label: "Sellers",
          description: "Manage and oversee sellers",
          route: "/master/seller",
          icon: "heroicons_outline:user-group",
          tone: "indigo",
        },
        {
          label: "Users",
          description: "Manage premises users",
          route: "/master/user",
          icon: "heroicons_outline:users",
          tone: "violet",
        },
        {
          label: "Plans",
          description: "Manage subscription plans",
          route: "/master/manage-plan",
          icon: "heroicons_outline:credit-card",
          tone: "emerald",
        },
        {
          label: "System Logs",
          description: "View application system logs",
          route: "/master/system-logs",
          icon: "heroicons_outline:document-text",
          tone: "amber",
        },
      ];
    } else {
      return [
        {
          label: "My Catalog",
          description: "Manage products and quantities",
          route: "/master/master-catalog",
          icon: "heroicons_outline:archive",
          tone: "indigo",
        },
        {
          label: "Amazon Inventory",
          description: "View and sync Amazon catalog",
          route: "/master/amazon-inventory",
          icon: "heroicons_outline:cube",
          tone: "violet",
        },

        {
          label: "Compliance",
          description: "Amazon policy & compliance",
          route: "/master/amazon/compliance/",
          icon: "heroicons_outline:shield-check",
          tone: "amber",
        },
        {
          label: "Banned Items",
          description: "Manage banned ASINs and keywords",
          route: "/master/amazon/compliance/banned-items",
          icon: "heroicons_outline:ban",
          tone: "amber",
        },
        {
          label: "File Uploads",
          description: "View uploaded files and reports",
          route: "/master/uploaded-files",
          icon: "heroicons_outline:document-report",
          tone: "emerald",
        },
        {
          label: "Tag Settings",
          description: "Configure inventory item tags",
          route: "/master/tag-setting",
          icon: "heroicons_outline:tag",
          tone: "purple",
        },
        {
          label: "Support & FAQs",
          description: "Get support & quick assistance",
          route: "/master/support/tickets",
          icon: "heroicons_outline:support",
          tone: "rose",
        },
      ];
    }
  }

  getComplianceScorePercentage(): number {
    const total =
      this.totalSellerWiseInventoryCounts?.sellerWiseInventoryCount || 0;
    const banned =
      this.totalSellerWiseInventoryCounts?.bannedProductsCount || 0;
    if (total === 0) return 100;
    const compliantCount = Math.max(0, total - banned);
    return Math.round((compliantCount / total) * 100);
  }

  getNeedsAttention(): any[] {
    const list = [];
    if (this.isDeveloper && !this.isSuperAdmin && !this.isPremisesUser) {
      return list;
    }
    if (!this.isSuperAdmin && !this.isPremisesUser) {
      if (this.totalSellerWiseInventoryCounts?.bannedProductsCount > 0) {
        list.push({
          count: this.totalSellerWiseInventoryCounts.bannedProductsCount,
          label: "banned products requiring compliance review",
          route: "/master/amazon/compliance/banned-items",
        });
      }
      if (this.totalSellerWiseInventoryCounts?.outOFStockInventory > 0) {
        list.push({
          count: this.totalSellerWiseInventoryCounts.outOFStockInventory,
          label: "products out of stock",
        });
      }
      if (!this.isCustomerAuthorized) {
        list.push({
          count: 1,
          label: "store not authorized on Amazon",
        });
      }
    } else {
      const unauthorizedSellers =
        this.sellers?.filter(
          (seller: any) =>
            !seller?.seller_stores?.some(
              (store) => store?.is_amazon_authorized,
            ),
        )?.length ?? 0;
      if (unauthorizedSellers > 0) {
        list.push({
          count: unauthorizedSellers,
          label: "sellers have unauthorized stores",
        });
      }
    }
    return list;
  }

  formatNumber(value?: number): string {
    return Number(value || 0).toLocaleString("en-IN");
  }

  initials(): string {
    return this.getInitials();
  }
  mergeProductData(productType: string): number[] {
    const data = {
      retail: {
        Electronics: 0,
        Clothing: 0,
        Books: 0,
        Toys: 0,
        "Home Appliances": 0,
        Grocery: 150,
        Beauty: 0,
        Sports: 0,
        Automotive: 0,
        Food: 0,
        Books1: 0,
        Health: 0,
        Furniture: 0,
        Jewelry: 0,
        Pets: 0,
      },
      "white-label": {
        Electronics: 0,
        Clothing: 0,
        Books: 0,
        Toys: 0,
        "Home Appliances": 0,
        Grocery: 0,
        Beauty: 0,
        Sports: 0,
        Automotive: 0,
        Food: 0,
        Books1: 0,
        Health: 0,
        Furniture: 0,
        Jewelry: 0,
        Pets: 0,
      },
    };

    // Get the appropriate product data based on the productType (retail or white-label)
    const productData =
      data && productType && data[productType] ? data[productType] : {};

    // Get all product types (categories) for consistency in both series
    const categories = [
      "Electronics",
      "Clothing",
      "Books",
      "Toys",
      "Home Appliances",
      "Grocery",
      "Beauty",
      "Sports",
      "Automotive",
      "Food",
      "Books",
      "Health",
      "Furniture",
      "Jewelry",
      "Pets",
      "Books1",
    ];

    // Map the product data to match the order of categories and default to 0 if the product doesn't exist
    return categories.map((category) => productData[category] || 0);
  }
  getDashboardStatistics(): any {
    return this._dashboardService
      .getDashboardStatistics()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (payload: any) => {
          this.isLoading = false;
          const sellers = Array.isArray(payload?.data?.sellers)
            ? payload.data.sellers
            : [];
          this.sellers = sellers.slice(0, 4);

          this.numberOfSellers = payload?.data?.totalSellers ?? sellers.length;
          this.authorizedSeller =
            payload?.data?.authorizedSeller ??
            sellers.filter((seller: any) =>
              seller?.seller_stores?.some(
                (store) => store?.is_amazon_authorized,
              ),
            )?.length ??
            0;

          this.activeSellers = payload?.data?.activeSellers ?? 0;
          this.totalStoreCount = payload?.data?.totalStoreCount ?? 0;
          this.activeSubscriptionsCount =
            payload?.data?.activeSubscriptionsCount ?? 0;

          this.amazonAuthorizedPercentage = this.calculatePercentage(
            this.authorizedSeller,
          );

          this._changeDetectorRef.markForCheck();
        },
        error: ({ error }) => {
          this.sellers = [];
        },
      });
  }

  getInventoryStaticstForProductType(seller_id: string): any {
    return this._dashboardService
      .getSellerInventoryStatisticforProductType(seller_id)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (payload: any) => {
          const productData = Array.isArray(payload?.data) ? payload.data : [];

          // Sort productData descending by total stock (sum of all numeric keys)
          productData.sort((a: any, b: any) => {
            const sumA = Object.keys(a)
              .filter((k) => k !== "product_type")
              .reduce((acc, k) => acc + (Number(a[k]) || 0), 0);
            const sumB = Object.keys(b)
              .filter((k) => k !== "product_type")
              .reduce((acc, k) => acc + (Number(b[k]) || 0), 0);
            return sumB - sumA;
          });

          const categories = productData.map((item: any) => {
            const val = item?.product_type ?? "Unknown";
            return val
              .replace(/_/g, " ")
              .toLowerCase()
              .replace(/\b\w/g, (c: string) => c.toUpperCase());
          });

          const firstItem = productData[0] ?? {};

          const series = Object.keys(firstItem)
            .filter((key) => key !== "product_type")
            .map((key) => ({
              name: key
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (c: string) => c.toUpperCase()),
              data: productData.map((item: any) => item?.[key] ?? 0),
            }));

          // Flag to check if there is data
          this.hasProductCategoryData = productData.length > 0;

          this.chartOptions8 = {
            ...this.chartOptions8,
            series,
            xaxis: {
              ...this.chartOptions8?.xaxis,
              categories,
            },
          };

          this.isLoadingBrandsBarChart3 = false;
          this._changeDetectorRef.markForCheck();
        },
        error: ({ error }) => {
          console.log("error: ", error);
          this.isLoadingBrandsBarChart3 = false;
          this.hasProductCategoryData = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  getDashboardStatisticsForrStockOfTopBrands(seller_id: string): any {
    return this._dashboardService
      .getSellerInventoryStatisticForBrandsStock(seller_id)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (payload: any) => {
          this.isLoadingBrandsBarChart = true;
          this.topBrandsList = Array.isArray(payload.data) ? payload.data : [];

          const brands = this.topBrandsList.map((item: any) => item.brand);
          const stockCounts = this.topBrandsList.map(
            (item: any) => item.totalStock,
          );

          // // Update the chart options
          this.chartOptions6.series[0] = { data: [] };
          this.chartOptions6.series[0].data = [...(stockCounts || [])];
          this.chartOptions6.xaxis.categories = [...(brands || [])];
          this.chartOptions6.colors = ["#0EA5E9"]; // Sky-500 premium
          this.isLoadingBrandsBarChart = false;
          this._changeDetectorRef.markForCheck();
        },
        error: ({ error }) => {
          console.log("error: ", error);
        },
      });
  }
  getDashboardStatisticsForrStockOfTopBrandsForLeastStocks(
    seller_id: string,
  ): any {
    return this._dashboardService
      .getSellerInventoryStatisticForBrandsStockWithLeastStock(seller_id)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (payload: any) => {
          this.isLoadingBrandsBarChart2 = true;
          this.leastBrandsList = Array.isArray(payload.data)
            ? payload.data
            : [];

          const brands = this.leastBrandsList.map((item: any) => item.brand);
          const stockCounts = this.leastBrandsList.map(
            (item: any) => item.totalStock,
          );

          // // Update the chart options
          this.chartOptions7.series[0] = { data: [] };
          this.chartOptions7.series[0].data = [...(stockCounts || [])];
          this.chartOptions7.xaxis.categories = [...(brands || [])];
          this.chartOptions7.colors = ["#7DD3FC"]; // Sky-300 for contrast
          this.isLoadingBrandsBarChart2 = false;
          this._changeDetectorRef.markForCheck();
        },
        error: ({ error }) => {
          console.log("error: ", error);
        },
      });
  }

  getMaxStock(list: any[]): number {
    if (!list || list.length === 0) return 1;
    return Math.max(...list.map((item) => item.totalStock || 0), 1);
  }

  // Calculate the percentage
  calculatePercentage(count: number): number {
    const totalCount = this.numberOfSellers;
    if (totalCount === 0) {
      return 0; // Avoid division by zero
    }
    return (count / totalCount) * 100;
  }

  /**
   * The function `handleQueryParams` checks the query parameters and performs different actions based
   * on the presence of certain parameters.
   */
  handleQueryParams(params: any): any {
    if (Object.keys(params).length > 0) {
      if (params.spapi_oauth_code) {
        this.handleSpapiOauthCode(params);
      }
    } else {
      this.getCustomerAuthData();
    }
    this.getStoreDetails();
  }

  // Get customer's auth data from localstorage is customer not authorized with any marketplace then auto redirect to /authorization-workflow page
  getCustomerAuthData(): any {
    if (this.sellerInfo) {
      // this.isCustomerAuthorized = this.sellerInfo?.customer_Stores.filter(x => x.is_amazon_authorized === true).length > 0 ? true : false;;
      if (this.sellerInfo === null || !this.isCustomerAuthorized) {
        // this._router.navigate(['/authorization-workflow']);
      }
      this.sellerStores = this.sellerInfo.seller_Stores;
      // this.initForm();
    } else {
      // this._router.navigate(['/authorization-workflow']);
    }
  }

  handleSpapiOauthCode(params: any): any {
    this.isLoading = true;
    this._amazonService
      .exchangeLWAAuthorizationCode({
        selling_partner_id: params.selling_partner_id,
        spapi_oauth_code: params.spapi_oauth_code,
      })
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: ({ data }) => {
          this.isLoading = false;
          this.updateAuthData(data);
          this._changeDetectorRef.markForCheck();
          this.getStoreDetails();
        },
        error: ({ error }) => {
          this.isCustomerAuthorized = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  updateAuthData(updatedData: any): any {
    this.sellerInfo = { ...this.sellerInfo, ...updatedData };
    this._userSessionService.setCurrentUser(this.sellerInfo);
    this.getCustomerAuthData();
  }

  // Form initiate
  initForm(): any {
    this.selectedMarketPlace =
      this._localService.getItem("selected-marketplace") ||
      (this.sellerStores && this.sellerStores.length > 0
        ? this.sellerStores[0].marketplace_id
        : "");
    this.form = this.fb.group({
      selectedMarketplace: [this.selectedMarketPlace],
    });

    if (this._localService.getItem("selected-marketplace") === undefined) {
      this.form
        .get("selectedMarketplace")
        .setValue(
          this.sellerStores && this.sellerStores.length > 0
            ? this.sellerStores[0].marketplace_id
            : "",
        );
      this._localService.setItem(
        "selected-marketplace",
        this.form.get("selectedMarketplace").value,
      );
    } else {
      this.form
        .get("selectedMarketplace")
        .setValue(this._localService.getItem("selected-marketplace"));
    }
  }

  getStoreDetails(): void {
    const sellerId = this.getSellerId();
    // Get the store details by seller ID
    this._dashboardService
      .getAllStoreDetailsBySeller(sellerId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response: any) => {
        if (response.status === 200) {
          if (
            response?.data &&
            Array.isArray(response.data) &&
            response.data.length
          ) {
            // Check if any store has is_amazon_authorized = true
            this.isCustomerAuthorized = response?.data?.some(
              (portal: any) => portal.is_amazon_authorized,
            );
            // Map the response data to fit your display structure
            this.storeDetailsList = response.data.map((portal: any) => ({
              _id: portal._id,
              marketplace: portal.marketplace, // Use marketplace as the portal name
              aws_region: portal.aws_region, // Display region
              seller_central_url: portal.seller_central_url,
              marketplace_id: portal.marketplace_id,
              seller_id: portal.seller_id,
              is_amazon_authorized: portal.is_amazon_authorized,
              countryName: this.getMarketplaceName(portal.marketplace_id),
            }));
          }
        }
      });
  }

  getMarketplaceName(marketplaceId: string): string {
    const marketplace = this.allMarketplaces.find(
      (m) => m.id === marketplaceId,
    );
    return marketplace ? marketplace.countryName : "-";
  }

  // Store the selected marketplace in local storage
  onStoreSelect(store: any): void {
    this.selectedMarketplaceId = store.marketplace_id;
    localStorage.setItem("selected-marketplace", store.marketplace_id);
  }

  fetchSellerWiseTotalInventoryCounts(): void {
    const sellerId = this.getSellerId();
    this.isLoadingBrandsBarChart5 = true;
    this.isLoadingSellerWiseInventoryCount = true;
    this._dashboardService
      .getSellerInventoryDashboardData(sellerId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        (response: any) => {
          this.totalSellerWiseInventoryCounts = response.data;
          this.chartOptions5.series = [
            {
              name: "Products",
              data: [
                this.totalSellerWiseInventoryCounts.inStockInventory,
                this.totalSellerWiseInventoryCounts.outOFStockInventory,
              ],
            },
          ];
          this.chartOptions5.colors = ["#EAB308", "#F59E0B"]; // Yellow-Gold
          this.chartOptions5.xaxis = {
            categories: ["In Stock", "Out of Stock"],
          };
          this.isLoadingBrandsBarChart5 = false;
          this.isLoadingSellerWiseInventoryCount = false;
        },

        (error) => {
          this.isLoadingSellerWiseInventoryCount = false;
          this.isLoadingBrandsBarChart5 = false;
        },
      );
  }

  // Start
  fetchAndProcessChartData(sellerId: string): void {
    this.isFullfilmentLoading = true;
    this._dashboardService
      .getFullfillmentData(sellerId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response) => {
          const fullfillmentData = response.data;
          this.processChartData(fullfillmentData);
          this.isFullfilmentLoading = false;
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          console.error("Error fetching fulfillment data:", err);
          // Handle errors by setting default chart data
          this.processChartData([]);
          this.isFullfilmentLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  processChartData(fullfillmentData: any[]): void {
    const labels = ["FBM", "FBA"]; // Categories for bar chart
    const seriesData = [0, 0]; // Initialize counts for FBM and FBA

    // Check if fullfillmentData is valid
    if (fullfillmentData && fullfillmentData.length > 0) {
      // Iterate through the fulfillment data and update seriesData
      fullfillmentData.forEach((item) => {
        // Normalize fulfillmentType for comparison (to handle case and space mismatches)
        const fulfillmentType = item.fulfillmentType.trim().toUpperCase();
        const index = labels.indexOf(fulfillmentType);

        if (index > -1) {
          seriesData[index] = Number(item.count);
        }
      });
    }

    this.fulfillmentCounts = {
      FBM: seriesData[0],
      FBA: seriesData[1],
    };

    // Flag: has real non-zero data
    this.hasFullfillmentData = seriesData.some((v) => v > 0);

    // Update chart options with the populated data for bar chart
    this.chartOptions.series = [
      {
        name: "Count",
        data: seriesData,
      },
    ];
    this.chartOptions.xaxis = {
      categories: labels,
    };
    this.chartOptions.colors = ["#EF4444", "#F97316"]; // Red-Orange
  }
  //end

  getFulfillmentPercentage(type: "FBM" | "FBA"): number {
    const total = this.fulfillmentCounts.FBM + this.fulfillmentCounts.FBA;
    if (total === 0) return 0;
    return Math.round((this.fulfillmentCounts[type] / total) * 100);
  }

  getHealthyStockPercentage(): number {
    const inStock = this.totalSellerWiseInventoryCounts?.inStockInventory || 0;
    const total =
      this.totalSellerWiseInventoryCounts?.sellerWiseInventoryCount || 0;
    if (total === 0) return 0;
    return Math.round((inStock / total) * 100);
  }

  getCatalogHealthScore(): number {
    const total =
      this.totalSellerWiseInventoryCounts?.sellerWiseInventoryCount || 0;
    if (total === 0) return 100;
    const inStock = this.totalSellerWiseInventoryCounts?.inStockInventory || 0;
    const banned =
      this.totalSellerWiseInventoryCounts?.bannedProductsCount || 0;
    const score = Math.max(
      0,
      Math.min(100, Math.round(((inStock - banned * 2) / total) * 100)),
    );
    return score;
  }

  getActiveListingPercentage(): number {
    const total =
      this.totalSellerWiseInventoryCounts?.sellerWiseInventoryCount || 0;
    const active = this.totalSellerWiseInventoryCounts?.activeInventory || 0;
    if (total === 0) return 0;
    return Math.round((active / total) * 100);
  }

  triggerLiveSync(): void {
    if (this.isSyncingInventory) return;
    this.isSyncingInventory = true;
    const sellerId = this.getSellerId();
    this.fetchSellerWiseTotalInventoryCounts();
    this.fetchAndProcessChartData(sellerId);
    setTimeout(() => {
      this.isSyncingInventory = false;
      this._changeDetectorRef.markForCheck();
    }, 1200);
  }

  getSubscriptionConversionRate(): number {
    if (!this.numberOfSellers || this.numberOfSellers === 0) return 0;
    return Math.round(
      ((this.activeSubscriptionsCount || 0) / this.numberOfSellers) * 100,
    );
  }

  getActiveSellerPercentage(): number {
    if (!this.numberOfSellers || this.numberOfSellers === 0) return 0;
    return Math.round(((this.activeSellers || 0) / this.numberOfSellers) * 100);
  }

  getPlatformHealthScore(): number {
    if (!this.numberOfSellers || this.numberOfSellers === 0) return 100;
    const authRate = this.amazonAuthorizedPercentage || 0;
    const activeRate = this.getActiveSellerPercentage();
    const subRate = this.getSubscriptionConversionRate();
    return Math.round(authRate * 0.4 + activeRate * 0.4 + subRate * 0.2);
  }

  getTopSellersFromCount(): any[] {
    if (!Array.isArray(this.sellerInventoryCount)) return [];
    return [...this.sellerInventoryCount]
      .sort((a, b) => (b.totalCount || 0) - (a.totalCount || 0))
      .slice(0, 5);
  }

  getMaxSellerStock(list: any[]): number {
    if (!list || list.length === 0) return 1;
    return Math.max(...list.map((item) => item.totalCount || 0), 1);
  }

  getSellerDisplayName(item: any): string {
    if (!item) return "Seller Account";
    const name = item.sellerName?.trim();
    if (name && name.length > 0) return name;
    if (item.first_name || item.last_name) {
      const combined =
        `${item.first_name || ""} ${item.last_name || ""}`.trim();
      if (combined.length > 0) return combined;
    }
    return item.sellerId
      ? `Seller #${String(item.sellerId).substring(0, 6)}`
      : "Seller Account";
  }

  fetchAndProcessProductTypeChartData(): void {
    this.isLoadingProductTypeChartData = true;
    const sellerId = this.getSellerId();

    this._dashboardService
      .getProductTypeData(sellerId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response) => {
          const productTypeData = response?.data || {};

          this.processProductTypeChartData(productTypeData);
        },
        error: (err) => {
          console.error("Error fetching product type data:", err);

          this.processProductTypeChartData([]);
        },
      });
  }

  processProductTypeChartData(productTypeData: any[]): void {
    const labels = ["retail", "white label"]; // Categories for pie chart
    const seriesData = [0, 0]; // Initialize counts for retail and white label

    if (productTypeData && productTypeData.length > 0) {
      productTypeData.forEach((item) => {
        const productType = item?.productType
          ? item.productType.trim().toLowerCase().replace("_", " ")
          : "";
        const index = labels.indexOf(productType);
        if (index > -1) {
          seriesData[index] = Number(item.count);
        }
      });
    } else {
      seriesData[0] = 0;
      seriesData[1] = 0;
    }

    // Flag: has real non-zero data
    this.hasProductTypeData = seriesData.some((v) => v > 0);

    // Update chart options with distinct Hot Pink & Golden Amber colors (no cyan overlap)
    this.chartOptions2.series = seriesData;
    this.chartOptions2.labels = labels;
    this.chartOptions2.colors = ["#ec4899", "#f59e0b"]; // Hot Pink & Golden Amber

    // Set isLoading to false once data is processed
    this.isLoadingProductTypeChartData = false;
  }

  // start
  fetchAndProcessInventoryChartData(): void {
    this.isLoadingMarketplaceChart = true;
    const sellerId = this.getSellerId();
    // Call the API to get fulfillment data
    this._dashboardService
      .getSellerInventoryData(sellerId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response) => {
          const inventoryData = response?.data ?? []; // Renamed from marketplaceWiseData to inventoryData

          // Pass the fetched data to the processChartData method
          this.processInventoryChartData(inventoryData);
          this.isLoadingMarketplaceChart = false;
        },
        error: (err) => {
          console.error("Error fetching fulfillment data:", err);

          // Handle errors by setting default chart data
          this.processInventoryChartData({});
          this.isLoadingMarketplaceChart = false;
        },
      });
  }

  processInventoryChartData(inventoryData: any): void {
    const categories = Object.keys(inventoryData);
    const values = categories.map((category) => inventoryData[category] || 0);

    this.hasMarketplaceData =
      categories.length > 0 && values.some((v) => v > 0);

    const formattedLabels = categories.map(
      (category) => category.charAt(0).toUpperCase() + category.slice(1),
    );

    this.chartOptions3.series = [
      {
        name: "Inventory Count",
        data: values,
      },
    ];
    if (!this.chartOptions3.xaxis) {
      this.chartOptions3.xaxis = {};
    }
    this.chartOptions3.xaxis.categories = formattedLabels;
    this.chartOptions3.labels = formattedLabels;
    this._changeDetectorRef.markForCheck();
  }

  // Function to generate random color in HEX format
  generateRandomColor = (): string => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };
  // end

  // start
  processWeeklySellerInventoryChartData(
    inventory: any[],
    seriesFields: string[],
  ): void {
    // Check if inventory is defined and not empty
    if (inventory && inventory.length > 0) {
      // Initialize arrays for each day of the week
      const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      // Create an object to store the counts for each series field
      const inventoryCountsByDay: { [key: string]: { [day: string]: number } } =
        {};

      // Initialize the inventoryCountsByDay object with empty counts for each series field
      seriesFields.forEach((field) => {
        inventoryCountsByDay[field] = {};
        daysOfWeek.forEach((day) => {
          inventoryCountsByDay[field][day] = 0;
        });
      });

      // Loop through the inventory to populate inventoryCountsByDay
      inventory.forEach((data) => {
        const inventoryDate = new Date(data.date);
        const dayOfWeek = daysOfWeek[inventoryDate.getDay()]; // Get the day of the week

        // Loop through each series field and increment the count for the corresponding day
        seriesFields.forEach((field) => {
          if (data[field] !== undefined) {
            inventoryCountsByDay[field][dayOfWeek] += data[field];
          }
        });
      });

      // Prepare the data for the chart
      const seriesData = seriesFields.map((field) => ({
        name: field,
        data: daysOfWeek.map((day) => inventoryCountsByDay[field][day] || 0),
      }));

      // Update the chartOptions4 series with the new data
      this.chartOptions4.series = seriesData;
      this.chartOptions4.xaxis.categories = daysOfWeek;

      // Mark for check to update the chart in the template
      this._changeDetectorRef.markForCheck();
    }
  }

  // Assuming you have a FormControl for startDate
  onDateChangeForBarChart(): void {
    this.searchQry = {};

    if (this.startDate.value) {
      // If the input is not empty, update the search value
      const tmpStart = new Date(this.startDate.value);
      this.searchQry["startDate"] = tmpStart;
    } else {
      // If the input is empty, set the value to the current date
      const currentDate = new Date();
      this.startDate.setValue(currentDate);
      this._changeDetectorRef.markForCheck();
    }

    //this.searchByDateAndDays();
  }

  clearDate(): void {
    this.range.reset();
    this.searchByDateAndDays("");
    this._changeDetectorRef.markForCheck();
  }

  endDateSelection(): void {
    // Set chartData to an empty array to show a blank chart
    this.chartData = [];

    const startDateVal = this.range.controls["startDate"].value;
    const endDateVal = this.range.controls["endDate"].value;

    if (!startDateVal && !endDateVal) {
      this.searchByDateAndDays("");
      return;
    }

    let start: Date;
    if (startDateVal) {
      start = new Date(startDateVal);
    } else {
      // If no start date is provided, set it to the start of the current week
      start = new Date();
      start.setDate(start.getDate() - start.getDay()); // Move to the start of the week
    }

    let end: Date;
    if (endDateVal) {
      end = new Date(endDateVal);
    } else {
      // Calculate the end date as one week from the start date if not selected
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    }

    this.range.controls["startDate"].setValue(start, { emitEvent: false });
    this.range.controls["endDate"].setValue(end, { emitEvent: false });

    const sandeDate: string = start.toDateString() + " - " + end.toDateString();
    if (sandeDate) {
      this.isLoadBarChart = true;
      this.searchByDateAndDays(sandeDate);
    } else {
      this.isLoadBarChart = false;
    }
  }

  searchByDateAndDays(sandeDate: any): any {
    const sellerId = this.getSellerId();
    return this._dashboardService
      .getWeeklySellerInventoryData(sandeDate, sellerId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        (response) => {
          const inventory = Array.isArray(response?.data) ? response.data : [];
          this.inventoryData = inventory;

          // Safely extract keys from the first inventory item (if any), excluding 'date'
          const seriesFields =
            inventory.length > 0
              ? Object.keys(inventory[0] ?? {}).filter((key) => key !== "date")
              : [];

          // Process the data and populate the chart with dynamic seriesFields
          this.processWeeklySellerInventoryChartData(inventory, seriesFields);
          this._changeDetectorRef.markForCheck();
        },
        (error) => {
          this.isLoadBarChart = false;
          console.error("Error fetching data:", error);
        },
      );
  }

  private _prepareChartData(): void {
    const sellerNames = Array.isArray(this.sellerInventoryCount)
      ? this.sellerInventoryCount.map((item: any) => item?.sellerName ?? "")
      : [];

    const totalCounts = Array.isArray(this.sellerInventoryCount)
      ? this.sellerInventoryCount.map((item: any) => item?.totalCount ?? 0)
      : [];

    // Sellers Overview Line & Column Combo Chart (matching Image 3)
    this.chartVisitors = {
      series: [
        {
          name: "Inventory Volume",
          type: "column",
          data: totalCounts,
        },
        {
          name: "Trend Curve",
          type: "line",
          data: totalCounts,
        },
      ],
      chart: {
        type: "line",
        height: 220,
        toolbar: { show: false },
        fontFamily: "inherit",
        zoom: { enabled: false },
      },
      colors: ["#0d9488", "#f97316"], // Teal columns + Coral-Orange trend line (No Purple, Pink, or Blue)
      stroke: {
        width: [0, 3],
        curve: "smooth",
      },
      plotOptions: {
        bar: {
          columnWidth: "25%",
          borderRadius: 6,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: {
        enabled: true,
        enabledOnSeries: [1],
        style: {
          fontSize: "11px",
          fontWeight: "bold",
          colors: ["#c2410c"],
        },
      },
      fill: {
        opacity: [0.85, 1],
      },
      grid: {
        borderColor: "#e5e7eb",
        strokeDashArray: 4,
      },
      xaxis: {
        categories: sellerNames,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: {
            colors: "#64748b",
            fontSize: "12px",
            fontWeight: "600",
          },
        },
      },
      yaxis: {
        labels: {
          style: { colors: "#64748b" },
          formatter: (value: number): string => `${Math.round(value)}`,
        },
      },
      tooltip: { theme: "light" },
    };

    // Top Inventory Sellers Radar Chart (Vibrant Rose Theme & Large Size)
    const topSellers = this.getTopSellersFromCount();
    this.chartTopSellers = {
      series: [
        {
          name: "Inventory Count",
          data: topSellers.map((item: any) => item?.totalCount ?? 0),
        },
      ],
      chart: {
        type: "radar",
        height: 310,
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: ["#db2777"], // Rose-600 vibrant distinct color
      stroke: { width: 3 },
      markers: { size: 5 },
      fill: { opacity: 0.45 },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: "11px",
          fontWeight: "bold",
          colors: ["#9d174d"],
        },
      },
      plotOptions: {
        radar: {
          size: 110,
          polygons: {
            strokeColors: "#cbd5e1",
            strokeWidth: "1",
            connectorColors: "#cbd5e1",
            fill: {
              colors: ["#f8fafc", "#ffffff"],
            },
          },
        },
      },
      xaxis: {
        categories: topSellers.map((item: any) =>
          this.getSellerDisplayName(item),
        ),
        labels: {
          style: { colors: ["#1e293b"], fontSize: "11px", fontWeight: "700" },
          formatter: (val: string): string => {
            if (!val) return "";
            return val.length > 16 ? val.substring(0, 14) + "..." : val;
          },
        },
      },
      yaxis: { show: false },
    };
  }
  transformAvatarUrl(profileImgUrl: string): string {
    if (!profileImgUrl) {
      return profileImgUrl;
    }
    // Replace green background color with primary color
    return profileImgUrl.replace(/background=084f08/gi, "background=1e3a8a");
  }

  onChartLoaded(): void {
    // Called when the fulfillment chart finishes rendering
    this._changeDetectorRef.markForCheck();
  }

  onAvatarLoad(): void {
    this.imageLoaded = true;
    this._changeDetectorRef.markForCheck();
  }

  getInitials(): string {
    const first = this.sellerInfo?.first_name?.charAt(0) || "";
    const last = this.sellerInfo?.last_name?.charAt(0) || "";
    return (first + last).toUpperCase();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    if (tab === "cron_logs") {
      this.fetchCronLogs();
    } else if (tab === "file_upload") {
      this.fetchFileUploadLogs();
    }
    this._changeDetectorRef.markForCheck();
  }

  fetchFileUploadLogs(): void {
    this.isLoadingFileUpload = true;
    this._changeDetectorRef.markForCheck();

    const [sortKey, sortOrder] = this.fileUploadSortBy.split(":");
    const filter: any = {};
    const sellerId = this.getSellerId();
    if (sellerId) {
      filter.seller_id = sellerId;
    }
    if (this.fileUploadStatus && this.fileUploadStatus !== "all") {
      filter.process_status = this.fileUploadStatus;
    }

    this._uploadedFilesService
      .getUploadedFiles(
        this.fileUploadPage,
        this.fileUploadLimit,
        sortKey || "createdAt",
        sortOrder || "desc",
        this.fileUploadSearch,
        filter,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response: any) => {
          this.isLoadingFileUpload = false;
          if (
            response &&
            (response.status === 200 || response.status === 201)
          ) {
            const dataObj = response.data || response;
            this.fileUploadLogs = dataObj.results || response.results || [];
            const paginationData = dataObj.pagination || response.pagination;
            if (paginationData) {
              this.fileUploadTotalResults = paginationData.length || 0;
              this.fileUploadTotalPages = paginationData.lastPage || 1;
            }
          } else {
            this.fileUploadLogs = [];
            this.fileUploadTotalResults = 0;
            this.fileUploadTotalPages = 1;
          }
          this._changeDetectorRef.markForCheck();
        },
        error: (err: any) => {
          this.isLoadingFileUpload = false;
          this.fileUploadLogs = [];
          this.fileUploadTotalResults = 0;
          this.fileUploadTotalPages = 1;
          console.error("Error fetching file upload logs:", err);
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  refreshFileUploadLogs(): void {
    if (this.fileUploadSearchControl) {
      this.fileUploadSearchControl.setValue("", { emitEvent: false });
    }
    this.fileUploadSearch = "";
    this.fileUploadStatus = "all";
    this.fileUploadPage = 1;
    this.fetchFileUploadLogs();
  }

  onFileUploadStatusFilterChange(status: string): void {
    this.fileUploadStatus = status;
    this.fileUploadPage = 1;
    this.fetchFileUploadLogs();
  }

  onFileUploadPageChange(event: any): void {
    if (event && typeof event.pageIndex === "number") {
      this.fileUploadPage = event.pageIndex + 1;
      this.fileUploadLimit = event.pageSize || this.fileUploadLimit;
    } else if (typeof event === "number") {
      if (event < 1 || event > this.fileUploadTotalPages) return;
      this.fileUploadPage = event;
    }
    this.fetchFileUploadLogs();
  }

  calculateProgressPercentage(log: UploadedFileItem): number {
    if (log.process_status === "COMPLETED") return 100;
    if (log.process_status === "FAILED") return 0;
    const total = log.total_record || 0;
    const processed = log.processed_records || 0;
    if (total === 0) return 0;
    return Math.min(Math.round((processed / total) * 100), 99);
  }

  fetchCronLogs(): void {
    this.isLoadingCron = true;
    this._changeDetectorRef.markForCheck();

    const params: any = {
      page: this.cronPage.toString(),
      limit: this.cronLimit.toString(),
    };

    if (this.cronSearch && this.cronSearch.trim()) {
      params.search = this.cronSearch.trim();
    }
    if (this.cronStatus && this.cronStatus !== "all") {
      params.status = this.cronStatus;
    }
    if (this.cronTimeFilter && this.cronTimeFilter !== "all") {
      params.cronTime = this.cronTimeFilter;
    }
    if (
      this.cronStartDateControl.value &&
      this.cronStartDateControl.value !== "" &&
      this.cronEndDateControl.value &&
      this.cronEndDateControl.value !== ""
    ) {
      const tmpStart = new Date(this.cronStartDateControl.value);
      tmpStart.setHours(0, 0, 0, 0);
      const tmpEnd = new Date(this.cronEndDateControl.value);
      tmpEnd.setHours(23, 59, 59, 999);
      params.startDate = tmpStart.toISOString();
      params.endDate = tmpEnd.toISOString();
    }
    if (this.cronSortBy) {
      params.sortBy = this.cronSortBy;
    }

    this._dashboardService
      .getCronLogs(params)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response: any) => {
          this.isLoadingCron = false;
          if (response.status === 200 && response.data) {
            this.cronLogs = response.data.results || [];
            this.cronTotalResults = response.data.totalResults || 0;
            this.cronTotalPages =
              response.data.totalPages ||
              Math.ceil(this.cronTotalResults / this.cronLimit) ||
              1;
          } else {
            this.cronLogs = [];
            this.cronTotalResults = 0;
            this.cronTotalPages = 1;
          }
          this._changeDetectorRef.markForCheck();
        },
        error: (error) => {
          this.isLoadingCron = false;
          this.cronLogs = [];
          this.cronTotalResults = 0;
          this.cronTotalPages = 1;
          console.error("Error fetching cron logs:", error);
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.cronSearch && this.cronSearch.trim()) count++;
    if (this.cronStatus && this.cronStatus !== "all") count++;
    if (this.cronTimeFilter && this.cronTimeFilter !== "all") count++;
    if (this.isCronResetDate) count++;
    return count;
  }

  onStatusFilterChange(status: string): void {
    this.cronStatus = status;
    this.cronPage = 1;
    this.fetchCronLogs();
  }

  onCronTimeFilterChange(time: string): void {
    this.cronTimeFilter = time;
    this.cronPage = 1;
    this.fetchCronLogs();
  }

  onCronDateClickFilter(): void {
    if (
      this.cronStartDateControl.value &&
      this.cronStartDateControl.value !== "" &&
      this.cronEndDateControl.value &&
      this.cronEndDateControl.value !== ""
    ) {
      this.isCronResetDate = true;
      this.cronPage = 1;
      this.fetchCronLogs();
    }
  }

  clearCronDate(): void {
    this.cronStartDateControl.setValue("");
    this.cronEndDateControl.setValue("");
    this.isCronResetDate = false;
    this.cronPage = 1;
    this.fetchCronLogs();
  }

  clearCronFilters(): void {
    this.cronSearch = "";
    this.cronSearchControl.setValue("", { emitEvent: false });
    this.cronStatus = "all";
    this.cronTimeFilter = "all";
    this.cronStartDateControl.setValue("");
    this.cronEndDateControl.setValue("");
    this.isCronResetDate = false;
    this.cronPage = 1;
    this.fetchCronLogs();
  }

  onCronSort(column: string): void {
    const currentKey = this.cronSortBy.split(":")[0];
    const currentOrder = this.cronSortBy.split(":")[1];
    if (currentKey === column) {
      this.cronSortBy = `${column}:${currentOrder === "asc" ? "desc" : "asc"}`;
    } else {
      this.cronSortBy = `${column}:desc`;
    }
    this.cronPage = 1;
    this.fetchCronLogs();
  }

  refreshCronLogs(): void {
    this.fetchCronLogs();
  }

  onCronPageChange(event: any): void {
    if (event && typeof event.pageIndex === "number") {
      this.cronPage = event.pageIndex + 1;
      this.cronLimit = event.pageSize || this.cronLimit;
    } else if (typeof event === "number") {
      if (event < 1 || event > this.cronTotalPages) return;
      this.cronPage = event;
    }
    this.fetchCronLogs();
  }

  getRelativeTime(dateInput: any): string {
    if (!dateInput) return "-";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "-";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }

  formatCronDate(dateInput: any): string {
    if (!dateInput) return "-";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || item?.title || index;
  }
}
