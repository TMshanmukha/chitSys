import React from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard, ArrowLeft, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDevDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log sanitized diagnostic details for developers without leaking in prod UI
    if (import.meta.env?.DEV) {
      console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
    } else {
      console.error('[ErrorBoundary] Page rendering error caught safely. Fallback displayed.');
    }
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoDashboard = () => {
    const isAgent = window.location.pathname.startsWith('/agent');
    window.location.href = isAgent ? '/agent/dashboard' : '/admin/dashboard';
  };

  handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.handleGoDashboard();
    }
  };

  render() {
    if (this.state.hasError) {
      const isDev = Boolean(import.meta.env?.DEV);

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="max-w-lg w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner border border-amber-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading">
                Something went wrong. Please try again.
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                We encountered an unexpected issue while loading this section. Your recorded data and financial records remain safe.
              </p>
            </div>

            {/* Diagnostic Details - Visible only during local development */}
            {isDev && this.state.error && (
              <div className="text-left">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDevDetails: !prev.showDevDetails }))}
                  className="text-[11px] font-mono text-amber-600 dark:text-amber-400 underline hover:no-underline cursor-pointer"
                >
                  {this.state.showDevDetails ? 'Hide Dev Diagnostics' : 'Show Dev Diagnostics'}
                </button>
                {this.state.showDevDetails && (
                  <div className="mt-2 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 font-mono text-[11px] text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto break-words">
                    <p className="font-bold text-rose-600 dark:text-rose-400 mb-1">
                      {this.state.error.name}: {this.state.error.message}
                    </p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-[10px] whitespace-pre-wrap text-slate-500">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1 text-xs">
              <button
                type="button"
                onClick={this.handleGoBack}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Go Back</span>
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                onClick={this.handleGoDashboard}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
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
