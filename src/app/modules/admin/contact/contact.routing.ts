import { Route } from "@angular/router";
import { ContactListComponent } from "./contact.component";
import { ContactResolver } from "./contact.resolver";

export const ContactRoutes: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: ContactListComponent,
  },
];
