export interface GitHubConfig {
  owner: string;
  repo: string;
  path: string; // e.g., "DailyNotes/" or ""
  token: string;
}

export interface NewsSummary {
  date: string;
  content: string;
  sources: Array<{ title: string; uri: string }>;
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  SYNCING = 'SYNCING',
  SYNC_SUCCESS = 'SYNC_SUCCESS',
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}