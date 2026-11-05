import React from 'react';

/**
 * AnimatedFinLendBackground:
 * Handcrafted vector artwork (100% pure manual code, zero photo dependencies)
 * rendering scattered loan sanction promissory notes, EMI collection vouchers,
 * interest rate symbols (%, ₹), currency notes, and minted gold coins overlaid 
 * on soft ambient light gradients.
 * 
 * Specifically designed for FinLend Pro (Interest Business & Micro-Finance Lending).
 */
export default function AnimatedFinLendBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* 1. Soft Ambient Light Gradient Mesh (Indigo/Violet/Emerald) */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/70 via-indigo-50/30 to-purple-50/40 dark:from-[#060913] dark:via-[#090d1c] dark:to-[#080716] transition-colors" />

      {/* 2. Soft Luminous Color Nebulas */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-600/20 dark:to-purple-600/15 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] bg-gradient-to-bl from-violet-500/10 via-indigo-500/8 to-cyan-500/8 dark:from-purple-600/15 dark:to-indigo-900/20 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute -bottom-40 left-1/4 w-[700px] h-[700px] bg-gradient-to-tr from-emerald-500/8 via-teal-500/6 to-indigo-500/8 dark:from-indigo-950/20 dark:to-teal-950/15 rounded-full blur-[160px]" />

      {/* 3. Subtle Ledger Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] text-slate-900 dark:text-indigo-400"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* 4. Concentric Financial Amortization Rings (Night Mode Only) */}
      <div className="hidden dark:block absolute top-[12%] right-[7%] w-[440px] h-[440px] rounded-full border border-indigo-500/15 animate-spinSlow pointer-events-none">
        <div className="absolute inset-8 rounded-full border border-purple-500/15 border-dashed" />
        <div className="absolute inset-20 rounded-full border border-cyan-500/15" />
      </div>
      <div className="hidden dark:block absolute bottom-[8%] left-[4%] w-[380px] h-[380px] rounded-full border border-purple-500/15 animate-spinSlow pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '36s' }}>
        <div className="absolute inset-10 rounded-full border border-indigo-500/15 border-dashed" />
      </div>

      {/* ========================================================================= */}
      {/* 5. LIGHT MODE: Pure Vector Financial Artwork                              */}
      {/* ========================================================================= */}
      <div className="dark:hidden">
        {/* --- ITEM 1: Handcrafted SVG Loan Sanction Slip #FL-108 (Top Left) --- */}
        <div className="absolute top-[8%] left-[4%] animate-floatGently opacity-25 transform -rotate-5 hover:scale-105 transition-transform duration-500">
          <svg width="225" height="110" viewBox="0 0 225 110" fill="none" className="drop-shadow-sm">
            <rect x="2" y="2" width="221" height="106" rx="5" fill="#F8FAFC" stroke="#6366F1" strokeWidth="1.2" />
            <rect x="6" y="6" width="213" height="98" rx="3" fill="#EEF2FF" fillOpacity="0.4" stroke="#818CF8" strokeWidth="0.7" strokeDasharray="3 2" />
            
            {/* Header */}
            <text x="14" y="22" fill="#4338CA" fontSize="8" fontWeight="900" letterSpacing="0.8">FINLEND PRO • SANCTION SLIP</text>
            <text x="14" y="34" fill="#64748B" fontSize="6.5" fontWeight="600">REDUCING BALANCE LOAN #FL-108</text>
            
            {/* Loan Principal */}
            <text x="14" y="60" fill="#1E1B4B" fontSize="20" fontWeight="900" fontFamily="system-ui, sans-serif">
              ₹1,00,000
            </text>
            
            {/* Rate & EMI Details */}
            <text x="14" y="78" fill="#4338CA" fontSize="8.5" fontWeight="bold">Rate: 2.0% PM</text>
            <text x="80" y="78" fill="#475569" fontSize="8.5">• Monthly EMI: ₹4,250</text>
            
            {/* Verified Loan Badge */}
            <rect x="14" y="86" width="85" height="16" rx="3" fill="#E0E7FF" stroke="#6366F1" strokeWidth="0.8" />
            <text x="56" y="98" textAnchor="middle" fill="#3730A3" fontSize="7.5" fontWeight="bold">DISBURSED & ACTIVE</text>
            
            {/* Stamp */}
            <circle cx="180" cy="58" r="20" stroke="#4F46E5" strokeWidth="1.2" strokeDasharray="3 1.5" />
            <text x="180" y="55" textAnchor="middle" fill="#4F46E5" fontSize="7" fontWeight="900">INTEREST</text>
            <text x="180" y="66" textAnchor="middle" fill="#4F46E5" fontSize="6.5" fontWeight="bold">VERIFIED</text>
          </svg>
        </div>

        {/* --- ITEM 2: Handcrafted Interest Rate % Floating Token (Top Left) --- */}
        <div className="absolute top-[22%] left-[18%] animate-driftSlow opacity-26 transform rotate-8">
          <svg width="120" height="85" viewBox="0 0 120 85" fill="none" className="drop-shadow-sm">
            <rect x="3" y="3" width="114" height="79" rx="4" fill="#FAF5FF" stroke="#A855F7" strokeWidth="1" />
            <text x="10" y="16" fill="#7E22CE" fontSize="7" fontWeight="bold">ANNUALIZED APR</text>
            <text x="10" y="42" fill="#581C87" fontSize="22" fontWeight="900">% 24.0</text>
            <text x="10" y="58" fill="#6B7280" fontSize="7.5">Monthly Accrual: 2.0%</text>
            <rect x="10" y="65" width="60" height="14" rx="2" fill="#F3E8FF" />
            <text x="40" y="75" textAnchor="middle" fill="#7E22CE" fontSize="7" fontWeight="bold">FLAT / EMI</text>
          </svg>
        </div>

        {/* --- ITEM 3: Handcrafted SVG ₹500 Currency Note (Top Right) --- */}
        <div className="absolute top-[8%] right-[5%] animate-floatGentlyRev opacity-24 transform rotate-6 hover:scale-105 transition-transform duration-500">
          <svg width="210" height="94" viewBox="0 0 210 94" fill="none" className="drop-shadow-sm">
            <rect x="2" y="2" width="206" height="90" rx="4" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.2" />
            <rect x="6" y="6" width="198" height="82" rx="2" fill="#F0F9FF" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="3 2" />
            <line x1="76" y1="6" x2="76" y2="88" stroke="#0369A1" strokeWidth="2.5" strokeDasharray="5 3" />
            <text x="12" y="20" fill="#0369A1" fontSize="7.5" fontWeight="900">RESERVE BANK OF INDIA</text>
            <text x="105" y="56" textAnchor="middle" fill="#0C4A6E" fontSize="26" fontWeight="bold">₹500</text>
            <ellipse cx="170" cy="48" rx="20" ry="24" stroke="#0284C7" strokeWidth="1" strokeDasharray="2 2" fill="#E0F2FE" />
            <text x="170" y="54" textAnchor="middle" fill="#0369A1" fontSize="16" fontWeight="bold">₹</text>
            <text x="12" y="82" fill="#0369A1" fontSize="6.5" fontWeight="bold" fontFamily="monospace">8EM 429184</text>
          </svg>
        </div>

        {/* --- ITEM 4: Handcrafted EMI Repayment Receipt (Top Right, near ₹500) --- */}
        <div className="absolute top-[22%] right-[16%] animate-driftSlowRev opacity-26 transform -rotate-10">
          <svg width="155" height="100" viewBox="0 0 155 100" fill="none" className="drop-shadow-sm">
            <rect x="3" y="3" width="149" height="94" rx="3" fill="#FFFDF8" stroke="#CBD5E1" strokeWidth="1" />
            <line x1="6" y1="18" x2="149" y2="18" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="2 2" />
            <text x="12" y="14" fill="#0F172A" fontSize="7.5" fontWeight="900">COLLECTION RECEIPT</text>
            <text x="12" y="36" fill="#1E293B" fontSize="13" fontWeight="bold">INST #03 PAID</text>
            <text x="12" y="50" fill="#475569" fontSize="8.5">Principal: ₹3,500</text>
            <text x="12" y="62" fill="#64748B" fontSize="8.5">Interest: ₹750</text>
            <rect x="12" y="72" width="75" height="18" rx="3" fill="#DCFCE7" stroke="#16A34A" strokeWidth="0.8" />
            <text x="49" y="84" textAnchor="middle" fill="#15803D" fontSize="8" fontWeight="bold">₹4,250 CREDITED</text>
            <circle cx="125" cy="56" r="14" stroke="#16A34A" strokeWidth="1" />
            <text x="125" y="60" textAnchor="middle" fill="#16A34A" fontSize="9" fontWeight="bold">✓</text>
          </svg>
        </div>

        {/* --- ITEM 5: Handcrafted SVG ₹200 Currency Note (Bottom Left) --- */}
        <div className="absolute bottom-[10%] left-[5%] animate-floatGently opacity-24 transform rotate-8 hover:scale-105 transition-transform duration-500">
          <svg width="195" height="88" viewBox="0 0 195 88" fill="none" className="drop-shadow-sm">
            <rect x="2" y="2" width="191" height="84" rx="4" fill="#FFF7ED" stroke="#EA580C" strokeWidth="1.2" />
            <rect x="6" y="6" width="183" height="76" rx="2" fill="#FFEDD5" fillOpacity="0.4" stroke="#F97316" strokeWidth="0.8" strokeDasharray="3 2" />
            <line x1="72" y1="6" x2="72" y2="82" stroke="#C2410C" strokeWidth="2" strokeDasharray="5 3" />
            <text x="12" y="18" fill="#C2410C" fontSize="7" fontWeight="900">RESERVE BANK OF INDIA</text>
            <text x="96" y="52" textAnchor="middle" fill="#9A3412" fontSize="24" fontWeight="bold">₹200</text>
            <ellipse cx="160" cy="45" rx="18" ry="22" stroke="#EA580C" strokeWidth="1" strokeDasharray="2 2" fill="#FFEDD5" />
            <text x="160" y="50" textAnchor="middle" fill="#C2410C" fontSize="15" fontWeight="bold">₹</text>
            <text x="12" y="76" fill="#C2410C" fontSize="6.5" fontWeight="bold" fontFamily="monospace">3BG 761942</text>
          </svg>
        </div>

        {/* --- ITEM 6: Handcrafted Daily Outstanding Balance Card (Bottom Left) --- */}
        <div className="absolute bottom-[20%] left-[16%] animate-driftSlow opacity-26 transform -rotate-6">
          <svg width="150" height="95" viewBox="0 0 150 95" fill="none" className="drop-shadow-sm">
            <rect x="3" y="3" width="144" height="89" rx="3" fill="#F8FAFC" stroke="#64748B" strokeWidth="1" />
            <text x="10" y="16" fill="#334155" fontSize="7" fontWeight="bold">DAILY BALANCE INTEREST</text>
            <text x="10" y="36" fill="#0F172A" fontSize="13" fontWeight="bold">OUTSTANDING</text>
            <text x="10" y="52" fill="#059669" fontSize="12" fontWeight="900">₹25,000 BAL</text>
            <text x="10" y="66" fill="#64748B" fontSize="8">Accrual: ₹16.67/day</text>
            <rect x="10" y="73" width="75" height="15" rx="2" fill="#F1F5F9" />
            <text x="47" y="83" textAnchor="middle" fill="#475569" fontSize="7" fontWeight="bold">LIVE ACCRUAL</text>
          </svg>
        </div>

        {/* --- ITEM 7: Bullet / Flat Loan Voucher (Bottom Right) --- */}
        <div className="absolute bottom-[12%] right-[6%] animate-floatGentlyRev opacity-26 transform -rotate-8">
          <svg width="165" height="105" viewBox="0 0 165 105" fill="none" className="drop-shadow-sm">
            <rect x="4" y="4" width="157" height="97" rx="4" fill="#FAF5FF" stroke="#A855F7" strokeWidth="1.2" />
            <line x1="8" y1="20" x2="157" y2="20" stroke="#E9D5FF" strokeWidth="1" strokeDasharray="3 2" />
            <text x="14" y="15" fill="#7E22CE" fontSize="8" fontWeight="800">INTEREST-ONLY BULLET</text>
            <text x="14" y="40" fill="#3B0764" fontSize="14" fontWeight="bold">LOAN #FL-302</text>
            <text x="14" y="56" fill="#6B7280" fontSize="9">Principal: ₹50,000</text>
            <rect x="14" y="68" width="96" height="22" rx="3" fill="#F3E8FF" stroke="#A855F7" strokeWidth="1" />
            <text x="18" y="82" fill="#7E22CE" fontSize="7.5" fontWeight="bold">MONTHLY INTEREST:</text>
            <text x="18" y="93" fill="#581C87" fontSize="9" fontWeight="900">₹1,500 / MONTH</text>
            <circle cx="135" cy="70" r="14" stroke="#7E22CE" strokeWidth="1.2" />
            <text x="135" y="74" textAnchor="middle" fill="#7E22CE" fontSize="11" fontWeight="bold">%</text>
          </svg>
        </div>

        {/* --- ITEM 8: Minted Coins with % and ₹ Symbols --- */}
        <div className="absolute top-[6%] left-[46%] animate-floatGently opacity-30">
          <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
            <circle cx="21" cy="21" r="19" fill="url(#finCoinGrad1)" stroke="#6366F1" strokeWidth="1.2" />
            <circle cx="21" cy="21" r="16" stroke="#C7D2FE" strokeWidth="0.8" strokeDasharray="3 1" />
            <text x="21" y="27" textAnchor="middle" fill="#312E81" fontSize="16" fontWeight="900">%</text>
            <defs>
              <radialGradient id="finCoinGrad1" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#E0E7FF" />
                <stop offset="60%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#4F46E5" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div className="absolute bottom-[6%] left-[50%] animate-floatGentlyRev opacity-30">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="url(#finCoinGrad2)" stroke="#D97706" strokeWidth="1.2" />
            <circle cx="20" cy="20" r="15" stroke="#FEF9C3" strokeWidth="0.8" strokeDasharray="3 1" />
            <text x="20" y="26" textAnchor="middle" fill="#78350F" fontSize="16" fontWeight="bold">₹</text>
            <defs>
              <radialGradient id="finCoinGrad2" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="50%" stopColor="#EAB308" />
                <stop offset="100%" stopColor="#A16207" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. NIGHT MODE: LUXURY OBSIDIAN & NEON INDIGO/VIOLET/GOLD FINANCIAL SUITE  */}
      {/* ========================================================================= */}
      <div className="hidden dark:block">
        {/* --- ITEM 1 (DARK): Obsidian Sanction Agreement Slip #FL-108 (Top Left) --- */}
        <div className="absolute top-[8%] left-[4%] animate-floatGently opacity-40 transform -rotate-5 hover:scale-105 transition-transform duration-500">
          <svg width="225" height="110" viewBox="0 0 225 110" fill="none" className="drop-shadow-[0_8px_24px_rgba(99,102,241,0.24)]">
            <rect x="2" y="2" width="221" height="106" rx="5" fill="#0d1124" stroke="#6366F1" strokeWidth="1.2" />
            <rect x="6" y="6" width="213" height="98" rx="3" fill="#141836" stroke="#4F46E5" strokeWidth="0.7" strokeDasharray="4 2" />
            
            <line x1="86" y1="6" x2="86" y2="104" stroke="#818CF8" strokeWidth="2" strokeDasharray="6 3" />
            
            <text x="14" y="22" fill="#A5B4FC" fontSize="8" fontWeight="900" letterSpacing="0.8">FINLEND PRO • SANCTION</text>
            <text x="14" y="34" fill="#64748B" fontSize="6.5" fontWeight="600">REDUCING BALANCE LOAN #FL-108</text>
            
            <text x="14" y="60" fill="#F8FAFC" fontSize="22" fontWeight="900" fontFamily="system-ui, sans-serif">
              ₹1,00,000
            </text>
            
            <text x="14" y="76" fill="#C7D2FE" fontSize="8.5" fontWeight="bold">Rate: 2.0% PM</text>
            <text x="80" y="76" fill="#94A3B8" fontSize="8.5">• Monthly EMI: ₹4,250</text>
            
            <rect x="14" y="84" width="85" height="16" rx="3" fill="#1e1b4b" stroke="#818CF8" strokeWidth="0.8" />
            <text x="56" y="96" textAnchor="middle" fill="#C7D2FE" fontSize="7.5" fontWeight="bold">DISBURSED & ACTIVE</text>
            
            <circle cx="180" cy="58" r="20" stroke="#818CF8" strokeWidth="1.2" strokeDasharray="3 1.5" />
            <text x="180" y="55" textAnchor="middle" fill="#A5B4FC" fontSize="7" fontWeight="900">INTEREST</text>
            <text x="180" y="66" textAnchor="middle" fill="#FBBF24" fontSize="6.5" fontWeight="bold">VERIFIED</text>
          </svg>
        </div>

        {/* --- ITEM 2 (DARK): Neon Violet % Token (Top Left) --- */}
        <div className="absolute top-[22%] left-[18%] animate-driftSlow opacity-38 transform rotate-8">
          <svg width="120" height="85" viewBox="0 0 120 85" fill="none" className="drop-shadow-[0_8px_20px_rgba(168,85,247,0.22)]">
            <rect x="3" y="3" width="114" height="79" rx="4" fill="#170d2b" stroke="#C084FC" strokeWidth="1" />
            <text x="10" y="16" fill="#C084FC" fontSize="7" fontWeight="bold">ANNUALIZED APR</text>
            <text x="10" y="42" fill="#F3E8FF" fontSize="22" fontWeight="900">% 24.0</text>
            <text x="10" y="58" fill="#94A3B8" fontSize="7.5">Monthly Accrual: 2.0%</text>
            <rect x="10" y="65" width="60" height="14" rx="2" fill="#3B0764" />
            <text x="40" y="75" textAnchor="middle" fill="#E9D5FF" fontSize="7" fontWeight="bold">FLAT / EMI</text>
          </svg>
        </div>

        {/* --- ITEM 3 (DARK): Obsidian Cyan ₹500 Currency Note (Top Right) --- */}
        <div className="absolute top-[8%] right-[5%] animate-floatGentlyRev opacity-36 transform rotate-6 hover:scale-105 transition-transform duration-500">
          <svg width="210" height="94" viewBox="0 0 210 94" fill="none" className="drop-shadow-[0_8px_24px_rgba(14,165,233,0.22)]">
            <rect x="2" y="2" width="206" height="90" rx="4" fill="#071927" stroke="#38BDF8" strokeWidth="1.2" />
            <rect x="6" y="6" width="198" height="82" rx="2" fill="#0c2338" stroke="#0284C7" strokeWidth="0.8" strokeDasharray="3 2" />
            <line x1="76" y1="6" x2="76" y2="88" stroke="#38BDF8" strokeWidth="2.5" strokeDasharray="5 3" />
            <text x="12" y="20" fill="#FBBF24" fontSize="7.5" fontWeight="900">RESERVE BANK OF INDIA</text>
            <text x="105" y="56" textAnchor="middle" fill="#F0F9FF" fontSize="26" fontWeight="bold">₹500</text>
            <ellipse cx="170" cy="48" rx="20" ry="24" stroke="#38BDF8" strokeWidth="1" strokeDasharray="2 2" fill="#071927" />
            <text x="170" y="54" textAnchor="middle" fill="#FBBF24" fontSize="16" fontWeight="bold">₹</text>
            <text x="12" y="82" fill="#38BDF8" fontSize="6.5" fontWeight="bold" fontFamily="monospace">8EM 429184</text>
          </svg>
        </div>

        {/* --- ITEM 4 (DARK): Obsidian EMI Collection Receipt (Top Right, near ₹500) --- */}
        <div className="absolute top-[22%] right-[16%] animate-driftSlowRev opacity-38 transform -rotate-10">
          <svg width="155" height="100" viewBox="0 0 155 100" fill="none" className="drop-shadow-[0_8px_24px_rgba(52,211,153,0.22)]">
            <rect x="3" y="3" width="149" height="94" rx="4" fill="#081b15" stroke="#10B981" strokeWidth="1" />
            <line x1="6" y1="18" x2="149" y2="18" stroke="#10B981" strokeWidth="0.8" strokeDasharray="2 2" />
            <text x="12" y="14" fill="#34D399" fontSize="7.5" fontWeight="900">COLLECTION RECEIPT</text>
            <text x="12" y="36" fill="#FFFFFF" fontSize="13" fontWeight="bold">INST #03 PAID</text>
            <text x="12" y="50" fill="#94A3B8" fontSize="8.5">Principal: ₹3,500</text>
            <text x="12" y="62" fill="#94A3B8" fontSize="8.5">Interest: ₹750</text>
            <rect x="12" y="72" width="80" height="18" rx="3" fill="#064e3b" stroke="#34D399" strokeWidth="0.8" />
            <text x="52" y="84" textAnchor="middle" fill="#A7F3D0" fontSize="8" fontWeight="bold">₹4,250 CREDITED</text>
            <circle cx="125" cy="56" r="14" stroke="#10B981" strokeWidth="1" fill="#064e3b" />
            <text x="125" y="60" textAnchor="middle" fill="#34D399" fontSize="9" fontWeight="bold">✓</text>
          </svg>
        </div>

        {/* --- ITEM 5 (DARK): Holographic Obsidian ₹200 Currency Note (Bottom Left) --- */}
        <div className="absolute bottom-[10%] left-[5%] animate-floatGently opacity-36 transform rotate-8 hover:scale-105 transition-transform duration-500">
          <svg width="195" height="88" viewBox="0 0 195 88" fill="none" className="drop-shadow-[0_8px_24px_rgba(245,158,11,0.2)]">
            <rect x="2" y="2" width="191" height="84" rx="4" fill="#1c0f05" stroke="#F59E0B" strokeWidth="1.2" />
            <rect x="6" y="6" width="183" height="76" rx="2" fill="#2d1708" stroke="#D97706" strokeWidth="0.8" strokeDasharray="3 2" />
            <line x1="72" y1="6" x2="72" y2="82" stroke="#FB923C" strokeWidth="2" strokeDasharray="5 3" />
            <text x="12" y="18" fill="#FDE68A" fontSize="7" fontWeight="900">RESERVE BANK OF INDIA</text>
            <text x="96" y="52" textAnchor="middle" fill="#FFF7ED" fontSize="24" fontWeight="bold">₹200</text>
            <ellipse cx="160" cy="45" rx="18" ry="22" stroke="#F59E0B" strokeWidth="1" strokeDasharray="2 2" fill="#1c0f05" />
            <text x="160" y="50" textAnchor="middle" fill="#FBBF24" fontSize="15" fontWeight="bold">₹</text>
            <text x="12" y="76" fill="#FB923C" fontSize="6.5" fontWeight="bold" fontFamily="monospace">3BG 761942</text>
          </svg>
        </div>

        {/* --- ITEM 6 (DARK): Obsidian Daily Outstanding Balance (Bottom Left) --- */}
        <div className="absolute bottom-[20%] left-[16%] animate-driftSlow opacity-38 transform -rotate-6">
          <svg width="150" height="95" viewBox="0 0 150 95" fill="none" className="drop-shadow-[0_8px_20px_rgba(100,116,139,0.2)]">
            <rect x="3" y="3" width="144" height="89" rx="4" fill="#0f172a" stroke="#64748B" strokeWidth="1" />
            <text x="10" y="16" fill="#94A3B8" fontSize="7" fontWeight="bold">DAILY BALANCE INTEREST</text>
            <text x="10" y="36" fill="#FFFFFF" fontSize="13" fontWeight="bold">OUTSTANDING</text>
            <text x="10" y="52" fill="#34D399" fontSize="12" fontWeight="900">₹25,000 BAL</text>
            <text x="10" y="66" fill="#94A3B8" fontSize="8">Accrual: ₹16.67/day</text>
            <rect x="10" y="73" width="75" height="15" rx="2" fill="#1e293b" />
            <text x="47" y="83" textAnchor="middle" fill="#E2E8F0" fontSize="7" fontWeight="bold">LIVE ACCRUAL</text>
          </svg>
        </div>

        {/* --- ITEM 7 (DARK): Royal Violet Bullet Loan Card (Bottom Right) --- */}
        <div className="absolute bottom-[12%] right-[6%] animate-floatGentlyRev opacity-38 transform -rotate-8">
          <svg width="165" height="105" viewBox="0 0 165 105" fill="none" className="drop-shadow-[0_8px_24px_rgba(192,132,252,0.22)]">
            <rect x="4" y="4" width="157" height="97" rx="4" fill="#180b2d" stroke="#C084FC" strokeWidth="1.2" />
            <line x1="8" y1="20" x2="157" y2="20" stroke="#C084FC" strokeWidth="0.8" strokeDasharray="3 2" />
            <text x="14" y="15" fill="#E9D5FF" fontSize="8" fontWeight="800">INTEREST-ONLY BULLET</text>
            <text x="14" y="40" fill="#FFFFFF" fontSize="14" fontWeight="bold">LOAN #FL-302</text>
            <text x="14" y="56" fill="#C084FC" fontSize="9">Principal: ₹50,000</text>
            <rect x="14" y="68" width="98" height="22" rx="3" fill="#3B0764" stroke="#C084FC" strokeWidth="1" />
            <text x="18" y="82" fill="#E9D5FF" fontSize="7.5" fontWeight="bold">MONTHLY INTEREST:</text>
            <text x="18" y="93" fill="#F5D0FE" fontSize="9" fontWeight="900">₹1,500 / MONTH</text>
            <circle cx="135" cy="70" r="14" stroke="#C084FC" strokeWidth="1.2" fill="#2e1065" />
            <text x="135" y="74" textAnchor="middle" fill="#F5D0FE" fontSize="11" fontWeight="bold">%</text>
          </svg>
        </div>

        {/* --- ITEM 8 (DARK): Radiant Minted Gold & Indigo Bullion Coins --- */}
        <div className="absolute top-[6%] left-[46%] animate-floatGently opacity-65">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="drop-shadow-[0_0_16px_rgba(99,102,241,0.55)]">
            <circle cx="22" cy="22" r="20" fill="url(#finCoinGradDark1)" stroke="#818CF8" strokeWidth="1.6" />
            <circle cx="22" cy="22" r="17" stroke="#C7D2FE" strokeWidth="0.9" strokeDasharray="3 1.5" />
            <circle cx="22" cy="22" r="14" fill="#1e1b4b" fillOpacity="0.3" />
            <text x="22" y="29" textAnchor="middle" fill="#E0E7FF" fontSize="18" fontWeight="900">%</text>
            <defs>
              <radialGradient id="finCoinGradDark1" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="20%" stopColor="#C7D2FE" />
                <stop offset="55%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#312E81" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div className="absolute bottom-[6%] left-[50%] animate-floatGentlyRev opacity-65">
          <svg width="42" height="42" viewBox="0 0 42 42" fill="none" className="drop-shadow-[0_0_16px_rgba(245,158,11,0.55)]">
            <circle cx="21" cy="21" r="19" fill="url(#finCoinGradDark2)" stroke="#F59E0B" strokeWidth="1.6" />
            <circle cx="21" cy="21" r="16" stroke="#FEF08A" strokeWidth="0.9" strokeDasharray="3 1.5" />
            <circle cx="21" cy="21" r="13" fill="#78350F" fillOpacity="0.25" />
            <text x="21" y="27" textAnchor="middle" fill="#78350F" fontSize="17" fontWeight="900">₹</text>
            <defs>
              <radialGradient id="finCoinGradDark2" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="25%" stopColor="#FEF08A" />
                <stop offset="60%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#92400E" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
