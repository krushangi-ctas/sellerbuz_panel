import { takeUntil } from "rxjs";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  QueryList,
  TemplateRef,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Router } from "@angular/router";
import { FuseAlertService } from "@fuse/components/alert";
import { AlertService } from "app/core/alert/alert.service";
import { Contact, ContactFilter } from "app/core/manage-contact/contact.model";
import { ContactService } from "app/core/manage-contact/contact.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import { Observable, Subject, debounceTime, map, merge, switchMap } from "rxjs";

@Component({
  standalone: false,
  selector: "app-contact",
  templateUrl: "./contact.component.html",
  styleUrls: ["./contact.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;
  @ViewChild("messagePopup") messagePopup: TemplateRef<any>;

  isLoading: boolean = false;
  isSending: boolean = false;
  pagination: any;
  searchInputControl: FormControl = new FormControl();
  contactFormInput: Observable<Contact[]>;
  contacts: Contact[] = [];
  tmpQry: string = "";
  filterQry: ContactFilter = {};
  contactSearchFormGroup: FormGroup;
  selectedContact: Contact | null = null;
  replyMessage: string = "";
  pageLimit: number = Constants.pageLimit;
  pageOptions: number[] = Constants.pageOptions;
  tooltip = Constants.contactDetails;

  readonly statusMap: Record<number, { label: string; class: string }> = {
    0: { label: "New", class: "bg-blue-100 text-blue-800" },
    1: { label: "Read", class: "bg-yellow-100 text-yellow-800" },
    2: { label: "Replied", class: "bg-green-100 text-green-800" },
  };

  readonly inquiryTypeMap: Record<string, { label: string; class: string }> = {
    sales: { label: "Sales", class: "bg-purple-100 text-purple-800" },
    support: { label: "Support", class: "bg-red-100 text-red-800" },
    partnership: {
      label: "Partnership",
      class: "bg-indigo-100 text-indigo-800",
    },
    general: { label: "General", class: "bg-gray-100 text-gray-700" },
  };

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _contactService: ContactService,
    private _router: Router,
    private _fuseAlertService: FuseAlertService,
    private _formBuilder: FormBuilder,
    private _alertService: AlertService,
    private _navigationService: NavigationService,
    private _matDialog: MatDialog,
  ) {
    if (
      !this._navigationService.isSuperAdmin &&
      !this._navigationService.isPremisesUser
    ) {
      this._router.navigate(["/404-not-found"]);
    }
  }

  ngOnInit(): void {
    this._contactService.contacts$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((contacts: Contact[]) => {
        this.contacts = contacts || [];
      });

    this._contactService
      .getContacts()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    this._contactService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination) => {
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });

    this.contactFormInput = this._contactService.contacts$;

    this.contactSearchFormGroup = this._formBuilder.group({
      status: [""],
      inquiry_type: [""],
    });

    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.tmpQry = (query || "").trim();
          this.isLoading = true;
          return this._contactService.getContacts(
            1,
            getPageSize(this._paginators?.first),
            "createdAt",
            "desc",
            this.tmpQry,
            this.filterQry,
          );
        }),
        map(() => {
          this.isLoading = false;
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    this.contactSearchFormGroup.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.filterQry = query;
          this.isLoading = true;
          return this._contactService.getContacts(
            1,
            getPageSize(this._paginators?.first),
            "createdAt",
            "desc",
            this.tmpQry,
            this.filterQry,
          );
        }),
        map(() => {
          this.isLoading = false;
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  ngAfterViewInit(): void {
    this._paginators.changes
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.setupSortAndPagination();
      });
    this.setupSortAndPagination();
  }

  setupSortAndPagination(): void {
    if (this._sort && this._paginators?.first) {
      this._changeDetectorRef.markForCheck();

      this._sort.sortChange
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          if (this._paginators?.first) {
            this._paginators.first.pageIndex = 0;
          }
        });

      merge(this._sort.sortChange, this._paginators.first.page)
        .pipe(
          switchMap(() => {
            this.isLoading = true;
            const page = (this._paginators?.first?.pageIndex ?? 0) + 1;
            const size = getPageSize(this._paginators?.first);
            return this._contactService.getContacts(
              page,
              size,
              this._sort?.active || "createdAt",
              this._sort?.direction || "desc",
              this.tmpQry,
              this.filterQry,
            );
          }),
          map(() => {
            this.isLoading = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe();
    }
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  refresh(): void {
    this.searchInputControl.setValue("");
    this.contactSearchFormGroup.get("status")?.setValue("");
    this.contactSearchFormGroup.get("inquiry_type")?.setValue("");
  }

  getContacts(): void {
    this.tmpQry = this.searchInputControl.value || "";
    this.filterQry = this.contactSearchFormGroup.value || {};
    this._contactService
      .getContacts(
        1,
        getPageSize(this._paginators?.first),
        "createdAt",
        "desc",
        this.tmpQry,
        this.filterQry,
      )
      .pipe(
        takeUntil(this._unsubscribeAll),
        map(() => {
          this.contactFormInput = this._contactService.contacts$;
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  openMessage(contact: Contact): void {
    this.selectedContact = contact;
    this.replyMessage = "";

    if (contact.status === 0) {
      this._contactService
        .updateContactStatus(contact._id, 1)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          contact.status = 1;
          this._changeDetectorRef.markForCheck();
        });
    }

    this._matDialog.open(this.messagePopup, {
      width: "700px",
      maxWidth: "95vw",
      panelClass: "contact-message-dialog",
    });
  }

  closeDialog(): void {
    this._matDialog.closeAll();
    this.selectedContact = null;
    this.replyMessage = "";
  }

  sendReply(): void {
    if (!this.selectedContact || !this.replyMessage?.trim()) return;

    const contactId =
      this.selectedContact._id || (this.selectedContact as any).id;
    if (!contactId) return;

    this.isSending = true;
    this._contactService
      .replyToContact(contactId, this.replyMessage.trim())
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response) => {
          this.isSending = false;
          if (response.data) {
            const updated: Contact = {
              ...response.data,
              _id: response.data._id || (response.data as any).id || contactId,
            };
            this.selectedContact = updated;
            this.contacts = this.contacts.map((c) =>
              c._id === updated._id || (c as any).id === updated._id
                ? updated
                : c,
            );
          } else {
            if (this.selectedContact) {
              this.selectedContact.status = 2;
            }
          }
          this.replyMessage = "";
          this._alertService.message = "Reply sent successfully!";
          this._fuseAlertService.show("alert_success");
          setTimeout(
            () => this._fuseAlertService.dismiss("alert_success"),
            2500,
          );
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isSending = false;
          this._alertService.message = "Failed to send reply.";
          this._fuseAlertService.show("alert_error");
          setTimeout(() => this._fuseAlertService.dismiss("alert_error"), 2500);
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
