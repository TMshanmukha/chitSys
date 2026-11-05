import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Home,
  Coins,
  Users,
  FileText,
  MoreHorizontal,
  Landmark,
  Layers,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function DesktopRail() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login?business=interest');
  };

  const navItems = [
    { label: 'Home', path: '/interest/home', icon: Home },
    { label: 'Collect', path: '/interest/collect', icon: Coins },
    { label: 'Customers', path: '/interest/customers', icon: Users },
    { label: 'Reports', path: '/interest/reports', icon: FileText },
    { label: 'More', path: '/interest/more', icon: MoreHorizontal },
  ];

  return (
    <aside className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-60 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/10 z-40 shadow-xs">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200/70 dark:border-white/10 shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-600/20 font-heading">
          <Landmark className="w-5 h-5" />
        </div>
        <Link to="/interest/home" className="flex-1 min-w-0">
          <div>
            <div className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white font-heading leading-tight flex items-center gap-1">
              <span>FinLend</span>
              <span className="text-indigo-600 dark:text-indigo-400">Pro</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Interest & Loans
            </span>
          </div>
        </Link>
      </div>

      {/* 5 Core Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-heading">
          Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_8px_20px_-4px_rgba(99,102,241,0.45)] font-bold translate-x-1'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-50/70 dark:hover:bg-white/[0.04] hover:text-indigo-600 dark:hover:text-indigo-400 hover:translate-x-1'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-slate-200/70 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.01] space-y-2 shrink-0">
        {/* Switch to ChitFund Pro */}
        <Link
          to="/admin/dashboard"
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all font-heading"
          title="Switch to ChitFund Pro"
        >
          <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate">Switch to ChitFund Pro</span>
        </Link>

        {/* User Pill & Dark Mode */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'A'}
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {user?.full_name || 'Admin'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
