import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '../api';
import { SyncJob } from '../types';
import {
  Mail,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  RotateCw,
  Search,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export const FetchEmailsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<'gmail' | 'microsoft365'>('gmail');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterBy, setFilterBy] = useState('issue_date');
  const [folderFilter, setFolderFilter] = useState('INBOX');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Preview state
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Active Job Polling
  const { data: currentJob, refetch: refetchJob } = useQuery({
    queryKey: ['active-sync-job', activeJobId],
    queryFn: () => (activeJobId ? syncApi.getJob(activeJobId) : null),
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const data = query.state.data as SyncJob | null | undefined;
      if (!data) return false;
      return ['pending', 'running'].includes(data.status) ? 2000 : false;
    },
  });

  // Recent sync jobs
  const { data: recentJobs, refetch: refetchRecentJobs } = useQuery({
    queryKey: ['recent-sync-jobs'],
    queryFn: () => syncApi.listJobs(10),
  });

  const syncMutation = useMutation({
    mutationFn: syncApi.createJob,
    onSuccess: (job) => {
      setActiveJobId(job.id);
      queryClient.invalidateQueries({ queryKey: ['recent-sync-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: syncApi.retryJob,
    onSuccess: (job) => {
      setActiveJobId(job.id);
      queryClient.invalidateQueries({ queryKey: ['recent-sync-jobs'] });
    },
  });

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const res = await syncApi.preview({
        provider,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        folder_filter: folderFilter,
        subject_filter: subjectFilter || undefined,
      });
      setPreviewData(res);
    } catch (err: any) {
      alert(`Preview failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleStartSync = () => {
    syncMutation.mutate({
      provider,
      start_date: startDate,
      end_date: endDate,
      filter_by: filterBy,
      folder_filter: folderFilter,
      subject_filter: subjectFilter || undefined,
    });
  };

  const isJobRunning = currentJob && ['pending', 'running'].includes(currentJob.status);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Configuration Header Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Synchronize Support Mailbox</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Fetch emails via OAuth, extract issues using Fireworks AI, and persist records in Neon PostgreSQL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Provider:</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="gmail">Google Gmail (OAuth2)</option>
              <option value="microsoft365">Microsoft 365 (Graph API)</option>
            </select>
          </div>
        </div>

        {/* Parameters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date Filter Strategy</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none font-medium"
            >
              <option value="issue_date">Original Issue Date (Recommended)</option>
              <option value="activity_date">Support Activity Date</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject Filter (Optional)</label>
            <input
              type="text"
              placeholder="e.g. eFeap, Access, SR"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={handlePreview}
            disabled={isPreviewing || isJobRunning}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isPreviewing ? 'Inspecting Mailbox...' : 'Preview Matching Emails'}</span>
          </button>

          <button
            onClick={handleStartSync}
            disabled={isJobRunning || syncMutation.isPending}
            className="flex items-center gap-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 px-5 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isJobRunning ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Synchronizing Thread Contexts...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Fetch Emails & Extract Issues</span>
              </>
            )}
          </button>
        </div>

        {/* Email Preview Drawer if available */}
        {previewData && (
          <div className="mt-4 p-4 bg-teal-50/60 rounded-lg border border-teal-200/80 text-xs">
            <div className="flex items-center justify-between font-semibold text-teal-900 mb-1">
              <span>Mailbox Match Preview ({previewData.total_emails_matched} conversations found)</span>
              <button onClick={() => setPreviewData(null)} className="text-teal-700 hover:underline text-[11px]">Dismiss</button>
            </div>
            <p className="text-[11px] text-teal-700 mb-2">Sample conversation threads ready for AI ingestion:</p>
            <ul className="list-disc pl-4 space-y-1 text-slate-700 text-[11px]">
              {previewData.sample_subjects?.map((sub: string, i: number) => (
                <li key={i}>{sub}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Real-Time Sync Execution & Progress Card */}
      {currentJob && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  currentJob.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : currentJob.status === 'running'
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : currentJob.status === 'partially_completed'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {currentJob.status === 'running' && <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>}
                {currentJob.status.toUpperCase()}
              </span>
              <span className="text-xs text-slate-500 font-mono">Job ID: {currentJob.id}</span>
            </div>

            {currentJob.status === 'failed' && (
              <button
                onClick={() => retryMutation.mutate(currentJob.id)}
                className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 font-semibold"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Retry Failed Job
              </button>
            )}
          </div>

          {/* Counts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[11px] text-slate-500 font-medium">Conversations Found</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{currentJob.total_found}</p>
            </div>
            <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
              <p className="text-[11px] text-emerald-700 font-medium">Newly Tracked</p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">{currentJob.newly_tracked_count}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[11px] text-slate-500 font-medium">Processed / Updated</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{currentJob.processed_count}</p>
            </div>
            <div className="bg-rose-50/60 p-3 rounded-lg border border-rose-100">
              <p className="text-[11px] text-rose-700 font-medium">Failed Items</p>
              <p className="text-lg font-bold text-rose-700 mt-0.5">{currentJob.failed_count}</p>
            </div>
          </div>

          {/* Execution Log Console */}
          <div className="bg-slate-950 p-3.5 rounded-lg font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto space-y-1">
            <div className="text-slate-500 text-[10px] pb-1 border-b border-slate-800">
              LIVE PERSISTENT EXECUTION LOGS
            </div>
            {currentJob.log_events?.map((ev, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                <span className={ev.level === 'ERROR' ? 'text-rose-400' : ev.level === 'WARN' ? 'text-amber-400' : 'text-teal-400'}>
                  [{ev.level}]
                </span>
                <span>{ev.message}</span>
              </div>
            ))}
          </div>

          {/* Extracted Issues from this Job */}
          {currentJob.extracted_issues && currentJob.extracted_issues.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-900 mb-2">Extracted Issues in this Run</h4>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">User SR No</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Raised By</th>
                      <th className="p-2.5">Resolution Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentJob.extracted_issues.map((iss) => (
                      <tr key={iss.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium">{iss.issue_date}</td>
                        <td className="p-2.5 font-mono text-teal-700">{iss.user_sr_no || 'Pending Review'}</td>
                        <td className="p-2.5">{iss.type_of_issue}</td>
                        <td className="p-2.5 text-slate-600">{iss.issue_raised_by}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              iss.resolution_status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {iss.resolution_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sync Jobs History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Synchronization History</h3>
          <button
            onClick={() => refetchRecentJobs()}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Job ID</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Date Range</th>
                <th className="p-3">Status</th>
                <th className="p-3">Tracked</th>
                <th className="p-3">Executed At</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentJobs?.items && recentJobs.items.length > 0 ? (
                recentJobs.items.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-[11px] text-slate-600">{job.id.substring(0, 8)}...</td>
                    <td className="p-3 capitalize font-medium">{job.provider}</td>
                    <td className="p-3 text-slate-600">{job.start_date} to {job.end_date}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          job.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.status === 'running'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-teal-700">{job.newly_tracked_count}</td>
                    <td className="p-3 text-slate-500">{new Date(job.created_at).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setActiveJobId(job.id)}
                        className="text-teal-600 hover:text-teal-800 font-semibold text-xs"
                      >
                        View Logs
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No sync jobs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

