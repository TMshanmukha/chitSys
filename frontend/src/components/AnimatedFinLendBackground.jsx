import React from 'react';

/**
 * AnimatedFinLendBackground:
 * Ultra-clean, modern ambient background for FinLend Pro.
 * Provides soft gradient orbs, subtle fintech grid, and glowing auras
 * without any floating mock cards, text, or shapes that could cause text bleed or UI overlap.
 */
export default function AnimatedFinLendBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* 1. Base Smooth Background Canvas */}
      <div className="absolute inset-0 bg-[#f8fafc] dark:bg-[#070b14] transition-colors duration-300" />

      {/* 2. Soft Ambient Glowing Orbs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[140px]" />
      <div className="absolute top-1/4 -right-40 w-[550px] h-[550px] bg-purple-500/10 dark:bg-purple-600/12 rounded-full blur-[150px]" />
      <div className="absolute -bottom-40 left-1/3 w-[650px] h-[650px] bg-teal-500/8 dark:bg-emerald-600/10 rounded-full blur-[160px]" />

      {/* 3. Subtle Clean Grid Mesh */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.02] dark:opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="cleanGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-indigo-900 dark:text-indigo-200" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cleanGridPattern)" />
      </svg>
    </div>
  );
}
