import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedChitBackground from '../components/AnimatedChitBackground';
import AnimatedFinLendBackground from '../components/AnimatedFinLendBackground';
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
  Moon,
  ArrowRight,
  Layers,
  Landmark,
  Percent,
  ArrowLeft,
} from 'lucide-react';
import { getFriendlyErrorMessage } from '../utils/friendlyError';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login, isAuthenticated, isAdmin, isAgent } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  // Selected Business: 'chitfund' | 'interest'
  const initialBusiness = searchParams.get('business') === 'interest' ? 'interest' : 'chitfund';
  const [business, setBusiness] = useState(initialBusiness);

  // Role selection: 'ADMIN' | 'COLLECTION_AGENT'
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Sync state if URL query param changes
  useEffect(() => {
    const qb = searchParams.get('business');
    if (qb === 'interest' || qb === 'chitfund') {
      setBusiness(qb);
    }
  }, [searchParams]);

  const handleSwitchBusiness = (newBiz) => {
    setBusiness(newBiz);
    setSearchParams({ business: newBiz });
    setError('');
    setSuccessMessage('');
  };

  // If already authenticated, redirect to appropriate business
  useEffect(() => {
    if (isAuthenticated) {
      if (business === 'interest') {
        if (isAdmin) navigate('/interest/home', { replace: true });
        else if (isAgent) navigate('/interest/agent/collections', { replace: true });
      } else {
        if (isAdmin) navigate('/admin/dashboard', { replace: true });
        else if (isAgent) navigate('/agent/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, isAgent, business, navigate]);

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
        business,
      });

      setSuccessMessage('Login verified. Accessing system dashboard...');

      // Store celebration data
      sessionStorage.setItem(
        'chitfund_celebrate_welcome',
        JSON.stringify({
          name: res.user?.full_name || username.trim(),
          role: res.user?.role || selectedRole,
          business,
        })
      );

      setTimeout(() => {
        if (res.user.role === 'SUPER_ADMIN' || res.user.role === 'ADMIN') {
          if (business === 'interest') {
            navigate('/interest/home', { replace: true });
          } else {
            navigate('/admin/dashboard', { replace: true });
          }
        } else {
          if (business === 'interest') {
            navigate('/interest/agent/collections', { replace: true });
          } else {
            navigate('/agent/dashboard', { replace: true });
          }
        }
      }, 350);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Authentication failed. Please verify your credentials and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isInterest = business === 'interest';

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 p-4 sm:p-6 relative overflow-hidden transition-colors selection:bg-blue-500 selection:text-white">
      {/* 100% Vector Animated Background with Authentic Currency, Tokens & Symbols */}
      {isInterest ? <AnimatedFinLendBackground /> : <AnimatedChitBackground />}

      {/* Top Header Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs transition-colors backdrop-blur-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">All Businesses</span>
          </Link>

          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ${
                isInterest
                  ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-500/20'
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-500/20'
              }`}
            >
              {isInterest ? <Landmark className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white font-heading">
                {isInterest ? (
                  <>FinLend<span className="text-indigo-600 dark:text-indigo-400">Pro</span></>
                ) : (
                  <>ChitFund<span className="text-emerald-600 dark:text-emerald-400">Pro</span></>
                )}
              </span>
              <span
                className={`hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  isInterest
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}
              >
                {isInterest ? 'Interest & Lending Engine' : 'Chit Fund & Auction Suite'}
              </span>
            </div>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer shadow-xs backdrop-blur-md"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </header>

      {/* Main Form Container - Seamless Glass Without Harsh Night Mode Box */}
      <main className="w-full max-w-md my-auto z-10 py-6 px-1 sm:px-0">
        <div className="relative group">
          <div
            className={`absolute -inset-1 rounded-[2rem] blur-2xl opacity-60 group-hover:opacity-90 transition duration-500 pointer-events-none ${
              isInterest
                ? 'bg-gradient-to-r from-indigo-600/30 via-violet-600/20 to-purple-500/30'
                : 'bg-gradient-to-r from-emerald-600/30 via-teal-600/20 to-cyan-500/30'
            }`}
          />

          <div className="relative bg-white/95 dark:bg-slate-900/70 backdrop-blur-2xl rounded-3xl border border-slate-200/70 dark:border-white/10 shadow-2xl p-6 sm:p-8 transition-all">
            {/* Top Business Switcher Track (Seamless Pill) */}
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-2xl border border-slate-200/60 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => handleSwitchBusiness('chitfund')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !isInterest
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>ChitFund Pro</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchBusiness('interest')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isInterest
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>FinLend Pro</span>
                </button>
              </div>
            </div>

            {/* Floating Brand Badge */}
            <div className="flex justify-center mb-3">
              <div
                className={`w-14 h-14 rounded-2xl p-0.5 shadow-lg flex items-center justify-center transform hover:scale-105 transition-transform duration-300 ${
                  isInterest
                    ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 shadow-indigo-500/30'
                    : 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 shadow-emerald-500/30'
                }`}
              >
                <div className="w-full h-full rounded-[14px] bg-slate-900/40 flex items-center justify-center text-white">
                  {isInterest ? <Percent className="w-7 h-7" /> : <Layers className="w-7 h-7" />}
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-heading">
                {isInterest ? 'FinLend Pro Login' : 'ChitFund Pro Login'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {isInterest
                  ? 'Sign in to manage interest schemes, loans, customer ledgers & collections'
                  : 'Sign in for chit funds, auctions, commissions & route collections'}
              </p>
            </div>

            {/* Portal Selector (Admin vs Agent) */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Select Access Role
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100/90 dark:bg-white/[0.04] rounded-2xl border border-slate-200/60 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => handleRoleChange('ADMIN')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    selectedRole === 'ADMIN'
                      ? isInterest
                        ? 'bg-indigo-600 text-white shadow-md font-bold'
                        : 'bg-emerald-600 text-white shadow-md font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Admin Portal</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange('COLLECTION_AGENT')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    selectedRole === 'COLLECTION_AGENT'
                      ? isInterest
                        ? 'bg-indigo-600 text-white shadow-md font-bold'
                        : 'bg-emerald-600 text-white shadow-md font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>Agent Portal</span>
                </button>
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span className="font-semibold">{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 font-heading">
                  {selectedRole === 'ADMIN' ? 'Admin Username' : 'Agent Username / ID'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={selectedRole === 'ADMIN' ? 'e.g. admin' : 'e.g. agent1'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 font-heading">
                  Password / PIN
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your secret password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer font-heading ${
                  isInterest
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to {isInterest ? 'FinLend Pro' : 'ChitFund Pro'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl text-center py-2 text-xs text-slate-500">
        © {new Date().getFullYear()} {isInterest ? 'FinLend Pro Lending Platform' : 'ChitFund Pro Management System'}. Banking-Grade Security.
      </footer>
    </div>
  );
}
