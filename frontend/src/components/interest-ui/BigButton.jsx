import React from 'react';

export default function BigButton({
  children,
  onClick,
  variant = 'primary', // 'primary' | 'success' | 'secondary' | 'danger'
  disabled = false,
  className = '',
  type = 'button',
  icon: Icon,
}) {
  const base =
    'min-h-[48px] px-5 py-3 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-xs select-none disabled:opacity-50 disabled:pointer-events-none font-heading';

  const variants = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 hover:shadow-indigo-600/30',
    success:
      'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 hover:shadow-emerald-600/30',
    secondary:
      'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-white/10',
    danger:
      'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
    >
      {Icon && <Icon className="w-5 h-5 shrink-0 stroke-[2.2]" />}
      <span>{children}</span>
    </button>
  );
}
