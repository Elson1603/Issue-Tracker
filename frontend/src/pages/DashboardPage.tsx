import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  ArrowUpRight,
  TrendingUp,
  Download,
  Eye,
  RefreshCw,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const PIE_COLORS = ['#0d9488', '#0284c7', '#f59e0b', '#8b5cf6', '#ec4899'];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-summary', startDate, endDate],
    queryFn: () => dashboardApi.getSummary(startDate || undefined, endDate || undefined),
  });

  const { data: trendsData } = useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: () => dashboardApi.getTrends(14),
  });

  // Prepare Pie Chart data from category_counts
  const pieData = React.useMemo(() => {
    if (!summary?.category_counts) return [];
    return Object.entries(summary.category_counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [summary?.category_counts]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Operations</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time metrics from Neon PostgreSQL & Fireworks AI</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-slate-700 font-medium"
              placeholder="Start"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-slate-700 font-medium"
              placeholder="End"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1.5 font-medium"
            >
              Clear
            </button>
          )}

          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards - Interactive & Clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Issues Card */}
        <div
          onClick={() => navigate('/issues')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-teal-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tracked</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{isLoading ? '...' : summary?.total_issues ?? 0}</span>
            <span className="text-xs text-slate-500 font-medium">all-time</span>
          </div>
          <div className="mt-2 text-xs text-teal-600 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>Explore all issues</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Resolved Issues Card */}
        <div
          onClick={() => navigate('/issues?status=resolved')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved Issues</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{isLoading ? '...' : summary?.resolved_issues ?? 0}</span>
            <span className="text-xs text-emerald-600 font-medium">
              {summary && summary.total_issues > 0
                ? `${Math.round((summary.resolved_issues / summary.total_issues) * 100)}% resolved`
                : '100%'}
            </span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>View confirmed solutions</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Open Issues Card */}
        <div
          onClick={() => navigate('/issues?status=open')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open / Pending</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{isLoading ? '...' : summary?.open_issues ?? 0}</span>
            <span className="text-xs text-amber-600 font-medium">requires action</span>
          </div>
          <div className="mt-2 text-xs text-amber-600 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>Filter pending queue</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Human Review Queue Card */}
        <div
          onClick={() => navigate('/review-queue')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-rose-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Review Queue</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{isLoading ? '...' : summary?.review_required_issues ?? 0}</span>
            <span className="text-xs text-rose-600 font-medium">AI flags</span>
          </div>
          <div className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>Verify missing SR/ambiguous</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Ingestion Trends */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Daily Issue Volume Trends</h3>
              <p className="text-xs text-slate-500 mt-0.5">Historical ingestion and resolution volume</p>
            </div>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>

          <div className="h-64 w-full">
            {trendsData && trendsData.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendsData.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="total" name="Total Ingested" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No trend history recorded yet. Sync emails to populate daily data.
              </div>
            )}
          </div>
        </div>

        {/* Issue Categories Breakdown (Clickable Pie) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Issue Category Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">Click any segment to view issues</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    onClick={(entry) => navigate(`/issues?category=${encodeURIComponent(entry.name)}`)}
                    cursor="pointer"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    onClick={(entry) => navigate(`/issues?category=${encodeURIComponent(entry.value)}`)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No categories found for this period</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Saved Reports Section - Interactive Drill-down */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Recent Saved Excel Reports</h3>
            <p className="text-xs text-slate-500 mt-0.5">Click any report to view its historical issues snapshot</p>
          </div>
          <button
            onClick={() => navigate('/saved-reports')}
            className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
          >
            <span>View All Reports</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {summary?.recent_reports && summary.recent_reports.length > 0 ? (
            summary.recent_reports.map((report) => (
              <div
                key={report.id}
                onClick={() => navigate(`/saved-reports/${report.id}`)}
                className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                      {report.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Period: {report.start_date} to {report.end_date} • {report.total_issues} issues • Created {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/saved-reports/${report.id}`);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                    title="View Drill-Down Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <a
                    href={`/api/v1/reports/${report.id}/download`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-md transition-colors"
                    title="Download Excel"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No reports generated yet. Click 'Saved Reports' to generate an Excel report from your issues.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

