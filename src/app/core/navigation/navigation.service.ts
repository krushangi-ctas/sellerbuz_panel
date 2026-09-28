import { Injectable } from "@angular/core";
import { FuseNavigationItem } from "@fuse/components/navigation";
import { Navigation } from "app/core/navigation/navigation.types";
import {
  BehaviorSubject,
  filter,
  map,
  Observable,
  of,
  ReplaySubject,
} from "rxjs";
import { cloneDeep } from "lodash";
import { defaultNavigation } from "./navigation.data";
import { LocalStorageService } from "../local/local-storage.service";
import { UserSessionsService } from "../session/user-sessions.service";
import { RoleService } from "../manage-role/role.service";
import { SellerRoleService } from "../seller-role/seller-role.service";
import { NavigationEnd, Router } from "@angular/router";

@Injectable({
  providedIn: "root",
})
export class NavigationService {
  isSuperAdmin: boolean = false;
  isPremisesUser: boolean = false;
  isDeveloper: boolean = false;
  adminNavAllow = [
    "seller",
    "dashboard",
    "shop",
    "manage-seller",
    "manage-user",
    "admin-inventory",
    "system-log",
    "cron-management",
    "cron-logs",
    "manage-role",
    "seller-store",
    "route-acl",
    "admin-route-acl",
    "seller-route-acl",
    "features",
    "feature-meter",
    "manage-plan",
    "manage-contact",
    "coupon",
    "web-settings",
    "support",
    "support.tickets",
    "support.faqs",
    "support.quick-replies",
    "technical-document",
    "guide-documents",
    "guide-documents.admin",
    "guide-documents.viewer",
    "blogs",
  ];
  userNavAllow = [
    "dashboard",
    "authorization-workflow",
    "manage-seller-user",
    "manage-seller-role",
    "catalog",
    "catalog.my-catalog",
    "catalog-log",
    "general-setting",
    "amazon",
    "amazon.inventory",
    "orders",
    "compliance-setting",
    "compliance-rules",
    "banned-items",
    "amz-inv-log",
    "uploaded-files",
    "tag-setting",
    "system-log",
    "support",
    "support.tickets",
    "support.faqs",
    "support.quick-replies",
    "subscription",
    "guide-documents",
    "guide-documents.admin",
    "guide-documents.viewer",
  ];
  adminSectionMap: Record<string, string[]> = {
    dashboard: ["dashboard"],
    shop: ["shop"],
    seller: ["manage-seller"],
    user: ["manage-user"],
    roles: ["manage-role"],
    "seller store": ["seller-store"],
    "seller-store": ["seller-store"],
    plans: ["manage-plan"],
    contact: ["manage-contact"],
    coupons: ["coupon"],
    "website settings": ["web-settings"],
    "system log": ["system-log"],
    "cron management": ["cron-management", "cron-logs"],
    "cron-management": ["cron-management", "cron-logs"],
    "cron logs": ["cron-logs"],
    "cron-logs": ["cron-logs"],
    orders: ["orders"],

    "technical document": ["technical-document"],

    "guide document": [
      "guide-documents",
      "guide-documents.admin",
      "guide-documents.viewer",
    ],
    blogs: ["blogs"],
    blog: ["blogs"],

    support: [
      "support",
      "support.tickets",
      "support.faqs",
      "support.quick-replies",
    ],
    "support tickets": ["support", "support.tickets"],
    "support ticket": ["support", "support.tickets"],
    tickets: ["support", "support.tickets"],
    ticket: ["support", "support.tickets"],
    faqs: ["support", "support.faqs"],
    faq: ["support", "support.faqs"],
    "support faqs": ["support", "support.faqs"],
    "support faq": ["support", "support.faqs"],
    "quick replies": ["support", "support.quick-replies"],
    "quick reply": ["support", "support.quick-replies"],
    "support quick replies": ["support", "support.quick-replies"],
    "support quick reply": ["support", "support.quick-replies"],
  };
  sellerSectionMap: Record<string, string[]> = {
    dashboard: ["dashboard"],
    "my catalog": ["catalog", "catalog.my-catalog"],
    "catalog logs": ["catalog", "catalog-log"],
    "seller user": ["manage-seller-user"],
    "seller roles": ["manage-seller-role"],
    "authorization workflow": ["authorization-workflow"],
    amazon: ["amazon"],
    inventory: ["amazon"],
    orders: ["amazon", "orders"],
    "amazon orders": ["amazon", "orders"],
    "amazon compliance": ["amazon", "compliance-setting"],
    "banned items": ["amazon", "compliance-setting", "banned-items"],
    "amazon inv logs": ["amazon", "amz-inv-log"],
    "uploaded files": ["uploaded-files"],
    "tag setting": ["tag-setting"],
    "general setting": ["general-setting"],
    "system log": ["system-log"],
    support: [
      "support",
      "support.tickets",
      "support.faqs",
      "support.quick-replies",
    ],
    "support tickets": ["support", "support.tickets"],
    "support ticket": ["support", "support.tickets"],
    tickets: ["support", "support.tickets"],
    ticket: ["support", "support.tickets"],
    faqs: ["support", "support.faqs"],
    faq: ["support", "support.faqs"],
    "support faqs": ["support", "support.faqs"],
    "support faq": ["support", "support.faqs"],
    subscription: ["subscription"],
  };
  private readonly sellerRouteSectionMap: Record<string, string[]> = {
    "/dashboard": ["dashboard"],
    "/master/master-catalog": ["my catalog"],
    "/master/catalog-logs": ["my catalog", "catalog logs"],
    "/master/seller-user": ["seller user"],
    "/master/seller-role": ["seller roles"],
    "/authorization-workflow": ["authorization workflow"],
    "/master/amazon-inventory": ["inventory"],
    "/master/orders": ["orders", "amazon orders", "inventory", "amazon"],
    "/master/amazon/compliance": ["amazon compliance"],
    "/master/amazon/compliance/banned-items": [
      "amazon compliance",
      "banned items",
    ],
    "/master/amazon/amz-inv-logs": ["amazon inv logs"],
    "/master/uploaded-files": ["uploaded files"],
    "/master/tag-setting": ["tag setting"],
    "/master/general-setting": ["general setting"],
    "/master/system-logs": ["system log"],
    "/master/support/tickets": [
      "support tickets",
      "support ticket",
      "support",
      "tickets",
      "ticket",
      "customer support",
    ],
    "/master/support/faqs": [
      "support tickets",
      "support ticket",
      "support",
      "tickets",
      "ticket",
      "customer support",
    ],
    "/master/support/quick-replies": [
      "support tickets",
      "support ticket",
      "support",
      "tickets",
      "ticket",
      "customer support",
    ],
    "/master/subscription": ["subscription"],
  };
  private _navigation: ReplaySubject<Navigation> =
    new ReplaySubject<Navigation>(1);
  private _userNavigation: ReplaySubject<Navigation> =
    new ReplaySubject<Navigation>(1);
  private readonly _compactNavigation: FuseNavigationItem[] = defaultNavigation;
  private _defaultNavigation: FuseNavigationItem[] = defaultNavigation;
  private navigationItems: FuseNavigationItem[] = [];
  private _badges = new BehaviorSubject<any>(null);
  private userRole = new BehaviorSubject<any>(null);
  private roleData = new BehaviorSubject<any>(null);
  private adminRoleData = new BehaviorSubject<any>(null);
  private sellerRoleData = new BehaviorSubject<any>(null);
  private readonly fullSellerPermission = {
    view: true,
    add: true,
    update: true,
    delete: true,
  };

