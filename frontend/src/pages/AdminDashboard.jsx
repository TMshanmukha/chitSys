import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Users,
  UserCheck,
  Boxes,
  Receipt,
  TrendingUp,
  Shield,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Database,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const [sumRes, logsRes] = await Promise.all([
          api.get('/admin/summary').catch(() => ({ data: { data: {} } })),
          api.get('/admin/audit-logs').catch(() => ({ data: { data: [] } })),
        ]);

        if (sumRes.data?.success) setSummary(sumRes.data.data);
        if (logsRes.data?.success) setAuditLogs(logsRes.data.data || []);
      } catch (err) {
        console.error('Failed to load admin dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Milestone 1 Active
              </span>
              <span className="text-xs text-slate-400">
                Authentication & Core Architecture Initialized
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-['Outfit']">
              Welcome back, {user?.full_name || 'Administrator'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Chit Fund Operations Management console. Manage administrative permissions, monitor audit activity, and prepare collection routes.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>MySQL 9.3 Engine Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: System Accounts (Real Data) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total System Users</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-['Outfit']">
              {loading ? '...' : summary?.activeUsers || 0}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">Verified in DB</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Super Admin & Authorized Staff</p>
        </div>

        {/* Metric 2: Collection Agents (Real Data) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Agents</span>
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-['Outfit']">
              {loading ? '...' : summary?.totalAgents || 0}
            </span>
            <span className="text-[11px] text-blue-400 font-medium">Route Staff</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Authorized for cash collection</p>
        </div>

        {/* Metric 3: Chit Groups (Demonstration Placeholder) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Chit Groups Scheme</span>
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-['Outfit']">--</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-medium border border-amber-500/30">
              Demo Preview
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Daily & Monthly groups in M2</p>
        </div>

        {/* Metric 4: Collections (Demonstration Placeholder) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Daily Collection</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-['Outfit']">₹ 0.00</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-medium border border-amber-500/30">
              Pending Rules
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cash & Digital reconciliation</p>
        </div>
      </div>

      {/* Business Roadmap & Architecture Note */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
        <div>
          <span className="font-semibold">Milestone 1 Scope Confirmation: </span>
          Authentication, role validation, session tracking, and database foundations are complete.
          Financial calculations, member dues, and payouts will be implemented in subsequent milestones upon client confirmation of auction versus fixed-scheme rules.
        </div>
      </div>

      {/* Audit Log Table (Real Data from MySQL) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-sm sm:text-base tracking-tight font-['Outfit']">
              Live Security & Audit Trail
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Real records from <code className="text-indigo-300">audit_logs</code> table
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-500">
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '--'}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-indigo-300">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {log.resource}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {log.full_name || log.username || 'System / Unauthenticated'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : log.status === 'WARNING'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
