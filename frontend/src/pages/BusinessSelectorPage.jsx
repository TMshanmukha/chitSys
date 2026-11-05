import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  Layers,
  Landmark,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';

export default function BusinessSelectorPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080b12] text-slate-800 dark:text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans transition-colors selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <header className="relative z-10 px-6 sm:px-12 py-4 flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.01] backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-sm font-heading">
            CP
          </div>
          <div>
            <div className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight font-heading leading-tight">
              ChitFund Pro Suite
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Enterprise Financial Systems</p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </header>

      {/* Main Business Selection - Single Viewport Centered */}
      <main className="relative z-10 flex-1 max-w-3xl mx-auto w-full px-6 flex flex-col justify-center py-6 sm:py-10">
        {/* Simple & Clean Header */}
        <div className="text-center mb-8 sm:mb-10 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-heading">
            Select Your Business
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Choose the operational business workspace you want to open.
          </p>
        </div>

        {/* Simple Two Cards Grid - Compact, Clean, No Long Text */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 items-stretch">
          {/* Card 1: ChitFund Pro */}
          <div
            onClick={() => navigate('/login?business=chitfund')}
            className="group relative rounded-2xl bg-white dark:bg-[#0d131f] border border-slate-200/80 dark:border-white/10 p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-[0_12px_28px_rgba(0,0,0,0.6)] hover:border-emerald-500/50 cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-heading">
                  ChitFund Pro
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Chit Schemes, Bidding Auctions & Collections
                </p>
              </div>
            </div>

            <div className="pt-6">
              <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors font-heading shadow-xs">
                <span>Enter ChitFund Pro</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Card 2: FinLend Pro */}
          <div
            onClick={() => navigate('/login?business=interest')}
            className="group relative rounded-2xl bg-white dark:bg-[#0d131f] border border-slate-200/80 dark:border-white/10 p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-[0_12px_28px_rgba(0,0,0,0.6)] hover:border-indigo-500/50 cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/40 group-hover:scale-105 transition-transform">
                <Landmark className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-heading">
                  FinLend Pro
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Interest Business & Lending Portfolios
                </p>
              </div>
            </div>

            <div className="pt-6">
              <div className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors font-heading shadow-xs">
                <span>Enter FinLend Pro</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="relative z-10 py-3 text-center text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
        ChitFund Pro & FinLend Pro • Strict Data Segregation
      </footer>
    </div>
  );
}
