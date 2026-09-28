import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { PermissionAuthGuard } from "app/core/auth/guards/permission-auth.guard";

const routes: Routes = [
  {
    path: "",
    children: [
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
      //         import('./admin-inventory/admin-inventory.module').then(
      //             m => m.AdminInventoryModule
      //         ),
      // },
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
        path: "manage-role",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("app/modules/admin/role/role.module").then(
            (m) => m.RoleModule,
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
      // ── Support Tickets & FAQs ─────────────────────────────────────────────
      {
        path: "support/tickets",
        loadChildren: () =>
          import("./support/support.module").then(
            (m) => m.SupportTicketFrontendModule,
          ),
      },
      {
        path: "support/faqs",
        loadChildren: () =>
          import("./support/faq/faq.module").then((m) => m.FaqModule),
      },
      {
        path: "support/quick-replies",
        loadChildren: () =>
          import("./support/quick-reply/quick-reply.module").then(
            (m) => m.QuickReplyModule,
          ),
      },
      {
        path: "blogs",
        canActivate: [PermissionAuthGuard],
        loadChildren: () =>
          import("../blog/blog.module").then((m) => m.BlogModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MasterRoutingModule {}
