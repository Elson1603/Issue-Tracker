import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../api';
import { SavedReport } from '../types';
import {
  FileSpreadsheet,
  Download,
  Trash2,
  Eye,
  Plus,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  X
} from 'lucide-react';

export const SavedReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Create report modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [startDate, setStartDate] = useState('2026-09-15');
  const [endDate, setEndDate] = useState('2026-09-15');
  const [dateFilterType, setDateFilterType] = useState('issue_date');

  // Delete modal state
  const [reportToDelete, setReportToDelete] = useState<SavedReport | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saved-reports', search, page],
    queryFn: () =>
      reportsApi.list({
        search: search || undefined,
        page,
        page_size: 20,
      }),
  });

  const createMutation = useMutation({
    mutationFn: reportsApi.create,
    onSuccess: (newReport) => {
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      navigate(`/saved-reports/${newReport.id}`);
    },
    onError: (err: any) => {
      alert(`Report creation failed: ${err?.response?.data?.detail || err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsApi.delete(id),
    onSuccess: () => {
      setReportToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      alert(`Deletion failed: ${err?.response?.data?.detail || err.message}`);
    },
  });

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: reportName || undefined,
      start_date: startDate,
      end_date: endDate,
      date_filter_type: dateFilterType,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Saved Excel Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Downloadable reports matching the official workbook template with historical issue snapshots
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 px-4 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New Excel Report</span>
        </button>
      </div>

      {/* Reports Listing Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <button
            onClick={() => refetch()}
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
                <th className="p-3">Report Name</th>
                <th className="p-3">Reporting Period</th>
                <th className="p-3">Issues Included</th>
                <th className="p-3">Resolved / Open</th>
                <th className="p-3">Generated Date</th>
                <th className="p-3">File Size</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading reports...</td>
                </tr>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => navigate(`/saved-reports/${report.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-semibold text-slate-900 flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>{report.name}</span>
                    </td>
                    <td className="p-3 text-slate-600 font-medium whitespace-nowrap">
                      {report.start_date} to {report.end_date}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{report.total_issues}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="text-emerald-700 font-semibold">{report.resolved_count}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="text-amber-700 font-semibold">{report.open_count}</span>
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {new Date(report.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-500 font-mono">
                      {Math.round(report.file_size_bytes / 1024)} KB
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/saved-reports/${report.id}`)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md"
                          title="View Drill-Down Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={reportsApi.getDownloadUrl(report.id)}
                          className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-md"
                          title="Download Excel (.xlsx)"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => setReportToDelete(report)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md"
                          title="Delete Report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No reports generated yet. Click 'Generate New Excel Report' to export.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Report Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Generate Date-Specific Excel Report</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Report Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Issue Tracker - 15th Sep 2026"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date Filtering Rule</label>
                <select
                  value={dateFilterType}
                  onChange={(e) => setDateFilterType(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="issue_date">Original Issue Date (Default standard)</option>
                  <option value="activity_date">Support Activity Date</option>
                </select>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
                Populates the authentic Excel template (`Issue Tracker - 15th Sep` format and `Summary` sheet counts),
                saving an immutable snapshot in Neon PostgreSQL.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1.5"
                >
                  {createMutation.isPending ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-rose-50 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold">Confirm Report Deletion</h3>
            </div>

            <div className="p-6 space-y-3 text-xs text-slate-700">
              <p>
                Are you sure you want to delete <span className="font-bold text-slate-900">{reportToDelete.name}</span>?
              </p>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px]">
                <span className="font-bold">Important Data Safety Rule:</span> Deleting this report will only remove
                the stored Excel file and report snapshot. <strong>All underlying tracked issues and email conversation records remain safe in PostgreSQL.</strong>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(reportToDelete.id)}
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

