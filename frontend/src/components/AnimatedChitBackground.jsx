import React from 'react';

/**
 * AnimatedChitBackground:
 * Ultra-clean, subtle, and minimalist modern background for ChitFund Pro.
 * Calm, professional, and elegant — zero clutter, zero loud neon glows.
 */
export default function AnimatedChitBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* 1. Base Gradient Canvas */}
      <div className="absolute inset-0 bg-[#f8fafc] dark:bg-[#080b12] transition-colors duration-300" />

      {/* 2. Very Subtle Neutral Vignette (Soft Depth without Neon Saturation) */}
      <div 
        className="absolute inset-0 opacity-40 dark:opacity-30"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.04) 0%, rgba(15, 23, 42, 0) 70%)',
        }}
      />

      {/* 3. Extremely Faint Micro Dot Matrix Texture */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] text-slate-800 dark:text-slate-200"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}
