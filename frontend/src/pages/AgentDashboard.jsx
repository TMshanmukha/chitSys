import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import {
  UserCheck,
  LogOut,
  MapPin,
  Calendar,
  Building2,
  Clock,
  Smartphone,
  Info,
  Sun,
  Moon,
  Wallet,
  Receipt,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  ArrowRight,
  Printer,
  X,
} from 'lucide-react';

export default function AgentDashboard() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routesData, setRoutesData] = useState({ groups: [], members: [], summary: {} });
  const [recentCollections, setRecentCollections] = useState([]);
  const [activeTab, setActiveTab] = useState('routes'); // 'routes' | 'history'

  // Collection Modal
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [collectError, setCollectError] = useState('');
  const [receiptModal, setReceiptModal] = useState(null);

  const [collectForm, setCollectForm] = useState({
    group_id: '',
    member_id: '',
    amount: '',
    payment_method: 'CASH',
    payment_reference: '',
    notes: '',
  });

  const loadAgentData = async () => {
    try {
      const [routesRes, collRes] = await Promise.all([
        api.get('/agent/my-routes'),
        api.get('/agent/collections'),
      ]);

      if (routesRes.data?.success) {
        setRoutesData(routesRes.data.data);
      }
      if (collRes.data?.success) {
        setRecentCollections(collRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load agent route data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAgentData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAgentData();
  };

  // Pre-fill modal for a specific member
  const openCollectForMember = (groupId, memberId, defaultAmount) => {
    setCollectForm({
      group_id: String(groupId),
      member_id: String(memberId),
      amount: String(defaultAmount || ''),
      payment_method: 'CASH',
      payment_reference: '',
      notes: '',
    });
    setCollectError('');
    setShowCollectModal(true);
  };

  // Group selection changes default installment amount
  const handleGroupSelectChange = (groupId) => {
    const selectedGroup = routesData.groups.find((g) => String(g.id) === String(groupId));
    setCollectForm((prev) => ({
      ...prev,
      group_id: groupId,
      member_id: '',
      amount: selectedGroup ? String(selectedGroup.installment_amount) : prev.amount,
    }));
  };

  const handleRecordCollection = async (e) => {
    e.preventDefault();
    setCollectError('');
    setSubmitting(true);

    try {
      const res = await api.post('/agent/collections', {
        group_id: parseInt(collectForm.group_id, 10),
        member_id: parseInt(collectForm.member_id, 10),
        amount: parseFloat(collectForm.amount),
        payment_method: collectForm.payment_method,
        payment_reference: collectForm.payment_reference || null,
        notes: collectForm.notes || null,
      });

      if (res.data?.success) {
        const recordedReceipt = res.data.receipt;
        const selectedGroup = routesData.groups.find((g) => String(g.id) === String(collectForm.group_id));
        const selectedMember = routesData.members.find((m) => String(m.member_id) === String(collectForm.member_id));

        setReceiptModal({
          ...recordedReceipt,
          groupName: selectedGroup?.group_name || 'Chit Group',
          groupCode: selectedGroup?.group_code || '',
          memberName: selectedMember?.full_name || 'Member',
          memberPhone: selectedMember?.phone || '',
          agentName: user?.full_name || 'Field Agent',
        });

        setShowCollectModal(false);
        loadAgentData();
      }
    } catch (err) {
      setCollectError(err.response?.data?.message || err.message || 'Failed to record collection');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter members belonging to selected group in modal
  const eligibleMembers = collectForm.group_id
    ? routesData.members.filter((m) => String(m.group_id) === String(collectForm.group_id))
    : routesData.members;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      {/* Mobile-first Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <span>ChitFund Pro</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                Agent
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Field Route Collection Terminal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Data */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh routes"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            id="agent-theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Logout */}
          <button
            type="button"
            id="agent-logout-btn"
            onClick={logout}
            aria-label="Logout"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/30 border border-red-200 dark:border-rose-900/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-4xl w-full mx-auto space-y-5 animate-fadeIn">
        {/* Agent Profile & Quick Action Bar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {user?.full_name || 'Collection Agent'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  Authorized Route Agent
                </span>
                <span className="text-xs text-slate-500 font-mono">@{user?.username}</span>
                {user?.phone && <span className="text-xs text-slate-400">· {user.phone}</span>}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCollectForm({
                group_id: routesData.groups[0]?.id ? String(routesData.groups[0].id) : '',
                member_id: '',
                amount: routesData.groups[0]?.installment_amount ? String(routesData.groups[0].installment_amount) : '',
                payment_method: 'CASH',
                payment_reference: '',
                notes: '',
              });
              setCollectError('');
              setShowCollectModal(true);
            }}
            disabled={routesData.groups.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Field Collection</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              Today's Collections
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              ₹{Number(routesData.summary?.todayTotal || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Receipt className="w-3 h-3 text-slate-400" />
              <span>{routesData.summary?.totalCollectionsCount || 0} receipts issued</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              Cash on Hand
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{Number(routesData.summary?.todayCash || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">To reconcile with admin</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              Digital / UPI
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
              ₹{Number(routesData.summary?.todayOnline || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Bank settlement verified</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              Assigned Routes
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {routesData.groups?.length || 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {routesData.members?.length || 0} active members
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('routes')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'routes'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Assigned Routes & Members ({routesData.members?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            My Recent Collections ({recentCollections?.length || 0})
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading assigned routes and dues...</p>
          </div>
        ) : activeTab === 'routes' ? (
          /* Routes Tab */
          routesData.groups.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">No Route Assigned Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Your business administrator has not yet assigned active chit group routes to this terminal. Once assigned, members and dues will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {routesData.groups.map((group) => {
                const groupMembers = routesData.members.filter((m) => m.group_id === group.id);
                return (
                  <div
                    key={group.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white text-base">
                            {group.group_name}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                            {group.frequency}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-500" />
                            {group.location_name}
                          </span>
                          <span>·</span>
                          <span className="font-mono">{group.group_code}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-slate-400 block">Due per Installment</span>
                        <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                          ₹{Number(group.installment_amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Members List in Group */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        Route Members ({groupMembers.length})
                      </h4>
                      {groupMembers.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No members enrolled in this group yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupMembers.map((member) => (
                            <div
                              key={member.member_id}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    #{member.ticket_number}
                                  </span>
                                  <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                    {member.full_name}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                  {member.phone} {member.address ? `· ${member.address}` : ''}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => openCollectForMember(group.id, member.member_id, group.installment_amount)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 shadow-xs cursor-pointer"
                              >
                                Collect
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Recent Collections History Tab */
          recentCollections.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
              <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">No Collections Recorded Today</h3>
              <p className="text-xs text-slate-500">Collected dues will appear here with immediate receipt issuance.</p>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Group</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentCollections.map((col) => (
                    <tr key={col.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {col.receipt_number}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {col.member_name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{col.group_name}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        ₹{Number(col.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          col.payment_method === 'CASH'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        }`}>
                          {col.payment_method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {col.collection_date?.slice(0, 10)} {col.collection_time?.slice(0, 5)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                          {col.verification_status?.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>

      {/* Collect Modal */}
      {showCollectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Record Member Collection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordCollection} className="p-4 sm:p-5 space-y-3.5">
              {collectError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 text-red-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{collectError}</span>
                </div>
              )}

              {/* Group Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chit Group Route *
                </label>
                <select
                  required
                  value={collectForm.group_id}
                  onChange={(e) => handleGroupSelectChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">Select Chit Group Route</option>
                  {routesData.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name} ({g.group_code}) — ₹{g.installment_amount}
                    </option>
                  ))}
                </select>
              </div>

              {/* Member Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enrolled Member *
                </label>
                <select
                  required
                  value={collectForm.member_id}
                  onChange={(e) => setCollectForm({ ...collectForm, member_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">Select Member</option>
                  {eligibleMembers.map((m) => (
                    <option key={m.member_id} value={m.member_id}>
                      #{m.ticket_number} - {m.full_name} ({m.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Collection Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={collectForm.amount}
                  onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={collectForm.payment_method}
                    onChange={(e) => setCollectForm({ ...collectForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ref # / UPI UTR
                  </label>
                  <input
                    type="text"
                    value={collectForm.payment_reference}
                    onChange={(e) => setCollectForm({ ...collectForm, payment_reference: e.target.value })}
                    placeholder="e.g. 329048293"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Collection Note / Location
                </label>
                <input
                  type="text"
                  value={collectForm.notes}
                  onChange={(e) => setCollectForm({ ...collectForm, notes: e.target.value })}
                  placeholder="e.g. Collected at shop"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Submit & Generate Receipt</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full shadow-2xl p-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Payment Receipt</h3>
              <p className="text-xs text-slate-400 font-mono">{receiptModal.receiptNumber}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Member:</span>
                <span className="font-bold text-slate-900 dark:text-white">{receiptModal.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Group:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{receiptModal.groupName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                  ₹{Number(receiptModal.amount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mode:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{receiptModal.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Agent:</span>
                <span className="text-slate-700 dark:text-slate-300">{receiptModal.agentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono">{receiptModal.date}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
