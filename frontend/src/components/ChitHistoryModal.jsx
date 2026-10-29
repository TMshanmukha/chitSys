import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  X,
  Layers,
  Calendar,
  Users,
  Receipt,
  Gavel,
  Compass,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { formatDate, formatDateTime, formatTime } from '../utils/dateUtils';

export default function ChitHistoryModal({ groupId, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'members' | 'collections' | 'auctions' | 'nodes'

  useEffect(() => {
    if (!isOpen || !groupId) return;

    let isMounted = true;
    async function fetchHistory() {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/admin/groups/${groupId}`);
        if (isMounted) {
          if (res.data?.success) {
            setData(res.data.data);
          } else {
            setError(res.data?.message || 'Failed to load chit history');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || err.message || 'Error fetching chit history');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, groupId]);

  if (!isOpen) return null;

  const group = data;
  const members = data?.members || [];
  const collections = data?.collections || [];
  const auctions = data?.auctions || [];
  const stops = data?.stops || [];
  const financials = data?.financials || {
    totalCollected: 0,
    totalCash: 0,
    totalDigital: 0,
    totalDividendsDistributed: 0,
    totalPrizeDisbursed: 0,
    receiptsCount: 0,
  };

  const poolAmount = parseFloat(group?.total_pool_amount || 0);
  const collectedPercent = poolAmount > 0 ? Math.min(100, Math.round((financials.totalCollected / poolAmount) * 100)) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto print:max-h-none print:shadow-none print:border-none">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase tracking-wider">
                {group?.group_code || 'CHIT'}
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                group?.chit_type === 'DAILY_CHIT'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : group?.chit_type === 'DOUBLE_CHIT'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}>
                {group?.chit_type === 'DAILY_CHIT' ? '🚚 Daily Chit Route' : (group?.chit_type === 'DOUBLE_CHIT' ? '🎰 Monthly Double Chit' : '🏛️ Monthly Auction Chit')}
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {group?.route_category?.replace('_', ' ')}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                ● Status: {group?.status || 'ACTIVE'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {group?.group_name || 'Chit Scheme History & Audit Dossier'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assigned Field Area: <strong>{group?.location_name}</strong> · Launched: <strong>{group?.start_date ? formatDate(group.start_date) : 'N/A'}</strong> · Field Agent: <strong>{group?.agents?.map(a => a.full_name).join(', ') || 'Unassigned'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Print Chit History Dossier"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pill Tabs Selector - Styled matching user's reference picture */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto shrink-0 print:hidden">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1 shrink-0">
            Dossier View:
          </span>
          
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            1. Financial Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'members'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            2. Enrolled Subscribers ({members.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('collections')}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'collections'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            3. Collection Ledger ({collections.length} Receipts)
          </button>

          {group?.chit_type !== 'DAILY_CHIT' && (
            <button
              type="button"
              onClick={() => setActiveTab('auctions')}
              className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 cursor-pointer ${
                activeTab === 'auctions'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              4. Auction & Dividend Draws ({auctions.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('nodes')}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'nodes'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            {group?.chit_type !== 'DAILY_CHIT' ? '5. Assigned Chit Nodes' : '4. Assigned Chit Nodes'} ({stops.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Fetching complete chit history and ledger records...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* TAB 1: FINANCIAL OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Three-column soft pastel cards inspired by reference screenshot */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* Card 1: Scheme Parameters */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span>🛠️ Scheme Specifications:</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Pool Value:</span>
                          <strong className="text-slate-900 dark:text-white">₹{poolAmount.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Installment Due:</span>
                          <strong className="text-blue-600 dark:text-blue-400">₹{parseFloat(group?.installment_amount || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Duration:</span>
                          <strong>{group?.duration_periods} {group?.frequency === 'DAILY' ? 'Days' : 'Months'}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Subscribers:</span>
                          <strong>{members.length} / {group?.total_members_limit} Members</strong>
                        </div>
                        {group?.chit_type !== 'DAILY_CHIT' && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Foreman Commission:</span>
                            <strong>{group?.foreman_commission_percent}%</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card 2: Realized Collections */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <span>💵 Realized Collections:</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200 pt-1">
                        <div className="flex justify-between">
                          <span className="text-emerald-600 dark:text-emerald-400">Total Collected:</span>
                          <strong className="text-base text-emerald-700 dark:text-emerald-300 font-extrabold">₹{financials.totalCollected.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-600 dark:text-emerald-400">Physical Cash:</span>
                          <strong>₹{financials.totalCash.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-600 dark:text-emerald-400">Digital / UPI:</span>
                          <strong>₹{financials.totalDigital.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-600 dark:text-emerald-400">Total Receipts:</span>
                          <strong>{financials.receiptsCount} Verified</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-600 dark:text-emerald-400">Pool Coverage:</span>
                          <strong>{collectedPercent}% of total pool</strong>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Dividends & Payouts */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-300">
                        <span>📊 Dividends & Payouts:</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-purple-900 dark:text-purple-200 pt-1">
                        <div className="flex justify-between">
                          <span className="text-purple-600 dark:text-purple-400">Dividends Distributed:</span>
                          <strong className="text-base text-purple-700 dark:text-purple-300 font-extrabold">₹{financials.totalDividendsDistributed.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-600 dark:text-purple-400">Prize Money Disbursed:</span>
                          <strong>₹{financials.totalPrizeDisbursed.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-600 dark:text-purple-400">Auctions Completed:</span>
                          <strong>{auctions.length} Rounds</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-600 dark:text-purple-400">Assigned Agents:</span>
                          <strong>{group?.agents?.length || 0} Staff</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pool Progress Bar */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-400">Cumulative Realized Collection Progress</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">{collectedPercent}% (₹{financials.totalCollected.toLocaleString('en-IN')} / ₹{poolAmount.toLocaleString('en-IN')})</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${collectedPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Preview of Recent Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Recent 5 Receipts */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Latest Collection Receipts
                        </h4>
                        <button
                          type="button"
                          onClick={() => setActiveTab('collections')}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          View all ({collections.length}) →
                        </button>
                      </div>
                      {collections.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4 text-center">No receipts recorded yet for this chit.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {collections.slice(0, 5).map((c) => (
                            <div key={c.id} className="py-2.5 flex items-center justify-between gap-2">
                              <div>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{c.receipt_number}</span>
                                <span className="text-slate-800 dark:text-slate-200 font-medium ml-2">{c.member_name}</span>
                                <span className="text-[11px] text-slate-400 block font-mono">
                                  {formatDate(c.collection_date)} {c.collection_time ? `· ${formatTime(c.collection_time)}` : ''} · {c.payment_method}
                                </span>
                              </div>
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                ₹{parseFloat(c.amount).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Enrolled Members Quick Roster */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Subscribers Roster
                        </h4>
                        <button
                          type="button"
                          onClick={() => setActiveTab('members')}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          View all ({members.length}) →
                        </button>
                      </div>
                      {members.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4 text-center">No members enrolled yet.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {members.slice(0, 5).map((m) => (
                            <div key={m.membership_id} className="py-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  #{m.ticket_number}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white">{m.full_name}</span>
                                  <span className="text-[11px] text-slate-400 block">{m.phone}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  ₹{parseFloat(m.total_paid_in_group || 0).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-slate-400 block">{m.receipts_count} receipts</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ENROLLED SUBSCRIBERS */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        Enrolled Chit Subscribers ({members.length} / {group?.total_members_limit})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Every participant assigned to this chit with their designated ticket number and cumulative payments.
                      </p>
                    </div>
                  </div>

                  {members.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 space-y-1">
                      <Users className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-500">No members have been enrolled into this chit scheme yet.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Ticket</th>
                            <th className="py-2.5 px-3">Member Name</th>
                            <th className="py-2.5 px-3">Phone</th>
                            <th className="py-2.5 px-3">Enrolled Date</th>
                            <th className="py-2.5 px-3">Receipts</th>
                            <th className="py-2.5 px-3">Total Paid in Chit</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {members.map((m) => (
                            <tr key={m.membership_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                                Ticket #{m.ticket_number}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                {m.full_name}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">
                                {m.phone}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                                {m.joined_date ? formatDate(m.joined_date) : 'N/A'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                {m.receipts_count} receipts
                              </td>
                              <td className="py-2.5 px-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                                ₹{parseFloat(m.total_paid_in_group || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  {m.status || 'ACTIVE'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: COLLECTION RECEIPTS LEDGER */}
              {activeTab === 'collections' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        Installment Collections Ledger ({collections.length} Total Receipts)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Complete chronological ledger of all cash and digital installments recorded under this scheme.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Total Realized</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{financials.totalCollected.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {collections.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 space-y-1">
                      <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-500">No collection receipts recorded for this chit yet.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Receipt #</th>
                            <th className="py-2.5 px-3">Date & Time</th>
                            <th className="py-2.5 px-3">Subscriber</th>
                            <th className="py-2.5 px-3">Ticket #</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Method</th>
                            <th className="py-2.5 px-3">Agent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {collections.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                                {c.receipt_number}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                {formatDate(c.collection_date)} {c.collection_time ? `· ${formatTime(c.collection_time)}` : ''}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                {c.member_name}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                                #{c.ticket_number}
                              </td>
                              <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">
                                ₹{parseFloat(c.amount).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  c.payment_method === 'CASH'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                }`}>
                                  {c.payment_method}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                {c.agent_name}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: AUCTIONS & DIVIDEND DRAWS */}
              {activeTab === 'auctions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        Auctions & Dividend Distribution History ({auctions.length} Draws)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Monthly reverse auction draws, winning discounts, foreman fee, and subscriber dividend credits.
                      </p>
                    </div>
                  </div>

                  {auctions.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 space-y-1">
                      <Gavel className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-500">No auctions have been conducted for this scheme yet.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Draw #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Winner Subscriber</th>
                            <th className="py-2.5 px-3">Bid Discount</th>
                            <th className="py-2.5 px-3">Foreman Commission</th>
                            <th className="py-2.5 px-3">Dividend / Member</th>
                            <th className="py-2.5 px-3">Net Prize Payout</th>
                            <th className="py-2.5 px-3 text-right">Payout Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {auctions.map((a) => (
                            <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                                Draw #{a.draw_number} (Mo #{a.period_number})
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                {formatDate(a.auction_date)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                {a.winner_name} {a.winning_ticket_number > 0 && `(Ticket #${a.winning_ticket_number})`}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-rose-600 dark:text-rose-400">
                                ₹{parseFloat(a.bid_discount).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                ₹{parseFloat(a.foreman_commission).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-purple-600 dark:text-purple-400">
                                ₹{parseFloat(a.dividend_per_member).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                                ₹{parseFloat(a.net_payable_amount).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  a.payout_status === 'DISBURSED'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                }`}>
                                  {a.payout_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: ASSIGNED CHIT NODES */}
              {activeTab === 'nodes' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Assigned Chit Nodes & Field Trajectory ({stops.length} Nodes)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sequential route nodes assigned for collection agent visits corresponding strictly to enrolled chit tickets.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {stops.map((stop) => (
                      <div
                        key={stop.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          #{stop.stop_order}
                        </div>
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 block truncate">
                            Ticket #{stop.stop_order}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white block truncate">
                            {stop.member_name || `Chit Node #${stop.stop_order}`}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Due: ₹{parseFloat(stop.expected_amount || group?.installment_amount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center justify-between shrink-0 print:hidden">
          <div className="text-xs text-slate-400">
            Total records: {members.length} members · {collections.length} receipts · {auctions.length} auctions
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close History
          </button>
        </div>

      </div>
    </div>
  );
}
