import { Route } from "@angular/router";
import { AuthGuard } from "app/core/auth/guards/auth.guard";
import { NoAuthGuard } from "app/core/auth/guards/noAuth.guard";
import { LayoutComponent } from "app/layout/layout.component";
import { InitialDataResolver } from "app/app.resolvers";
import { PermissionAuthGuard } from "./core/auth/guards/permission-auth.guard";

// @formatter:off
export const appRoutes: Route[] = [
  // Redirect empty path to '/dashboards/project'
  { path: "", pathMatch: "full", redirectTo: "sign-in" },

  // Redirect signed-in user to the '/dashboard'

  // Auth routes for users
  {
    path: "",
    // canMatch: [NoAuthGuard],
    canActivate: [NoAuthGuard],
    canActivateChild: [NoAuthGuard],
    component: LayoutComponent,
    data: {
      layout: "empty",
    },
    children: [
      {
        path: "confirmation-required",
        loadChildren: () =>
          import("app/modules/auth/confirmation-required/confirmation-required.module").then(
            (m) => m.AuthConfirmationRequiredModule,
          ),
      },

      {
        path: "sign-in",
        loadChildren: () =>
          import("app/modules/auth/sign-in/sign-in.module").then(
            (m) => m.AuthSignInModule,
          ),
      },
    
    ],
  },

  // Auth routes for authenticated users
  {
    path: "",
    // canMatch: [AuthGuard],
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    component: LayoutComponent,
    data: {
      layout: "empty",
    },
    children: [
      {
        path: "sign-out",
        loadChildren: () =>
          import("app/modules/auth/sign-out/sign-out.module").then(
            (m) => m.AuthSignOutModule,
          ),
      },
    ],
  },

  // App routes (admin + seller feature modules; URLs unchanged)
  {
    path: "",
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    component: LayoutComponent,
    resolve: {
      initialData: InitialDataResolver,
    },

    children: [
      // Dashboard (shared)
      {
        path: "dashboard",
        pathMatch: "full",
        loadChildren: () =>
          import("app/modules/shared/dashboard/dashboard.module").then(
            (m) => m.DashboardModule,
          ),
      },
      {
        path: "authorization-workflow",
        canActivate: [PermissionAuthGuard],
        pathMatch: "full",
        loadChildren: () =>
          import("app/modules/seller/authorization-workflow/authorization-workflow.module").then(
            (m) => m.AuthorizationWorkflowModule,
          ),
      },
      {
        path: "master",
        loadChildren: () =>
          import("app/modules/shared/master/master.module").then(
            (m) => m.MasterModule,
          ),
      },
      {
        path: "profile",
        loadChildren: () =>
          import("app/modules/shared/pages/profile/profile.module").then(
            (m) => m.ProfileModule,
          ),
      },
      {
        path: ":sellerId/master",
        loadChildren: () =>
          import("app/modules/shared/master/master.module").then(
            (m) => m.MasterModule,
          ),
      },
      {
        path: ":sellerId/authorization-workflow",
        canActivate: [PermissionAuthGuard],
        pathMatch: "full",
        loadChildren: () =>
          import("app/modules/seller/authorization-workflow/authorization-workflow.module").then(
            (m) => m.AuthorizationWorkflowModule,
          ),
      },
      {
        path: ":sellerId/dashboard",
        pathMatch: "full",
        loadChildren: () =>
          import("app/modules/shared/dashboard/dashboard.module").then(
            (m) => m.DashboardModule,
          ),
      },
      // 404 & Catch all
      {
        path: "404-not-found",
        pathMatch: "full",
        loadChildren: () =>
          import("app/modules/shared/pages/error/error-404/error-404.module").then(
            (m) => m.Error404Module,
          ),
      },

      {
        path: "**",
        redirectTo: "404-not-found",
      },
    ],
  },
];
