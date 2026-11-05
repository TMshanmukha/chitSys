import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  HandCoins,
  Users,
  BarChart3,
  MoreHorizontal,
} from 'lucide-react';
import { useLanguage } from './LanguageContext';

export default function BottomNav() {
  const { t } = useLanguage();

  const tabs = [
    { label: t('home'), path: '/interest/home', icon: Home },
    { label: t('collect'), path: '/interest/collect', icon: HandCoins },
    { label: t('customers'), path: '/interest/customers', icon: Users },
    { label: t('reports'), path: '/interest/reports', icon: BarChart3 },
    { label: t('more'), path: '/interest/more', icon: MoreHorizontal },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 rounded-2xl min-w-[56px] transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-10 h-7 rounded-xl flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 shadow-xs'
                        : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-heading tracking-tight mt-0.5">
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
