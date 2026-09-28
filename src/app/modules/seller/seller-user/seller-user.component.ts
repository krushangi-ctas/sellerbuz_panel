import { Component } from "@angular/core";

@Component({
  standalone: false,
  selector: "seller-users",
  template: "<router-outlet></router-outlet>",
})
export class SellerUsersComponent {
  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
