import React from 'react';

export default function RoleChip({ role }) {
  const normalized = (role || 'AGENT').toUpperCase();

  const styles = {
    OWNER: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
    MANAGER: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
    AGENT: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    VIEWER: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10',
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold border uppercase tracking-wider font-heading ${
        styles[normalized] || styles.AGENT
      }`}
    >
      {normalized}
    </span>
  );
}
