import React from 'react';
import { Delete } from 'lucide-react';

export default function Keypad({ onKeyPress, onDelete, onClear }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-sm mx-auto select-none">
      {keys.map((k) => {
        if (k === 'DEL') {
          return (
            <button
              key={k}
              type="button"
              onClick={onDelete}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-lg active:scale-95 transition-all shadow-xs cursor-pointer"
              aria-label="Backspace"
            >
              <Delete className="w-6 h-6 stroke-[2.2]" />
            </button>
          );
        }

        return (
          <button
            key={k}
            type="button"
            onClick={() => onKeyPress(k)}
            className="h-14 sm:h-16 rounded-2xl bg-white hover:bg-slate-50 dark:bg-[#0c1220] dark:hover:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white font-extrabold text-xl sm:text-2xl active:scale-95 transition-all shadow-xs flex items-center justify-center font-mono cursor-pointer"
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}

