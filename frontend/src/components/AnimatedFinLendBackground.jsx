import React from 'react';

/**
 * AnimatedFinLendBackground:
 * Ultra-clean, subtle, and minimalist modern background.
 * Calm, professional, and elegant — zero clutter, zero currency notes, zero loud neon glows.
 */
export default function AnimatedFinLendBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* 1. Base Gradient Canvas */}
      <div className="absolute inset-0 bg-[#f8fafc] dark:bg-[#080b12] transition-colors duration-300" />

      {/* 2. Very Subtle Neutral Vignette (Soft Depth without Neon Saturation) */}
      <div 
        className="absolute inset-0 opacity-40 dark:opacity-30"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.04) 0%, rgba(15, 23, 42, 0) 70%)',
        }}
      />

      {/* 3. Extremely Faint Micro Grid Texture */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.018] dark:opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="finlendMinimalGrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-slate-800 dark:text-slate-200" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#finlendMinimalGrid)" />
      </svg>
    </div>
  );
}
