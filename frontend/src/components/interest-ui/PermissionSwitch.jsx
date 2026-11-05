import React from 'react';

export default function PermissionSwitch({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-heading">
          {label}
        </div>
        {description && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {description}
          </div>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer shrink-0 ${
          checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform absolute top-0.5 left-0.5 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

