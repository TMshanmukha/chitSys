import React from 'react';
import { Clock, ArrowRight, Layers } from 'lucide-react';

export default function ComingSoonPage({ title, description, roadmapSteps, databasePreview }) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
          <Clock className="w-3.5 h-3.5" />
          <span>Milestone 2 Development Roadmap</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1 mb-2">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
          {description}
        </p>
      </div>

      {/* Grid of Planned Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Planned Workflow Operations */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white font-bold text-sm">
            <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Planned Business Operations</span>
          </div>
          <ul className="space-y-3">
            {(roadmapSteps || [
              'Creation and lifecycle management',
              'Verification and approval workflows',
              'Audit log synchronization',
            ]).map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Database & Schema Readiness */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white font-bold text-sm">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Database Architecture</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Database tables and relationships for this module have been designed and documented in <code className="text-blue-600 dark:text-blue-400 font-mono">database/schema/future_schema.sql</code>.
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-700 dark:text-slate-300">
            {databasePreview || 'Target Table: Ready for migration'}
          </div>
        </div>
      </div>
    </div>
  );
}
