import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import AgentSidebar from './AgentSidebar';
import AnimatedChitBackground from './AnimatedChitBackground';
import WelcomeCelebrationModal from './WelcomeCelebrationModal';
import ErrorBoundary from './ErrorBoundary';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Menu,
  Sun,
  Moon,
  LogOut,
  Building2,
  CalendarDays,
  PlusCircle,
  Receipt,
  PackageCheck,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const AGENT_PAGE_TITLES = {
  '/agent/tasks': "Today's Route Tasks & Stops",
  '/agent/routes': 'Assigned Schemes & 2D Map',
  '/agent/leaves': 'Leave Calendar & Coverage',
  '/agent/history': 'Receipts & Collection History',
  '/agent/profile': 'Agent Profile & Route Hub',
  '/agent/dashboard': 'Field Agent Terminal',
};

export default function AgentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  const currentTitle = AGENT_PAGE_TITLES[location.pathname] || "Today's Route Tasks & Stops";

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 flex flex-col transition-colors relative overflow-x-hidden">
      {/* Dynamic Animated Background */}
      <AnimatedChitBackground />

      {/* Login Welcome Celebration */}
      <WelcomeCelebrationModal />

      {/* Dedicated Agent Sidebar */}
      <AgentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Body Area */}
      <div className="lg:pl-72 flex flex-col flex-1 relative z-10 transition-all">
        {/* Floating Top Navbar Island */}
        <header className="sticky top-3 z-30 mx-3 sm:mx-6 flex items-center justify-between h-16 px-4 sm:px-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 text-slate-800 dark:text-slate-100 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.04)] mb-4">
          {/* Left: Mobile hamburger & Page Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="agent-mobile-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle agent navigation menu"
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight font-heading truncate max-w-[200px] sm:max-w-none">
                  {currentTitle}
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  Agent Portal
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                Field Collection Terminal · {user?.full_name || 'Agent'}
              </p>
            </div>
          </div>

          {/* Right Action Island */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick Link to Leave Calendar */}
            <Link
              to="/agent/leaves"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 text-xs font-bold transition-all shadow-xs"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Leaves</span>
            </Link>

            {/* Notification Center */}
            <NotificationBell />

            {/* Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Profile Avatar Pill */}
            <Link
              to="/agent/profile"
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors text-xs font-bold text-slate-800 dark:text-slate-100"
              title="View your profile"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[11px] font-black">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <span className="hidden md:inline truncate max-w-[100px]">{user?.full_name?.split(' ')[0]}</span>
            </Link>

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              aria-label="Logout"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition-colors flex items-center gap-1.5"
              title="Logout session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content Outlet with Crash Protection */}
        <main className="flex-1 px-3 sm:px-6 lg:px-6 pb-12 max-w-7xl w-full mx-auto relative z-10 animate-pageSlideIn">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Confirm Agent Logout"
        message="Are you sure you want to end your active field collection session? Make sure all offline collections are recorded."
        confirmText="Yes, Logout"
        cancelText="Stay Logged In"
        variant="danger"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
