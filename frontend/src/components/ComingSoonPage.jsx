import React from 'react';
import { Calendar, Clock, Database, ArrowRight, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export default function ComingSoonPage({ title, moduleCode, description, roadmapSteps, databasePreview }) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
            <Clock className="w-3.5 h-3.5" />
            <span>Phase 2 Architecture — In Preparation</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-['Outfit'] mb-2">
            {title}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Grid of Planned Features & Architectural Readiness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Workflow Roadmap */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 mb-4 text-white font-semibold text-sm">
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            <span>Planned Business Operations</span>
          </div>
          <ul className="space-y-3">
            {(roadmapSteps || [
              'Creation and lifecycle management',
              'Verification and approval workflows',
              'Audit log synchronization',
            ]).map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Database & Schema Readiness */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 mb-4 text-white font-semibold text-sm">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Database & Integration Status</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            The schema architecture and foreign key relationships for this module have already been designed in <code className="text-indigo-300">database/schema/future_schema.sql</code>.
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300/90">
            {databasePreview || 'Target Table: Ready for migration'}
          </div>
        </div>
      </div>
    </div>
  );
}
