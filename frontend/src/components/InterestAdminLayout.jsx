import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedFinLendBackground from './AnimatedFinLendBackground';
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
  Sparkles,
  Layers,
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* 100% Vector Animated Background with Floating Loan Slips, Interest %, Notes & Coins */}
      <AnimatedFinLendBackground />

      {/* Floating Translucent Top Navbar Island */}
      <header className="sticky top-3 z-30 mx-3 sm:mx-6 flex items-center justify-between h-16 px-4 sm:px-6 rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-slate-100 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.04)] mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:-translate-y-0.5 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/interest/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white font-heading flex items-center gap-1.5">
                <span>FinLend</span>
                <span className="text-indigo-600 dark:text-indigo-400">Pro</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 ml-1">
                  Interest Business
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400">
                Lending Portfolio & Amortization System
              </p>
            </div>
          </Link>
        </div>

        {/* Right Actions: Business Switcher to ChitFund Pro, Theme & User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Business Switcher Button to ChitFund Pro */}
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all shadow-2xs hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(16,185,129,0.25)] font-heading cursor-pointer"
            title="Switch to ChitFund Pro (Chits & Auctions)"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">ChitFund Pro</span>
            <span className="hidden md:inline px-1 py-0.2 rounded-md bg-emerald-200/60 dark:bg-emerald-900/60 text-[9px] text-emerald-800 dark:text-emerald-200 uppercase font-black">Chits</span>
          </Link>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(245,158,11,0.25)] transition-all flex items-center justify-center cursor-pointer bg-white/50 dark:bg-slate-800/50"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Pill */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(99,102,241,0.2)] transition-all">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs font-heading">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'A'}
            </div>
            <div className="hidden md:block text-left text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 block leading-tight font-heading">
                {user?.full_name || 'Administrator'}
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wide">
                FinLend Admin
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-rose-400 bg-red-50/60 dark:bg-rose-950/20 hover:bg-red-100/80 dark:hover:bg-rose-950/50 border border-red-200/80 dark:border-rose-900/50 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(239,68,68,0.25)] transition-all cursor-pointer font-heading"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area with Frosted Floating Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-3 sm:px-6 relative z-10 gap-5 pb-8">
        {/* Desktop Floating Frosted Glass Sidebar */}
        <aside className="hidden md:flex w-64 flex-col p-4 rounded-3xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-slate-200/60 dark:border-white/10 shadow-[0_12px_40px_-5px_rgba(0,0,0,0.06)] shrink-0 space-y-1.5 self-start sticky top-24">
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
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_10px_22px_-4px_rgba(99,102,241,0.4)] -translate-y-0.5 translate-x-1 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:-translate-y-0.5 hover:translate-x-1 hover:shadow-[0_6px_16px_-3px_rgba(99,102,241,0.25)] border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-200/60 dark:border-white/10">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-50/50 dark:from-indigo-950/40 dark:to-purple-950/20 border border-indigo-200/70 dark:border-indigo-800/60 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs font-heading">
                <Sparkles className="w-4 h-4 text-indigo-500" />
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
          <div className="md:hidden fixed inset-x-3 top-20 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 space-y-1.5 shadow-2xl">
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
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
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
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
