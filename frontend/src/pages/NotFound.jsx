import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h1 className="text-3xl font-bold font-['Outfit'] mb-2">404 — Page Not Found</h1>
      <p className="text-sm text-slate-400 max-w-sm mb-6">
        The requested screen does not exist or you do not have permission to access it.
      </p>
      <Link
        to="/login"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
      >
        <Home className="w-4 h-4" />
        <span>Return to Login</span>
      </Link>
    </div>
  );
}
