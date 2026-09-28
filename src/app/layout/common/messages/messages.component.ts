import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from "@angular/core";
import { Overlay, OverlayRef } from "@angular/cdk/overlay";
import { TemplatePortal } from "@angular/cdk/portal";
import { MatButton } from "@angular/material/button";
import { Subject, takeUntil } from "rxjs";
import { Message } from "app/layout/common/messages/messages.types";
import { MessagesService } from "app/layout/common/messages/messages.service";
import { NotificationService } from "app/core/notification/notification.service";
import { MatDialog } from "@angular/material/dialog";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { SupportTicketService } from "app/core/support/support-ticket.service";

@Component({
  standalone: false,
  selector: "messages",
  templateUrl: "./messages.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: "messages",
})
export class MessagesComponent implements OnInit, OnDestroy {
  @ViewChild("messagesOrigin") private _messagesOrigin: MatButton;
  @ViewChild("messagesPanel") private _messagesPanel: TemplateRef<any>;

  messages: any;
  unreadCount = 0;
  /** Ticket unread count — merged into the same bell badge */
  private _ticketUnreadCount = 0;
  /** AMZ notification unread count */
  private _notifUnreadCount = 0;
  message: any;
  private _overlayRef: OverlayRef;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  get notifyRoute(): string[] {
    const sellerId = this._userSessionService.getCurrentSellerId();
    if (sellerId) {
      return [`/${sellerId}/master/notify-inventory`];
    }
    const currentUser = this._userSessionService.getCurrentUser();
    if (
      currentUser?.id &&
      !currentUser?.isSuperAdmin &&
      !currentUser?.isPremisesUser
    ) {
      return [`/${currentUser.id}/master/notify-inventory`];
    }
    return ["/master/notify-inventory"];
  }

  /**
   * Constructor
   */
  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _messagesService: MessagesService,
    private _notificationsService: NotificationService,
    private _userSessionService: UserSessionsService,
    private _overlay: Overlay,
    private _matDialog: MatDialog,
    private _viewContainerRef: ViewContainerRef,
    private _supportTicketService: SupportTicketService,
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Subscribe to AMZ notification changes
    this._notificationsService
      .getAllNotification()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((notifications: any) => {
        this.messages = notifications?.data || [];
        this._notifUnreadCount = notifications?.count || 0;
        this._calculateUnreadCount();
        this._changeDetectorRef.markForCheck();
      });

    // Merge ticket unread counts into the same bell badge
    this._supportTicketService.totalUnread$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((ticketUnread: number) => {
        this._ticketUnreadCount = ticketUnread;
        this._calculateUnreadCount();
        this._changeDetectorRef.markForCheck();
      });

    // Load initial ticket summary for unread count
    this._supportTicketService
      .getSummary()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();

    // Dispose the overlay
    if (this._overlayRef) {
      this._overlayRef.dispose();
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Open the messages panel
   */
  openPanel(): void {
    // Return if the messages panel or its origin is not defined
    if (!this._messagesPanel || !this._messagesOrigin) {
      return;
    }

    // Create the overlay if it doesn't exist
    if (!this._overlayRef) {
      this._createOverlay();
    }

    // Attach the portal to the overlay
    this._overlayRef.attach(
      new TemplatePortal(this._messagesPanel, this._viewContainerRef),
    );
  }

  /**
   * Close the messages panel
   */
  closePanel(): void {
    this._overlayRef?.detach();
  }

  /**
   * Mark all messages as read
   */
  markAllAsRead(): void {
    // Mark all as read
    this._messagesService
      .markAllAsRead()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  /**
   * Toggle read status of the given message
   */
  toggleRead(message: Message): void {
    // Toggle the read status
    message.read = !message.read;

    // Update the message
    this._messagesService
      .update(message.id, message)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  /**
   * Delete the given message
   */
  delete(message: Message): void {
    // Delete the message
    this._messagesService
      .delete(message.id)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  /**
   * Track by function for ngFor loops
   *
   * @param index
   * @param item
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Create the overlay
   */
  private _createOverlay(): void {
    // Create the overlay
    this._overlayRef = this._overlay.create({
      hasBackdrop: true,
      backdropClass: "fuse-backdrop-on-mobile",
      scrollStrategy: this._overlay.scrollStrategies.block(),
      positionStrategy: this._overlay
        .position()
        .flexibleConnectedTo(this._messagesOrigin._elementRef.nativeElement)
        .withLockedPosition(true)
        .withPush(true)
        .withPositions([
          {
            originX: "start",
            originY: "bottom",
            overlayX: "start",
            overlayY: "top",
          },
          {
            originX: "start",
            originY: "top",
            overlayX: "start",
            overlayY: "bottom",
          },
          {
            originX: "end",
            originY: "bottom",
            overlayX: "end",
            overlayY: "top",
          },
          {
            originX: "end",
            originY: "top",
            overlayX: "end",
            overlayY: "bottom",
          },
        ]),
    });

    // Detach the overlay from the portal on backdrop click
    this._overlayRef
      .backdropClick()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this._overlayRef.detach();
      });
  }

  /**
   * Calculate the unread count
   *
   * @private
   */
  private _calculateUnreadCount(): void {
    // Sum AMZ notification count + ticket unread count into one badge
    const notifCount = this._notifUnreadCount || (this.messages?.count ?? 0);
    this.unreadCount = notifCount + this._ticketUnreadCount;
  }
}
