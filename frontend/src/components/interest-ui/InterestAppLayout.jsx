import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AnimatedFinLendBackground from '../AnimatedFinLendBackground';
import ErrorBoundary from '../ErrorBoundary';
import DesktopRail from './DesktopRail';
import BottomNav from './BottomNav';
import FinLendChangePasswordModal from './FinLendChangePasswordModal';
import { Layers, Sun, Moon, LogOut, Landmark } from 'lucide-react';

export default function InterestAppLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [pwdForcedClosed, setPwdForcedClosed] = useState(false);

  const mustChangePassword = Boolean(user?.interest_profile?.must_change_password) && !pwdForcedClosed;

  const handleLogout = async () => {
    await logout();
    navigate('/login?business=interest');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Forced Password Change Modal */}
      <FinLendChangePasswordModal
        isOpen={mustChangePassword}
        onClose={() => setPwdForcedClosed(true)}
        forced={true}
      />
      {/* Dynamic Animated FinLend Vector Background */}
      <AnimatedFinLendBackground />

      {/* Desktop Left Rail (md: and up) */}
      <DesktopRail />

      {/* Mobile Top Header (hidden on md:) */}
      <header className="md:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-white/85 dark:bg-[#0c1220]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 shadow-xs shrink-0">
        <Link to="/interest/home" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-xs font-heading">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white font-heading">
              FinLend Pro
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          {/* Switch to ChitFund Pro */}
          <Link
            to="/admin/dashboard"
            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60"
            title="Switch to ChitFund Pro"
          >
            <Layers className="w-4 h-4" />
          </Link>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-rose-500"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="md:pl-60 flex-1 pb-20 md:pb-8 relative z-10 animate-pageSlideIn w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation (hidden on md:) */}
      <BottomNav />
    </div>
  );
}
