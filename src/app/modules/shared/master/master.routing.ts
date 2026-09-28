import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { PermissionAuthGuard } from "app/core/auth/guards/permission-auth.guard";

const routes: Routes = [
  {
    path: "",
    children: [
      // Admin
      {
        path: "seller",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/sellers/sellers.module").then(
            (m) => m.SellersModule,
          ),
      },
      {
        path: "user",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/user/user.module").then(
            (m) => m.UsersModule,
          ),
      },
      {
        path: "portal",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/portal/portal.module").then(
            (m) => m.portalModule,
          ),
      },
      // {
      //     path: 'admin-inventory',
      //     canActivate: [PermissionAuthGuard],
      //     loadChildren: () =>
      //         import('app/modules/admin/admin-inventory/admin-inventory.module').then(
      //             m => m.AdminInventoryModule
      //         ),
      // },
      {
        path: "manage-role",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/role/role.module").then(
            (m) => m.RoleModule,
          ),
      },
      {
        path: "seller-store",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("../../admin/seller-store/seller-store.module").then(
            (m) => m.SellerStoreModule,
          ),
      },
      {
        path: "admin-route-acl",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/admin-route-acl/admin-route-acl.module").then(
            (m) => m.AdminRouteAclModule,
          ),
      },
      {
        path: "seller-route-acl",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/seller-route-acl/seller-route-acl.module").then(
            (m) => m.SellerRouteAclModule,
          ),
      },
      {
        path: "route-acl",
        redirectTo: "admin-route-acl",
        pathMatch: "full",
      },
      {
        path: "features",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/features/features.module").then(
            (m) => m.FeaturesModule,
          ),
      },
      {
        path: "feature-meter",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/feature-meter/feature-meter.module").then(
            (m) => m.FeatureMeterModule,
          ),
      },
      {
        path: "manage-plan",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/plan/plan.module").then(
            (m) => m.PlanModule,
          ),
      },
      {
        path: "subscription",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/subscription/subscription.module").then(
            (m) => m.SubscriptionModule,
          ),
      },
      {
        path: "coupon",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/coupon/coupon.module").then(
            (m) => m.CouponModule,
          ),
      },
      {
        path: "contact",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/contact/contact.module").then(
            (m) => m.ContactModule,
          ),
      },
      {
        path: "web-settings",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/web-settings/web-settings.module").then(
            (m) => m.WebSettingsModule,
          ),
      },
      // Seller
      {
        path: "seller-user",
        // canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/seller/seller-user/seller-user.module").then(
            (m) => m.SellerUsersModule,
          ),
      },
      {
        path: "seller-role",
        loadChildren: () =>
          import("app/modules/seller/seller-role/seller-role.module").then(
            (m) => m.SellerRoleModule,
          ),
      },
      {
        path: "master-catalog",
        loadChildren: () =>
          import("app/modules/seller/master-catalog/master-catalog.module").then(
            (m) => m.MasterCatalogModule,
          ),
      },
      {
        path: "tag-setting",
        loadChildren: () =>
          import("app/modules/seller/tag/tag.module").then((m) => m.TagModule),
      },
      {
        path: "general-setting",
        loadChildren: () =>
          import("app/modules/seller/general-setting/general-setting.module").then(
            (m) => m.GeneralSettingsModule,
          ),
      },
      {
        path: "amazon-inventory",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/seller/amazon/amazon-inventory/amazon-inventory.module").then(
            (m) => m.AmazonInventoryModule,
          ),
      },
      {
        path: "notify-inventory",
        loadChildren: () =>
          import("app/modules/seller/amazon/notify-inventory/notify-inventory.module").then(
            (m) => m.NotifyInventoryModule,
          ),
      },
      {
        path: "orders",
        loadChildren: () =>
          import("app/modules/seller/orders/orders.module").then(
            (m) => m.OrdersModule,
          ),
      },
      {
        path: "amazon/compliance",
        loadChildren: () =>
          import("app/modules/seller/banned/banned.module").then(
            (m) => m.BannedModule,
          ),
      },
      // Shared
      {
        path: "system-logs",
        loadChildren: () =>
          import("app/modules/shared/system-log/system-log.module").then(
            (m) => m.SystemLogModule,
          ),
      },
      {
        path: "cron-management",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/cron-management/cron-management.module").then(
            (m) => m.CronManagementModule,
          ),
      },
      {
        path: "cron-logs",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/cron-management/cron-management.module").then(
            (m) => m.CronManagementModule,
          ),
      },
      {
        path: "amazon/amz-inv-logs",
        loadChildren: () =>
          import("app/modules/shared/amz-inv-log/amz-inv-log.module").then(
            (m) => m.AmzInvLogModule,
          ),
      },
      {
        path: "catalog-logs",
        loadChildren: () =>
          import("app/modules/shared/catalog-log/catalog-log.module").then(
            (m) => m.CatalogLogModule,
          ),
      },

      {
        path: "uploaded-files",
        loadChildren: () =>
          import("app/modules/seller/uploaded-files/uploaded-files.module").then(
            (m) => m.UploadedFilesModule,
          ),
      },
      // ── Support Tickets & FAQs ─────────────────────────────────────────────
      {
        path: "support/tickets",
        loadChildren: () =>
          import("app/modules/admin/master/support/support.module").then(
            (m) => m.SupportTicketFrontendModule,
          ),
      },
      {
        path: "support/faqs",
        loadChildren: () =>
          import("app/modules/admin/master/support/faq/faq.module").then(
            (m) => m.FaqModule,
          ),
      },
      {
        path: "support/quick-replies",
        loadChildren: () =>
          import("app/modules/admin/master/support/quick-reply/quick-reply.module").then(
            (m) => m.QuickReplyModule,
          ),
      },
      {
        path: "technical-doc",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/technical-document/technical-document.module").then(
            (m) => m.TechnicalDocumentModule,
          ),
      },
      {
        path: "guide-documents",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/guide-documents/guide-documents.module").then(
            (m) => m.GuideDocumentsModule,
          ),
      },
      {
        path: "blogs",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/blog/blog.module").then(
            (m) => m.BlogModule,
          ),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MasterRoutingModule {}
