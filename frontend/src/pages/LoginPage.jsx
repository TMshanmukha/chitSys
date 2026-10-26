import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin, isAgent } = useAuth();

  // Role selection: 'ADMIN' | 'COLLECTION_AGENT'
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) navigate('/admin/dashboard', { replace: true });
      else if (isAgent) navigate('/agent/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAdmin, isAgent, navigate]);

  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
    setError('');
    setSuccessMessage('');
    // Clear or reset fields appropriately
    if (newRole === 'ADMIN') {
      setUsername('');
      setPassword('');
    } else {
      setUsername('');
      setPassword('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (selectedRole === 'COLLECTION_AGENT' && !username.trim()) {
      setError('Please enter your unique Collection Agent username.');
      return;
    }

    if (!password) {
      setError(`Please enter your ${selectedRole === 'ADMIN' ? 'administrator password or PIN' : 'PIN or password'}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login({
        role: selectedRole,
        username: selectedRole === 'ADMIN' ? (username.trim() || undefined) : username.trim(),
        password,
      });

      setSuccessMessage('Credentials verified. Redirecting to workspace...');

      setTimeout(() => {
        if (res.user.role === 'SUPER_ADMIN' || res.user.role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/agent/dashboard', { replace: true });
        }
      }, 500);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill helper for testing & development
  const handleQuickFill = (role) => {
    if (role === 'ADMIN') {
      setSelectedRole('ADMIN');
      setUsername('admin');
      setPassword('AdminChitFund2026!');
    } else {
      setSelectedRole('COLLECTION_AGENT');
      setUsername('agent01');
      setPassword('Agent1234!');
    }
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10">
        {/* Branding Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-lg shadow-indigo-500/25 mb-3">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Outfit']">
            ChitFund <span className="text-indigo-400">Pro</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Private Chit Fund & Daily Collection Management System
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl p-5 sm:p-7 transition-all">
          {/* Role Selection Switcher */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Authorized Portal
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/80 rounded-xl border border-slate-700/50">
              <button
                type="button"
                id="role-admin-btn"
                onClick={() => handleRoleChange('ADMIN')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  selectedRole === 'ADMIN'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Login</span>
              </button>

              <button
                type="button"
                id="role-agent-btn"
                onClick={() => handleRoleChange('COLLECTION_AGENT')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  selectedRole === 'COLLECTION_AGENT'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Agent Login</span>
              </button>
            </div>
          </div>

          {/* Role Status Tag */}
          <div className="mb-4 flex items-center justify-between px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700/40 text-xs">
            <span className="text-slate-400">Target Role:</span>
            <span
              className={`font-semibold uppercase tracking-wider ${
                selectedRole === 'ADMIN' ? 'text-indigo-400' : 'text-blue-400'
              }`}
            >
              {selectedRole === 'ADMIN' ? 'Owner / Administrator' : 'Authorized Route Agent'}
            </span>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div
              id="auth-error-alert"
              className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {successMessage && (
            <div
              id="auth-success-alert"
              className="mb-4 flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Agent Username Field (Shown for Collection Agent, optional for Admin) */}
            {selectedRole === 'COLLECTION_AGENT' ? (
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Agent Username / ID <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. agent01"
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="admin-username"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Administrator Username <span className="text-slate-500 font-normal">(Default: admin)</span>
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin (Leave empty to use primary Super Admin)"
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password / PIN Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-300"
                >
                  {selectedRole === 'ADMIN' ? 'Admin Password / PIN' : 'Agent PIN / Password'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  {selectedRole === 'ADMIN' ? 'Secured by Argon2/Bcrypt' : 'Numeric or alphanumeric'}
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  {selectedRole === 'ADMIN' ? <Lock className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
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
                      ? 'Enter admin password'
                      : 'Enter agent password or PIN'
                  }
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit-btn"
              disabled={isSubmitting}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                selectedRole === 'ADMIN'
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In as {selectedRole === 'ADMIN' ? 'Administrator' : 'Collection Agent'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Test Credentials
              </span>
              <span className="text-[10px] text-slate-500">Dev Mode</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('ADMIN')}
                className="py-1.5 px-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-700/50 hover:border-indigo-500/50 rounded-lg text-slate-300 text-xs transition-all flex flex-col items-center"
              >
                <span className="font-semibold text-indigo-300">Admin Account</span>
                <span className="text-[10px] text-slate-400">admin / AdminChit...</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('COLLECTION_AGENT')}
                className="py-1.5 px-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-700/50 hover:border-blue-500/50 rounded-lg text-slate-300 text-xs transition-all flex flex-col items-center"
              >
                <span className="font-semibold text-blue-300">Agent Account</span>
                <span className="text-[10px] text-slate-400">agent01 / Agent12...</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="text-center mt-6 text-xs text-slate-500 flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Internal Financial Portal. Authorized Business Access Only.</span>
        </div>
      </div>
    </div>
  );
}
