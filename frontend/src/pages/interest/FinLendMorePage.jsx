import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  Percent,
  Users,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Landmark,
  UserCheck,
  KeyRound,
  Banknote,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import RoleChip from '../../components/interest-ui/RoleChip';
import FinLendChangePasswordModal from '../../components/interest-ui/FinLendChangePasswordModal';

export default function FinLendMorePage() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);

  const interestRole = user?.interest_profile?.role || (user?.role === 'COLLECTION_AGENT' ? 'AGENT' : 'OWNER');
  const canManageUsers = interestRole === 'OWNER' || Boolean(user?.interest_profile?.permissions?.manage_users);

  const handleLogout = async () => {
    await logout();
    navigate('/login?business=interest');
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn font-sans pb-16">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
          More
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Settings, lending schemes, agents & system controls
        </p>
      </div>

      {/* Change Password Modal */}
      <FinLendChangePasswordModal
        isOpen={isPwdModalOpen}
        onClose={() => setIsPwdModalOpen(false)}
        forced={false}
      />

      {/* Profile Card */}
      <div className="rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-base shadow-md font-heading">
            {(user?.full_name || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-extrabold text-base text-slate-900 dark:text-white font-heading">
              {user?.full_name || 'Administrator'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <RoleChip role={interestRole} />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                FinLend Operations
              </span>
            </div>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
          Active
        </span>
      </div>

      {/* Section 1: Business Operations */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
          Lending Setup
        </h2>

        <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 overflow-hidden divide-y divide-slate-100 dark:divide-white/5 shadow-xs">
          {/* Loan Types */}
          <div
            onClick={() => navigate('/interest/more/loan-types')}
            className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white font-heading">
                  Loan Types
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daily, Weekly, Monthly EMI and Monthly Vaddi schemes
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>

          {/* Users & Staff Permissions */}
          {canManageUsers && (
            <div
              onClick={() => navigate('/interest/more/users')}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white font-heading">
                    Users & Staff Permissions
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Roles, permissions, field agents & customer route assignments
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          )}

          {/* Admin Day Closings & Review */}
          {canManageUsers && (
            <div
              onClick={() => navigate('/interest/day-closings')}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white font-heading">
                    Day Closings & Agent Handovers
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Verify field agent collections, count physical cash, and approve day shifts
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          )}

          {/* Agent Day Closing & Cash Handover Submit */}
          <div
            onClick={() => navigate('/interest/day-closing')}
            className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white font-heading">
                  Submit Daily Work & Handover
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Submit today's collected money and hand over cash to Admin
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Section 2: Preferences & Cross-Business */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
          Preferences & Security
        </h2>

        <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 overflow-hidden divide-y divide-slate-100 dark:divide-white/5 shadow-xs">
          {/* Change Password */}
          <div
            onClick={() => setIsPwdModalOpen(true)}
            className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white font-heading">
                  Change Password
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update your personal login password
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>

          {/* Switch to ChitFund Pro */}
          <Link
            to="/admin/dashboard"
            className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] cursor-pointer transition-colors block"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white font-heading">
                  Switch to ChitFund Pro
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Open Chit Schemes, Auctions & Member Groups
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>

          {/* Theme Toggle */}
          <div
            onClick={toggleTheme}
            className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white font-heading">
                  Appearance
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isDark ? 'Dark Mode Active' : 'Light Mode Active'}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isDark ? 'Switch to Light' : 'Switch to Dark'}
            </span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full p-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer font-heading"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </button>

      <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-2">
        FinLend Pro v2.4 • Simple, Fast, Zero Confusion
      </div>
    </div>
  );
}
