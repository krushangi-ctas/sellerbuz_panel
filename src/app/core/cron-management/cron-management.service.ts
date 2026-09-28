import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { Observable } from "rxjs";

export interface CronItem {
  cron_name: string;
  display_name: string;
  domain: string;
  schedule: string;
  enabled: boolean;
  running: boolean;
  lastRun?: Date | string;
  lastSuccess?: Date | string;
  lastError?: string;
  totalExecutions: number;
  totalFailures: number;
}

@Injectable({
  providedIn: "root",
})
export class CronManagementService {
  constructor(private readonly _httpClient: HttpClient) {}

  /**
   * Get listing of all 14 crons with status
   */
  getCronsList(): Observable<{
    status: number;
    data: CronItem[];
    message: string;
  }> {
    return this._httpClient.get<{
      status: number;
      data: CronItem[];
      message: string;
    }>(`${environment.apiBaseUrl}/crons/list`);
  }

  /**
   * Start / Enable a cron job
   */
  startCron(cronName: string): Observable<any> {
    return this._httpClient.post(
      `${environment.apiBaseUrl}/crons/start/${cronName}`,
      {},
    );
  }

  /**
   * Stop / Disable a cron job
   */
  stopCron(cronName: string): Observable<any> {
    return this._httpClient.post(
      `${environment.apiBaseUrl}/crons/stop/${cronName}`,
      {},
    );
  }

  /**
   * Run a cron job immediately
   */
  runCron(cronName: string): Observable<any> {
    return this._httpClient.post(
      `${environment.apiBaseUrl}/crons/run/${cronName}`,
      {},
    );
  }

  /**
   * Schedule a cron job to run once after delay (in seconds)
   */
  runCronAfterDelay(cronName: string, delaySeconds: number): Observable<any> {
    return this._httpClient.post(
      `${environment.apiBaseUrl}/crons/delay-run/${cronName}`,
      { delaySeconds },
    );
  }

  /**
   * Get Cron execution logs
   */
  getCronLogs(
    page: number = 1,
    limit: number = 10,
    search: string = "",
  ): Observable<any> {
    return this._httpClient.get(`${environment.apiBaseUrl}/crons/logs`, {
      params: {
        page: page.toString(),
        limit: limit.toString(),
        search,
      },
    });
  }
}
