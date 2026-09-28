import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { ExtraOptions, PreloadAllModules, RouterModule } from "@angular/router";
import { FuseModule } from "@fuse";
import { FuseConfigModule } from "@fuse/services/config";
import { CoreModule } from "app/core/core.module";
import { appConfig } from "app/core/config/app.config";
import { LayoutModule } from "app/layout/layout.module";
import { AppComponent } from "app/app.component";
import { appRoutes } from "app/app.routing";
import { MatIconRegistry } from "@angular/material/icon";
import { DomSanitizer } from "@angular/platform-browser";
import {
  MatPaginatorIntl,
  MAT_PAGINATOR_DEFAULT_OPTIONS,
} from "@angular/material/paginator";
import { CustomPaginatorIntl } from "app/shared/custom-paginator-intl";

import { MAT_DATE_LOCALE, MatNativeDateModule } from "@angular/material/core";
import { DatePipe } from "@angular/common";
import { MatSnackBarModule } from "@angular/material/snack-bar";

const routerConfig: ExtraOptions = {
  preloadingStrategy: PreloadAllModules,
  scrollPositionRestoration: "enabled",
};

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(appRoutes, routerConfig),
    MatSnackBarModule,
    MatNativeDateModule,

    // Fuse, FuseConfig & FuseMockAPI
    FuseModule,
    FuseConfigModule.forRoot(appConfig),

    // Core module of your application
    CoreModule,

    // Layout module of your application
    LayoutModule,
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: CustomPaginatorIntl },
    {
      provide: MAT_PAGINATOR_DEFAULT_OPTIONS,
      useValue: { pageSizeOptions: [5, 25, 50, 100] },
    },
    { provide: MAT_DATE_LOCALE, useValue: "en-GB" },
    DatePipe,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer,
  ) {
    this.matIconRegistry.addSvgIcon(
      "wrench-screwdriver",
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        "assets/icons/wrench-screwdriver.svg",
      ),
    );
  }
}
