import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  TemplateRef,
} from "@angular/core";
// import { ORDER_ITEM_STATUS } from '../constants';
import { Router } from "@angular/router";

@Component({
  standalone: false,
  selector: "app-dynamic-grid",
  templateUrl: "./dynamic-grid.component.html",
  styleUrls: ["./dynamic-grid.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicGridComponent {
  @Input() headers: string[] = [];
  @Input() tableProperties: string[] = [];
  @Input() data: any[] = [];
  @Input() key: any[] = [];
  @Input() pagination: any;
  @Input() gridStyle: any;
  @Input() permission: any;
  @Output() editItem = new EventEmitter();
  @Output() viewItem = new EventEmitter();
  @Output() deleteItem = new EventEmitter();
  @Output() pageChangeEvent = new EventEmitter();
  @Output() sortItem = new EventEmitter();
  @Input() showView: boolean = false; // Control visibility of view button
  @Input() showEdit: boolean = false; // Control visibility of edit button
  @Input() showDelete: boolean = false; // Control visibility of delete button
  @Input() showActionButton: boolean = true;
  @Input() actionTemplate: any; // Add this input to accept a template
  @Input() columnStyles: { [key: string]: string } = {};
  // Other existing properties and methods

  // order_item_status: { key: number | boolean; value: string }[] = ORDER_ITEM_STATUS;
  constructor(private _route: Router) {}

  // getOrderStatus(status: number): string {
  //   return this.order_item_status.filter(sts => sts.key === status)[0]?.value || '-';
  // }

  editItemDetails(item): void {
    this.editItem.emit(item); // Emits the item to be edited
  }

  viewItemDetails(item): void {
    this.viewItem.emit(item); // Emits the item to be viewed
  }

  deleteItemDetails(item): void {
    this.deleteItem.emit(item); // Emits the item to be deleted
  }

  changePage(item): void {
    this.pageChangeEvent.emit(item);
  }

  sortData(item): void {
    this.sortItem.emit(item);
  }

  redirectToDetailPage(orderNumber: string): void {
    const url = this._route.serializeUrl(
      this._route.createUrlTree(["/master/orders/details", orderNumber]),
    );
    window.open(url, "_blank");
  }

  replacePlaceholders(url: string, item: any): string {
    return url.replace(/{{(.*?)}}/g, (match, key) => item[key.trim()] || "");
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
