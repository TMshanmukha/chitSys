import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  History,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Laptop,
  Globe,
  User,
  RefreshCw,
  FileText,
  KeyRound,
  Lock,
} from 'lucide-react';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import Pagination from '../components/Pagination';
import ShowMoreText from '../components/ShowMoreText';
import { smoothScrollTo } from '../utils/scrollHelper';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('LOGINS'); // 'LOGINS' | 'ALL' | 'OPERATIONS'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchLogs = async (tab = activeTab) => {
    try {
      const res = await api.get('/admin/audit-logs', {
        params: {
          category: tab === 'ALL' ? undefined : tab,
        },
      });
      if (res.data?.success) {
        setLogs(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLogs(activeTab);
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs(activeTab);
  };

  // Filter logs by search query (user name, username, IP, action)
  const filteredLogs = logs.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (l.full_name || '').toLowerCase();
    const user = (l.username || '').toLowerCase();
    const action = (l.action || '').toLowerCase();
    const ip = (l.ip_address || '').toLowerCase();
    return name.includes(q) || user.includes(q) || action.includes(q) || ip.includes(q);
  });

  // Paginated logs slice
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Action badge color and icon helper
  const getActionBadge = (action, status) => {
    if (action.includes('LOGIN_SUCCESS')) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        icon: <KeyRound className="w-3.5 h-3.5 text-emerald-600" />,
        label: 'Login Successful',
      };
    }
    if (action.includes('LOGIN_FAILURE') || action.includes('INVALID_CREDENTIALS')) {
      return {
        bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
        label: 'Login Failed',
      };
    }
    if (action.includes('ROLE_MISMATCH') || action.includes('INACTIVE_ACCOUNT')) {
      return {
        bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        label: 'Access Blocked',
      };
    }
    if (action.includes('LOGOUT')) {
      return {
        bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        icon: <Lock className="w-3.5 h-3.5 text-slate-500" />,
        label: 'Session Logout',
      };
    }
    return {
      bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      icon: <FileText className="w-3.5 h-3.5 text-blue-600" />,
      label: action.replace(/_/g, ' '),
    };
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Security & Compliance Center</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Logs & Audit Trail
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Permanent records of user login dates, login times, IP addresses, and operational events
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Filter Tabs and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs with Automatic Window Move */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1 shrink-0">Filter Logs:</span>
          <button
            type="button"
            onClick={() => {
              setActiveTab('LOGINS');
              smoothScrollTo('audit-logs-table-container', { offset: 32, behavior: 'smooth' });
            }}
            className={`px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium shrink-0 ${
              activeTab === 'LOGINS'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            🔑 Login Times & Sessions
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('ALL');
              smoothScrollTo('audit-logs-table-container', { offset: 32, behavior: 'smooth' });
            }}
            className={`px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            📋 All System Activity
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('OPERATIONS');
              smoothScrollTo('audit-logs-table-container', { offset: 32, behavior: 'smooth' });
            }}
            className={`px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium shrink-0 ${
              activeTab === 'OPERATIONS'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            ⚙️ Operational Changes
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user, IP, or event..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Audit Logs Table with Automatic Window Move */}
      <div id="audit-logs-table-container" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden scroll-mt-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Audit Records ({filteredLogs.length})
          </span>
          <span className="font-mono text-[11px]">Format: DD/MM/YYYY, HH:mm:ss</span>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/95 backdrop-blur-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 shadow-xs">
              <tr>
                <th className="py-3 px-4">Date & Login Time</th>
                <th className="py-3 px-4">Event / Action</th>
                <th className="py-3 px-4">User Account</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Browser & Device</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    Loading audit trail from MySQL...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No log records match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const badge = getActionBadge(log.action, log.status);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date & Login Time in DD/MM/YYYY format */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>{formatDateTime(log.created_at, true)}</span>
                        </div>
                      </td>

                      {/* Event / Action */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badge.bg}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* User Account */}
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{log.full_name || log.username || 'System Admin'}</span>
                        </div>
                        {log.username && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            @{log.username}
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.role === 'SUPER_ADMIN' || log.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                              : log.role === 'COLLECTION_AGENT'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {log.role ? log.role.replace(/_/g, ' ') : 'SYSTEM'}
                        </span>
                      </td>

                      {/* IP Address */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>{log.ip_address || '127.0.0.1'}</span>
                        </div>
                      </td>

                      {/* Browser / Device */}
                      <td className="py-3 px-4 text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                        <div className="flex items-center gap-1">
                          <Laptop className="w-3 h-3 text-slate-400 shrink-0" />
                          <ShowMoreText text={log.user_agent || 'Standard Browser'} maxChars={35} />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : log.status === 'WARNING'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>

                      {/* Details View */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-[11px]"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredLogs.length}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page);
            smoothScrollTo('audit-logs-table-container', { offset: 32, behavior: 'smooth' });
          }}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Inspect Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Audit Entry Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Action</span>
                  <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{selectedLog.action}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold text-emerald-600">{selectedLog.status}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp (DD/MM/YYYY):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatDateTime(selectedLog.created_at, true)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">User / Account:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedLog.full_name || selectedLog.username || 'System'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedLog.role || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IP Address:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedLog.ip_address || '127.0.0.1'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Raw Payload / Parameters</span>
                <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-40">
                  {typeof selectedLog.details === 'string'
                    ? selectedLog.details
                    : JSON.stringify(selectedLog.details, null, 2) || 'None'}
                </pre>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">User Agent (Client Device)</span>
                <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-words">
                  {selectedLog.user_agent || 'Standard Desktop / Mobile Browser'}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
