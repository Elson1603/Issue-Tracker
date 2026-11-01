import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { issuesApi } from '../api';
import { Issue } from '../types';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit,
  Mail,
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';

export const IssuesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [startDate, setStartDate] = useState(searchParams.get('start_date') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end_date') || '');
  const [page, setPage] = useState(1);

  // Selected issue for detail/edit modal
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [auditReason, setAuditReason] = useState('');

  // Selected issue email thread modal
  const [threadIssueId, setThreadIssueId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['issues-list', search, status, category, startDate, endDate, page],
    queryFn: () =>
      issuesApi.list({
        search: search || undefined,
        status: status || undefined,
        category: category || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        page_size: 20,
      }),
  });

  const { data: threadData, isLoading: isThreadLoading } = useQuery({
    queryKey: ['issue-thread', threadIssueId],
    queryFn: () => (threadIssueId ? issuesApi.getThread(threadIssueId) : null),
    enabled: !!threadIssueId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => issuesApi.update(id, data),
    onSuccess: (updated) => {
      setSelectedIssue(updated);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['issues-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const handleOpenDetail = (issue: Issue) => {
    setSelectedIssue(issue);
    setEditFormData({ ...issue });
    setIsEditing(false);
    setAuditReason('');
  };

  const handleSaveEdit = () => {
    if (!selectedIssue) return;
    updateMutation.mutate({
      id: selectedIssue.id,
      data: {
        ...editFormData,
        audit_reason: auditReason || 'Manual edit from Issues table',
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Search and Filters Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SR No, Requester, Details, Resolver..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="resolved">Resolved</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_confirmation">Pending Confirmation</option>
            </select>

            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Categories</option>
              <option value="Transfer In">Transfer In</option>
              <option value="User ID locked">User ID locked</option>
              <option value="eFeap Login Issue">eFeap Login Issue</option>
              <option value="Mobile number update">Mobile number update</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
            />

            {(search || status || category || startDate) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setCategory('');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1.5 font-semibold"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">User SR No</th>
                <th className="p-3">Category</th>
                <th className="p-3">Issue Raised By</th>
                <th className="p-3">Issue Details</th>
                <th className="p-3">Resolution</th>
                <th className="p-3">Resolved By</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">Loading issues from database...</td>
                </tr>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((iss) => (
                  <tr
                    key={iss.id}
                    onClick={() => handleOpenDetail(iss)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-medium text-slate-800 whitespace-nowrap">{iss.issue_date}</td>
                    <td className="p-3 font-mono font-semibold text-teal-700 whitespace-nowrap">
                      {iss.user_sr_no || <span className="text-rose-500 italic">None</span>}
                    </td>
                    <td className="p-3 font-medium text-slate-800 whitespace-nowrap">{iss.type_of_issue}</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">{iss.issue_raised_by}</td>
                    <td className="p-3 text-slate-600 max-w-sm truncate" title={iss.issue_details}>
                      {iss.issue_details}
                    </td>
                    <td className="p-3 text-slate-700 font-medium whitespace-nowrap">
                      {iss.resolution || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{iss.resolved_by || '—'}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          iss.resolution_status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : iss.resolution_status === 'pending_confirmation'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {iss.resolution_status}
                      </span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(iss);
                        }}
                        className="p-1 text-slate-500 hover:text-teal-600 transition-colors"
                        title="View / Edit Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No issues match the selected search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {data && data.total_pages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total} issues
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold px-2">Page {page} of {data.total_pages}</span>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Issue Detail & Edit Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                  SR #{selectedIssue.user_sr_no || 'Pending'}
                </span>
                <span className="text-xs text-slate-500">Recorded on {selectedIssue.issue_date}</span>
              </div>

              <div className="flex items-center gap-2">
                {selectedIssue.thread_id && (
                  <button
                    onClick={() => setThreadIssueId(selectedIssue.id)}
                    className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 font-medium"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>View Email Thread</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {selectedIssue.needs_review && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-800">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">Review Flag: </span>
                    <span>{selectedIssue.review_reason || 'Requires human verification.'}</span>
                  </div>
                </div>
              )}

              {isEditing ? (
                /* Editable Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">User SR No</label>
                      <input
                        type="text"
                        value={editFormData.user_sr_no || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, user_sr_no: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Type of Issue</label>
                      <select
                        value={editFormData.type_of_issue || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, type_of_issue: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value="Transfer In">Transfer In</option>
                        <option value="User ID locked">User ID locked</option>
                        <option value="eFeap Login Issue">eFeap Login Issue</option>
                        <option value="Mobile number update">Mobile number update</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Issue Raised By</label>
                    <input
                      type="text"
                      value={editFormData.issue_raised_by || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, issue_raised_by: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Issue Details</label>
                    <textarea
                      rows={3}
                      value={editFormData.issue_details || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, issue_details: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Resolution Text</label>
                      <input
                        type="text"
                        value={editFormData.resolution || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, resolution: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Resolution Status</label>
                      <select
                        value={editFormData.resolution_status || 'open'}
                        onChange={(e) => setEditFormData({ ...editFormData, resolution_status: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value="resolved">Resolved</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="pending_confirmation">Pending Confirmation</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Audit Reason for Change</label>
                    <input
                      type="text"
                      placeholder="e.g. Corrected SR number based on employee email signature"
                      value={auditReason}
                      onChange={(e) => setAuditReason(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                /* Read-Only Details */
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider mb-1">
                      Issue Description
                    </h5>
                    <p className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800 leading-relaxed">
                      {selectedIssue.issue_details}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider mb-1">
                        Category & Form
                      </h5>
                      <p className="font-medium text-slate-900">{selectedIssue.type_of_issue} ({selectedIssue.application_name})</p>
                    </div>
                    <div>
                      <h5 className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider mb-1">
                        Raised By
                      </h5>
                      <p className="font-medium text-slate-900">{selectedIssue.issue_raised_by || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider mb-1">
                        Resolution Action
                      </h5>
                      <p className="font-medium text-slate-900">{selectedIssue.resolution || 'Pending Resolution'}</p>
                    </div>
                    <div>
                      <h5 className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider mb-1">
                        Resolved By / Team
                      </h5>
                      <p className="font-medium text-slate-900">
                        {selectedIssue.resolved_by || '—'} ({selectedIssue.resolution_by || 'IGA'})
                      </p>
                    </div>
                  </div>

                  {selectedIssue.resolution_evidence && (
                    <div>
                      <h5 className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider mb-1">
                        Evidence from Conversation
                      </h5>
                      <p className="bg-teal-50/50 p-3 rounded-lg border border-teal-200/60 text-slate-700 italic">
                        "{selectedIssue.resolution_evidence}"
                      </p>
                    </div>
                  )}

                  {/* Audit Trail */}
                  {selectedIssue.audits && selectedIssue.audits.length > 0 && (
                    <div className="pt-3 border-t border-slate-200">
                      <h5 className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider mb-2">
                        Audit Trail ({selectedIssue.audits.length} edits)
                      </h5>
                      <div className="space-y-2">
                        {selectedIssue.audits.map((a) => (
                          <div key={a.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px]">
                            <div className="flex items-center justify-between text-slate-500">
                              <span>Edited by {a.changed_by}</span>
                              <span>{new Date(a.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-800 font-medium mt-1">Reason: {a.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/50">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Fields</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Thread Timeline Modal */}
      {threadIssueId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-teal-600" />
                <h4 className="text-sm font-bold text-slate-900">Email Conversation Timeline</h4>
              </div>
              <button
                onClick={() => setThreadIssueId(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {isThreadLoading ? (
                <p className="text-center text-slate-400 py-8">Loading message history...</p>
              ) : threadData?.messages && threadData.messages.length > 0 ? (
                threadData.messages.map((msg: any, idx: number) => (
                  <div
                    key={msg.id || idx}
                    className={`p-4 rounded-xl border ${
                      msg.is_original_issue
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-semibold text-slate-900">{msg.sender}</span>
                      <span className="text-[11px] text-slate-500">
                        {msg.sent_at ? new Date(msg.sent_at).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 mb-2">Subject: {msg.subject}</p>
                    <div className="text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {msg.body_text}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 py-8">No raw email messages attached to this issue.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

