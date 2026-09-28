import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from "@angular/router";
import { Observable } from "rxjs";
import { BlogService } from "app/core/blog/blog.service";
import { BlogResponse, BlogsListResponse } from "app/core/blog/blog.model";

@Injectable({
  providedIn: "root",
})
export class BlogsResolver implements Resolve<BlogsListResponse> {
  constructor(private _blogService: BlogService) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<BlogsListResponse> {
    return this._blogService.getBlogs(1, 100, "createdAt", "desc", "", {});
  }
}

@Injectable({
  providedIn: "root",
})
export class BlogResolver implements Resolve<BlogResponse | null> {
  constructor(private _blogService: BlogService) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ):
    | Observable<BlogResponse | null>
    | Promise<BlogResponse | null>
    | BlogResponse
    | null {
    const blogId = route.paramMap.get("id");
    if (!blogId) {
      return null;
    }
    return this._blogService.getBlogById(blogId);
  }
}
