import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AnimatedFinLendBackground from '../AnimatedFinLendBackground';
import ErrorBoundary from '../ErrorBoundary';
import DesktopRail from './DesktopRail';
import BottomNav from './BottomNav';
import FinLendChangePasswordModal from './FinLendChangePasswordModal';
import FinLendLogo from '../FinLendLogo';
import { Layers, Sun, Moon, LogOut } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans relative selection:bg-indigo-500 selection:text-white">
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

      {/* Main Viewport Container */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 z-10">
        {/* Mobile Top Header (hidden on md:) */}
        <header className="md:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-white/90 dark:bg-[#0c1220]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 shadow-xs shrink-0">
          <Link to="/interest/home" className="flex items-center gap-2.5">
            <FinLendLogo size={34} variant="app-icon" className="shrink-0" />
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

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 md:pb-10 animate-pageSlideIn">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation (hidden on md:) */}
      <BottomNav />
    </div>
  );
}
