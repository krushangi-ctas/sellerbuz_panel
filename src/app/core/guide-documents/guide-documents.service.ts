import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { Observable } from "rxjs";
import { MasterService } from "../master.service";

@Injectable({
  providedIn: "root",
})
export class GuideDocumentsService {
  constructor(
    private _httpClient: HttpClient,
    private _masterService: MasterService,
  ) {}

  private get userId(): string {
    return this._masterService.usePremisesUserId() || "admin";
  }

  // User (published only)
  getPublishedTree(isAdminSection?: boolean): Observable<any> {
    const params: any = {};
    if (isAdminSection !== undefined && isAdminSection !== null) {
      params.isAdminSection = isAdminSection;
    }
    return this._httpClient.get<any>(
      `${environment.apiBaseUrl}/guide-documents/published-tree/${this.userId}`,
      { params },
    );
  }

  getPublishedChildDetails(childModuleId: string): Observable<any> {
    return this._httpClient.get<any>(
      `${environment.apiBaseUrl}/guide-documents/published-tree/${this.userId}/child/${childModuleId}`,
    );
  }

  // Admin
  getModules(
    search: string = "",
    page = 1,
    limit = 100,
    sortBy = "createdAt:desc",
  ): Observable<any> {
    const params: any = { search, page, limit, sortBy };
    return this._httpClient.get<any>(
      `${environment.apiBaseUrl}/guide-documents/modules/${this.userId}`,
      { params },
    );
  }

  getModulesTree(search: string = ""): Observable<any> {
    const params: any = { search };
    return this._httpClient.get<any>(
      `${environment.apiBaseUrl}/guide-documents/modules-tree/${this.userId}`,
      { params },
    );
  }

  getModuleDetails(moduleId: string): Observable<any> {
    return this._httpClient.get<any>(
      `${environment.apiBaseUrl}/guide-documents/modules/${this.userId}/${moduleId}`,
    );
  }

  createModule(payload: any): Observable<any> {
    return this._httpClient.post<any>(
      `${environment.apiBaseUrl}/guide-documents/modules/${this.userId}`,
      payload,
    );
  }

  updateModule(moduleId: string, payload: any): Observable<any> {
    return this._httpClient.patch<any>(
      `${environment.apiBaseUrl}/guide-documents/modules/${this.userId}/${moduleId}`,
      payload,
    );
  }

  deleteModule(moduleId: string): Observable<any> {
    return this._httpClient.delete<any>(
      `${environment.apiBaseUrl}/guide-documents/modules/${this.userId}/${moduleId}`,
    );
  }

  uploadScreenshot(file: File): Observable<any> {
    const formData = new FormData();
    formData.append("screenshot", file);
    return this._httpClient.post<any>(
      `${environment.apiBaseUrl}/guide-documents/upload-screenshot/${this.userId}`,
      formData,
    );
  }

  createStep(moduleId: string, payload: any): Observable<any> {
    return this._httpClient.post<any>(
      `${environment.apiBaseUrl}/guide-documents/modules/${this.userId}/${moduleId}/steps`,
      payload,
    );
  }

  updateStep(stepId: string, payload: any): Observable<any> {
    return this._httpClient.patch<any>(
      `${environment.apiBaseUrl}/guide-documents/steps/${this.userId}/${stepId}`,
      payload,
    );
  }

  deleteStep(stepId: string): Observable<any> {
    return this._httpClient.delete<any>(
      `${environment.apiBaseUrl}/guide-documents/steps/${this.userId}/${stepId}`,
    );
  }

  reorderSteps(
    moduleId: string,
    steps: { id: string; stepOrder: number }[],
  ): Observable<any> {
    return this._httpClient.put<any>(
      `${environment.apiBaseUrl}/guide-documents/modules/${this.userId}/${moduleId}/steps/reorder`,
      { steps },
    );
  }

  reorderModules(payload: {
    parents: { id: string; sortOrder: number }[];
    children: { id: string; parentId: string; sortOrder: number }[];
  }): Observable<any> {
    return this._httpClient.put<any>(
      `${environment.apiBaseUrl}/guide-documents/modules/${this.userId}/reorder`,
      payload,
    );
  }
}
