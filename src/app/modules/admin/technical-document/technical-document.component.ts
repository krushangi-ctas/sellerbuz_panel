import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";

declare const Redoc: any;

export interface ParentSection {
  id: string;
  label: string;
  icon: string;
  children?: { id: string; label: string }[];
}

export interface ModelDoc {
  id: string;
  title: string;
  shortTitle: string;
  overview: string;
  purpose: string;
  badge: string;
  highlights: { label: string; value: string }[];
  interfaceCode: string;
  keyFields: { name: string; description: string }[];
  notes: string[];
}

export interface UtilityDoc {
  id: string;
  title: string;
  overview: string;
  code: string;
  notes: string[];
  highlights: { label: string; value: string }[];
}

export interface PluginDoc {
  id: string;
  title: string;
  overview: string;
  code: string;
  notes: string[];
  highlights: { label: string; value: string }[];
}

export interface MiddlewareDoc {
  id: string;
  title: string;
  overview: string;
  code: string;
  notes: string[];
  highlights: { label: string; value: string }[];
}

export interface ConfigEntry {
  key: string;
  description: string;
}

export interface ConfigGroup {
  title: string;
  summary: string;
  entries: ConfigEntry[];
}

@Component({
  selector: "app-technical-document",
  templateUrl: "./technical-document.component.html",
  styleUrls: ["./technical-document.component.scss"],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressBarModule],
})
export class TechnicalDocumentComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  isLoading = true;
  loadError = "";
  copied = false;
  searchQuery = "";

  selectedSection = "api-docs";
  selectedChild = "";
  expandedSection = "api-docs";

  sections: ParentSection[] = [
    {
      id: "api-docs",
      label: "API Documentation",
      icon: "heroicons_outline:book-open",
    },
    {
      id: "utilities",
      label: "Utilities",
      icon: "heroicons_outline:adjustments",
      children: [],
    },
    {
      id: "plugins",
      label: "Plugins",
      icon: "heroicons_outline:puzzle",
      children: [],
    },
    {
      id: "middlewares",
      label: "Middlewares",
      icon: "heroicons_outline:shield-check",
      children: [],
    },
    {
      id: "configuration",
      label: "Configuration",
      icon: "heroicons_outline:cog",
    },
    {
      id: "models",
      label: "Models",
      icon: "heroicons_outline:cube",
      children: [],
    },
  ];

  utilitiesDocs: UtilityDoc[] = [];
  pluginsDocs: PluginDoc[] = [];
  middlewaresDocs: MiddlewareDoc[] = [];
  modelsDocs: ModelDoc[] = [];
  configOverview = {
    serverPort: "3000",
    environment: "development",
    authWindow: "12h / 2d",
  };
  configSampleEnv = "";
  configurationDocs: ConfigGroup[] = [];

  private initTimer: any;
  private attemptCount = 0;
  private redocInitialized = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadTechnicalSections();
  }

  ngAfterViewInit(): void {
    if (this.selectedSection === "api-docs") {
      this.initRedoc();
    }
  }

  ngOnDestroy(): void {
    if (this.initTimer) {
      clearTimeout(this.initTimer);
    }
  }

  loadTechnicalSections(): void {
    this.http
      .get<any>("assets/api-docs/technical-doc-sections.json")
      .subscribe({
        next: (data: any) => {
          if (data.utilities) {
            this.utilitiesDocs = data.utilities;
            const utilsSection = this.sections.find(
              (s) => s.id === "utilities",
            );
            if (utilsSection) {
              utilsSection.children = data.utilities.map((u: UtilityDoc) => ({
                id: u.id,
                label: u.title,
              }));
            }
          }

          if (data.plugins) {
            this.pluginsDocs = data.plugins;
            const pluginsSection = this.sections.find(
              (s) => s.id === "plugins",
            );
            if (pluginsSection) {
              pluginsSection.children = data.plugins.map((p: PluginDoc) => ({
                id: p.id,
                label: p.title,
              }));
            }
          }

          if (data.middlewares) {
            this.middlewaresDocs = data.middlewares;
            const mwSection = this.sections.find((s) => s.id === "middlewares");
            if (mwSection) {
              mwSection.children = data.middlewares.map((m: MiddlewareDoc) => ({
                id: m.id,
                label: m.title,
              }));
            }
          }

          if (data.models) {
            this.modelsDocs = data.models;
            const modelsSection = this.sections.find((s) => s.id === "models");
            if (modelsSection) {
              modelsSection.children = data.models.map((m: ModelDoc) => ({
                id: m.id,
                label: m.shortTitle || m.title,
              }));
            }
          }

          if (data.configuration) {
            this.configOverview =
              data.configuration.overview || this.configOverview;
            this.configSampleEnv = data.configuration.sampleEnv || "";
            this.configurationDocs = data.configuration.docs || [];
          }

          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.warn("Could not load technical-doc-sections.json", err);
        },
      });
  }

  selectSection(sectionId: string, childId: string = ""): void {
    this.selectedSection = sectionId;
    this.selectedChild = childId;

    const targetSection = this.sections.find((s) => s.id === sectionId);
    if (
      targetSection &&
      targetSection.children &&
      targetSection.children.length > 0
    ) {
      if (!childId) {
        this.selectedChild = targetSection.children[0].id;
      }
      this.expandedSection = sectionId;
    }

    if (sectionId === "api-docs") {
      setTimeout(() => this.initRedoc(), 100);
    }

    this.cdr.detectChanges();
  }

  toggleSection(sectionId: string): void {
    if (this.expandedSection === sectionId) {
      this.expandedSection = "";
    } else {
      this.expandedSection = sectionId;
    }
  }

  get selectedSectionLabelWithChild(): string {
    const parent = this.sections.find((s) => s.id === this.selectedSection);
    if (!parent) return "";
    if (this.selectedChild && parent.children) {
      const child = parent.children.find((c) => c.id === this.selectedChild);
      if (child) {
        return `${parent.label} - ${child.label}`;
      }
    }
    return parent.label;
  }

  // Selected item getters
  selectedUtility(): UtilityDoc {
    return (
      this.utilitiesDocs.find((u) => u.id === this.selectedChild) ||
      this.utilitiesDocs[0] || {
        id: "",
        title: "",
        overview: "",
        code: "",
        notes: [],
        highlights: [],
      }
    );
  }

  selectedPlugin(): PluginDoc {
    return (
      this.pluginsDocs.find((p) => p.id === this.selectedChild) ||
      this.pluginsDocs[0] || {
        id: "",
        title: "",
        overview: "",
        code: "",
        notes: [],
        highlights: [],
      }
    );
  }

  selectedMiddleware(): MiddlewareDoc {
    return (
      this.middlewaresDocs.find((m) => m.id === this.selectedChild) ||
      this.middlewaresDocs[0] || {
        id: "",
        title: "",
        overview: "",
        code: "",
        notes: [],
        highlights: [],
      }
    );
  }

  selectedModel(): ModelDoc {
    return (
      this.modelsDocs.find((m) => m.id === this.selectedChild) ||
      this.modelsDocs[0] || {
        id: "",
        title: "",
        shortTitle: "",
        overview: "",
        purpose: "",
        badge: "",
        highlights: [],
        interfaceCode: "",
        keyFields: [],
        notes: [],
      }
    );
  }

  activeCodeSnippet(): string {
    if (this.selectedSection === "utilities")
      return this.selectedUtility().code;
    if (this.selectedSection === "plugins") return this.selectedPlugin().code;
    if (this.selectedSection === "middlewares")
      return this.selectedMiddleware().code;
    if (this.selectedSection === "models")
      return this.selectedModel().interfaceCode;
    if (this.selectedSection === "configuration") return this.configSampleEnv;
    return "";
  }

  copyCode(): void {
    const code = this.activeCodeSnippet();
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
      this.copied = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copied = false;
        this.cdr.detectChanges();
      }, 2000);
    });
  }

  initRedoc(): void {
    const container = document.getElementById("redoc-container");
    if (!container) return;

    if (this.redocInitialized && container.children.length > 0) {
      this.isLoading = false;
      return;
    }

    const w = window as unknown as {
      Redoc?: { init: (...args: any[]) => void };
    };

    if (!w.Redoc) {
      if (this.attemptCount < 20) {
        this.attemptCount++;
        this.initTimer = setTimeout(() => this.initRedoc(), 300);
      } else {
        this.isLoading = false;
        this.loadError =
          "Failed to load ReDoc engine. Please check connection or refresh.";
        this.cdr.detectChanges();
      }
      return;
    }

    this.http.get("assets/api-docs/openapi.json").subscribe({
      next: (spec: any) => {
        try {
          const rootStyle = getComputedStyle(document.documentElement);
          const primaryColor500 =
            rootStyle.getPropertyValue("--color-primary-500").trim() ||
            rootStyle.getPropertyValue("--fuse-primary-500").trim() ||
            rootStyle.getPropertyValue("--fuse-primary").trim() ||
            "#13355a";

          Redoc.init(
            spec,
            {
              hideHostname: true,
              expandResponses: "200,201",
              theme: {
                colors: {
                  primary: {
                    main: primaryColor500,
                  },
                },
                typography: {
                  fontSize: "14px",
                  fontFamily: "Inter, sans-serif",
                  headings: {
                    fontFamily: "Inter, sans-serif",
                  },
                },
              },
            },
            container,
          );

          this.redocInitialized = true;
          this.isLoading = false;
          this.cdr.detectChanges();
        } catch (err: any) {
          this.isLoading = false;
          this.loadError =
            err?.message || "Error initializing API documentation";
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.loadError =
          "Failed to load OpenAPI spec file: " +
          (err?.message || "404 Not Found");
        this.cdr.detectChanges();
      },
    });
  }
}
