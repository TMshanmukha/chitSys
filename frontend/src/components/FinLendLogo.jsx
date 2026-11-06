import React from 'react';

/**
 * FinLendLogo - Official Brand Mark for FinLend Pro
 * 
 * Accurately designed from the VeeCredit / FinLend Pro mobile app icon:
 * - 3D Isometric Open Ledger (Passbook) with Royal Blue cover
 * - Fresh Emerald Green inner growth page / bookmark at top fold
 * - Tangerine Orange Wallet flap with rounded leather styling
 * - Circular White snap fastener clasp with centered orange pin
 * 
 * @param {number|string} size - Pixel dimensions (default: 36)
 * @param {'app-icon'|'symbol'} variant - 'app-icon' (with white squircle), 'symbol' (transparent mark)
 * @param {string} className - Additional CSS classes
 */
export default function FinLendLogo({
  size = 36,
  variant = 'app-icon',
  className = '',
  alt = 'FinLend Pro'
}) {
  const isAppIcon = variant === 'app-icon';

  return (
    <div
      className={`inline-flex items-center justify-center select-none shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={alt}
      aria-label={alt}
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
      >
        <defs>
          {/* App Icon Squircle Background Gradient */}
          <linearGradient id="finlend_bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>

          {/* Ledger Blue Cover - 3D Gradient */}
          <linearGradient id="finlend_blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="55%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Right Blue Cover Underneath */}
          <linearGradient id="finlend_blue_right" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>

          {/* Top Green Growth Pages / Ribbon */}
          <linearGradient id="finlend_green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#86EFAC" />
            <stop offset="50%" stopColor="#4ADE80" />
            <stop offset="100%" stopColor="#A7F3D0" />
          </linearGradient>

          {/* Tangerine Orange Wallet Flap */}
          <linearGradient id="finlend_orange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>

          {/* Subtle Depth Shadow */}
          <filter id="finlend_shadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* 1. Squircle App Icon Container (if variant === 'app-icon') */}
        {isAppIcon && (
          <rect
            x="3"
            y="3"
            width="94"
            height="94"
            rx="25"
            fill="url(#finlend_bg)"
            stroke="#E2E8F0"
            strokeWidth="1"
            className="dark:stroke-white/10"
          />
        )}

        {/* 2. Top Inner Pages (Fresh Green leaf/pages visible at top opening fold) */}
        <path
          d="M 27 31 C 34 34.5, 42 37.5, 49.5 38.5 C 57 37.5, 65 34.5, 72 31 C 65 33, 57 35.5, 49.5 36 C 42 35.5, 34 33, 27 31 Z"
          fill="url(#finlend_green)"
        />

        {/* 3. Main Open Book Body (Left Blue Wing) */}
        <path
          d="M 26 31.5 
             C 33.5 35, 41.5 38, 49.5 38.8 
             L 49.5 73.5 
             C 41.5 70.8, 33.5 67.8, 25 64.8 
             Z"
          fill="url(#finlend_blue)"
        />

        {/* 4. Right Blue Wing (Underneath the wallet flap) */}
        <path
          d="M 49.5 38.8 
             C 57.5 38, 65.5 35, 73 31.5 
             L 72 65.5 
             C 65 68, 57.5 71, 49.5 73.5 
             Z"
          fill="url(#finlend_blue_right)"
        />

        {/* 5. Center Spine Fold Crease Highlight */}
        <path
          d="M 49 38.8 L 49 73.5 L 50.5 73.5 L 50.5 38.8 Z"
          fill="#1E40AF"
          opacity="0.5"
        />

        {/* 6. Orange Wallet Flap & Clasp */}
        <path
          d="M 52 42
             C 52 40.5, 53.8 39.8, 55.8 39.8
             L 68.5 37.8
             C 72.5 37.8, 74.5 40.5, 74.5 44.5
             L 73.5 62.5
             C 73.5 66.5, 71.5 68.2, 67.5 68.5
             L 54.8 69.2
             C 53 69.2, 52 68.5, 52 66.8
             Z"
          fill="url(#finlend_orange)"
          filter="url(#finlend_shadow)"
        />

        {/* 7. Wallet Clasp Button - Pure White Circular Disc */}
        <circle cx="65" cy="53.5" r="5.2" fill="#FFFFFF" />

        {/* 8. Wallet Clasp Center Snap Pin - Vibrant Orange Dot */}
        <circle cx="65" cy="53.5" r="2.2" fill="#EA580C" />
      </svg>
    </div>
  );
}

