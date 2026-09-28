import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { AuthorizationWorkflowComponent } from "./authorization-workflow.component";

const routes: Routes = [
  {
    path: "",
    component: AuthorizationWorkflowComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthorizationWorkflowRoutingModule {}
