import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';

export default function Navbar({ onToggleSidebar, pageTitle }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-colors shadow-xs">
      {/* Left: Mobile menu toggle and current title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          id="mobile-sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {pageTitle || 'Dashboard'}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
            Chit Fund & Collection Management System
          </p>
        </div>
      </div>

      {/* Right Actions: Theme Toggle, User Profile, Logout */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Light / Dark Mode Toggle */}
        <button
          type="button"
          id="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors flex items-center justify-center"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div className="hidden md:block text-left text-xs">
            <p className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.full_name || user?.username}
            </p>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">
              {user?.role === 'SUPER_ADMIN' ? 'Owner / Admin' : user?.role}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          id="admin-logout-btn"
          onClick={logout}
          aria-label="Log out"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/30 border border-red-200 dark:border-rose-900/40 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
