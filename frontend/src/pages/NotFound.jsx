import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();

  const homePath = isAuthenticated
    ? (isAdmin ? '/admin/dashboard' : '/agent/dashboard')
    : '/login';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center p-6 text-center transition-colors">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 shadow-xs">
        <Compass className="w-8 h-8" />
      </div>
      
      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest font-mono">
        HTTP 404 Error
      </span>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 mb-2 tracking-tight">
        Screen Not Found
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        The route you are navigating to does not exist or has been relocated within the ChitFund Pro portal.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>

        <Link
          to={homePath}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span>{isAuthenticated ? 'Return to Dashboard' : 'Back to Login'}</span>
        </Link>
      </div>

      <p className="mt-8 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
        ChitFund Pro · Secure Management Portal
      </p>
    </div>
  );
}

