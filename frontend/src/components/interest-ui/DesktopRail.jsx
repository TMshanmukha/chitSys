import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Home,
  Coins,
  Users,
  UserCheck,
  FileText,
  MoreHorizontal,
  Layers,
  Sun,
  Moon,
  LogOut,
  Shield,
} from 'lucide-react';
import FinLendLogo from '../FinLendLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import RoleChip from './RoleChip';

export default function DesktopRail() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login?business=interest');
  };

  const interestRole = user?.interest_profile?.role || (user?.role === 'COLLECTION_AGENT' ? 'AGENT' : 'OWNER');
  const canManageStaff = interestRole === 'OWNER' || Boolean(user?.interest_profile?.permissions?.manage_users);

  const navItems = [
    { label: 'Home', path: '/interest/home', icon: Home },
    { label: 'Collect', path: '/interest/collect', icon: Coins },
    { label: 'Customers', path: '/interest/customers', icon: Users },
    ...(canManageStaff
      ? [{ label: 'Staff & Agents', path: '/interest/more/users', icon: UserCheck }]
      : []),
    { label: 'Reports', path: '/interest/reports', icon: FileText },
    { label: 'More', path: '/interest/more', icon: MoreHorizontal },
  ];

  return (
    <aside className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-[#0c1220] border-r border-slate-200/90 dark:border-white/10 z-40 shadow-xs select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200/80 dark:border-white/10 shrink-0">
        <FinLendLogo size={40} variant="app-icon" className="shrink-0" />
        <Link to="/interest/home" className="flex-1 min-w-0">
          <div>
            <div className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white font-heading leading-tight flex items-center gap-1.5">
              <span>FinLend</span>
              <span className="text-indigo-600 dark:text-indigo-400">Pro</span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
              Lending & Collections
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-heading">
          Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-indigo-600 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'
                    }`}
                  />
                  <span className="truncate flex-1 font-heading">{item.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Footer Section */}
      <div className="p-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-3 shrink-0">
        {/* Switch to ChitFund Pro */}
        <Link
          to="/admin/dashboard"
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all font-heading"
          title="Switch to ChitFund Pro"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Switch to ChitFund</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 font-bold">
            Chits
          </span>
        </Link>

        {/* Profile Card & Action Row */}
        <div className="p-2.5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs font-heading">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate font-heading">
                {user?.full_name || 'Administrator'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <RoleChip role={interestRole} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-[11px]">Dark</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[11px]">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
