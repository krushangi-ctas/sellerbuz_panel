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
import { FaqComponent } from "./faq.component";
import { FaqDialogComponent } from "./faq-dialog/faq-dialog.component";

const routes: Routes = [{ path: "", component: FaqComponent }];

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

import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

/**
 * FaqModule — Feature module for Support FAQs.
 */
@NgModule({
  declarations: [FaqComponent, FaqDialogComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    FuseConfirmationModule,
    RouterModule.forChild(routes),
    NgxMatSelectSearchModule,
    ...MATERIAL,
  ],
})
export class FaqModule {}
