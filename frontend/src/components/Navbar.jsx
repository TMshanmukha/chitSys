import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import NotificationBell from './NotificationBell';

export default function Navbar({ onToggleSidebar, pageTitle }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      {/* Floating Translucent Top Navbar Island (Separated from Body Page) */}
      <header className="sticky top-3 z-30 mx-3 sm:mx-6 flex items-center justify-between h-16 px-4 sm:px-6 rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 text-slate-800 dark:text-slate-100 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.04)] mb-4">
        {/* Left: Mobile menu toggle and current title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="mobile-sidebar-toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight font-heading">
              {pageTitle || 'Dashboard'}
            </h1>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-sans">
              Chit Fund Operations & Financial Ledger
            </p>
          </div>
        </div>

        {/* Right Actions: Live Notifications, Theme Toggle, User Profile, Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Real-Time Live Notification Center */}
          <NotificationBell />

          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            id="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(245,158,11,0.25)] transition-all flex items-center justify-center cursor-pointer bg-white/50 dark:bg-slate-800/50"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* User Pill with 3D Hover Lift */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(37,99,235,0.2)] transition-all">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs font-heading">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight font-heading">
                {user?.full_name || user?.username}
              </p>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">
                {user?.role === 'SUPER_ADMIN' ? 'Owner / Admin' : user?.role}
              </span>
            </div>
          </div>

          {/* Logout Button with 3D Hover Lift & Red Glowing Shadow */}
          <button
            type="button"
            id="admin-logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
            aria-label="Log out"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-rose-400 bg-red-50/60 dark:bg-rose-950/20 hover:bg-red-100/80 dark:hover:bg-rose-950/50 border border-red-200/80 dark:border-rose-900/50 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(239,68,68,0.25)] transition-all cursor-pointer font-heading"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Confirmation Dialog for Administrator Sign Out */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Confirm Sign Out"
        message="Are you sure you want to end your administrator session? You will be signed out of the Chit Fund management system safely."
        confirmLabel="Yes, Sign Out"
        cancelLabel="Stay Logged In"
        variant="danger"
        icon={LogOut}
        subtext="Tip: Active collections and database changes have already been safely synchronized."
      />
    </>
  );
}

