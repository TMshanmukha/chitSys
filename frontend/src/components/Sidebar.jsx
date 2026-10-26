import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  UserCheck,
  Users,
  Receipt,
  BarChart3,
  ShieldCheck,
  Settings,
  Building2,
  X,
  Database,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Chit Groups', path: '/admin/chit-groups', icon: Boxes },
  { name: 'Collection Agents', path: '/admin/agents', icon: UserCheck },
  { name: 'Members', path: '/admin/members', icon: Users },
  { name: 'Collections', path: '/admin/collections', icon: Receipt },
  { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
  { name: 'User Management', path: '/admin/users', icon: ShieldCheck },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight font-['Outfit']">
                ChitFund <span className="text-indigo-400">Pro</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-medium">
                Admin Console
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer System Badge */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">MySQL 9.3 Engine Active</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 flex justify-between">
            <span>Milestone 1 — Auth Active</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
