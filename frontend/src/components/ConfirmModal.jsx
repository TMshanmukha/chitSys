import React, { useEffect } from 'react';
import {
  AlertTriangle,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  X,
  Loader2,
  HelpCircle,
} from 'lucide-react';

/**
 * Reusable Confirmation Dialog for ChitFund Admin & Agent actions:
 * - Logout confirmation
 * - Deactivating an agent
 * - Recording irreversible financial collections
 * - Conducting auction bids
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'Please confirm if you want to proceed with this action.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary' | 'success'
  icon: CustomIcon,
  isLoading = false,
  subtext,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  // Variants styling
  const variantStyles = {
    danger: {
      bgIcon: 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50',
      btn: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white shadow-xs',
      defaultIcon: LogOut,
    },
    warning: {
      bgIcon: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50',
      btn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white shadow-xs',
      defaultIcon: AlertTriangle,
    },
    primary: {
      bgIcon: 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50',
      btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white shadow-xs',
      defaultIcon: ShieldAlert,
    },
    success: {
      bgIcon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50',
      btn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white shadow-xs',
      defaultIcon: CheckCircle2,
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.danger;
  const IconComponent = CustomIcon || currentVariant.defaultIcon || HelpCircle;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all transform animate-confirmScale"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${currentVariant.bgIcon}`}>
              <IconComponent className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3
                  id="confirm-modal-title"
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
                >
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  aria-label="Close dialog"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {message}
              </p>

              {subtext && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                  {subtext}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            id="confirm-modal-cancel-btn"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            id="confirm-modal-submit-btn"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 cursor-pointer hover:shadow-md ${currentVariant.btn} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
