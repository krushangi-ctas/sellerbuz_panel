import {
  TranslocoModule,
  TranslocoService,
  translocoConfig,
  provideTransloco,
} from "@ngneat/transloco";
import { APP_INITIALIZER, NgModule } from "@angular/core";
import { TranslocoHttpLoader } from "app/core/transloco/transloco.http-loader";

@NgModule({
  exports: [TranslocoModule],
  providers: [
    provideTransloco({
      config: translocoConfig({
        availableLangs: [
          { id: "en", label: "English" },
          { id: "tr", label: "Turkish" },
        ],
        defaultLang: "en",
        fallbackLang: "en",
        reRenderOnLangChange: true,
        prodMode: true,
      }),
      loader: TranslocoHttpLoader,
    }),
    {
      provide: APP_INITIALIZER,
      deps: [TranslocoService],
      useFactory:
        (translocoService: TranslocoService): any =>
        (): Promise<any> => {
          return Promise.resolve();
        },
      multi: true,
    },
  ],
})
export class TranslocoCoreModule {}
