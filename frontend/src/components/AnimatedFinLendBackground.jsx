import React from 'react';

/**
 * AnimatedFinLendBackground:
 * Ultra-modern, high-end FinTech & Credit Analytics vector background.
 * Completely distinct from ChitFund (NO paper currency notes, NO gold coins, NO chit slips).
 * 
 * Features:
 * 1. Geometric financial coordinate grid & micro crosshairs (+)
 * 2. Elegant glowing Amortization Payoff & Interest Yield Bezier spline curves
 * 3. Minimalist digital financial telemetry (APR tickers, credit yield nodes, ledger blocks)
 * 4. Deep atmospheric radial glow mesh (indigo, violet, cyan)
 */
export default function AnimatedFinLendBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* 1. Deep Atmospheric Gradient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 dark:from-[#060913] dark:via-[#080d1e] dark:to-[#05060f] transition-colors duration-500" />

      {/* 2. Soft Ambient Luminous Color Nebulas */}
      <div className="absolute -top-40 -left-40 w-[650px] h-[650px] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent dark:from-indigo-600/15 dark:via-purple-600/10 dark:to-transparent rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '7s' }} />
      <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] bg-gradient-to-bl from-cyan-500/10 via-indigo-500/8 to-transparent dark:from-cyan-600/12 dark:via-indigo-900/15 dark:to-transparent rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '9s' }} />
      <div className="absolute -bottom-48 left-1/3 w-[700px] h-[700px] bg-gradient-to-tr from-violet-600/10 via-indigo-500/6 to-transparent dark:from-purple-950/20 dark:via-indigo-950/15 dark:to-transparent rounded-full blur-[160px]" />

      {/* 3. High-Tech Financial Matrix Grid (Isometric Coordinate Points) */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.035] dark:opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="fintechGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-slate-900 dark:text-indigo-300" />
            <circle cx="0" cy="0" r="1.5" fill="currentColor" className="text-indigo-600 dark:text-indigo-400" />
            <circle cx="48" cy="48" r="1.5" fill="currentColor" className="text-indigo-600 dark:text-indigo-400" />
            {/* Small crosshair in center */}
            <path d="M 22 24 L 26 24 M 24 22 L 24 26" stroke="currentColor" strokeWidth="0.6" className="text-slate-400 dark:text-indigo-500" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#fintechGrid)" />
      </svg>

      {/* 4. Elegant SVG Amortization Yield Splines (Top-Right to Center-Left) */}
      <svg className="absolute top-0 right-0 w-full h-[650px] pointer-events-none opacity-20 dark:opacity-30" viewBox="0 0 1440 650" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="yieldGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="yieldGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#6366F1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
          </linearGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Primary Amortization Payoff Spline Curve */}
        <path
          d="M -100 480 C 250 480, 450 320, 750 290 C 1050 260, 1250 140, 1550 110"
          stroke="url(#yieldGrad1)"
          strokeWidth="2.5"
          filter="url(#glowFilter)"
        />
        <path
          d="M -100 480 C 250 480, 450 320, 750 290 C 1050 260, 1250 140, 1550 110"
          stroke="url(#yieldGrad1)"
          strokeWidth="1.2"
          strokeDasharray="6 4"
        />

        {/* Secondary Interest Accrual Curve */}
        <path
          d="M -100 240 C 300 260, 600 420, 950 380 C 1200 350, 1380 200, 1550 180"
          stroke="url(#yieldGrad2)"
          strokeWidth="1.8"
          strokeDasharray="4 6"
        />

        {/* Data Coordinate Nodes on Spline */}
        <circle cx="750" cy="290" r="5" fill="#6366F1" className="animate-ping" style={{ animationDuration: '3s' }} />
        <circle cx="750" cy="290" r="4" fill="#FFFFFF" stroke="#6366F1" strokeWidth="2" />
        <circle cx="1050" cy="260" r="3.5" fill="#8B5CF6" />
        <circle cx="450" cy="320" r="3.5" fill="#06B6D4" />

        {/* Subtle Horizontal Benchmark Level */}
        <line x1="200" y1="290" x2="1300" y2="290" stroke="#6366F1" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.4" />
      </svg>

      {/* 5. Minimalist FinTech Floating Telemetry Chips (Clean, Tech-Forward, Zero Clutter) */}
      
      {/* Telemetry 1: Yield Matrix Badge (Top Right) */}
      <div className="hidden lg:block absolute top-[12%] right-[4%] opacity-20 dark:opacity-35 transform rotate-2 hover:opacity-80 transition-opacity">
        <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-indigo-200/50 dark:border-indigo-500/20 font-mono text-[10px] space-y-1 shadow-sm">
          <div className="flex items-center justify-between gap-4 text-indigo-600 dark:text-indigo-400 font-bold font-sans">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              FIN_ENGINE // ACTIVE
            </span>
            <span>v2.5</span>
          </div>
          <div className="text-slate-600 dark:text-slate-300">AMORTIZATION: REDUCING_BAL</div>
          <div className="text-slate-400 dark:text-slate-500 text-[9px]">LEDGER_HASH: 0x8F9B...421D</div>
        </div>
      </div>

      {/* Telemetry 2: APR Yield Metric Card (Mid Left) */}
      <div className="hidden xl:block absolute top-[42%] left-[18%] opacity-15 dark:opacity-30 transform -rotate-3 hover:opacity-80 transition-opacity">
        <div className="p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-purple-200/50 dark:border-purple-500/20 font-mono text-[10px] space-y-1 shadow-sm w-44">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-sans font-bold">Compound Benchmark</div>
          <div className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 leading-tight">24.0% APR</div>
          <div className="flex items-center justify-between text-[9px] text-slate-500">
            <span>Monthly Yield</span>
            <span className="text-emerald-500 font-bold">+2.00%</span>
          </div>
          {/* Micro Trend Bars */}
          <div className="flex items-end gap-1 h-4 pt-1">
            <span className="w-2 bg-indigo-500/40 rounded-xs h-2" />
            <span className="w-2 bg-indigo-500/60 rounded-xs h-3" />
            <span className="w-2 bg-purple-500/70 rounded-xs h-2.5" />
            <span className="w-2 bg-purple-500/90 rounded-xs h-3.5" />
            <span className="w-2 bg-emerald-500 rounded-xs h-4" />
          </div>
        </div>
      </div>

      {/* Telemetry 3: Repayment Cadence Badge (Bottom Right) */}
      <div className="hidden lg:block absolute bottom-[10%] right-[8%] opacity-15 dark:opacity-25 transform rotate-1">
        <div className="p-3 rounded-2xl bg-white/30 dark:bg-slate-900/30 backdrop-blur-md border border-cyan-200/40 dark:border-cyan-500/20 font-mono text-[10px] space-y-1">
          <div className="text-cyan-600 dark:text-cyan-400 font-bold font-sans flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            DISBURSEMENT_MATRIX
          </div>
          <div className="text-slate-500 text-[9px]">REPAYMENT: DAILY · WEEKLY · MONTHLY</div>
        </div>
      </div>
    </div>
  );
}
