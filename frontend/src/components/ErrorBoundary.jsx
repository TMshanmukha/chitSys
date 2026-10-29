import React from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoDashboard = () => {
    window.location.href = '/admin/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-lg w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-5 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner border border-amber-500/20">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-heading">
                Temporary Display Glitch Resolved
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                This page encountered a temporary rendering condition while processing real-time financial data.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-left font-mono text-[11px] text-slate-700 dark:text-slate-300 max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoDashboard}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