  constructor(
    private _localStorageService: LocalStorageService, // Inject your local service for user info
    private _userSessionService: UserSessionsService,
    private _roleService: RoleService,
    private _sellerRoleService: SellerRoleService,
    private _router: Router,
  ) {
    const currentUser = this._localStorageService.getItem("user");
    this.isSuperAdmin = currentUser?.isSuperAdmin ?? false;
    this.isPremisesUser = currentUser?.isPremisesUser ?? false;
    this.isDeveloper = currentUser?.isDeveloper ?? false;
    this._router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.get().subscribe();
      });
  }

  get badges$(): Observable<Navigation> {
    return this._badges.asObservable();
  }

  get userData(): Observable<any> {
    return this.userRole.asObservable();
  }
  get userRoleData(): Observable<any> {
    return this.roleData.asObservable();
  }
  get adminRoleData$(): Observable<any> {
    return this.adminRoleData.asObservable();
  }
  get sellerRoleData$(): Observable<any> {
    return this.sellerRoleData.asObservable();
  }
  get navigation$(): Observable<Navigation> {
    return this._navigation.asObservable();
  }

  get userNavigation$(): Observable<Navigation> {
    return this._userNavigation.asObservable();
  }

  get(): Observable<Navigation> {
    this.navigationItems = defaultNavigation;
    const currentUser = this._userSessionService.getCurrentUser();
    const isImpersonate = this._userSessionService.getCurrentSellerId();

    if (isImpersonate) {
      // Seller tab
      this.isSuperAdmin = false;
      this.isPremisesUser = false;
    } else {
      // Admin tab
      this.isSuperAdmin = currentUser?.isSuperAdmin ?? false;
      this.isPremisesUser = currentUser?.isPremisesUser ?? false;
    }

    const isDeveloper = currentUser?.isDeveloper ?? false;
    this.isDeveloper = isDeveloper;
    if (!isImpersonate && isDeveloper) {
      return of(
        this.buildAdminNavigation(
          { _id: "developer", name: "Developer", permissions: [] },
          [
            "dashboard",
            "admin-route-acl",
            "seller-route-acl",
            "features",
            "feature-meter",
            "cron-management",
          ],
        ),
      );
    }

    if (this.isSuperAdmin || this.isPremisesUser) {
      if (this.isPremisesUser && !this.isSuperAdmin) {
        return this._roleService.getRoleById(currentUser?.role).pipe(
          map((data: any): Navigation => {
            if (data.status === 200) {
              return this.buildAdminNavigation(data.data);
            }

            return this.buildEmptyNavigation();
          }),
        );
      } else {
        // For SuperAdmin, also get role data from database
        if (currentUser?.role) {
          return this._roleService.getRoleById(currentUser.role).pipe(
            map((data: any): Navigation => {
              if (data.status === 200) {
                return this.buildAdminNavigation(data.data);
              }

              return this.buildEmptyNavigation();
            }),
          );
        } else {
          // SuperAdmin with no role - set empty permissions
          return of(
            this.buildAdminNavigation(
              { _id: "super-admin", name: "Super Admin", permissions: [] },
              this.adminNavAllow,
            ),
          );
        }
      }
    } else {
      // Seller user permissions should come from seller-role, not admin role.
      if (
        currentUser?.is_seller_user &&
        (currentUser?.role || currentUser?.role_id)
      ) {
        const sellerRoleId = currentUser?.role || currentUser?.role_id;
        return this._sellerRoleService.getSellerRoleById(sellerRoleId).pipe(
          map((data: any): Navigation => {
            if (data.status === 200) {
              return this.buildSellerNavigation(data.data, isImpersonate, []);
            }

            return this.buildSellerNavigation(
              { _id: sellerRoleId, name: "Seller User", permissions: [] },
              isImpersonate,
              [],
            );
          }),
        );
      } else {
        return of(
          this.buildSellerNavigation(
            {
              _id: "seller-user-default",
              name: "Seller User",
              permissions: [],
            },
            isImpersonate,
            this.userNavAllow,
          ),
        );
      }
    }
  }

  private buildAdminNavigation(
    role: any,
    fallbackAllowList: string[] = [],
  ): Navigation {
    this.adminRoleData.next(role);
    this.sellerRoleData.next(null);
    this.roleData.next(role);
    const currentUser = this._userSessionService.getCurrentUser();
    const isDeveloper = currentUser?.isDeveloper ?? false;

    let navigationAllow: string[] = [];

    if (isDeveloper) {
      navigationAllow = [
        "dashboard",
        "admin-route-acl",
        "seller-route-acl",
        "features",
        "feature-meter",
        "cron-management",
      ];
    } else {
      const baseAllow = this.getAllowedNavigationIds(
        role?.permissions,
        this.adminSectionMap,
        fallbackAllowList,
      );
      const devIds = [
        "admin-route-acl",
        "seller-route-acl",
        "route-acl",
        "features",
        "feature-meter",
        "cron-management",
      ];
      navigationAllow = baseAllow.filter((id) => !devIds.includes(id));
      if (!navigationAllow.includes("technical-document")) {
        navigationAllow.push("technical-document");
      }
      if (!navigationAllow.includes("guide-documents")) {
        navigationAllow.push("guide-documents");
      }
      if (!navigationAllow.includes("guide-documents.admin")) {
        navigationAllow.push("guide-documents.admin");
      }
      if (!navigationAllow.includes("guide-documents.viewer")) {
        navigationAllow.push("guide-documents.viewer");
      }
      if (!navigationAllow.includes("blogs")) {
        navigationAllow.push("blogs");
      }
    }
    this.navigationItems = cloneDeep(this._defaultNavigation)
      .filter((ele) => navigationAllow.includes(ele.id))
      .map((item) => {
        if (item?.children) {
          item.children = item.children
            .filter((child) => navigationAllow.includes(child.id))
            .map((child) => {
              if (child?.children) {
                child.children = child.children.filter((subChild) =>
                  navigationAllow.includes(subChild.id),
                );
              }
              return child;
            });
        }
        return item;
      });
    const navigationItem = this.buildNavigationResponse();
    this._navigation.next(navigationItem);
    return navigationItem;
  }

  private buildSellerNavigation(
    role: any,
    isImpersonate: string | null,
    fallbackAllowList: string[] = [],
  ): Navigation {
    this.adminRoleData.next(null);
    this.sellerRoleData.next(role);
    this.roleData.next(role);
    const navigationAllow = this.getAllowedNavigationIds(
      role?.permissions,
      this.sellerSectionMap,
      fallbackAllowList,
    );
    this.navigationItems = cloneDeep(this._defaultNavigation)
      .filter((ele) => navigationAllow.includes(ele.id))
      .map((item) => {
        if (item?.children) {
          item.children = item.children
            .filter(
              (child) =>
                child.id !== "support.quick-replies" &&
                navigationAllow.includes(child.id),
            )
            .map((child) => {
              if (child?.children) {
                child.children = child.children.filter((subChild) =>
                  navigationAllow.includes(subChild.id),
                );
              }
              return child;
            });
        }
        return this.mapImpersonatedNavigationItem(item, isImpersonate);
      })
      .filter(Boolean);
    const navigationItem = this.buildNavigationResponse();
    this._navigation.next(navigationItem);
    return navigationItem;
  }

  private getAllowedNavigationIds(
    permissions: any[],
    sectionMap: Record<string, string[]>,
    fallbackAllowList: string[] = [],
  ): string[] {
    const navigationSet = new Set<string>();

    if (Array.isArray(permissions) && permissions.length) {
      permissions.forEach((item) => {
        const normalizedSectionName = this.normalizeSectionName(
          item?.section_name,
        );
        Array.isArray(sectionMap?.[normalizedSectionName]) &&
          sectionMap[normalizedSectionName].forEach((value) =>
            navigationSet.add(value),
          );
      });
    }

    return navigationSet.size ? [...navigationSet] : fallbackAllowList;
  }

  private normalizeSectionName(sectionName: string): string {
    return (sectionName || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  private normalizeRoutePath(routePath: string): string {
    const cleanRoute = (routePath || "")
      .split("?")[0]
      .split("#")[0]
      .replace(/\/+$/, "");
    const matchedRoute = Object.keys(this.sellerRouteSectionMap)
      .sort((a, b) => b.length - a.length)
      .find((route) => cleanRoute === route || cleanRoute.endsWith(route));

    return matchedRoute || cleanRoute;
  }

  getPermissionByRoute(roleData: any, routePath: string): any {
    const currentUser = this._userSessionService.getCurrentUser();
    if (currentUser && !currentUser?.is_seller_user) {
      return this.fullSellerPermission;
    }

    if (!roleData?.permissions || !Array.isArray(roleData.permissions)) {
      return {};
    }

    const sectionNames =
      this.sellerRouteSectionMap[this.normalizeRoutePath(routePath)] || [];
    if (!sectionNames.length) {
      return {};
    }

    return (
      roleData.permissions.find((item: any) =>
        sectionNames.includes(this.normalizeSectionName(item?.section_name)),
      ) || {}
    );
  }

  private mapImpersonatedNavigationItem(
    item: FuseNavigationItem,
    isImpersonate: string | null,
  ): FuseNavigationItem {
    if (!isImpersonate) {
      return item;
    }

    const sellerPrefix = `/${isImpersonate}`;
    const newItem = { ...item };

    if (newItem.link && !newItem.link.startsWith(sellerPrefix)) {
      newItem.link = `${sellerPrefix}${newItem.link}`;
    }

    if (newItem.children?.length) {
      newItem.children = newItem.children.map((child) =>
        this.mapImpersonatedNavigationItem(child, isImpersonate),
      );
    }

    return newItem;
  }

  private buildNavigationResponse(): Navigation {
    const compact = this.buildCompactNavigation();
    return {
      compact,
      default: cloneDeep(this.navigationItems),
      futuristic: cloneDeep(this.navigationItems),
      horizontal: cloneDeep(this.navigationItems),
    };
  }

  private buildEmptyNavigation(): Navigation {
    return {
      compact: [],
      default: [],
      futuristic: [],
      horizontal: [],
    };
  }

  private buildCompactNavigation(): FuseNavigationItem[] {
    return cloneDeep(this._compactNavigation).filter((compactNavItem) => {
      compactNavItem["type"] = compactNavItem.children ? "aside" : "basic";
      let match = false;
      this.navigationItems.forEach((defaultNavItem) => {
        if (defaultNavItem.id === compactNavItem.id) {
          compactNavItem.children = cloneDeep(defaultNavItem.children);
          match = true;
        }
      });
      return match;
    });
  }

  //  get(): Observable<Navigation> {
  //     this.navigationItems = defaultNavigation;
  //     const currentUser = this._userSessionService.getCurrentUser();
  //     const isImporsonate = this._userSessionService.getCurrentSellerId()
  //     this.isSuperAdmin = currentUser?.isSuperAdmin ?? false;
  //     this.isPremisesUser = currentUser?.isPremisesUser ?? false
  //     const navgationSet = new Set<string>();
  //     if (this.isSuperAdmin || this.isPremisesUser) {
  //         let adminNavAllow = this.adminNavAllow

  //         if (this.isPremisesUser && !this.isSuperAdmin) {
  //             this._roleService.getRoleById(currentUser?.role).subscribe((data: any) => {
  //                 if (data.status === 200) {
  //                     this.roleData.next(data.data)
  //                     if (data.data && data.data.permissions && Array.isArray(data.data.permissions)) {
  //                         const { permissions } = data.data
  //                         permissions.forEach(item => {
  //                             this.sectionMap[item.section_name].forEach(e => navgationSet.add(e))
  //                         })
  //                     }
  //                     adminNavAllow = [...navgationSet]
  //                 }
  //                 this.navigationItems = this._defaultNavigation.filter(ele => adminNavAllow.includes(ele.id));

  //                 const compact = cloneDeep(this._compactNavigation).filter((compactNavItem) => {
  //                     compactNavItem['type'] = compactNavItem.children ? 'aside' : 'basic';
  //                     let match = false;
  //                     this._defaultNavigation.forEach((defaultNavItem) => {
  //                         if (defaultNavItem.id === compactNavItem.id) {
  //                             compactNavItem.children = cloneDeep(defaultNavItem.children);
  //                             match = true;
  //                         }
  //                     });
  //                     return match;
  //                 });
  //                 const navigationItem = {
  //                     compact: compact,
  //                     default: cloneDeep(this.navigationItems),
  //                     futuristic: cloneDeep(this.navigationItems),
  //                     horizontal: cloneDeep(this.navigationItems),
  //                 };

  //                 this._navigation.next(navigationItem);
  //                 return of(navigationItem);
  //             })
  //         } else {
  //             this.navigationItems = this._defaultNavigation.filter(ele => adminNavAllow.includes(ele.id));

  //             const compact = cloneDeep(this._compactNavigation).filter((compactNavItem) => {
  //                 compactNavItem['type'] = compactNavItem.children ? 'aside' : 'basic';
  //                 let match = false;
  //                 this._defaultNavigation.forEach((defaultNavItem) => {
  //                     if (defaultNavItem.id === compactNavItem.id) {
  //                         compactNavItem.children = cloneDeep(defaultNavItem.children);
  //                         match = true;
  //                     }
  //                 });
  //                 return match;
  //             });
  //             const navigationItem = {
  //                 compact: compact,
  //                 default: cloneDeep(this.navigationItems),
  //                 futuristic: cloneDeep(this.navigationItems),
  //                 horizontal: cloneDeep(this.navigationItems),
  //             };

  //             this._navigation.next(navigationItem);
  //             return of(navigationItem);
  //         }
  //     } else {
  //         this.navigationItems = this._defaultNavigation.filter(ele => this.userNavAllow.includes(ele.id)).map(item => {
  //             if (!isImporsonate) {
  //                 return item;
  //             }
  //             const userId = currentUser?.id || "";
  //             const newItem = { ...item };
  //             if (newItem.link) {
  //                 newItem.link = `/${userId}${newItem.link}`;
  //             }
  //             if (newItem.id) {
  //                 newItem.id += `/${userId}`;
  //             }
  //             if (newItem.children && newItem.children.length) {
  //                 newItem.children = newItem.children.map(child => ({
  //                     ...child,
  //                     link: `/${userId}${child.link}`
  //                 }));
  //             }

  //             return newItem;
  //         }).filter(Boolean)

  //         const compact = cloneDeep(this._compactNavigation).filter((compactNavItem) => {
  //             compactNavItem['type'] = compactNavItem.children ? 'aside' : 'basic';
  //             let match = false;
  //             this._defaultNavigation.forEach((defaultNavItem) => {
  //                 if (defaultNavItem.id === compactNavItem.id) {
  //                     compactNavItem.children = cloneDeep(defaultNavItem.children);
  //                     match = true;
  //                 }
  //             });
  //             return match;
  //         });
  //         const navigationItem = {
  //             compact: compact,
  //             default: cloneDeep(this.navigationItems),
  //             futuristic: cloneDeep(this.navigationItems),
  //             horizontal: cloneDeep(this.navigationItems),
  //         };

  //         this._navigation.next(navigationItem);
  //         return of(navigationItem);
  //     }

  // }
}
