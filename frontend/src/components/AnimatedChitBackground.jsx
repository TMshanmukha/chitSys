import React from 'react';

/**
 * AnimatedChitBackground:
 * Handcrafted vector artwork (100% pure manual code, zero photo dependencies)
 * rendering scattered paper chit slips, Indian currency notes (₹500, ₹200, ₹2000), 
 * minted gold coins, and high-tech concentric financial rings overlaid on ambient light gradients.
 * 
 * Styled with gentle floating animations (floatGently, driftSlow, spinSlow)
 * to provide an authentic, lively Chit Fund ambiance in both Light and Dark modes.
 */
export default function AnimatedChitBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* 1. Soft Ambient Light Gradient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/70 via-blue-50/30 to-indigo-50/40 dark:from-[#080c14] dark:via-[#0b111f] dark:to-[#080d18] transition-colors duration-300" />

      {/* 2. Soft Luminous Color Nebulas */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/15 to-indigo-500/10 dark:from-blue-600/20 dark:to-indigo-600/15 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute top-1/4 -right-32 w-[550px] h-[550px] bg-gradient-to-bl from-amber-400/10 via-orange-400/8 to-emerald-400/8 dark:from-indigo-600/15 dark:to-purple-900/20 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '7s' }} />
      <div className="absolute -bottom-40 left-1/4 w-[700px] h-[700px] bg-gradient-to-tr from-emerald-400/10 via-teal-400/8 to-cyan-400/10 dark:from-blue-900/15 dark:to-teal-900/15 rounded-full blur-[160px]" />

      {/* 3. Subtle Ledger Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.045] text-slate-900 dark:text-cyan-400"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* 4. High-Tech Concentric Financial Grid Rings (Subtle slow rotation) */}
      <div className="absolute top-[12%] right-[6%] w-[420px] h-[420px] rounded-full border border-blue-500/10 dark:border-blue-500/20 animate-spinSlow pointer-events-none">
        <div className="absolute inset-8 rounded-full border border-indigo-500/10 dark:border-indigo-500/20 border-dashed" />
        <div className="absolute inset-20 rounded-full border border-cyan-500/10 dark:border-cyan-500/20" />
      </div>
      <div className="absolute bottom-[6%] left-[4%] w-[380px] h-[380px] rounded-full border border-emerald-500/10 dark:border-cyan-500/20 animate-spinSlow pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '34s' }}>
        <div className="absolute inset-10 rounded-full border border-blue-500/10 dark:border-blue-500/20 border-dashed" />
      </div>

      {/* ========================================================= */}
      {/* 5. FLOATING CHIT FUND MOTIFS (LIGHT MODE)                 */}
      {/* ========================================================= */}
      <div className="dark:hidden">
        {/* --- ITEM 1: Handcrafted SVG ₹500 Note (Top Left) --- */}
        <div className="absolute top-[8%] left-[4%] animate-floatGently opacity-30 transform -rotate-6 hover:scale-105 transition-transform duration-500">
          <svg width="220" height="98" viewBox="0 0 220 98" fill="none" className="drop-shadow-sm">
            <rect x="2" y="2" width="216" height="94" rx="4" fill="#E8ECE9" stroke="#3D5A45" strokeWidth="1.5" />
            <rect x="6" y="6" width="208" height="86" rx="2" fill="#F0F4F1" stroke="#4E7058" strokeWidth="0.8" strokeDasharray="3 2" />
            <line x1="82" y1="6" x2="82" y2="92" stroke="#226B38" strokeWidth="2.5" strokeDasharray="6 3" />
            <text x="14" y="20" fill="#2D4A35" fontSize="7.5" fontWeight="900" letterSpacing="0.8">RESERVE BANK OF INDIA</text>
            <text x="14" y="28" fill="#4E7058" fontSize="5.5" fontWeight="600">GUARANTEED BY THE CENTRAL GOVERNMENT</text>
            <text x="110" y="58" textAnchor="middle" fill="#1E4620" fontSize="28" fontWeight="bold" fontFamily="system-ui, sans-serif">₹500</text>
            <ellipse cx="180" cy="50" rx="22" ry="26" stroke="#4E7058" strokeWidth="1" strokeDasharray="2 2" fill="#E0E6E2" fillOpacity="0.6" />
            <text x="180" y="56" textAnchor="middle" fill="#3D5A45" fontSize="18" fontWeight="bold">₹</text>
            <text x="14" y="86" fill="#1E4620" fontSize="7" fontWeight="bold" fontFamily="monospace">6BE 847291</text>
            <circle cx="48" cy="56" r="14" stroke="#2D4A35" strokeWidth="1" fill="#D6DFD9" fillOpacity="0.7" />
            <text x="48" y="60" textAnchor="middle" fill="#2D4A35" fontSize="9" fontWeight="bold">500</text>
          </svg>
        </div>

        {/* --- ITEM 2: Handcrafted Paper Chit Slip #04 (Mid Left) --- */}
        <div className="absolute top-[42%] left-[3%] animate-driftSlow opacity-45 transform rotate-12 hover:scale-105 transition-transform duration-500">
          <svg width="150" height="95" viewBox="0 0 150 95" fill="none" className="drop-shadow-md">
            <rect x="2" y="2" width="146" height="91" rx="2" fill="#FEFDF8" stroke="#D97706" strokeWidth="1.2" />
            <line x1="6" y1="18" x2="144" y2="18" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 2" />
            <text x="10" y="14" fill="#B45309" fontSize="7" fontWeight="bold" letterSpacing="0.5">CHIT PROMISSORY #04</text>
            <text x="10" y="34" fill="#1E293B" fontSize="13" fontWeight="bold">TOKEN #04</text>
            <text x="10" y="47" fill="#64748B" fontSize="8">Group: LAKSHMI-50K</text>
            <text x="10" y="59" fill="#10B981" fontSize="9" fontWeight="bold">Prize Bid: ₹38,500</text>
            <text x="10" y="71" fill="#475569" fontSize="7.5">Installment: ₹2,000 / mo</text>
            <circle cx="120" cy="55" r="18" stroke="#DC2626" strokeWidth="1.5" strokeDasharray="3 1.5" fill="#FEF2F2" fillOpacity="0.6" />
            <text x="120" y="54" textAnchor="middle" fill="#DC2626" fontSize="7.5" fontWeight="bold">AUCTION</text>
            <text x="120" y="63" textAnchor="middle" fill="#DC2626" fontSize="6.5">PRIZED</text>
          </svg>
        </div>

        {/* --- ITEM 3: Handcrafted SVG ₹200 Bright Orange Note (Mid Right) --- */}
        <div className="absolute top-[38%] right-[3%] animate-floatGentlyRev opacity-30 transform rotate-8 hover:scale-105 transition-transform duration-500">
          <svg width="200" height="90" viewBox="0 0 200 90" fill="none" className="drop-shadow-sm">
            <rect x="2" y="2" width="196" height="86" rx="4" fill="#FFF4EB" stroke="#EA580C" strokeWidth="1.5" />
            <rect x="6" y="6" width="188" height="78" rx="2" fill="#FFEDE0" stroke="#F97316" strokeWidth="0.8" strokeDasharray="3 2" />
            <line x1="75" y1="6" x2="75" y2="84" stroke="#C2410C" strokeWidth="2" strokeDasharray="5 2.5" />
            <text x="12" y="19" fill="#9A3412" fontSize="7" fontWeight="900">RESERVE BANK OF INDIA</text>
            <text x="100" y="54" textAnchor="middle" fill="#C2410C" fontSize="26" fontWeight="bold">₹200</text>
            <ellipse cx="165" cy="46" rx="20" ry="24" stroke="#F97316" strokeWidth="1" strokeDasharray="2 2" fill="#FED7AA" fillOpacity="0.5" />
            <text x="165" y="52" textAnchor="middle" fill="#9A3412" fontSize="16" fontWeight="bold">₹</text>
            <text x="12" y="78" fill="#9A3412" fontSize="6.5" fontWeight="bold" fontFamily="monospace">4AK 392817</text>
          </svg>
        </div>

        {/* --- ITEM 4: Handcrafted Gold Coins (Light Mode) --- */}
        <div className="absolute top-[16%] right-[18%] animate-floatGently opacity-60">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="drop-shadow-md">
            <circle cx="22" cy="22" r="20" fill="url(#goldGradLight1)" stroke="#D97706" strokeWidth="1.5" />
            <circle cx="22" cy="22" r="16.5" stroke="#FDE68A" strokeWidth="1" strokeDasharray="3 1.5" />
            <circle cx="22" cy="22" r="13" fill="#F59E0B" fillOpacity="0.25" />
            <text x="22" y="28" textAnchor="middle" fill="#92400E" fontSize="18" fontWeight="900" fontFamily="sans-serif">₹</text>
            <defs>
              <radialGradient id="goldGradLight1" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="35%" stopColor="#FCD34D" />
                <stop offset="70%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div className="absolute bottom-[14%] right-[12%] animate-driftSlowRev opacity-55">
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="drop-shadow-md">
            <circle cx="19" cy="19" r="17" fill="url(#goldGradLight2)" stroke="#D97706" strokeWidth="1.3" />
            <circle cx="19" cy="19" r="14" stroke="#FEF3C7" strokeWidth="0.8" strokeDasharray="2.5 1.2" />
            <text x="19" y="25" textAnchor="middle" fill="#92400E" fontSize="16" fontWeight="900">₹</text>
            <defs>
              <radialGradient id="goldGradLight2" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="30%" stopColor="#FDE68A" />
                <stop offset="70%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#92400E" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* --- ITEM 5: Dividend Certificate Slip (Bottom Left) --- */}
        <div className="absolute bottom-[8%] left-[8%] animate-floatGentlyRev opacity-40 transform -rotate-8 hover:scale-105 transition-transform duration-500">
          <svg width="160" height="90" viewBox="0 0 160 90" fill="none" className="drop-shadow-md">
            <rect x="2" y="2" width="156" height="86" rx="3" fill="#F0FDF4" stroke="#16A34A" strokeWidth="1.2" />
            <text x="8" y="14" fill="#15803D" fontSize="7" fontWeight="bold">CHIT DIVIDEND DISTRIBUTION</text>
            <text x="8" y="32" fill="#14532D" fontSize="12" fontWeight="bold">AUCTION DIVIDEND</text>
            <text x="8" y="46" fill="#166534" fontSize="8">Gross Dividend: ₹47,500</text>
            <text x="8" y="58" fill="#15803D" fontSize="8" fontWeight="bold">Foreman: 5% (₹2,500)</text>
            <text x="8" y="72" fill="#047857" fontSize="10" fontWeight="bold">EQUAL DIVIDEND: ₹2,375</text>
            <circle cx="135" cy="55" r="14" stroke="#16A34A" strokeWidth="1" fill="#DCFCE7" />
            <text x="135" y="58" textAnchor="middle" fill="#15803D" fontSize="7" fontWeight="bold">PAID</text>
          </svg>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. FLOATING CHIT FUND MOTIFS (DARK / NIGHT MODE)          */}
      {/* ========================================================= */}
      <div className="hidden dark:block">
        {/* --- ITEM 6 (DARK): Neon Emerald ₹500 Note Hologram --- */}
        <div className="absolute top-[8%] left-[4%] animate-floatGently opacity-35 transform -rotate-6">
          <svg width="220" height="98" viewBox="0 0 220 98" fill="none" className="drop-shadow-[0_8px_25px_rgba(16,185,129,0.22)]">
            <rect x="2" y="2" width="216" height="94" rx="4" fill="#061a14" stroke="#10B981" strokeWidth="1.2" />
            <rect x="6" y="6" width="208" height="86" rx="2" fill="#09261d" stroke="#34D399" strokeWidth="0.6" strokeDasharray="3 2" />
            <line x1="82" y1="6" x2="82" y2="92" stroke="#10B981" strokeWidth="2" strokeDasharray="6 3" />
            <text x="14" y="20" fill="#6EE7B7" fontSize="7.5" fontWeight="900" letterSpacing="0.8">RESERVE BANK OF INDIA</text>
            <text x="110" y="58" textAnchor="middle" fill="#34D399" fontSize="28" fontWeight="bold">₹500</text>
            <ellipse cx="180" cy="50" rx="22" ry="26" stroke="#10B981" strokeWidth="1" strokeDasharray="2 2" fill="#064e3b" fillOpacity="0.4" />
            <text x="180" y="56" textAnchor="middle" fill="#A7F3D0" fontSize="18" fontWeight="bold">₹</text>
            <text x="14" y="86" fill="#6EE7B7" fontSize="7" fontWeight="bold" fontFamily="monospace">6BE 847291</text>
          </svg>
        </div>

        {/* --- ITEM 7 (DARK): Luminous Obsidian Chit Slip #04 --- */}
        <div className="absolute top-[42%] left-[4%] animate-driftSlow opacity-45 transform rotate-10">
          <svg width="150" height="95" viewBox="0 0 150 95" fill="none" className="drop-shadow-[0_8px_25px_rgba(245,158,11,0.2)]">
            <rect x="2" y="2" width="146" height="91" rx="3" fill="#181308" stroke="#F59E0B" strokeWidth="1.2" />
            <line x1="6" y1="18" x2="144" y2="18" stroke="#78350F" strokeWidth="0.8" strokeDasharray="3 2" />
            <text x="10" y="14" fill="#FCD34D" fontSize="7" fontWeight="bold">CHIT PROMISSORY #04</text>
            <text x="10" y="34" fill="#FFFFFF" fontSize="13" fontWeight="bold">TOKEN #04</text>
            <text x="10" y="47" fill="#FDE68A" fontSize="8">Group: LAKSHMI-50K</text>
            <text x="10" y="59" fill="#34D399" fontSize="9" fontWeight="bold">Prize Bid: ₹38,500</text>
            <text x="10" y="71" fill="#FBBF24" fontSize="7.5">Installment: ₹2,000 / mo</text>
            <circle cx="120" cy="55" r="18" stroke="#EF4444" strokeWidth="1.2" strokeDasharray="3 1.5" fill="#450a0a" fillOpacity="0.5" />
            <text x="120" y="54" textAnchor="middle" fill="#FCA5A5" fontSize="7.5" fontWeight="bold">AUCTION</text>
            <text x="120" y="63" textAnchor="middle" fill="#F87171" fontSize="6.5">PRIZED</text>
          </svg>
        </div>

        {/* --- ITEM 8 (DARK): Radiant Minted Gold Coins with Halos --- */}
        <div className="absolute top-[14%] right-[16%] animate-floatGently opacity-70">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="drop-shadow-[0_0_16px_rgba(245,158,11,0.55)]">
            <circle cx="22" cy="22" r="20" fill="url(#goldGradDark1)" stroke="#F59E0B" strokeWidth="1.6" />
            <circle cx="22" cy="22" r="16.5" stroke="#FEF08A" strokeWidth="0.9" strokeDasharray="3 1.5" />
            <circle cx="22" cy="22" r="13" fill="#78350F" fillOpacity="0.25" />
            <text x="22" y="28" textAnchor="middle" fill="#78350F" fontSize="18" fontWeight="900">₹</text>
            <defs>
              <radialGradient id="goldGradDark1" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="25%" stopColor="#FEF08A" />
                <stop offset="60%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#92400E" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div className="absolute bottom-[14%] right-[10%] animate-driftSlowRev opacity-65">
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="drop-shadow-[0_0_14px_rgba(245,158,11,0.5)]">
            <circle cx="19" cy="19" r="17" fill="url(#goldGradDark2)" stroke="#F59E0B" strokeWidth="1.4" />
            <circle cx="19" cy="19" r="14" stroke="#FEF08A" strokeWidth="0.8" strokeDasharray="2.5 1.2" />
            <text x="19" y="25" textAnchor="middle" fill="#78350F" fontSize="16" fontWeight="900">₹</text>
            <defs>
              <radialGradient id="goldGradDark2" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="25%" stopColor="#FDE68A" />
                <stop offset="60%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#92400E" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* --- ITEM 9 (DARK): Smoked Titanium Chit Token #12 --- */}
        <div className="absolute top-[48%] right-[4%] animate-driftSlowRev opacity-45 transform -rotate-12">
          <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="drop-shadow-[0_8px_20px_rgba(56,189,248,0.22)]">
            <rect x="3" y="3" width="114" height="74" rx="4" fill="#0b1528" stroke="#38BDF8" strokeWidth="1" />
            <line x1="6" y1="16" x2="114" y2="16" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 2" />
            <text x="8" y="12" fill="#38BDF8" fontSize="6.5" fontWeight="bold">CHIT TOKEN</text>
            <text x="8" y="34" fill="#FFFFFF" fontSize="13" fontWeight="bold">#12</text>
            <text x="8" y="47" fill="#94A3B8" fontSize="8">Installment Paid</text>
            <text x="8" y="60" fill="#34D399" fontSize="8" fontWeight="bold">Status: ACTIVE</text>
            <circle cx="95" cy="45" r="12" stroke="#38BDF8" strokeWidth="0.8" fill="#0c2340" />
            <text x="95" y="49" textAnchor="middle" fill="#FBBF24" fontSize="9" fontWeight="bold">₹</text>
          </svg>
        </div>

        {/* --- ITEM 10 (DARK): Glowing Cyan Dividend Receipt Slip (Bottom Left) --- */}
        <div className="absolute bottom-[8%] left-[6%] animate-floatGentlyRev opacity-40 transform -rotate-6">
          <svg width="160" height="90" viewBox="0 0 160 90" fill="none" className="drop-shadow-[0_8px_25px_rgba(16,185,129,0.2)]">
            <rect x="2" y="2" width="156" height="86" rx="3" fill="#051c14" stroke="#10B981" strokeWidth="1.2" />
            <text x="8" y="14" fill="#34D399" fontSize="7" fontWeight="bold">CHIT DIVIDEND DISTRIBUTION</text>
            <text x="8" y="32" fill="#A7F3D0" fontSize="12" fontWeight="bold">AUCTION DIVIDEND</text>
            <text x="8" y="46" fill="#6EE7B7" fontSize="8">Gross Dividend: ₹47,500</text>
            <text x="8" y="58" fill="#34D399" fontSize="8" fontWeight="bold">Foreman: 5% (₹2,500)</text>
            <text x="8" y="72" fill="#10B981" fontSize="10" fontWeight="bold">EQUAL DIVIDEND: ₹2,375</text>
            <circle cx="135" cy="55" r="14" stroke="#10B981" strokeWidth="1" fill="#064e3b" />
            <text x="135" y="58" textAnchor="middle" fill="#6EE7B7" fontSize="7" fontWeight="bold">PAID</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
