import React from 'react';
import chitBgImage from '../assets/chit_fund_bg.jpg';

/**
 * AnimatedChitBackground:
 * Renders an authentic high-resolution static chit fund background image 
 * featuring Indian currency notes, auction bowl with name chits & tokens, 
 * auction gavel and ledger records, tinted with soft ambient light gradients 
 * and subtle floating financial motifs.
 */
export default function AnimatedChitBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* 1. Static Photorealistic Chit Fund & Currency Wallpaper Base Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 opacity-[0.24] dark:opacity-[0.16] scale-105"
        style={{
          backgroundImage: `url(${chitBgImage})`,
          filter: 'contrast(1.06) saturate(1.12)',
        }}
      />

      {/* 2. Soft Light Gradient Mesh & Tint Overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/85 via-white/70 to-blue-50/80 dark:from-slate-950/92 dark:via-slate-900/88 dark:to-blue-950/88 transition-colors backdrop-blur-[1px]" />
      
      {/* 3. Soft Luminous Color Nebulas */}
      <div className="absolute -top-32 -left-32 w-[650px] h-[650px] bg-gradient-to-br from-blue-400/12 to-indigo-500/10 dark:from-blue-600/10 dark:to-indigo-600/8 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-gradient-to-bl from-amber-400/10 via-orange-400/8 to-pink-400/8 dark:from-amber-600/8 dark:to-purple-900/8 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute -bottom-40 left-1/4 w-[750px] h-[750px] bg-gradient-to-tr from-emerald-400/10 via-teal-400/8 to-cyan-400/10 dark:from-emerald-600/8 dark:to-cyan-900/8 rounded-full blur-[160px]" />
      <div className="absolute top-2/3 right-1/4 w-[450px] h-[450px] bg-purple-400/8 dark:bg-purple-600/6 rounded-full blur-[130px] animate-pulse" style={{ animationDuration: '8s' }} />

      {/* Grid Pattern Watermark for Financial Ledger Depth */}
      <div 
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Floating Motif 1: Minted Golden Rupee Coin (Top Left) */}
      <div className="absolute top-[10%] left-[6%] animate-floatGently opacity-20 dark:opacity-30">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="drop-shadow-lg text-amber-500">
          <circle cx="36" cy="36" r="33" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 3" />
          <circle cx="36" cy="36" r="28" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="36" cy="36" r="22" fill="currentColor" fillOpacity="0.06" />
          <text x="36" y="44" textAnchor="middle" fill="currentColor" fontSize="26" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">
            ₹
          </text>
        </svg>
      </div>

      {/* Floating Motif 2: Official Chit Fund Certificate & Registrar Stamp (Top Right) */}
      <div className="absolute top-[16%] right-[8%] animate-driftSlow opacity-20 dark:opacity-25">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-blue-500 dark:text-blue-400 drop-shadow-md">
          {/* Certificate Page */}
          <rect x="14" y="8" width="52" height="64" rx="8" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
          <rect x="18" y="12" width="44" height="56" rx="4" fill="currentColor" fillOpacity="0.04" />
          {/* Header & Lines */}
          <line x1="24" y1="22" x2="48" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="24" y1="30" x2="56" y2="30" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
          <line x1="24" y1="38" x2="52" y2="38" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
          <line x1="24" y1="46" x2="42" y2="46" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
          {/* Official Seal Stamp */}
          <circle cx="50" cy="52" r="9" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="50" cy="52" r="5" fill="currentColor" fillOpacity="0.3" />
        </svg>
      </div>

      {/* Floating Motif 3: Reverse Auction Gavel & Bid Podium (Mid-Left) */}
      <div className="absolute top-[48%] left-[4%] animate-floatGentlyRev opacity-20 dark:opacity-25">
        <svg width="68" height="68" viewBox="0 0 68 68" fill="none" className="text-indigo-500 dark:text-indigo-400 drop-shadow-md">
          {/* Gavel Head */}
          <rect x="16" y="16" width="16" height="26" rx="3" transform="rotate(-45 16 16)" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.08" />
          {/* Gavel Handle */}
          <line x1="32" y1="32" x2="54" y2="54" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          {/* Sound Block / Podium */}
          <rect x="8" y="52" width="28" height="6" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
        </svg>
      </div>

      {/* Floating Motif 4: Dividend Distribution Growth Curve (Bottom Right) */}
      <div className="absolute bottom-[16%] right-[7%] animate-floatGently opacity-20 dark:opacity-30">
        <svg width="90" height="70" viewBox="0 0 90 70" fill="none" className="text-emerald-500 dark:text-emerald-400 drop-shadow-md">
          {/* Upward Growth Curve */}
          <path d="M8 58 Q 28 52, 42 36 T 74 16 T 84 8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
          {/* Node Points */}
          <circle cx="84" cy="8" r="4.5" fill="currentColor" />
          <circle cx="74" cy="16" r="3.5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.3" />
          <circle cx="42" cy="36" r="3.5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.3" />
          {/* Baseline */}
          <line x1="8" y1="62" x2="84" y2="62" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
          {/* Rupee indicator */}
          <text x="24" y="24" fill="currentColor" fontSize="13" fontWeight="bold" opacity="0.8">
            +₹ Div
          </text>
        </svg>
      </div>

      {/* Floating Motif 5: Secure Vault / Wealth Pot (Bottom Left) */}
      <div className="absolute bottom-[12%] left-[10%] animate-driftSlowRev opacity-18 dark:opacity-25">
        <svg width="70" height="70" viewBox="0 0 70 70" fill="none" className="text-teal-500 dark:text-teal-400 drop-shadow-md">
          {/* Vault Body */}
          <rect x="14" y="16" width="42" height="42" rx="8" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.06" />
          {/* Dial Center */}
          <circle cx="35" cy="37" r="11" stroke="currentColor" strokeWidth="2" />
          <circle cx="35" cy="37" r="4" fill="currentColor" />
          <line x1="35" y1="28" x2="35" y2="31" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="35" y1="43" x2="35" y2="46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="26" y1="37" x2="29" y2="37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="41" y1="37" x2="44" y2="37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Floating Motif 6: Double Chit Interlocking Rings (Center Right) */}
      <div className="absolute top-[52%] right-[14%] animate-floatGentlyRev opacity-15 dark:opacity-22">
        <svg width="74" height="52" viewBox="0 0 74 52" fill="none" className="text-purple-500 dark:text-purple-400 drop-shadow-md">
          <circle cx="26" cy="26" r="20" stroke="currentColor" strokeWidth="2.2" strokeDasharray="4 2" />
          <circle cx="48" cy="26" r="20" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="37" cy="26" r="6" fill="currentColor" fillOpacity="0.2" />
          <text x="37" y="30" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="bold">
            2X
          </text>
        </svg>
      </div>

      {/* Floating Motif 7: Center Subtle Floating Token */}
      <div className="absolute top-[35%] left-[50%] -translate-x-1/2 animate-driftSlow opacity-12 dark:opacity-18">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="text-amber-500 dark:text-amber-400">
          <circle cx="28" cy="28" r="25" stroke="currentColor" strokeWidth="1.8" strokeDasharray="6 3" />
          <circle cx="28" cy="28" r="18" stroke="currentColor" strokeWidth="1.2" />
          <text x="28" y="35" textAnchor="middle" fill="currentColor" fontSize="20" fontWeight="bold">
            ₹
          </text>
        </svg>
      </div>
    </div>
  );
}
