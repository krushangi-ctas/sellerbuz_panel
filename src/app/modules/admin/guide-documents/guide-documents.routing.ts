import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { GuideDocumentsAdminComponent } from "./admin/guide-documents-admin.component";
import { GuideDocumentsViewerComponent } from "./viewer/guide-documents-viewer.component";

const routes: Routes = [
  {
    path: "",
    component: GuideDocumentsAdminComponent,
  },
  {
    path: "viewer",
    component: GuideDocumentsViewerComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GuideDocumentsRoutingModule {}
