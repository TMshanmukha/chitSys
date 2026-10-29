import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  KeyRound,
  Sun,
  ArrowRight,
} from 'lucide-react';
import { getFriendlyErrorMessage } from '../utils/friendlyError';
import AnimatedChitBackground from '../components/AnimatedChitBackground';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin, isAgent } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  // Role selection: 'ADMIN' | 'COLLECTION_AGENT'
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) navigate('/admin/dashboard', { replace: true });
      else if (isAgent) navigate('/agent/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAdmin, isAgent, navigate]);

  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
    setError('');
    setSuccessMessage('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!username.trim()) {
      setError(
        selectedRole === 'ADMIN'
          ? 'Please enter your administrator username.'
          : 'Please enter your assigned collection agent username or ID.'
      );
      return;
    }

    if (!password) {
      setError(
        selectedRole === 'ADMIN'
          ? 'Please enter your administrator password.'
          : 'Please enter your assigned agent password or PIN.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login({
        role: selectedRole,
        username: username.trim(),
        password,
      });

      setSuccessMessage('Login verified. Accessing system dashboard...');

      // Store celebration data so the welcome celebration modal triggers upon landing on dashboard
      sessionStorage.setItem(
        'chitfund_celebrate_welcome',
        JSON.stringify({
          name: res.user?.full_name || username.trim(),
          role: res.user?.role || selectedRole,
        })
      );

      setTimeout(() => {
        if (res.user.role === 'SUPER_ADMIN' || res.user.role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/agent/dashboard', { replace: true });
        }
      }, 350);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Authentication failed. Please verify your credentials and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-transparent text-slate-800 dark:text-slate-100 p-4 sm:p-6 relative overflow-hidden transition-colors selection:bg-blue-500 selection:text-white">
      {/* Background with Static Chit Fund Imagery, Money, and Ambient Lights */}
      <AnimatedChitBackground />

      {/* Top Header Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              ChitFund<span className="text-blue-600 dark:text-blue-400">Pro</span>
            </span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60">
              Enterprise Suite
            </span>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          id="login-theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors cursor-pointer shadow-xs"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </header>

      {/* Main 3D Elevated Card Layer */}
      <main className="w-full max-w-md my-auto z-10 py-6 px-1 sm:px-0 [perspective:1000px]">
        {/* Ambient 3D Depth Layer */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-sky-500/30 rounded-[2.5rem] blur-2xl opacity-75 group-hover:opacity-100 transition duration-500 pointer-events-none" />

          {/* Elevated 3D Glass Form Slab */}
          <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2.25rem] border border-white/80 dark:border-slate-800/80 shadow-[0_30px_70px_-15px_rgba(37,99,235,0.22),0_12px_24px_-8px_rgba(15,23,42,0.14),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[0_35px_80px_-15px_rgba(0,0,0,0.95),0_0_50px_rgba(59,130,246,0.2),inset_0_1px_1px_rgba(255,255,255,0.15)] p-6 sm:p-8 transition-all">
            {/* Top 3D Specular Rim Lighting Reflection */}
            <div className="absolute top-0 inset-x-8 h-1 bg-gradient-to-r from-transparent via-blue-500/50 dark:via-blue-400/50 to-transparent rounded-t-3xl" />
            <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-blue-300/60 to-transparent" />

            {/* 3D Floating Icon Seal */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-0.5 shadow-[0_10px_20px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] flex items-center justify-center transform hover:rotate-3 hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-inner">
                  <ShieldCheck className="w-7 h-7 drop-shadow-md" />
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Welcome Back
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {selectedRole === 'ADMIN'
                  ? 'Administrator portal for financial audits, auctions & ledger operations'
                  : 'Agent portal for scheduled daily/monthly collection routes'}
              </p>
            </div>

            {/* 3D Recessed Portal Selector Track */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Select Access Portal
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100/90 dark:bg-slate-950/80 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.05)]">
                <button
                  type="button"
                  id="role-admin-btn"
                  onClick={() => handleRoleChange('ADMIN')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    selectedRole === 'ADMIN'
                      ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.2)] border-t border-white/25 active:translate-y-0.5 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Admin Portal</span>
                </button>

                <button
                  type="button"
                  id="role-agent-btn"
                  onClick={() => handleRoleChange('COLLECTION_AGENT')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    selectedRole === 'COLLECTION_AGENT'
                      ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.2)] border-t border-white/25 active:translate-y-0.5 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>Agent Portal</span>
                </button>
              </div>
            </div>

            {/* Human-Friendly Error Alert */}
            {error && (
              <div
                id="auth-error-alert"
                role="alert"
                className="mb-5 flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs sm:text-sm animate-fadeIn shadow-xs"
              >
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <span className="font-semibold block text-rose-700 dark:text-rose-300 mb-0.5">
                    Sign-In Notice
                  </span>
                  {error}
                </div>
              </div>
            )}

            {/* Success Alert */}
            {successMessage && (
              <div
                id="auth-success-alert"
                role="status"
                className="mb-5 flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm animate-fadeIn shadow-xs"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1 font-medium">{successMessage}</div>
              </div>
            )}

            {/* 3D Tactile Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div>
                <label
                  htmlFor={selectedRole === 'ADMIN' ? 'admin-username' : 'username'}
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {selectedRole === 'ADMIN' ? 'Administrator Username' : 'Agent Username / Assigned ID'}
                </label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id={selectedRole === 'ADMIN' ? 'admin-username' : 'username'}
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={
                      selectedRole === 'ADMIN'
                        ? 'Enter administrator username'
                        : 'Enter assigned agent username'
                    }
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl text-slate-900 dark:text-white text-sm placeholder:text-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                </div>
              </div>

              {/* Password / PIN Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {selectedRole === 'ADMIN' ? 'Admin Password' : 'Agent PIN / Password'}
                  </label>
                </div>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                    {selectedRole === 'ADMIN' ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <KeyRound className="w-4 h-4" />
                    )}
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      selectedRole === 'ADMIN'
                        ? 'Enter administrator password'
                        : 'Enter assigned agent password or PIN'
                    }
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-11 py-3 bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl text-slate-900 dark:text-white text-sm placeholder:text-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 3D Embossed Floating Action Button */}
              <button
                type="submit"
                id="login-submit-btn"
                disabled={isSubmitting}
                className="w-full mt-3 py-3.5 px-5 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-700 hover:from-blue-400 hover:via-blue-500 hover:to-indigo-600 shadow-[0_12px_24px_-6px_rgba(37,99,235,0.45),0_4px_8px_-2px_rgba(37,99,235,0.3),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-2px_0_rgba(0,0,0,0.25)] hover:shadow-[0_16px_32px_-6px_rgba(37,99,235,0.55),inset_0_1px_0_rgba(255,255,255,0.45)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_3px_8px_rgba(37,99,235,0.4),inset_0_2px_4px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-t border-white/25"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In as {selectedRole === 'ADMIN' ? 'Administrator' : 'Collection Agent'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="w-full max-w-5xl text-center py-4 text-xs text-slate-500 dark:text-slate-400 z-10">
        <p>
          ChitFund Pro Management Suite · Daily & Monthly Chits · Multi-Route Agent Tracking
        </p>
      </footer>
    </div>
  );
}
