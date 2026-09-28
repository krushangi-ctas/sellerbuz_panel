import { Component, Inject, ChangeDetectionStrategy } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

export interface MarketplaceDialogData {
  storeName: string;
  totalInventory: number;
  totalRetail: number;
  totalWhitelabel: number;
  marketplaces: {
    name: string;
    code: string;
    id: string;
    total: number;
    retail: number;
    whiteLabel: number;
  }[];
}

@Component({
  standalone: false,
  selector: "app-marketplace-dialog",
  templateUrl: "./marketplace-dialog.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<MarketplaceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MarketplaceDialogData,
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
