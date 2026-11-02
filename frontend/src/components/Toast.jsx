import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Send } from 'lucide-react';

export default function Toast({
  title = 'Notification',
  message = '',
  type = 'success',
  onClose,
  duration = 4500,
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <div
      role="alert"
      className={`fixed top-5 right-4 sm:right-6 z-50 flex items-start gap-3.5 p-4 rounded-2xl shadow-2xl backdrop-blur-2xl border transition-all animate-fadeIn max-w-[calc(100vw-2rem)] sm:max-w-md ${
        isSuccess
          ? 'bg-slate-900/95 dark:bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-500/10'
          : isError
          ? 'bg-slate-900/95 dark:bg-slate-900/95 text-white border-rose-500/40 shadow-rose-500/10'
          : 'bg-slate-900/95 dark:bg-slate-900/95 text-white border-blue-500/40 shadow-blue-500/10'
      }`}
    >
      <div
        className={`p-2 rounded-xl shrink-0 ${
          isSuccess
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : isError
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : isError ? (
          <AlertCircle className="w-5 h-5" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <h4 className="text-xs font-black uppercase tracking-wider font-heading text-slate-200">
          {title}
        </h4>
        <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words font-sans">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

