import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";

// Angular Material
import { MatTableModule } from "@angular/material/table";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatSortModule } from "@angular/material/sort";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatDialogModule } from "@angular/material/dialog";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MAT_DATE_LOCALE, MatNativeDateModule } from "@angular/material/core";
import { DatePipe } from "@angular/common";
import { MatMenuModule } from "@angular/material/menu";
import { MatBadgeModule } from "@angular/material/badge";
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from "@angular/material/divider";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatSnackBarModule } from "@angular/material/snack-bar";

// Components
import { TicketListingComponent } from "./ticket-listing/ticket-listing.component";
import { TicketDetailComponent } from "./ticket-detail/ticket-detail.component";
import { CreateTicketDialogComponent } from "./create-ticket-dialog/create-ticket-dialog.component";
import { TicketStatusBadgeComponent } from "./components/ticket-status-badge/ticket-status-badge.component";
import { ChatMessageBubbleComponent } from "./components/chat-message-bubble/chat-message-bubble.component";

const routes: Routes = [
  { path: "", component: TicketListingComponent },
  { path: ":id", component: TicketDetailComponent },
];

const MATERIAL = [
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatInputModule,
  MatFormFieldModule,
  MatSelectModule,
  MatButtonModule,
  MatIconModule,
  MatChipsModule,
  MatDialogModule,
  MatTooltipModule,
  MatProgressSpinnerModule,
  MatSlideToggleModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatMenuModule,
  MatBadgeModule,
  MatCardModule,
  MatDividerModule,
  MatAutocompleteModule,
  MatSnackBarModule,
];

import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

@NgModule({
  declarations: [
    TicketListingComponent,
    TicketDetailComponent,
    CreateTicketDialogComponent,
    TicketStatusBadgeComponent,
    ChatMessageBubbleComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule.forChild(routes),
    NgxMatSelectSearchModule,
    ...MATERIAL,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: "en-GB" }, DatePipe],
})
export class SupportTicketFrontendModule {}
