import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  variant = 'default', // 'default' | 'success' | 'warning' | 'danger' | 'indigo'
  className = '',
  onClick,
}) {
  const valueColors = {
    default: 'text-slate-900 dark:text-white',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-rose-600 dark:text-rose-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:border-indigo-400/60 dark:hover:border-indigo-500/40' : ''
      } ${className}`}
    >
      <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </div>
      <div className={`text-xl sm:text-2xl font-black mt-1 font-heading tracking-tight ${valueColors[variant] || valueColors.default}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
}

