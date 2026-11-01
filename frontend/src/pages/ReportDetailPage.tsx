import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api';
import {
  FileSpreadsheet,
  Download,
  Trash2,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const PIE_COLORS = ['#0d9488', '#0284c7', '#f59e0b', '#8b5cf6', '#ec4899'];

export const ReportDetailPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report-detail', reportId],
    queryFn: () => (reportId ? reportsApi.getDetail(reportId) : null),
    enabled: !!reportId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => reportsApi.delete(reportId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      navigate('/saved-reports');
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading historical report snapshot...</div>;
  }

  if (error || !report) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm font-semibold text-rose-600">Failed to load report details.</p>
        <button
          onClick={() => navigate('/saved-reports')}
          className="text-xs text-teal-600 hover:underline"
        >
          Return to Saved Reports
        </button>
      </div>
    );
  }

  const categoryChartData = Object.entries(report.category_counts || {}).map(([name, value]) => ({
    name,
    value,
  }));

  const teamChartData = Object.entries(report.team_breakdown || {}).map(([name, value]) => ({
    name,
    count: value,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/saved-reports')}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">{report.name}</h1>
              <span className="text-xs font-mono text-slate-400">({report.id.substring(0, 8)})</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Period: {report.start_date} to {report.end_date} • Created on {new Date(report.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={reportsApi.getDownloadUrl(report.id)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel (.xlsx)</span>
          </a>

          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
            title="Delete this report"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Snapshot Verification Badge */}
      <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl flex items-center justify-between text-xs text-teal-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            <strong>Immutable Historical Snapshot:</strong> This report reflects exactly the {report.total_issues} issues
            captured at generation time, preserving historical reporting integrity.
          </span>
        </div>
        <span className="font-mono text-[11px] text-teal-700">{report.file_name}</span>
      </div>

      {/* Metric Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Issues</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{report.total_issues}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Resolved</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{report.resolved_count}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Open / Pending</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{report.open_count}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Review Flags</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{report.review_required_count}</p>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Issue Category Distribution</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resolution Team Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Resolution Teams</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" name="Issues Handled" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Snapshot Issue Listing */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Issues Included in this Report ({report.issues.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">User SR No</th>
                <th className="p-3">Category</th>
                <th className="p-3">Raised By</th>
                <th className="p-3">Issue Details</th>
                <th className="p-3">Resolution</th>
                <th className="p-3">Resolved By</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.issues.map((iss, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3 font-medium whitespace-nowrap">{iss.issue_date}</td>
                  <td className="p-3 font-mono font-semibold text-teal-700 whitespace-nowrap">
                    {iss.user_sr_no || 'None'}
                  </td>
                  <td className="p-3 whitespace-nowrap font-medium">{iss.type_of_issue}</td>
                  <td className="p-3 text-slate-600 truncate max-w-xs">{iss.issue_raised_by}</td>
                  <td className="p-3 text-slate-600 truncate max-w-sm" title={iss.issue_details}>
                    {iss.issue_details}
                  </td>
                  <td className="p-3 text-slate-700 font-medium whitespace-nowrap">{iss.resolution || '—'}</td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">{iss.resolved_by || '—'}</td>
                  <td className="p-3 whitespace-nowrap">
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-rose-50 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold">Confirm Report Deletion</h3>
            </div>

            <div className="p-6 space-y-3 text-xs text-slate-700">
              <p>
                Delete <span className="font-bold">{report.name}</span>?
              </p>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px]">
                Underlying issues and email synchronization history in PostgreSQL will remain completely intact.
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

