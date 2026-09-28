import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { RouterModule } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatDividerModule } from "@angular/material/divider";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { FuseFullscreenModule } from "@fuse/components/fullscreen";
import { FuseLoadingBarModule } from "@fuse/components/loading-bar";
import { FuseNavigationModule } from "@fuse/components/navigation";
import { LanguagesModule } from "app/layout/common/languages/languages.module";
import { MessagesModule } from "app/layout/common/messages/messages.module";
import { NotificationsModule } from "app/layout/common/notifications/notifications.module";
import { ShortcutsModule } from "app/layout/common/shortcuts/shortcuts.module";
import { UserModule } from "app/layout/common/user/user.module";
import { SharedModule } from "app/shared/shared.module";
import { DenseLayoutComponent } from "app/layout/layouts/vertical/dense/dense.component";
import { FuseAlertModule } from "@fuse/components/alert";

@NgModule({
  declarations: [DenseLayoutComponent],
  imports: [
    HttpClientModule,
    RouterModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    FuseFullscreenModule,
    FuseLoadingBarModule,
    FuseNavigationModule,
    LanguagesModule,
    MessagesModule,
    NotificationsModule,
    ShortcutsModule,
    UserModule,
    SharedModule,
    FuseAlertModule,
  ],
  exports: [DenseLayoutComponent],
})
export class DenseLayoutModule {}
