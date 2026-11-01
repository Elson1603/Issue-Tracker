export interface Issue {
  id: string;
  thread_id?: string | null;
  source_message_id?: string | null;
  issue_date: string;
  user_sr_no?: string | null;
  issue_raised_by?: string | null;
  application_name?: string | null;
  type_of_issue: string;
  issue_details: string;
  resolution?: string | null;
  time_received?: string | null;
  time_resolved?: string | null;
  resolution_by?: string | null;
  socurce: string;
  resolved_by?: string | null;
  resolution_status: string;
  resolution_evidence?: string | null;
  confidence: number;
  needs_review: boolean;
  review_reason?: string | null;
  extraction_status: string;
  ai_model?: string | null;
  created_at: string;
  updated_at: string;
  audits?: IssueAudit[];
}

export interface IssueAudit {
  id: string;
  issue_id: string;
  changed_by: string;
  changes: Record<string, { old: string | null; new: string | null }>;
  reason?: string | null;
  created_at: string;
}

export interface IssueListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: Issue[];
}

export interface SavedReport {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  date_filter_type: string;
  total_issues: number;
  resolved_count: number;
  open_count: number;
  review_required_count: number;
  category_counts: Record<string, number>;
  file_name: string;
  file_size_bytes: number;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReportDetail extends SavedReport {
  issues: IssueSnapshot[];
  application_breakdown: Record<string, number>;
  team_breakdown: Record<string, number>;
  daily_breakdown: Record<string, number>;
}

export interface IssueSnapshot {
  id: string;
  issue_date: string;
  user_sr_no?: string | null;
  issue_raised_by?: string | null;
  application_name?: string | null;
  type_of_issue: string;
  issue_details: string;
  resolution?: string | null;
  time_received?: string | null;
  time_resolved?: string | null;
  resolution_by?: string | null;
  socurce: string;
  resolved_by?: string | null;
  resolution_status: string;
  resolution_evidence?: string | null;
  needs_review: boolean;
  review_reason?: string | null;
}

export interface ReportListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: SavedReport[];
}

export interface SyncJob {
  id: string;
  provider: string;
  status: 'pending' | 'running' | 'completed' | 'partially_completed' | 'failed';
  start_date?: string | null;
  end_date?: string | null;
  filter_by: string;
  total_found: number;
  processed_count: number;
  skipped_count: number;
  failed_count: number;
  newly_tracked_count: number;
  error_message?: string | null;
  log_events: Array<{ timestamp: string; level: string; message: string }>;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  extracted_issues?: Issue[];
}

export interface SyncJobListResponse {
  total: number;
  items: SyncJob[];
}

export interface DashboardSummary {
  total_issues: number;
  period_issues: number;
  resolved_issues: number;
  open_issues: number;
  review_required_issues: number;
  total_reports: number;
  sync_jobs_running: number;
  recent_reports: SavedReport[];
  recent_sync_jobs: SyncJob[];
  category_counts: Record<string, number>;
  status_counts: Record<string, number>;
}

export interface TrendDataPoint {
  date: string;
  total: number;
  resolved: number;
  open: number;
}

