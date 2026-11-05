import React from 'react';

export default function AmountInput({
  value,
  onChange,
  placeholder = '0',
  label = 'Amount',
  chips = [],
  onChipSelect,
  className = '',
  disabled = false,
  autoFocus = false,
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
          {label}
        </label>
      )}

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-black text-slate-400 select-none">
          ₹
        </span>
        <input
          type="number"
          step="any"
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-2xl text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner disabled:opacity-50"
        />
      </div>

      {chips && chips.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          {chips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChipSelect && onChipSelect(chip.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10 transition-colors shrink-0 cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

