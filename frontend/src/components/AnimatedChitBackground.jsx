import React from 'react';

/**
 * AnimatedChitBackground:
 * Handcrafted vector artwork (100% pure manual code, zero photo dependencies)
 * rendering scattered random paper chit slips, Indian currency notes (₹500, ₹200, ₹2000), 
 * and minted gold coins overlaid on soft ambient light gradients.
 * 
 * Styled tastefully with balanced opacity and gentle floating animations
 * to provide authentic chit fund ambiance without dominating the workspace.
 */
export default function AnimatedChitBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* 1. Soft Ambient Light Gradient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/60 via-blue-50/30 to-indigo-50/40 dark:from-[#080c14] dark:via-[#0b111f] dark:to-[#080d18] transition-colors" />

      {/* 2. Soft Luminous Color Nebulas (Light and Non-Intrusive) */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/10 to-indigo-500/8 dark:from-blue-600/15 dark:to-indigo-600/10 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute top-1/4 -right-32 w-[550px] h-[550px] bg-gradient-to-bl from-amber-400/8 via-orange-400/6 to-emerald-400/6 dark:from-indigo-600/10 dark:to-purple-900/15 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '7s' }} />
      <div className="absolute -bottom-40 left-1/4 w-[700px] h-[700px] bg-gradient-to-tr from-emerald-400/8 via-teal-400/6 to-cyan-400/8 dark:from-blue-900/10 dark:to-teal-900/10 rounded-full blur-[160px]" />

      {/* 3. Subtle Ledger Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] text-slate-900 dark:text-cyan-400"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* 4. High-Tech Concentric Financial Grid Rings (Night Mode Only) */}
      <div className="hidden dark:block absolute top-[15%] right-[8%] w-[420px] h-[420px] rounded-full border border-blue-500/15 animate-spinSlow pointer-events-none">
        <div className="absolute inset-8 rounded-full border border-indigo-500/15 border-dashed" />
        <div className="absolute inset-20 rounded-full border border-cyan-500/15" />
      </div>
      <div className="hidden dark:block absolute bottom-[8%] left-[5%] w-[360px] h-[360px] rounded-full border border-cyan-500/15 animate-spinSlow pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '32s' }}>
        <div className="absolute inset-10 rounded-full border border-blue-500/15 border-dashed" />
      </div>

      {/* ========================================================= */}
      {/* HANDCRAFTED MANUAL CODE: RANDOM CHITS & MONEY VECTOR ART  */}
      {/* (Displayed exclusively in Light Mode to keep Night Mode   */}
      {/* clean, sleek, high-contrast and executive)                */}
      {/* ========================================================= */}
      <div className="dark:hidden">
        {/* --- ITEM 1: Handcrafted SVG ₹500 Indian Currency Note (Top Left) --- */}
        <div className="absolute top-[8%] left-[4%] animate-floatGently opacity-22 transform -rotate-6 hover:scale-105 transition-transform duration-500">
        <svg width="220" height="98" viewBox="0 0 220 98" fill="none" className="drop-shadow-sm">
          {/* Note Base: Sage Stone Grey Currency Paper */}
          <rect x="2" y="2" width="216" height="94" rx="4" fill="#E8ECE9" stroke="#3D5A45" strokeWidth="1.5" />
          <rect x="6" y="6" width="208" height="86" rx="2" fill="#F0F4F1" stroke="#4E7058" strokeWidth="0.8" strokeDasharray="3 2" />
          
          {/* Security Strip Thread */}
          <line x1="82" y1="6" x2="82" y2="92" stroke="#226B38" strokeWidth="2.5" strokeDasharray="6 3" />
          
          {/* Reserve Bank Micro Header */}
          <text x="14" y="20" fill="#2D4A35" fontSize="7.5" fontWeight="900" letterSpacing="0.8">RESERVE BANK OF INDIA</text>
          <text x="14" y="28" fill="#4E7058" fontSize="5.5" fontWeight="600">GUARANTEED BY THE CENTRAL GOVERNMENT</text>
          
          {/* ₹500 Center Denomination */}
          <text x="110" y="58" textAnchor="middle" fill="#1E4620" fontSize="28" fontWeight="bold" fontFamily="system-ui, sans-serif">
            ₹500
          </text>
          
          {/* Rupee Symbol & Watermark Oval */}
          <ellipse cx="180" cy="50" rx="22" ry="26" stroke="#4E7058" strokeWidth="1" strokeDasharray="2 2" fill="#E0E6E2" fillOpacity="0.6" />
          <text x="180" y="56" textAnchor="middle" fill="#3D5A45" fontSize="18" fontWeight="bold">₹</text>
          
          {/* Serial Number & Micro Emblem */}
          <text x="14" y="86" fill="#1E4620" fontSize="7" fontWeight="bold" fontFamily="monospace">6BE 847291</text>
          <circle cx="48" cy="56" r="14" stroke="#2D4A35" strokeWidth="1" fill="#D6DFD9" fillOpacity="0.7" />
          <text x="48" y="60" textAnchor="middle" fill="#2D4A35" fontSize="9" fontWeight="bold">500</text>
        </svg>
      </div>

      {/* --- ITEM 2: Handcrafted Paper Chit Slip #04 (Top Left, near money) --- */}
      <div className="absolute top-[18%] left-[15%] animate-driftSlow opacity-24 dark:opacity-18 transform rotate-8">
        <svg width="150" height="110" viewBox="0 0 150 110" fill="none" className="drop-shadow-lg">
          {/* Perforated Top Paper Slip */}
          <rect x="4" y="4" width="142" height="102" rx="3" fill="#FCFAF2" stroke="#D1C7A5" strokeWidth="1.2" />
          {/* Folded Top Right Corner */}
          <path d="M128 4 L146 22 L128 22 Z" fill="#E8DEC0" stroke="#D1C7A5" strokeWidth="0.8" />
          
          {/* Top Perforation Holes */}
          <circle cx="20" cy="12" r="2.5" fill="#E5DEC3" />
          <circle cx="36" cy="12" r="2.5" fill="#E5DEC3" />
          <circle cx="52" cy="12" r="2.5" fill="#E5DEC3" />
          <line x1="8" y1="18" x2="142" y2="18" stroke="#D1C7A5" strokeWidth="1" strokeDasharray="3 3" />
          
          {/* Chit Details */}
          <text x="14" y="32" fill="#8C733E" fontSize="9" fontWeight="900" letterSpacing="0.5">CHIT AUCTION SLIP</text>
          <text x="14" y="48" fill="#1E293B" fontSize="13" fontWeight="bold">CHIT #04</text>
          <text x="14" y="64" fill="#475569" fontSize="8.5" fontWeight="600">Member: Rajesh K.</text>
          <text x="14" y="78" fill="#475569" fontSize="8.5">Group: Gold Monthly</text>
          
          {/* Bid Winning Stamp */}
          <rect x="14" y="86" width="60" height="16" rx="2" fill="#EBF8F2" stroke="#10B981" strokeWidth="1" />
          <text x="44" y="98" textAnchor="middle" fill="#047857" fontSize="8" fontWeight="bold">₹50,000 BID</text>
          
          {/* Official Round Stamp Seal */}
          <circle cx="120" cy="74" r="16" stroke="#991B1B" strokeWidth="1.2" strokeDasharray="3 1.5" />
          <text x="120" y="72" textAnchor="middle" fill="#991B1B" fontSize="6" fontWeight="bold">AUCTION</text>
          <text x="120" y="80" textAnchor="middle" fill="#991B1B" fontSize="6.5" fontWeight="900">VERIFIED</text>
        </svg>
      </div>

      {/* --- ITEM 3: Handcrafted SVG ₹200 Indian Currency Note (Top Right) --- */}
      <div className="absolute top-[10%] right-[6%] animate-floatGentlyRev opacity-22 dark:opacity-16 transform rotate-10 hover:scale-105 transition-transform duration-500">
        <svg width="200" height="90" viewBox="0 0 200 90" fill="none" className="drop-shadow-sm">
          {/* Note Base: Vibrant Saffron / Warm Orange Paper */}
          <rect x="2" y="2" width="196" height="86" rx="4" fill="#FFF3E0" stroke="#E65100" strokeWidth="1.2" />
          <rect x="6" y="6" width="188" height="78" rx="2" fill="#FFE0B2" fillOpacity="0.4" stroke="#F57C00" strokeWidth="0.8" strokeDasharray="3 2" />
          
          {/* Security Strip Thread */}
          <line x1="74" y1="6" x2="74" y2="84" stroke="#BF360C" strokeWidth="2" strokeDasharray="5 3" />
          
          {/* Header */}
          <text x="12" y="18" fill="#E65100" fontSize="7" fontWeight="900">RESERVE BANK OF INDIA</text>
          
          {/* ₹200 Center Denomination */}
          <text x="100" y="54" textAnchor="middle" fill="#D84315" fontSize="26" fontWeight="bold">
            ₹200
          </text>
          
          {/* Watermark Frame */}
          <ellipse cx="165" cy="46" rx="20" ry="24" stroke="#F57C00" strokeWidth="1" strokeDasharray="2 2" fill="#FFE0B2" fillOpacity="0.5" />
          <text x="165" y="52" textAnchor="middle" fill="#E65100" fontSize="16" fontWeight="bold">₹</text>
          
          {/* Serial Number */}
          <text x="12" y="78" fill="#BF360C" fontSize="6.5" fontWeight="bold" fontFamily="monospace">4AH 918234</text>
        </svg>
      </div>

      {/* --- ITEM 4: Handcrafted Paper Chit Slip #19 (Top Right, near ₹200 note) --- */}
      <div className="absolute top-[22%] right-[16%] animate-driftSlowRev opacity-24 dark:opacity-18 transform -rotate-12">
        <svg width="140" height="95" viewBox="0 0 140 95" fill="none" className="drop-shadow-sm">
          <rect x="3" y="3" width="134" height="89" rx="3" fill="#FFFDF8" stroke="#D8CFB4" strokeWidth="1.2" />
          <line x1="6" y1="16" x2="134" y2="16" stroke="#D8CFB4" strokeWidth="1" strokeDasharray="2 2" />
          
          <text x="12" y="12" fill="#78350F" fontSize="7" fontWeight="800">OFFICIAL CHIT TOKEN</text>
          <text x="12" y="36" fill="#0F172A" fontSize="14" fontWeight="bold">TOKEN #19</text>
          <text x="12" y="52" fill="#334155" fontSize="9" fontWeight="600">Priya Sharma</text>
          <text x="12" y="66" fill="#64748B" fontSize="8">Monthly Chit Draw</text>
          
          <rect x="12" y="73" width="70" height="15" rx="3" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="0.8" />
          <text x="47" y="84" textAnchor="middle" fill="#1D4ED8" fontSize="7.5" fontWeight="bold">DIVIDEND: ₹2,400</text>
          
          {/* Small verification badge */}
          <circle cx="114" cy="52" r="12" stroke="#16A34A" strokeWidth="1" />
          <text x="114" y="55" textAnchor="middle" fill="#16A34A" fontSize="9">✓</text>
        </svg>
      </div>

      {/* --- ITEM 5: Handcrafted SVG ₹2000 Currency Note (Bottom Left) --- */}
      <div className="absolute bottom-[10%] left-[5%] animate-floatGently opacity-22 dark:opacity-16 transform rotate-8 hover:scale-105 transition-transform duration-500">
        <svg width="220" height="98" viewBox="0 0 220 98" fill="none" className="drop-shadow-sm">
          {/* Note Base: Magenta Currency Paper */}
          <rect x="2" y="2" width="216" height="94" rx="4" fill="#FCE4EC" stroke="#880E4F" strokeWidth="1.4" />
          <rect x="6" y="6" width="208" height="86" rx="2" fill="#F8BBD0" fillOpacity="0.4" stroke="#AD1457" strokeWidth="0.8" strokeDasharray="3 2" />
          
          {/* Security Thread Strip */}
          <line x1="84" y1="6" x2="84" y2="92" stroke="#4A148C" strokeWidth="2.5" strokeDasharray="6 3" />
          
          {/* Header */}
          <text x="14" y="20" fill="#880E4F" fontSize="7.5" fontWeight="900" letterSpacing="0.8">RESERVE BANK OF INDIA</text>
          
          {/* ₹2000 Denomination */}
          <text x="115" y="60" textAnchor="middle" fill="#880E4F" fontSize="30" fontWeight="bold" fontFamily="system-ui, sans-serif">
            ₹2000
          </text>
          
          {/* Watermark Oval */}
          <ellipse cx="182" cy="50" rx="22" ry="26" stroke="#C2185B" strokeWidth="1" strokeDasharray="2 2" fill="#F8BBD0" fillOpacity="0.5" />
          <text x="182" y="56" textAnchor="middle" fill="#880E4F" fontSize="18" fontWeight="bold">₹</text>
          
          {/* Serial Number */}
          <text x="14" y="86" fill="#880E4F" fontSize="7" fontWeight="bold" fontFamily="monospace">9LK 732104</text>
        </svg>
      </div>

      {/* --- ITEM 6: Handcrafted Paper Chit Slip #32 - Double Chit (Bottom Left, near ₹2000) --- */}
      <div className="absolute bottom-[20%] left-[16%] animate-driftSlow opacity-24 dark:opacity-18 transform -rotate-6">
        <svg width="155" height="105" viewBox="0 0 155 105" fill="none" className="drop-shadow-sm">
          <rect x="4" y="4" width="147" height="97" rx="4" fill="#FEFDF9" stroke="#CFBF90" strokeWidth="1.2" />
          <line x1="8" y1="18" x2="147" y2="18" stroke="#CFBF90" strokeWidth="1" strokeDasharray="3 2" />
          
          <text x="14" y="14" fill="#92400E" fontSize="7.5" fontWeight="800">DOUBLE CHIT DRAW #2</text>
          <text x="14" y="38" fill="#0F172A" fontSize="14" fontWeight="bold">CHIT #32</text>
          <text x="14" y="54" fill="#334155" fontSize="9" fontWeight="600">Surplus Pool: ₹2,00,000</text>
          <text x="14" y="68" fill="#64748B" fontSize="8.5">Retained in Chit Base</text>
          
          <rect x="14" y="76" width="75" height="18" rx="3" fill="#FEF3C7" stroke="#D97706" strokeWidth="0.8" />
          <text x="51" y="89" textAnchor="middle" fill="#B45309" fontSize="8" fontWeight="bold">2X AUCTION READY</text>
          
          {/* Stamp */}
          <circle cx="122" cy="72" r="14" stroke="#B45309" strokeWidth="1.2" strokeDasharray="3 1" />
          <text x="122" y="75" textAnchor="middle" fill="#B45309" fontSize="8" fontWeight="bold">2X</text>
        </svg>
      </div>

      {/* --- ITEM 7: Handcrafted Paper Chit Slip #08 - Dividend Voucher (Bottom Right) --- */}
      <div className="absolute bottom-[14%] right-[6%] animate-floatGentlyRev opacity-24 dark:opacity-18 transform -rotate-10">
        <svg width="165" height="105" viewBox="0 0 165 105" fill="none" className="drop-shadow-sm">
          <rect x="4" y="4" width="157" height="97" rx="3" fill="#FCFAF2" stroke="#CBD5E1" strokeWidth="1.2" />
          <line x1="8" y1="20" x2="157" y2="20" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 2" />
          
          <text x="14" y="15" fill="#1E293B" fontSize="8" fontWeight="800" letterSpacing="0.4">DIVIDEND VOUCHER</text>
          <text x="14" y="40" fill="#0F172A" fontSize="13" fontWeight="bold">CHIT TICKET #08</text>
          <text x="14" y="56" fill="#475569" fontSize="9">Member: Babu Rao</text>
          
          <rect x="14" y="68" width="92" height="22" rx="3" fill="#F0FDF4" stroke="#22C55E" strokeWidth="1" />
          <text x="18" y="82" fill="#15803D" fontSize="8" fontWeight="bold">EQUAL DISTRIBUTION:</text>
          <text x="18" y="92" fill="#166534" fontSize="9" fontWeight="900">₹2,375 SAVED</text>
          
          {/* Stamp */}
          <circle cx="135" cy="70" r="15" stroke="#15803D" strokeWidth="1.2" />
          <text x="135" y="68" textAnchor="middle" fill="#15803D" fontSize="6.5" fontWeight="bold">PAID</text>
          <text x="135" y="76" textAnchor="middle" fill="#15803D" fontSize="6">EQUALLY</text>
        </svg>
      </div>

      {/* --- ITEM 8: Minted Gold Coins Scattered (Subtle 3D Radial Coins) --- */}
      {/* Coin 1: Top Center */}
      <div className="absolute top-[6%] left-[44%] animate-floatGently opacity-28 dark:opacity-20">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="drop-shadow-sm">
          <circle cx="22" cy="22" r="20" fill="url(#goldGradient1)" stroke="#B45309" strokeWidth="1.5" />
          <circle cx="22" cy="22" r="17" stroke="#FDE68A" strokeWidth="0.8" strokeDasharray="3 1.5" />
          <text x="22" y="28" textAnchor="middle" fill="#78350F" fontSize="17" fontWeight="bold" fontFamily="sans-serif">₹</text>
          <defs>
            <radialGradient id="goldGradient1" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Coin 2: Mid-Right */}
      <div className="absolute top-[48%] right-[4%] animate-driftSlow opacity-25 dark:opacity-18">
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="drop-shadow-sm">
          <circle cx="19" cy="19" r="17" fill="url(#goldGradient2)" stroke="#B45309" strokeWidth="1.2" />
          <circle cx="19" cy="19" r="14" stroke="#FEF08A" strokeWidth="0.7" strokeDasharray="2 1" />
          <text x="19" y="24" textAnchor="middle" fill="#78350F" fontSize="15" fontWeight="bold">₹</text>
          <defs>
            <radialGradient id="goldGradient2" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#92400E" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Coin 3: Bottom Center */}
      <div className="absolute bottom-[6%] left-[48%] animate-floatGentlyRev opacity-25 dark:opacity-18">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="drop-shadow-sm">
          <circle cx="20" cy="20" r="18" fill="url(#goldGradient3)" stroke="#D97706" strokeWidth="1.2" />
          <circle cx="20" cy="20" r="15" stroke="#FEF9C3" strokeWidth="0.8" strokeDasharray="3 1" />
          <text x="20" y="26" textAnchor="middle" fill="#78350F" fontSize="16" fontWeight="bold">₹</text>
          <defs>
            <radialGradient id="goldGradient3" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#A16207" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* --- ITEM 9: Center Floating Paper Chit Token #12 --- */}
      <div className="absolute top-[44%] left-[6%] animate-driftSlowRev opacity-22 dark:opacity-16 transform rotate-14">
        <svg width="110" height="75" viewBox="0 0 110 75" fill="none" className="drop-shadow-sm">
          <rect x="3" y="3" width="104" height="69" rx="3" fill="#FFFDF8" stroke="#CBD5E1" strokeWidth="1" />
          <line x1="6" y1="14" x2="104" y2="14" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="2 2" />
          <text x="8" y="11" fill="#64748B" fontSize="6" fontWeight="bold">CHIT TOKEN</text>
          <text x="8" y="32" fill="#0F172A" fontSize="12" fontWeight="bold">#12</text>
          <text x="8" y="44" fill="#475569" fontSize="7.5">Installment Paid</text>
          <text x="8" y="55" fill="#16A34A" fontSize="7.5" fontWeight="bold">Status: ACTIVE</text>
          <circle cx="88" cy="40" r="10" stroke="#0284C7" strokeWidth="0.8" />
          <text x="88" y="43" textAnchor="middle" fill="#0284C7" fontSize="8" fontWeight="bold">₹</text>
        </svg>
      </div>
      </div>
    </div>
  );
}
