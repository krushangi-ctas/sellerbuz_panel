import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTabsModule } from "@angular/material/tabs";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatDialogModule } from "@angular/material/dialog";
import { MatSelectModule } from "@angular/material/select";
import { MatInputModule } from "@angular/material/input";
import { MatPaginatorModule } from "@angular/material/paginator";
import { NgApexchartsModule } from "ng-apexcharts";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { SharedModule } from "app/shared/shared.module";
import { subscriptionRoutes } from "./subscription.routing";
import { SubscriptionComponent } from "./subscription.component";
import { OverviewComponent } from "./components/overview/overview";
import { HistoryComponent } from "./components/history/history";

import { PlansComponent } from "./components/plans/plans";
import { PlansCheckoutDialogComponent } from "./components/plans/plans-checkout-dialog/plans-checkout-dialog.component";

@NgModule({
  declarations: [
    SubscriptionComponent,
    OverviewComponent,
    HistoryComponent,

    PlansComponent,
    PlansCheckoutDialogComponent,
  ],
  imports: [
    SharedModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatTabsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSelectModule,
    MatInputModule,
    MatPaginatorModule,
    NgApexchartsModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(subscriptionRoutes),
  ],
})
export class SubscriptionModule {}
