import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Heart } from 'lucide-react';

export default function WelcomeCelebrationModal() {
  const [welcomeData, setWelcomeData] = useState(null);
  const [ribbonOpen, setRibbonOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('chitfund_celebrate_welcome');
      if (stored) {
        const parsed = JSON.parse(stored);
        setWelcomeData(parsed);
        setIsVisible(true);

        // Untie ribbon after 300ms
        const timerRibbon = setTimeout(() => {
          setRibbonOpen(true);
        }, 350);

        // Auto dismiss after 4.5 seconds
        const timerDismiss = setTimeout(() => {
          handleDismiss();
        }, 4500);

        return () => {
          clearTimeout(timerRibbon);
          clearTimeout(timerDismiss);
        };
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.removeItem('chitfund_celebrate_welcome');
  };

  if (!isVisible || !welcomeData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      {/* Confetti & Golden Sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-amber-400 rounded-full animate-ping opacity-80" />
        <div className="absolute top-1/3 right-1/4 w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce opacity-80" />
        <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-emerald-400 rounded-full animate-pulse opacity-75" />
        <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-rose-400 rounded-full animate-ping opacity-80" />
      </div>

      {/* Main Glass Celebration Slab */}
      <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[2.5rem] border border-white/80 dark:border-slate-800 shadow-[0_30px_90px_-20px_rgba(37,99,235,0.4),0_0_60px_rgba(245,158,11,0.25)] p-7 sm:p-8 text-center overflow-hidden transform animate-scaleUp">
        {/* Animated Celebration Ribbon Strip */}
        <div className="relative mx-auto w-24 h-24 mb-4 flex items-center justify-center">
          {/* Animated Ribbon Loops */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
              ribbonOpen
                ? 'scale-125 opacity-0 rotate-45'
                : 'scale-100 opacity-100 rotate-0'
            }`}
          >
            <div className="w-20 h-20 rounded-full border-4 border-amber-400 border-dashed animate-spinSlow" />
          </div>

          {/* Central Emoticon Seal with Untying Ribbon Bow */}
          <div className="relative z-10 w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 p-0.5 shadow-xl shadow-orange-500/30">
            <div className="w-full h-full rounded-[22px] bg-white dark:bg-slate-900 flex items-center justify-center text-4xl shadow-inner">
              😊
            </div>
          </div>

          {/* Ribbon Tails that Split and Untie */}
          <div
            className={`absolute -bottom-2 -left-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-tl-xl transform transition-all duration-700 ${
              ribbonOpen ? '-translate-x-6 translate-y-4 opacity-0 -rotate-45' : 'translate-x-0 opacity-100'
            }`}
          />
          <div
            className={`absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-bl from-amber-400 to-rose-500 rounded-tr-xl transform transition-all duration-700 ${
              ribbonOpen ? 'translate-x-6 translate-y-4 opacity-0 rotate-45' : 'translate-x-0 opacity-100'
            }`}
          />
        </div>

        {/* Welcome Greeting */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            <span>Session Authenticated</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            Welcome, {welcomeData.name} 😊
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed pt-1">
            Your secure ChitFund Pro workspace has been initialized. Live reverse auctions and route telemetry are synced.
          </p>
        </div>

        {/* Role & Verification Badge */}
        <div className="mt-5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Role:</span>
            <strong className="text-slate-900 dark:text-white">
              {welcomeData.role === 'SUPER_ADMIN' || welcomeData.role === 'ADMIN'
                ? 'System Administrator'
                : 'Collection Agent'}
            </strong>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Operational</span>
          </span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full mt-5 py-3.5 px-5 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 shadow-[0_10px_25px_-5px_rgba(37,99,235,0.45)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Enter System Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Auto-Dismiss Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-blue-500 animate-shrinkWidth" />
        </div>
      </div>
    </div>
  );
}
