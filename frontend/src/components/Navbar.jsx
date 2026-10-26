import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, LogOut, Shield, User, Building2 } from 'lucide-react';

export default function Navbar({ onToggleSidebar, pageTitle }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      {/* Left: Mobile menu toggle and current title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          id="mobile-sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            {pageTitle || 'Admin Dashboard'}
          </h1>
          <p className="hidden sm:block text-[11px] text-slate-400">
            Chit Fund Operations & Financial Collection Suite
          </p>
        </div>
      </div>

      {/* Right: User Profile & Logout */}
      <div className="flex items-center gap-3">
        {/* User Pill */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60">
          <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-semibold text-xs">
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div className="hidden md:block text-left text-xs">
            <p className="font-medium text-slate-200 leading-tight">
              {user?.full_name || user?.username}
            </p>
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-indigo-500/20 text-indigo-300">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          id="admin-logout-btn"
          onClick={logout}
          aria-label="Log out of application"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
