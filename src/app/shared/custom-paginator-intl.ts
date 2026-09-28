import { Injectable } from "@angular/core";
import { MatPaginatorIntl } from "@angular/material/paginator";

@Injectable({
  providedIn: "root",
})
export class CustomPaginatorIntl extends MatPaginatorIntl {
  override getRangeLabel = (
    page: number,
    pageSize: number,
    length: number,
  ): string => {
    if (length === 0 || pageSize === 0) {
      return "0";
    }
    const startIndex = page * pageSize;
    const endIndex =
      startIndex < length
        ? Math.min(startIndex + pageSize, length)
        : startIndex + pageSize;
    return `${startIndex + 1} – ${endIndex}`;
  };
}
