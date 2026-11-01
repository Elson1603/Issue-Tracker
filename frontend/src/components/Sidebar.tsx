import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Mail,
  AlertCircle,
  FileSpreadsheet,
  CheckSquare,
  Settings,
  Layers,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/fetch-emails', label: 'Fetch Emails', icon: Mail },
    { to: '/issues', label: 'Issues', icon: AlertCircle },
    { to: '/saved-reports', label: 'Saved Reports', icon: FileSpreadsheet },
    { to: '/review-queue', label: 'Review Queue', icon: CheckSquare },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/40">
        <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-lg border border-teal-500/30">
          <Layers className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white tracking-tight">IGA Issue Tracker</h1>
          <p className="text-[11px] text-teal-400 font-medium">eFEAP Enterprise</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System Status / Engine badge */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30 text-xs">
        <div className="flex items-center gap-2 text-slate-400 mb-2 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Extraction Engine</span>
        </div>
        <div className="flex items-center justify-between text-[11px] bg-slate-900 p-2 rounded border border-slate-800">
          <span className="text-slate-400">Fireworks AI</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Active
          </span>
        </div>
      </div>
    </aside>
  );
};

