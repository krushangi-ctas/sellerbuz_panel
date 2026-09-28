export interface GuideModule {
  id?: string;
  _id?: string;
  title?: string;
  moduleName?: string;
  description?: string;
  parentId?: string | null;
  isPublished: boolean;
  isAdminSection?: boolean;
  sortOrder?: number;
  createdBy?: string;
  createdAt?: string;
  status?: number;
  children?: GuideModule[];
}

export interface GuideStep {
  id?: string;
  _id?: string;
  guideModuleId: string;
  title?: string;
  description?: string;
  screenshotUrl?: string;
  stepOrder: number;
  createdAt?: string;
  status?: number;
}
