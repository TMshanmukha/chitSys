import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  CheckSquare,
  Compass,
  UserCheck,
  History,
  CalendarDays,
  Banknote,
  X,
  Building2,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const AGENT_NAV_ITEMS = [
  {
    name: "Today's Tasks & Stops",
    path: '/agent/tasks',
    icon: CheckSquare,
    desc: 'Assigned subscriber route stops for today',
    activeGradient: 'from-blue-600 to-indigo-600',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    hoverBg: 'hover:bg-blue-50/70 dark:hover:bg-blue-950/40',
    hoverText: 'hover:text-blue-600 dark:hover:text-blue-400',
  },
  {
    name: 'Assigned Routes & 2D Map',
    path: '/agent/routes',
    icon: Compass,
    desc: 'Live 2D route trajectory & node status',
    activeGradient: 'from-cyan-600 to-blue-600',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    hoverBg: 'hover:bg-cyan-50/70 dark:hover:bg-cyan-950/40',
    hoverText: 'hover:text-cyan-600 dark:hover:text-cyan-400',
  },
  {
    name: 'Day Closing & Shift Submit',
    path: '/agent/day-closing',
    icon: Banknote,
    desc: "Reconcile today's collections, cash & submit",
    activeGradient: 'from-amber-600 to-orange-600',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    hoverBg: 'hover:bg-amber-50/70 dark:hover:bg-amber-950/40',
    hoverText: 'hover:text-amber-600 dark:hover:text-amber-400',
  },
  {
    name: 'Leave Calendar & Coverage',
    path: '/agent/leaves',
    icon: CalendarDays,
    desc: 'Apply leave & view temporary coverage',
    activeGradient: 'from-emerald-600 to-teal-600',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    hoverBg: 'hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40',
    hoverText: 'hover:text-emerald-600 dark:hover:text-emerald-400',
  },
  {
    name: 'Receipts & Collection History',
    path: '/agent/history',
    icon: History,
    desc: 'Search past collections and receipts issued',
    activeGradient: 'from-purple-600 to-indigo-600',
    glowColor: 'rgba(147, 51, 234, 0.4)',
    hoverBg: 'hover:bg-purple-50/70 dark:hover:bg-purple-950/40',
    hoverText: 'hover:text-purple-600 dark:hover:text-purple-400',
  },
  {
    name: 'Agent Profile & Route Hub',
    path: '/agent/profile',
    icon: UserCheck,
    desc: 'Personal details, UPI, and performance summary',
    activeGradient: 'from-rose-600 to-pink-600',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    hoverBg: 'hover:bg-rose-50/70 dark:hover:bg-rose-950/40',
    hoverText: 'hover:text-rose-600 dark:hover:text-rose-400',
  },
];

export default function AgentSidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="agent-navigation-sidebar"
        aria-label="Agent Navigation Sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-[0_10px_40px_rgba(0,0,0,0.06)]`}
      >
        {/* Brand / Logo Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/80">
          <NavLink
            to="/agent/tasks"
            onClick={onClose}
            className="flex items-center gap-3 group focus:outline-hidden"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 p-0.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-white">
                <Building2 className="w-5 h-5 text-blue-400 group-hover:text-white transition-colors" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white font-heading block">
                ChitFund Pro
              </span>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase block">
                Field Agent Portal
              </span>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Agent Info Badge */}
        <div className="p-4 mx-4 my-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-blue-950/40 dark:to-slate-800/60 border border-blue-100 dark:border-blue-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                {user?.full_name || 'Field Agent'}
              </p>
              <p className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold truncate">
                @{user?.username} · Collection Agent
              </p>
            </div>
          </div>
        </div>

        {/* Dedicated Navigation Menu */}
        <nav
          aria-label="Agent Main Menu"
          className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 focus:outline-hidden"
        >
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-heading">
            Dedicated Workflows
          </div>

          {AGENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-start gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all relative group ${
                    isActive
                      ? `bg-gradient-to-r ${item.activeGradient} text-white shadow-lg shadow-blue-600/20 font-extrabold`
                      : `text-slate-600 dark:text-slate-300 ${item.hoverBg} ${item.hoverText}`
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 mt-0.5 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs">{item.name}</span>
                      <span
                        className={`block text-[10px] font-normal truncate mt-0.5 ${
                          isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {item.desc}
                      </span>
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Actions: Theme toggle & Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between px-2 py-1 text-xs">
            <span className="text-slate-500 text-[11px] font-medium">Theme Mode</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}

