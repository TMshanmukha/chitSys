import React from 'react';

/**
 * AnimatedFinLendBackground:
 * Handcrafted vector artwork designed specifically for FinLend Pro (Interest Business & Lending).
 * Features:
 * - Floating Loan Promissory Notes & Loan Agreements
 * - Floating Interest Percentage badges (% and rate chips)
 * - 3D Minted Gold Rupee Coins (₹) with radiant halos
 * - Amortization & Repayment Ledger curve artwork
 * - High-tech concentric financial orbital rings (animate-spinSlow)
 * - Soft luminous ambient nebulas tailored in Indigo, Violet & Emerald
 * 
 * Alive with smooth floating animations (floatGently, driftSlow, spinSlow)
 * in both Light Mode and Night Mode without obstructing workspace cards.
 */
export default function AnimatedFinLendBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* 1. Base Gradient Canvas */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/70 via-indigo-50/30 to-purple-50/30 dark:from-[#070b14] dark:via-[#0c1020] dark:to-[#070a16] transition-colors duration-300" />

      {/* 2. Soft Luminous Color Nebulas (FinTech Indigo / Violet Theme) */}
      <div className="absolute -top-32 -left-32 w-[620px] h-[620px] bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-blue-500/10 dark:from-indigo-600/20 dark:via-purple-600/15 dark:to-blue-900/15 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute top-1/3 -right-32 w-[580px] h-[580px] bg-gradient-to-bl from-purple-400/12 via-indigo-400/8 to-emerald-400/8 dark:from-purple-600/15 dark:via-indigo-800/20 dark:to-emerald-900/10 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute -bottom-40 left-1/3 w-[720px] h-[720px] bg-gradient-to-tr from-indigo-400/10 via-cyan-400/8 to-purple-400/10 dark:from-indigo-950/20 dark:via-cyan-900/15 dark:to-purple-950/15 rounded-full blur-[160px]" />

      {/* 3. Subtle Technical Grid Canvas */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.035] dark:opacity-[0.045]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="finlendGridPattern" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-indigo-900 dark:text-indigo-300" />
            <circle cx="0" cy="0" r="1.5" fill="currentColor" className="text-indigo-600 dark:text-indigo-400" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#finlendGridPattern)" />
      </svg>

      {/* 4. High-Tech Concentric Financial Orbital Rings (Subtle Spin) */}
      <div className="absolute top-[10%] right-[5%] w-[440px] h-[440px] rounded-full border border-indigo-500/10 dark:border-indigo-500/20 animate-spinSlow pointer-events-none">
        <div className="absolute inset-10 rounded-full border border-purple-500/10 dark:border-purple-500/20 border-dashed" />
        <div className="absolute inset-24 rounded-full border border-cyan-500/10 dark:border-cyan-500/15" />
      </div>
      <div className="absolute bottom-[8%] left-[3%] w-[380px] h-[380px] rounded-full border border-purple-500/10 dark:border-purple-500/20 animate-spinSlow pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '36s' }}>
        <div className="absolute inset-12 rounded-full border border-indigo-500/10 dark:border-indigo-500/20 border-dashed" />
      </div>

      {/* ========================================================= */}
      {/* 5. FLOATING INTEREST & LENDING MOTIFS (LIGHT MODE)        */}
      {/* ========================================================= */}
      <div className="dark:hidden">
        {/* --- MOTIF 1: Handcrafted Loan Promissory Certificate (Top Left) --- */}
        <div className="absolute top-[7%] left-[4%] animate-floatGently opacity-30 transform -rotate-4 hover:scale-105 transition-transform duration-500">
          <svg width="230" height="110" viewBox="0 0 230 110" fill="none" className="drop-shadow-sm">
            <rect x="2" y="2" width="226" height="106" rx="4" fill="#F8FAFC" stroke="#6366F1" strokeWidth="1.4" />
            <rect x="6" y="6" width="218" height="98" rx="2" fill="#FFFFFF" stroke="#818CF8" strokeWidth="0.8" strokeDasharray="3 2" />
            <text x="14" y="20" fill="#4338CA" fontSize="7.5" fontWeight="900" letterSpacing="0.8">FINLEND PROMISSORY NOTE</text>
            <text x="14" y="28" fill="#6B7280" fontSize="5.5" fontWeight="600">SECURED LENDING • SCHEDULE APPROVED</text>
            
            <text x="14" y="52" fill="#1E1B4B" fontSize="16" fontWeight="bold">LOAN #FL-101</text>
            <text x="14" y="66" fill="#4338CA" fontSize="9" fontWeight="bold">Principal: ₹50,000</text>
            <text x="14" y="78" fill="#4B5563" fontSize="8">Rate: 18% p.a. • Reducing EMI</text>
            <text x="14" y="90" fill="#059669" fontSize="8" fontWeight="bold">Monthly EMI: ₹4,584</text>

            {/* Stamp Badge */}
            <circle cx="185" cy="55" r="22" stroke="#4F46E5" strokeWidth="1.2" strokeDasharray="3 1.5" fill="#EEF2FF" />
            <text x="185" y="52" textAnchor="middle" fill="#4338CA" fontSize="7.5" fontWeight="900">DISBURSED</text>
            <text x="185" y="62" textAnchor="middle" fill="#059669" fontSize="6.5" fontWeight="bold">100% ACTIVE</text>
          </svg>
        </div>

        {/* --- MOTIF 2: Floating Percentage Symbol Chip (Top Center) --- */}
        <div className="absolute top-[14%] left-[45%] animate-floatGentlyRev opacity-45">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-100 to-purple-100 border border-indigo-200/80 shadow-md flex items-center justify-center text-indigo-700 font-black text-xl font-heading">
            %
          </div>
        </div>

        {/* --- MOTIF 3: Handcrafted Amortization Growth Card (Mid Right) --- */}
        <div className="absolute top-[38%] right-[3%] animate-driftSlow opacity-30 transform rotate-6 hover:scale-105 transition-transform duration-500">
          <svg width="190" height="100" viewBox="0 0 190 100" fill="none" className="drop-shadow-sm">
            <rect x="2" y="2" width="186" height="96" rx="4" fill="#FAF5FF" stroke="#A855F7" strokeWidth="1.2" />
            <text x="10" y="16" fill="#7E22CE" fontSize="7" fontWeight="bold">AMORTIZATION LEDGER</text>
            <text x="10" y="32" fill="#581C87" fontSize="12" fontWeight="bold">12-MONTH SCHEDULE</text>
            
            {/* Amortization Curve Line */}
            <path d="M 12 75 Q 60 55, 110 40 T 175 25" fill="none" stroke="#6366F1" strokeWidth="2.5" />
            <path d="M 12 75 Q 60 55, 110 40 T 175 25 L 175 85 L 12 85 Z" fill="#EEF2FF" fillOpacity="0.6" />
            <circle cx="110" cy="40" r="3" fill="#A855F7" />
            <text x="10" y="88" fill="#059669" fontSize="8" fontWeight="bold">Principal Repaid: ₹42,000</text>
          </svg>
        </div>

        {/* --- MOTIF 4: 3D Minted Gold Rupee Coins (Light Mode) --- */}
        <div className="absolute top-[18%] right-[16%] animate-floatGently opacity-60">
          <svg width="46" height="46" viewBox="0 0 46 46" fill="none" className="drop-shadow-md">
            <defs>
              <linearGradient id="finGoldLight1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FCD34D" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
            </defs>
            <circle cx="23" cy="23" r="21" fill="url(#finGoldLight1)" stroke="#D97706" strokeWidth="1.5" />
            <circle cx="23" cy="23" r="17.5" stroke="#FDE68A" strokeWidth="1" strokeDasharray="3 1.5" />
            <circle cx="23" cy="23" r="14" fill="#F59E0B" fillOpacity="0.25" />
            <text x="23" y="30" textAnchor="middle" fill="#92400E" fontSize="19" fontWeight="900">₹</text>
          </svg>
        </div>

        <div className="absolute bottom-[22%] left-[10%] animate-floatGentlyRev opacity-50" style={{ animationDuration: '7s' }}>
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="drop-shadow-sm">
            <circle cx="19" cy="19" r="17" fill="url(#finGoldLight1)" stroke="#D97706" strokeWidth="1.2" />
            <text x="19" y="25" textAnchor="middle" fill="#92400E" fontSize="15" fontWeight="900">₹</text>
          </svg>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. FLOATING INTEREST & LENDING MOTIFS (DARK / NIGHT MODE) */}
      {/* ========================================================= */}
      <div className="hidden dark:block">
        {/* --- MOTIF 1: Futuristic Cyber Promissory Note (Top Left) --- */}
        <div className="absolute top-[7%] left-[4%] animate-floatGently opacity-30 transform -rotate-4">
          <svg width="230" height="110" viewBox="0 0 230 110" fill="none">
            <rect x="2" y="2" width="226" height="106" rx="4" fill="#0B1120" stroke="#6366F1" strokeWidth="1.4" strokeOpacity="0.6" />
            <rect x="6" y="6" width="218" height="98" rx="2" fill="#070D1A" stroke="#818CF8" strokeWidth="0.8" strokeDasharray="3 2" strokeOpacity="0.4" />
            <text x="14" y="20" fill="#A5B4FC" fontSize="7.5" fontWeight="900" letterSpacing="0.8">FINLEND PROMISSORY NOTE</text>
            <text x="14" y="28" fill="#64748B" fontSize="5.5" fontWeight="600">ENCRYPTED LENDING • ACTIVE SCHEDULE</text>
            
            <text x="14" y="52" fill="#F8FAFC" fontSize="16" fontWeight="bold">LOAN #FL-CYBER</text>
            <text x="14" y="66" fill="#818CF8" fontSize="9" fontWeight="bold">Principal: ₹50,000</text>
            <text x="14" y="78" fill="#94A3B8" fontSize="8">Rate: 18% p.a. • Reducing EMI</text>
            <text x="14" y="90" fill="#34D399" fontSize="8" fontWeight="bold">Monthly EMI: ₹4,584</text>

            {/* Stamp Badge */}
            <circle cx="185" cy="55" r="22" stroke="#6366F1" strokeWidth="1.2" strokeDasharray="3 1.5" fill="#1E1B4B" fillOpacity="0.4" />
            <text x="185" y="52" textAnchor="middle" fill="#818CF8" fontSize="7.5" fontWeight="900">DISBURSED</text>
            <text x="185" y="62" textAnchor="middle" fill="#34D399" fontSize="6.5" fontWeight="bold">VERIFIED</text>
          </svg>
        </div>

        {/* --- MOTIF 2: Glowing Percentage Chip (Dark Mode) --- */}
        <div className="absolute top-[14%] left-[45%] animate-floatGentlyRev opacity-45">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-950/80 to-purple-950/80 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)] flex items-center justify-center text-indigo-400 font-black text-xl font-heading">
            %
          </div>
        </div>

        {/* --- MOTIF 3: Neon Amortization Ledger Card (Mid Right) --- */}
        <div className="absolute top-[38%] right-[3%] animate-driftSlow opacity-30 transform rotate-6">
          <svg width="190" height="100" viewBox="0 0 190 100" fill="none">
            <rect x="2" y="2" width="186" height="96" rx="4" fill="#0A0F1D" stroke="#A855F7" strokeWidth="1.2" strokeOpacity="0.5" />
            <text x="10" y="16" fill="#C084FC" fontSize="7" fontWeight="bold">AMORTIZATION LEDGER</text>
            <text x="10" y="32" fill="#E9D5FF" fontSize="12" fontWeight="bold">12-MONTH SCHEDULE</text>
            
            {/* Glowing Amortization Curve */}
            <path d="M 12 75 Q 60 55, 110 40 T 175 25" fill="none" stroke="#818CF8" strokeWidth="2.5" />
            <path d="M 12 75 Q 60 55, 110 40 T 175 25 L 175 85 L 12 85 Z" fill="#312E81" fillOpacity="0.25" />
            <circle cx="110" cy="40" r="3.5" fill="#C084FC" />
            <text x="10" y="88" fill="#34D399" fontSize="8" fontWeight="bold">Principal Repaid: ₹42,000</text>
          </svg>
        </div>

        {/* --- MOTIF 4: Glowing Holographic Gold Rupee Coins (Dark Mode) --- */}
        <div className="absolute top-[18%] right-[16%] animate-floatGently opacity-65">
          <svg width="46" height="46" viewBox="0 0 46 46" fill="none" className="drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            <defs>
              <linearGradient id="finGoldDark1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#78350F" />
              </linearGradient>
            </defs>
            <circle cx="23" cy="23" r="21" fill="url(#finGoldDark1)" stroke="#F59E0B" strokeWidth="1.5" />
            <circle cx="23" cy="23" r="17.5" stroke="#FDE68A" strokeWidth="1" strokeDasharray="3 1.5" strokeOpacity="0.8" />
            <circle cx="23" cy="23" r="14" fill="#B45309" fillOpacity="0.35" />
            <text x="23" y="30" textAnchor="middle" fill="#FFFBEB" fontSize="19" fontWeight="900">₹</text>
          </svg>
        </div>

        <div className="absolute bottom-[22%] left-[10%] animate-floatGentlyRev opacity-55" style={{ animationDuration: '7s' }}>
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="drop-shadow-[0_0_10px_rgba(245,158,11,0.25)]">
            <circle cx="19" cy="19" r="17" fill="url(#finGoldDark1)" stroke="#F59E0B" strokeWidth="1.2" />
            <text x="19" y="25" textAnchor="middle" fill="#FFFBEB" fontSize="15" fontWeight="900">₹</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
