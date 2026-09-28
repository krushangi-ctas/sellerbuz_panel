import { Component, Input } from "@angular/core";
import {
  TicketMessage,
  TicketAttachment,
} from "app/core/support/support-ticket.model";
import { environment } from "environments/environment";

/**
 * ChatMessageBubbleComponent — renders a single message bubble.
 * Outgoing messages (sent by the currently logged-in user / side) appear on the RIGHT.
 * Incoming messages (sent by the other party) appear on the LEFT.
 * Internal notes get a distinct styled warm yellow theme (admin only).
 */
@Component({
  standalone: false,
  selector: "app-chat-message-bubble",
  template: `
    <div
      class="bubble-wrapper flex items-start gap-2.5 my-2 px-1 sm:px-2 transition-all"
      [class.flex-row-reverse]="isOutgoing"
      [class.flex-row]="!isOutgoing"
    >
      <!-- Avatar -->
      <div
        class="avatar flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-extrabold text-[11px] shadow-xs select-none mt-0.5"
      >
        {{ avatarInitial }}
      </div>

      <!-- Bubble Container -->
      <div
        class="bubble-container max-w-[92%] sm:max-w-[85%] md:max-w-[78%] flex flex-col gap-0.5"
      >
        <!-- Header: Sender Name only (Role badge removed) -->
        <div
          class="bubble-header flex items-center gap-2 px-1 text-[11px] select-none"
          [class.justify-end]="isOutgoing"
          [class.justify-start]="!isOutgoing"
        >
          <span class="font-bold text-slate-900">{{ senderLabel }}</span>
        </div>

        <!-- Bubble Box -->
        <div
          class="bubble relative px-3.5 py-2 rounded-xl text-xs leading-normal shadow-2xs transition-all duration-200"
          [class.bg-primary/10]="isOutgoing"
          [class.border]="isOutgoing"
          [class.border-primary/20]="isOutgoing"
          [class.text-slate-900]="isOutgoing"
          [class.rounded-tr-xs]="isOutgoing"
          [class.bg-white]="!isOutgoing"
          [class.text-slate-900]="!isOutgoing"
          [class.border]="!isOutgoing"
          [class.border-slate-200/90]="!isOutgoing"
          [class.rounded-tl-xs]="!isOutgoing"
        >
          <!-- Message Text -->
          <div
            class="bubble-text text-xs font-sans tracking-tight leading-normal break-words whitespace-pre-wrap select-text text-slate-800"
          >
            {{ message.message }}
          </div>

          <!-- Attachments preview -->
          @if (message.attachments?.length > 0) {
            <div
              class="bubble-attachments mt-1.5 flex flex-col gap-1.5 pt-1.5 border-t border-slate-200/60"
            >
              @for (att of message.attachments; track att.url) {
                @if (isImage(att)) {
                  <div
                    class="attachment-media my-0.5 overflow-hidden rounded-lg border border-black/10 shadow-2xs"
                  >
                    <div
                      (click)="openImagePreview(att, $event)"
                      class="block relative group overflow-hidden bg-black/5 cursor-pointer"
                    >
                      <img
                        [src]="getFileUrl(att.url)"
                        [alt]="att.fileName"
                        class="max-h-56 w-auto max-w-full rounded-md object-contain transition-transform duration-200 group-hover:scale-[1.01]"
                        loading="lazy"
                      />
                      <div
                        class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"
                      >
                        <mat-icon
                          class="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow"
                          >zoom_in</mat-icon
                        >
                      </div>
                    </div>
                    <div
                      class="flex items-center justify-between gap-2 px-2 py-0.5 text-[10.5px] font-medium transition-colors select-none bg-slate-100 text-slate-700"
                    >
                      <span
                        class="truncate max-w-[180px] sm:max-w-[240px] cursor-pointer hover:underline"
                        (click)="openImagePreview(att, $event)"
                        >{{ att.fileName }}</span
                      >
                      <button
                        type="button"
                        (click)="openImagePreview(att, $event)"
                        class="hover:opacity-80 flex items-center gap-0.5 cursor-pointer"
                        title="Preview image"
                      >
                        <mat-icon class="icon-size-3">zoom_in</mat-icon>
                      </button>
                    </div>
                  </div>
                } @else if (isVideo(att)) {
                  <div
                    class="attachment-media my-0.5 overflow-hidden rounded-lg border border-black/10 shadow-2xs"
                  >
                    <video
                      [src]="getFileUrl(att.url)"
                      controls
                      class="max-h-56 w-auto max-w-full rounded-md bg-slate-950"
                    ></video>
                    <div
                      class="flex items-center justify-between gap-2 px-2 py-0.5 text-[10.5px] font-medium transition-colors bg-slate-100 text-slate-700"
                    >
                      <span class="truncate max-w-[180px] sm:max-w-[240px]">{{
                        att.fileName
                      }}</span>
                      <a
                        [href]="getFileUrl(att.url)"
                        target="_blank"
                        class="hover:underline flex items-center gap-0.5"
                      >
                        <mat-icon class="icon-size-3">open_in_new</mat-icon>
                      </a>
                    </div>
                  </div>
                } @else {
                  <a
                    [href]="getFileUrl(att.url)"
                    target="_blank"
                    class="attachment-card flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-all group"
                  >
                    <div class="flex items-center gap-1.5 truncate">
                      <mat-icon class="icon-size-3 flex-shrink-0"
                        >attach_file</mat-icon
                      >
                      <span
                        class="truncate max-w-[180px] sm:max-w-[240px] text-[10.5px]"
                        >{{ att.fileName }}</span
                      >
                    </div>
                    <mat-icon
                      class="icon-size-3 opacity-75 group-hover:opacity-100 transition-all flex-shrink-0"
                      >open_in_new</mat-icon
                    >
                  </a>
                }
              }
            </div>
          }

          <!-- Footer: Time only (Compact) -->
          <div
            class="bubble-footer flex items-center justify-end gap-1 mt-0.5 text-[9.5px] text-slate-400 font-medium select-none"
          >
            <span>{{ message.createdAt | date: "hh:mm a" }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Preview Popup Box Dialog -->
    @if (previewModalAtt) {
      <div
        class="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200 select-none"
        (click)="closeImagePreview()"
      >
        <div
          class="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-[92vw] max-h-[92vh] animate-in zoom-in-95 duration-200"
          (click)="$event.stopPropagation()"
        >
          <!-- Popup Box Header -->
          <div
            class="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 select-none"
          >
            <div
              class="flex items-center gap-2 truncate pr-4 text-slate-200 text-xs sm:text-sm font-semibold"
            >
              <mat-icon class="icon-size-4 sm:icon-size-5 text-indigo-400"
                >image</mat-icon
              >
              <span class="truncate max-w-[240px] sm:max-w-[450px]">{{
                previewModalAtt.fileName
              }}</span>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <a
                [href]="getFileUrl(previewModalAtt.url)"
                target="_blank"
                class="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors flex items-center"
                title="Open original file in new tab"
              >
                <mat-icon class="icon-size-4">open_in_new</mat-icon>
              </a>
              <button
                type="button"
                class="p-1.5 text-slate-300 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center"
                (click)="closeImagePreview()"
              >
                <mat-icon class="icon-size-5">close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Popup Box Image Body -->
          <div
            class="p-2 sm:p-4 flex items-center justify-center bg-slate-950 overflow-auto flex-1 min-h-0"
          >
            <img
              [src]="getFileUrl(previewModalAtt.url)"
              [alt]="previewModalAtt.fileName"
              class="max-h-[78vh] max-w-[85vw] object-contain rounded-lg shadow-lg select-none"
            />
          </div>
        </div>
      </div>
    }
  `,
  styles: [],
})
export class ChatMessageBubbleComponent {
  @Input() message!: TicketMessage;
  @Input() isOutgoing: boolean = false;
  @Input() senderLabel: string = "Customer";
  @Input() avatarInitial: string = "C";

  previewModalAtt: TicketAttachment | null = null;

  openImagePreview(att: TicketAttachment, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.previewModalAtt = att;
  }

  closeImagePreview(): void {
    this.previewModalAtt = null;
  }

  getFileUrl(url?: string): string {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const apiOrigin = environment.apiBaseUrl.replace(/\/v1\/?$/, "");
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${apiOrigin}${cleanPath}`;
  }

  isImage(att: TicketAttachment): boolean {
    if (!att) return false;
    if (att.mimeType?.startsWith("image/")) return true;
    const name = att.fileName || att.url || "";
    return /\.(png|jpe?g|gif|webp|svg|bmp|avif|heic)$/i.test(name);
  }

  isVideo(att: TicketAttachment): boolean {
    if (!att) return false;
    if (att.mimeType?.startsWith("video/")) return true;
    const name = att.fileName || att.url || "";
    return /\.(mp4|webm|ogg|mov|m4v|mkv|avi)$/i.test(name);
  }
}
