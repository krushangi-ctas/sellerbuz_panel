import { Injectable, OnDestroy } from "@angular/core";
import { environment } from "environments/environment";
import { Observable, Subject } from "rxjs";
import { io, Socket } from "socket.io-client";

export interface FileProgressEvent {
  type: "progress" | "completed" | "failed";
  fileId: string;
  sellerId: string;
  processed?: number;
  total?: number;
  percentage?: number;
  totalSuccess?: number;
  totalFail?: number;
  error?: string;
}

@Injectable({
  providedIn: "root",
})
export class FileProgressService implements OnDestroy {
  private socket: Socket | null = null;
  private _fileProgress$: Subject<FileProgressEvent> =
    new Subject<FileProgressEvent>();
  private currentSellerId: string = "";

  get fileProgress$(): Observable<FileProgressEvent> {
    return this._fileProgress$.asObservable();
  }

  connect(sellerId: string): void {
    if (
      this.socket &&
      this.currentSellerId === sellerId &&
      this.socket.connected
    ) {
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.currentSellerId = sellerId;
    const socketUrl =
      environment.uploadPath || environment.apiBaseUrl.replace(/\/v1\/?$/, "/");

    this.socket = io(`${socketUrl}file-progress`, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      if (this.currentSellerId) {
        this.socket.emit("join", { sellerId: this.currentSellerId });
      }
    });

    this.socket.on("file_progress", (data: any) => {
      this._fileProgress$.next({
        type: "progress",
        fileId: data.fileId,
        sellerId: data.sellerId,
        processed: data.processed,
        total: data.total,
        percentage: data.percentage,
      });
    });

    this.socket.on("file_completed", (data: any) => {
      this._fileProgress$.next({
        type: "completed",
        fileId: data.fileId,
        sellerId: data.sellerId,
        totalSuccess: data.totalSuccess,
        totalFail: data.totalFail,
        total: data.totalRecord,
      });
    });

    this.socket.on("file_failed", (data: any) => {
      this._fileProgress$.next({
        type: "failed",
        fileId: data.fileId,
        sellerId: data.sellerId,
        error: data.error,
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
