import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Layers,
  Users,
  UserCheck,
  Receipt,
  IndianRupee,
  ArrowRight,
  PlusCircle,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Wallet,
  Smartphone,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const res = await api.get('/admin/summary');
        if (res.data?.success) {
          setSummary(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  // Practical business demonstration data for chit operations overview
  const activeGroups = [
    {
      code: 'DG-101',
      name: 'Daily Market Scheme A',
      type: 'Daily',
      route: 'Main Bazaar Sector 1',
      agent: 'Ramesh Kumar',
      installment: '₹500 / day',
      members: 30,
      status: 'Active',
    },
    {
      code: 'MG-201',
      name: 'Monthly Commercial Chit',
      type: 'Monthly',
      route: 'Gandhi Road & Textile Lane',
      agent: 'Ramesh Kumar',
      installment: '₹10,000 / mo',
      members: 20,
      status: 'Active',
    },
    {
      code: 'DG-102',
      name: 'Vegetable Market Daily Pool',
      type: 'Daily',
      route: 'Rythu Bazaar Complex',
      agent: 'Suresh Rao',
      installment: '₹300 / day',
      members: 40,
      status: 'Active',
    },
    {
      code: 'MG-202',
      name: 'Small Business Monthly Chit',
      type: 'Monthly',
      route: 'Auto Nagar Industrial Area',
      agent: 'Unassigned',
      installment: '₹5,000 / mo',
      members: 25,
      status: 'Setup',
    },
  ];

  const agentSummaries = [
    {
      name: 'Ramesh Kumar',
      route: 'Main Bazaar & Gandhi Road',
      cashCollected: '₹14,500',
      onlineCollected: '₹8,000',
      totalCollected: '₹22,500',
      handoverStatus: 'Pending Verification',
    },
    {
      name: 'Suresh Rao',
      route: 'Rythu Bazaar Complex',
      cashCollected: '₹9,800',
      onlineCollected: '₹3,200',
      totalCollected: '₹13,000',
      handoverStatus: 'Reconciled',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-7 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Business Administration
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Welcome, {user?.full_name || 'Administrator'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Operational summary of your chit fund groups, collection routes, and field agents.
          </p>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-2">
          <Link
            to="/admin/chit-groups"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Chit Group</span>
          </Link>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Chit Groups */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Groups
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              12
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">8 Daily · 4 Monthly</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total active chit schemes</p>
        </div>

        {/* Metric 2: Members Enrolled */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Enrolled Members
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              115
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Verified KYC</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Participants in chit pools</p>
        </div>

        {/* Metric 3: Collection Agents */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Collection Agents
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : summary?.totalAgents || 2}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">On Route Today</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Authorized field staff</p>
        </div>

        {/* Metric 4: Expected Daily Target */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Today's Target
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ₹45,000
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Target Dues</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scheduled daily collections</p>
        </div>
      </div>

      {/* Today's Collection Overview: Cash vs Online Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Collection Breakdown Card */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Today's Collection Breakdown
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Split between physical cash and verified digital UPI payments
              </p>
            </div>
            <Link
              to="/admin/collections"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Physical Cash</span>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">₹24,300</p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Handover pending</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Digital UPI</span>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">₹11,200</p>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Auto-credited</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Total Collected</span>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">₹35,500</p>
              <span className="text-[11px] text-blue-600 dark:text-blue-400">78% of Daily Target</span>
            </div>
          </div>

          {/* Simple Clean Progress Bar */}
          <div className="pt-2">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              <span>Collection Progress</span>
              <span>₹35,500 of ₹45,000 target</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: '78%' }}
              />
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Links */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Quick Operations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Frequently accessed management functions
            </p>
          </div>

          <div className="space-y-2">
            <Link
              to="/admin/chit-groups"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Manage Chit Groups</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/admin/agents"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Assign Agents to Routes</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/admin/members"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Member Participant Directory</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/admin/reports"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Daily Handover Reports</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Active Groups Overview Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Active Chit Schemes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Overview of running daily and monthly collection pools
            </p>
          </div>
          <Link
            to="/admin/chit-groups"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Configure Groups</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Scheme Code</th>
                <th className="py-3 px-4">Group Name</th>
                <th className="py-3 px-4">Frequency</th>
                <th className="py-3 px-4">Route Location</th>
                <th className="py-3 px-4">Assigned Agent</th>
                <th className="py-3 px-4">Installment</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {activeGroups.map((group) => (
                <tr key={group.code} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400 font-mono">
                    {group.code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {group.name}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        group.type === 'Daily'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      }`}
                    >
                      {group.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{group.route}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {group.agent}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {group.installment}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {group.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Agents Today's Summary */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Route Agents Collection Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Today's collection totals and cash handover reconciliation
            </p>
          </div>
          <Link
            to="/admin/agents"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Agent Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agentSummaries.map((agent) => (
            <div
              key={agent.name}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {agent.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{agent.route}</span>
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    agent.handoverStatus === 'Reconciled'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {agent.handoverStatus}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Cash</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{agent.cashCollected}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">UPI</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{agent.onlineCollected}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Total</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{agent.totalCollected}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
