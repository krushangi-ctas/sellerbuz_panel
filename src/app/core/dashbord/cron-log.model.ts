export interface cronLogModel {
  _id?: string;
  title: string;
  cron_time: string;
  isRunning: boolean;
  isExecuted: boolean;
  startTime: Date;
  endTime: Date;
  cronName?: string;
  subtitle?: string;
  icon?: string;
  scheduleLabel?: string;
  scheduleSub?: string;
  statusText?: string;
  duration?: string;
  nextRun?: Date | string;
}
