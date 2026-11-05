import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Percent,
  Users,
  Coins,
  Receipt,
  FileBarChart2,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Landmark,
  ArrowRightLeft,
  ChevronRight,
  ShieldCheck,
  User,
} from 'lucide-react';

export default function InterestAdminLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login?business=interest');
  };

  const navItems = [
    { label: 'Dashboard', path: '/interest/admin/dashboard', icon: LayoutDashboard },
    { label: 'Scheme Builder', path: '/interest/admin/schemes', icon: Percent },
    { label: 'Customers & KYC', path: '/interest/admin/customers', icon: Users },
    { label: 'Loan Accounts', path: '/interest/admin/loans', icon: Coins },
    { label: 'Collections Center', path: '/interest/admin/collections', icon: Receipt },
    { label: 'Reports & Ledgers', path: '/interest/admin/reports', icon: FileBarChart2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Universal Enterprise Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/interest/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-base tracking-tight text-slate-900 dark:text-white font-heading flex items-center gap-1.5">
                <span>FinLend</span>
                <span className="text-indigo-600 dark:text-indigo-400">Pro</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 ml-1">
                  Interest Business
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Right Actions: Business Switcher, Theme & User */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Business Switcher Button */}
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all shadow-2xs font-heading"
            title="Switch to ChitFund Pro"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch to ChitFund Pro</span>
            <span className="sm:hidden">Chits</span>
          </Link>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User & Logout */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'A'}
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight font-heading">
                {user?.full_name || 'Administrator'}
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight">Admin Portal</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area with Fixed Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col p-4 border-r border-slate-200 dark:border-slate-800 shrink-0 space-y-1">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-2 font-heading">
            Lending Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs font-heading">
                <ShieldCheck className="w-4 h-4" />
                <span>Isolated DB System</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Zero data mixing with ChitFund Pro. All loans, ledgers, and KYC records are strictly isolated.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-[60px] z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 p-4 space-y-1 shadow-2xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        {/* Page View Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

