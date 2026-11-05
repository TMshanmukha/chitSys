import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedFinLendBackground from './AnimatedFinLendBackground';
import ErrorBoundary from './ErrorBoundary';
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
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

const TITLE_MAP = {
  '/interest/admin/dashboard': {
    section: 'Operations',
    title: 'Financial Overview & KPIs',
  },
  '/interest/admin/schemes': {
    section: 'Configuration',
    title: 'Scheme Builder & Lending Rules',
  },
  '/interest/admin/customers': {
    section: 'Directory',
    title: 'Borrowers & KYC Roster',
  },
  '/interest/admin/loans': {
    section: 'Ledger',
    title: 'Loan Accounts & Repayment Ledger',
  },
  '/interest/admin/collections': {
    section: 'Cash Desk',
    title: 'Daily Collections & Receipts',
  },
  '/interest/admin/reports': {
    section: 'Analytics',
    title: 'Financial Statements & Audit Ledgers',
  },
  '/interest/admin/users': {
    section: 'Staff',
    title: 'User Management (Agents)',
  },
  '/interest/admin/agents': {
    section: 'Staff',
    title: 'User Management (Agents)',
  },
};

export default function InterestAdminLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    { label: 'User Management (Agents)', path: '/interest/admin/users', icon: UserCheck },
    { label: 'Reports & Ledgers', path: '/interest/admin/reports', icon: FileBarChart2 },
  ];

  const currentMeta = TITLE_MAP[location.pathname] || {
    section: 'FinLend Pro',
    title: 'Lending Management',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Brand-New Ultra-Clean Vector FinTech Background (No cash notes / coins) */}
      <AnimatedFinLendBackground />

      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ========================================================================= */}
      {/* DOCKED SIDEBAR: Clean, Flush to Left Screen Edge, No Floating Indentation */}
      {/* ========================================================================= */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col bg-transparent backdrop-blur-2xl border-r border-slate-200/70 dark:border-white/10 transition-transform duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] shrink-0">
          <Link
            to="/interest/admin/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white font-heading flex items-center gap-1.5 leading-tight">
                <span>FinLend</span>
                <span className="text-indigo-600 dark:text-indigo-400">Pro</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">
                Interest & Lending
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Label */}
        <div className="px-4 pt-5 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-heading">
          Lending Operations
        </div>

        {/* Navigation Items - Clean Full-Width Links */}
        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_8px_20px_-4px_rgba(99,102,241,0.5)] font-bold translate-x-1'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 hover:translate-x-1'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
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

        {/* Bottom Sidebar Footer: ChitFund Pro Switcher Card & DB Isolation Pill */}
        <div className="p-3 border-t border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] space-y-2 shrink-0">
          {/* Quick Business Switcher Button to ChitFund Pro */}
          <Link
            to="/admin/dashboard"
            className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 transition-all hover:shadow-[0_4px_16px_rgba(16,185,129,0.2)] group cursor-pointer"
            title="Switch to ChitFund Pro (Chits & Auctions)"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold font-heading leading-tight">
                  ChitFund Pro
                </span>
                <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold leading-tight">
                  Chits & Auctions Suite
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Isolated Database Security Badge */}
          <div className="px-2.5 py-1.5 rounded-lg bg-white/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">Isolated DB • Zero Data Leakage</span>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT: Docked to Sidebar, Full Width, Clean Layout                */}
      {/* ========================================================================= */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen relative z-10 transition-all">
        {/* Full-Width Top Navbar */}
        <header className="sticky top-0 z-30 h-16 w-full px-4 sm:px-8 flex items-center justify-between bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/10 text-slate-800 dark:text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] shrink-0">
          {/* Left: Mobile Toggle & Page Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-heading">
                <span>FinLend Pro</span>
                <span>/</span>
                <span className="text-indigo-600 dark:text-indigo-400">{currentMeta.section}</span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-heading tracking-tight leading-tight">
                {currentMeta.title}
              </h1>
            </div>
          </div>

          {/* Right: Switcher, Theme, User Pill & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Switch to ChitFund Pro */}
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all shadow-xs hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(16,185,129,0.25)] font-heading cursor-pointer"
              title="Switch to ChitFund Pro"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">ChitFund Pro</span>
              <span className="hidden md:inline px-1 py-0.2 rounded-md bg-emerald-200/60 dark:bg-emerald-900/60 text-[9px] text-emerald-800 dark:text-emerald-200 uppercase font-black">Chits</span>
            </Link>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 transition-all flex items-center justify-center cursor-pointer bg-white/50 dark:bg-slate-800/50"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10">
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

            {/* Sign Out */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100/80 dark:hover:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/50 transition-all cursor-pointer font-heading"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto relative z-10 animate-pageSlideIn">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
