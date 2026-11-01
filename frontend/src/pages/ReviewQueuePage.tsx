import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewQueueApi, issuesApi } from '../api';
import { Issue } from '../types';
import {
  CheckSquare,
  AlertCircle,
  CheckCircle2,
  Edit,
  Save,
  X,
  ShieldCheck,
  RefreshCw,
  Search
} from 'lucide-react';

export const ReviewQueuePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [auditReason, setAuditReason] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['review-queue-list'],
    queryFn: () => reviewQueueApi.list(1, 50),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => issuesApi.update(id, data),
    onSuccess: () => {
      setSelectedIssue(null);
      queryClient.invalidateQueries({ queryKey: ['review-queue-list'] });
      queryClient.invalidateQueries({ queryKey: ['issues-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const handleOpenReview = (issue: Issue) => {
    setSelectedIssue(issue);
    setEditFormData({
      ...issue,
      needs_review: false, // Default to resolving review flag
    });
    setAuditReason('Verified and confirmed by human reviewer');
  };

  const handleConfirmReview = () => {
    if (!selectedIssue) return;
    updateMutation.mutate({
      id: selectedIssue.id,
      data: {
        ...editFormData,
        needs_review: editFormData.needs_review,
        audit_reason: auditReason || 'Reviewed in Review Queue',
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Human Review & Quality Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify ambiguous AI extractions, missing employee SR numbers, and unconfirmed resolution claims
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Review Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">User SR No</th>
                <th className="p-3">Flag Reason</th>
                <th className="p-3">Issue Raised By</th>
                <th className="p-3">Details</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading review queue...</td>
                </tr>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((iss) => (
                  <tr key={iss.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-medium whitespace-nowrap">{iss.issue_date}</td>
                    <td className="p-3 font-mono font-semibold whitespace-nowrap text-teal-700">
                      {iss.user_sr_no || <span className="text-rose-500 italic">Missing</span>}
                    </td>
                    <td className="p-3 max-w-xs">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">{iss.review_reason || 'Low confidence or missing fields'}</span>
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">{iss.issue_raised_by}</td>
                    <td className="p-3 text-slate-600 max-w-sm truncate" title={iss.issue_details}>
                      {iss.issue_details}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                        {iss.resolution_status}
                      </span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenReview(iss)}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-medium text-xs shadow-2xs"
                      >
                        Review & Verify
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <p className="font-semibold text-slate-700">Review queue is empty!</p>
                      <p className="text-[11px] text-slate-400">All ingested records have passed validation.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Verify & Complete Issue Record</h3>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                <span className="font-bold">Flagged Reason: </span>
                <span>{selectedIssue.review_reason}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Details</label>
                <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
                  {selectedIssue.issue_details}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employee User SR No</label>
                  <input
                    type="text"
                    value={editFormData.user_sr_no || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, user_sr_no: e.target.value })}
                    placeholder="e.g. 331725"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Issue Category</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Resolution Text</label>
                  <input
                    type="text"
                    value={editFormData.resolution || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, resolution: e.target.value })}
                    placeholder="e.g. TRANSFERIN, User ID unlocked"
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
                    <option value="resolved">Resolved (Confirmed)</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending_confirmation">Pending Confirmation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Review Note / Audit Reason</label>
                <input
                  type="text"
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk_review"
                  checked={!editFormData.needs_review}
                  onChange={(e) => setEditFormData({ ...editFormData, needs_review: !e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="chk_review" className="font-semibold text-slate-700 cursor-pointer">
                  Mark as verified (removes from review queue)
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setSelectedIssue(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReview}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save & Confirm Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

