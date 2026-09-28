import { Component, OnInit } from "@angular/core";
import { UserSessionsService } from "./core/session/user-sessions.service";
import { Router } from "@angular/router";
// import { AuthService } from './core/auth/auth.service';

@Component({
  standalone: false,
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  /**
   * Constructor
   */
  constructor(
    private _userSessionService: UserSessionsService,
    private _router: Router,
  ) {}
  ngOnInit(): void {
    // setInterval(() => {
    //     return this._authService._checkToken().subscribe();
    // }, 3000);
    const urlSegments = this._router.url.split("/");
    const potentialId = urlSegments[1];

    if (potentialId && /^[a-f\d]{24}$/i.test(potentialId)) {
      this._userSessionService.setActiveSellerId(potentialId);
    }
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
