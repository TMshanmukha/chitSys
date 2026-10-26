import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserCheck,
  LogOut,
  MapPin,
  Calendar,
  Building2,
  Clock,
  ShieldCheck,
  Smartphone,
  Info,
} from 'lucide-react';

export default function AgentDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Mobile-first Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-300">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight font-['Outfit']">
              ChitFund <span className="text-blue-400">Agent Portal</span>
            </h1>
            <p className="text-[10px] text-slate-400">Route Collection Terminal</p>
          </div>
        </div>

        <button
          type="button"
          id="agent-logout-btn"
          onClick={logout}
          aria-label="Logout"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 max-w-lg w-full mx-auto space-y-5 animate-fadeIn">
        {/* Agent Profile Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-['Outfit']">
                  {user?.full_name || 'Collection Agent'}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Route Agent
                  </span>
                  <span className="text-xs text-slate-400 font-mono">@{user?.username}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Account Status</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Active & Authorized
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Contact Registered</span>
              <span className="font-medium text-slate-200 mt-0.5 block">
                {user?.phone || 'On file'}
              </span>
            </div>
          </div>
        </div>

        {/* Milestone 1 Status Notification */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs flex items-start gap-3">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
          <div className="leading-relaxed">
            <span className="font-semibold">Milestone 1 Session Verified: </span>
            Your agent authentication and session are securely verified against MySQL. Route assignments, daily collection entries, and cash handover slips will activate once your administrator assigns groups to your profile.
          </div>
        </div>

        {/* Clean Empty State: Assigned Groups */}
        <div className="p-7 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">No Active Route Assigned Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Your business administrator has not yet assigned active chit group routes to this terminal account.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled for Milestone 2 Deployment</span>
          </div>
        </div>

        {/* Planned Features Notice */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            Future Agent Workflow (Milestone 2)
          </h4>
          <ul className="text-xs text-slate-400 space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Record daily & monthly cash payments on location</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Log digital UPI references and receipts</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Submit daily cash handover reconciliation slips to admin</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
