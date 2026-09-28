import { Pagination } from "app/core/pagination/pagination.types";
import { User } from "app/core/user/user.types";

export interface Response {
  message: string;
  status: number;
}

export interface ResponseData {
  data: { data: object; pagination: Pagination };
}

export interface LoginRes {
  data: { data: { accessToken: string; user: User }; pagination: Pagination };
}
