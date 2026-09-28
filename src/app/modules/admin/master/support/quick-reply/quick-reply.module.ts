import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
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
import { MatMenuModule } from "@angular/material/menu";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatSnackBarModule } from "@angular/material/snack-bar";

// Fuse Services
import { FuseConfirmationModule } from "@fuse/services/confirmation";

// Components
import { QuickReplyComponent } from "./quick-reply.component";
import { QuickReplyDialogComponent } from "./quick-reply-dialog/quick-reply-dialog.component";

const routes: Routes = [{ path: "", component: QuickReplyComponent }];

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
  MatMenuModule,
  MatAutocompleteModule,
  MatSnackBarModule,
];

/**
 * QuickReplyModule — Feature module for Support Quick Replies.
 */
@NgModule({
  declarations: [QuickReplyComponent, QuickReplyDialogComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    FuseConfirmationModule,
    RouterModule.forChild(routes),
    ...MATERIAL,
  ],
})
export class QuickReplyModule {}
