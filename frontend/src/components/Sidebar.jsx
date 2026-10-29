import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  UserCheck,
  Users,
  Receipt,
  FileBarChart,
  Shield,
  Settings,
  Building2,
  X,
  Compass,
  Gavel,
  History,
  Sparkles,
  Bell,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const NAV_ITEMS = [
  {
    name: 'Dashboard',
    path: '/admin/dashboard',
    icon: LayoutDashboard,
    activeGradient: 'from-blue-600 to-blue-700',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    hoverBg: 'hover:bg-blue-50/70 dark:hover:bg-blue-950/40',
    hoverText: 'hover:text-blue-600 dark:hover:text-blue-400',
  },
  {
    name: 'Route & Agent Tracking',
    path: '/admin/tracking',
    icon: Compass,
    activeGradient: 'from-cyan-600 to-blue-600',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    hoverBg: 'hover:bg-cyan-50/70 dark:hover:bg-cyan-950/40',
    hoverText: 'hover:text-cyan-600 dark:hover:text-cyan-400',
  },
  {
    name: 'Chit Schemes & Routes',
    path: '/admin/chit-groups',
    icon: Layers,
    activeGradient: 'from-indigo-600 to-purple-600',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    hoverBg: 'hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40',
    hoverText: 'hover:text-indigo-600 dark:hover:text-indigo-400',
  },
  {
    name: 'Auctions & Dividends',
    path: '/admin/auctions',
    icon: Gavel,
    activeGradient: 'from-amber-600 to-orange-600',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    hoverBg: 'hover:bg-amber-50/70 dark:hover:bg-amber-950/40',
    hoverText: 'hover:text-amber-600 dark:hover:text-amber-400',
  },
  {
    name: 'User Management (Agents)',
    path: '/admin/users',
    icon: UserCheck,
    activeGradient: 'from-purple-600 to-indigo-600',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    hoverBg: 'hover:bg-purple-50/70 dark:hover:bg-purple-950/40',
    hoverText: 'hover:text-purple-600 dark:hover:text-purple-400',
  },
  {
    name: 'Members & Passbook',
    path: '/admin/members',
    icon: Users,
    activeGradient: 'from-emerald-600 to-teal-600',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    hoverBg: 'hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40',
    hoverText: 'hover:text-emerald-600 dark:hover:text-emerald-400',
  },
  {
    name: 'Collections',
    path: '/admin/collections',
    icon: Receipt,
    activeGradient: 'from-teal-600 to-emerald-600',
    glowColor: 'rgba(20, 184, 166, 0.4)',
    hoverBg: 'hover:bg-teal-50/70 dark:hover:bg-teal-950/40',
    hoverText: 'hover:text-teal-600 dark:hover:text-teal-400',
  },
  {
    name: 'Admin Profile',
    path: '/admin/profile',
    icon: Shield,
    activeGradient: 'from-rose-600 to-pink-600',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    hoverBg: 'hover:bg-rose-50/70 dark:hover:bg-rose-950/40',
    hoverText: 'hover:text-rose-600 dark:hover:text-rose-400',
  },
  {
    name: 'Reports',
    path: '/admin/reports',
    icon: FileBarChart,
    activeGradient: 'from-blue-600 to-indigo-600',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    hoverBg: 'hover:bg-blue-50/70 dark:hover:bg-blue-950/40',
    hoverText: 'hover:text-blue-600 dark:hover:text-blue-400',
  },
  {
    name: 'Notifications',
    path: '/admin/notifications',
    icon: Bell,
    badgeKey: 'notifications',
    activeGradient: 'from-amber-500 to-rose-500',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    hoverBg: 'hover:bg-rose-50/70 dark:hover:bg-rose-950/40',
    hoverText: 'hover:text-rose-600 dark:hover:text-rose-400',
  },
  {
    name: 'Logs & Audit',
    path: '/admin/audit',
    icon: History,
    activeGradient: 'from-slate-700 to-slate-800',
    glowColor: 'rgba(100, 116, 139, 0.35)',
    hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
    hoverText: 'hover:text-slate-900 dark:hover:text-white',
  },
  {
    name: 'Settings',
    path: '/admin/settings',
    icon: Settings,
    activeGradient: 'from-slate-700 to-slate-800',
    glowColor: 'rgba(71, 85, 105, 0.35)',
    hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
    hoverText: 'hover:text-slate-900 dark:hover:text-white',
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { unreadCount } = useNotifications();
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Frosted Glass Floating Sidebar Container (Separated from Body Page) */}
      <aside
        className={`fixed z-50 flex flex-col transition-all duration-300 ease-in-out top-0 bottom-0 left-0 w-64 lg:top-3 lg:bottom-3 lg:left-3 lg:w-64 lg:rounded-3xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_12px_40px_-5px_rgba(0,0,0,0.06)] overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight font-heading">
                ChitFund <span className="text-blue-600 dark:text-blue-400">Pro</span>
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium font-sans">
                Enterprise Suite
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items with Rich 3D Hover Lift and Matching Colored Glow Shadows */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-250 cursor-pointer ${
                    isActive
                      ? `bg-gradient-to-r ${item.activeGradient} text-white shadow-[0_10px_22px_-4px_${item.glowColor}] -translate-y-0.5 translate-x-1 font-bold`
                      : `text-slate-600 dark:text-slate-400 ${item.hoverBg} ${item.hoverText} hover:-translate-y-0.5 hover:translate-x-1.5 hover:shadow-[0_8px_20px_-3px_${item.glowColor}] border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50`
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform duration-250 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-current'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                    {item.badgeKey === 'notifications' && unreadCount > 0 ? (
                      <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-[0_2px_8px_rgba(244,63,94,0.6)] animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : isActive ? (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Clean, Rich Frosted Glass Footer */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 font-heading">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>ChitFund Management</span>
          </div>
          <p className="text-[11px] mt-0.5 text-slate-400 dark:text-slate-500">
            Internal Financial Operations
          </p>
        </div>
      </aside>
    </>
  );
}
