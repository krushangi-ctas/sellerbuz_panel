import { Routes } from "@angular/router";
import { BlogListComponent } from "./list/list.component";
import { BlogManageComponent } from "./manage/manage.component";
import { BlogResolver, BlogsResolver } from "./blog.resolvers";

export const blogRoutes: Routes = [
  {
    path: "",
    component: BlogListComponent,
    resolve: {
      blogs: BlogsResolver,
    },
  },
  {
    path: "create",
    component: BlogManageComponent,
  },
  {
    path: "edit/:id",
    component: BlogManageComponent,
    resolve: {
      blog: BlogResolver,
    },
  },
];
