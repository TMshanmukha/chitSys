import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  Layers,
  Landmark,
  Coins,
  Percent,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  Building2,
  Users,
  BadgePercent,
  Calendar,
} from 'lucide-react';

export default function BusinessSelectorPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b10_1px,transparent_1px),linear-gradient(to_bottom,#1e293b10_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 px-6 sm:px-12 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/20">
            CP
          </div>
          <div>
            <div className="font-extrabold text-white text-base tracking-tight font-heading flex items-center gap-2">
              <span>ChitFund Pro Enterprise Suite</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-emerald-400 border border-white/10">
                v2.5 Dual-Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">Integrated Financial Operations & Lending Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>
        </div>
      </header>

      {/* Hero & Dual-Business Cards */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 sm:px-12 py-10 sm:py-16 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Select Your Business Management Workspace</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-heading leading-tight">
            Two Independent Financial Engines.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
              One Unified Enterprise Platform.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Choose the operational business unit you want to manage. Each system maintains 100% strict separation of accounts, customers, transactions, and financial ledgers.
          </p>
        </div>

        {/* Dual Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Card 1: Business A - ChitFund Pro */}
          <div className="group relative rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-emerald-500/20 hover:border-emerald-500/50 p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 backdrop-blur-xl">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Coins className="w-36 h-36 text-emerald-400" />
            </div>

            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Layers className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Business A
                </span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
                  ChitFund Pro
                </h2>
                <p className="text-sm text-emerald-400/90 font-medium mt-1">
                  Chit Fund Schemes, Auctions & Group Savings
                </p>
                <p className="text-xs sm:text-sm text-slate-400 mt-2.5 leading-relaxed">
                  Manage chit groups, dynamic multi-subscriber bidding auctions, foreman commissions, dividend distributions, and field agent daily collection routes.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 font-medium">Regular & Double Auction Pools</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 font-medium">Foreman Commission & Dividends</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 font-medium">Daily & Monthly Subscriber Cycles</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 font-medium">Agent Route Planner & Overdues</span>
                </div>
              </div>
            </div>

            <div className="pt-8 relative z-10">
              <button
                type="button"
                onClick={() => navigate('/login?business=chitfund')}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 group-hover:gap-3 transition-all cursor-pointer font-heading"
              >
                <span>Enter ChitFund Pro</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Business B - FinLend Pro */}
          <div className="group relative rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-indigo-500/20 hover:border-indigo-500/50 p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 backdrop-blur-xl">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Landmark className="w-36 h-36 text-indigo-400" />
            </div>

            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <Percent className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Business B
                </span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
                  FinLend Pro
                </h2>
                <p className="text-sm text-indigo-400/90 font-medium mt-1">
                  Interest Business & Micro-Finance Lending
                </p>
                <p className="text-xs sm:text-sm text-slate-400 mt-2.5 leading-relaxed">
                  Configure real-world lending products (Flat, Reducing Balance EMI, Daily Balance, Interest-only Bullet), automated amortization ledgers, and 1-click agent collection.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 font-medium">Configurable 7-Step Scheme Builder</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 font-medium">Flat / Reducing / Bullet / Daily Balance</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 font-medium">Multi-Loan Borrower Profile & Ledgers</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 font-medium">Agent 1-Click Collection & Receipts</span>
                </div>
              </div>
            </div>

            <div className="pt-8 relative z-10">
              <button
                type="button"
                onClick={() => navigate('/login?business=interest')}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group-hover:gap-3 transition-all cursor-pointer font-heading"
              >
                <span>Enter FinLend Pro</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 sm:px-12 py-6 border-t border-white/5 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Banking-grade security · Strict Zero-Mix Database Isolation · Immutable Financial Auditing</span>
        </div>
        <div>
          © {new Date().getFullYear()} ChitFund Pro & FinLend Pro Enterprise. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

