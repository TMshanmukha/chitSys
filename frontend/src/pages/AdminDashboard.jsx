import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Layers,
  Users,
  UserCheck,
  Receipt,
  PlusCircle,
  MapPin,
  CheckCircle2,
  Wallet,
  Smartphone,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const res = await api.get('/admin/overview');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard overview:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const totalGroups = data?.totalGroups || 0;
  const totalMembers = data?.totalMembers || 0;
  const totalAgents = data?.totalAgents || 0;
  const todayCash = parseFloat(data?.todayCash || 0);
  const todayOnline = parseFloat(data?.todayOnline || 0);
  const todayTotal = parseFloat(data?.todayTotal || 0);
  const expectedTarget = parseFloat(data?.expectedDailyTarget || 0);
  const progressPercent = expectedTarget > 0 ? Math.min(Math.round((todayTotal / expectedTarget) * 100), 100) : 0;
  const recentCollections = data?.recentCollections || [];
  const groupsList = data?.groupsList || [];
  const agentsSummary = data?.agentsSummary || [];

  return (
    <div className="space-y-6 sm:space-y-7 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Chit Fund Operations
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Welcome, {user?.full_name || 'Administrator'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time business status of chit groups, collections, and registered agents.
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
              {loading ? '...' : totalGroups}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {data?.dailyGroups || 0} Daily · {data?.monthlyGroups || 0} Monthly
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configured chit schemes</p>
        </div>

        {/* Metric 2: Members Enrolled */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Registered Members
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : totalMembers}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Participants</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Members in database</p>
        </div>

        {/* Metric 3: Collection Agents */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Route Agents
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : totalAgents}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Field Staff</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Authorized for cash collection</p>
        </div>

        {/* Metric 4: Today's Target */}
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
              ₹{expectedTarget.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Daily Dues</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Calculated from active groups</p>
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
                Split between physical cash and digital UPI payments recorded in MySQL
              </p>
            </div>
            <Link
              to="/admin/collections"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View Collections</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Physical Cash</span>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                ₹{todayCash.toLocaleString('en-IN')}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Handover pending</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Digital UPI</span>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                ₹{todayOnline.toLocaleString('en-IN')}
              </p>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Direct credit</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Total Collected</span>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                ₹{todayTotal.toLocaleString('en-IN')}
              </p>
              <span className="text-[11px] text-blue-600 dark:text-blue-400">
                {expectedTarget > 0 ? `${progressPercent}% of Target` : 'Recorded today'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pt-2">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              <span>Collection Progress</span>
              <span>
                ₹{todayTotal.toLocaleString('en-IN')}{' '}
                {expectedTarget > 0 ? `of ₹${expectedTarget.toLocaleString('en-IN')}` : ''}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
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
              Key operational management portals
            </p>
          </div>

          <div className="space-y-2">
            <Link
              to="/admin/chit-groups"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Chit Groups & Routes</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/admin/agents"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Create & Assign Agents</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/admin/members"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Enroll Participants</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/admin/collections"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Record New Collection</span>
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
              Active Chit Schemes ({groupsList.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Running schemes from MySQL database
            </p>
          </div>
          <Link
            to="/admin/chit-groups"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Manage All Groups</span>
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
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Installment</th>
                <th className="py-3 px-4">Enrolled Members</th>
                <th className="py-3 px-4">Assigned Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {groupsList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No active chit groups created yet. Click "Create Chit Group" to start your first scheme.
                  </td>
                </tr>
              ) : (
                groupsList.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400 font-mono">
                      {group.group_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {group.group_name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          group.frequency === 'DAILY'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        }`}
                      >
                        {group.frequency}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{group.location_name}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      ₹{parseFloat(group.installment_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {group.enrolled_members} Members
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {group.assigned_agents || 'Unassigned'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Collections Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Recent Collections
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest payment records stored in MySQL
            </p>
          </div>
          <Link
            to="/admin/collections"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>All Collections</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Receipt No.</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Chit Group</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Collector</th>
                <th className="py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {recentCollections.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No collection records yet today. Go to "Collections" to record payments.
                  </td>
                </tr>
              ) : (
                recentCollections.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                      {c.receipt_number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {c.member_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {c.group_name} ({c.group_code})
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      ₹{parseFloat(c.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          c.payment_method === 'CASH'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {c.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {c.agent_name}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {c.collection_time || 'Today'}
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
