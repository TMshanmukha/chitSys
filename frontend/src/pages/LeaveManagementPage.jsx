import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  X,
  Send,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Palmtree,
  ClipboardCheck,
  ArrowUpRight,
  UserCheck,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Filter,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Star,
  Award,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import Toast from '../components/Toast';
import Pagination from '../components/Pagination';
import { getFriendlyErrorMessage } from '../utils/friendlyError';

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const label = (date) =>
  new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export default function LeaveManagementPage() {
  const { user } = useAuth();
  const admin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);
  const [leaves, setLeaves] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [history, setHistory] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [groups, setGroups] = useState([]);
  const [month, setMonth] = useState(new Date());
  const [start, setStart] = useState(ymd(new Date()));
  const [end, setEnd] = useState(ymd(new Date()));
  const [reason, setReason] = useState('');
  const [assignments, setAssignments] = useState({});
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState(null);
  const [searchHistory, setSearchHistory] = useState('');
  const [coveragePage, setCoveragePage] = useState(1);
  const [coveragePageSize, setCoveragePageSize] = useState(5);
  const [expandedCoverageStops, setExpandedCoverageStops] = useState(new Set());

  useEffect(() => {
    setCoveragePage(1);
  }, [searchHistory]);

  const toggleCoverageStops = (key) => {
    setExpandedCoverageStops((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Multi-Factor Filter States
  const [filterAgent, setFilterAgent] = useState('ALL');
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'APPROVED' | 'PENDING' | 'WORKING'

  const todayYmd = useMemo(() => ymd(new Date()), []);

  const refresh = async (showSpinner = false) => {
    try {
      if (showSpinner) setRefreshing(true);
      const [res, hist] = await Promise.all([
        api.get(admin ? '/admin/leaves' : '/agent/leaves'),
        api.get(admin ? '/admin/leaves/coverage-history' : '/agent/leaves/coverage-history'),
      ]);
      setLeaves(res.data.leaves || []);
      setCoverage(res.data.coverage || []);
      setHistory(hist.data.history || []);
      setMessage('');
    } catch (e) {
      if (e.response?.status === 404) {
        setMessage('The backend leave service is currently deploying or cold-starting on Render. If this message remains, click "Manual Deploy" -> "Deploy latest commit" on dashboard.render.com.');
      } else {
        setMessage(getFriendlyErrorMessage(e, 'Could not load leave records. Please check database sync.'));
      }
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
    if (admin) {
      Promise.all([api.get('/admin/agents?role=ALL'), api.get('/admin/groups')])
        .then(([u, g]) => {
          setUsersList(u.data.data || []);
          setGroups(g.data.data || []);
        })
        .catch(() => {});
    } else {
      api.get('/agent/my-routes')
        .then((r) => {
          setGroups(r.data.data?.groups || []);
        })
        .catch(() => {});
    }
  }, [admin]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return [
      ...Array(first.getDay()).fill(null),
      ...Array.from({ length: last.getDate() }, (_, i) => ymd(new Date(month.getFullYear(), month.getMonth(), i + 1))),
    ];
  }, [month]);

  // Selected Agent and Enrolment / Joining Date
  const selectedAgent = useMemo(() => {
    if (admin) {
      if (filterAgent !== 'ALL') {
        return usersList.find((u) => String(u.id) === String(filterAgent)) || null;
      }
      return null;
    }
    return user;
  }, [admin, filterAgent, usersList, user]);

  const joiningDate = useMemo(() => {
    if (selectedAgent?.created_at) {
      return String(selectedAgent.created_at).slice(0, 10);
    }
    if (admin && filterAgent === 'ALL' && usersList.length > 0) {
      const dates = usersList
        .filter((u) => u.role === 'COLLECTION_AGENT' && u.created_at)
        .map((u) => String(u.created_at).slice(0, 10))
        .sort();
      if (dates.length > 0) return dates[0];
    }
    return user?.created_at ? String(user.created_at).slice(0, 10) : '2026-10-31';
  }, [selectedAgent, admin, filterAgent, usersList, user]);

  // Dynamic Multi-Factor Filtered Leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      // 1. Agent Filter
      if (filterAgent !== 'ALL' && String(l.agent_id) !== String(filterAgent)) {
        return false;
      }
      // 2. Status Filter
      if (filterStatus === 'APPROVED' && l.status !== 'APPROVED') {
        return false;
      }
      if (filterStatus === 'PENDING' && l.status !== 'PENDING') {
        return false;
      }
      // 3. Chit Group Filter
      if (filterGroup !== 'ALL') {
        const groupObj = groups.find((g) => String(g.id) === String(filterGroup));
        const agentAssigned = (groupObj?.assigned_agent_ids || '').split(',').includes(String(l.agent_id));
        const inCoverage = coverage.some(
          (c) => Number(c.leave_id) === Number(l.id) && Number(c.group_id) === Number(filterGroup)
        );
        if (!agentAssigned && !inCoverage) {
          return false;
        }
      }
      return true;
    });
  }, [leaves, filterAgent, filterStatus, filterGroup, groups, coverage]);

  const statusFor = (date) => filteredLeaves.filter((l) => String(l.leave_date).slice(0, 10) === date);

  // Dynamic KPI Metrics (Only count from joining date onwards)
  const pendingApprovalsCount = useMemo(
    () => filteredLeaves.filter((l) => l.status === 'PENDING').length,
    [filteredLeaves]
  );
  const approvedLeavesCount = useMemo(
    () => filteredLeaves.filter((l) => l.status === 'APPROVED').length,
    [filteredLeaves]
  );
  const workingDaysInMonth = useMemo(() => {
    return days.filter((d) => {
      if (!d) return false;
      if (d < joiningDate) return false; // Prior to joining: never counted as working
      if (d > todayYmd) return false;    // Future dates: not counted yet
      const isApprovedLeave = filteredLeaves.some(
        (l) => String(l.leave_date).slice(0, 10) === d && l.status === 'APPROVED'
      );
      return !isApprovedLeave;
    }).length;
  }, [days, joiningDate, todayYmd, filteredLeaves]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const endpoint = admin ? '/admin/leaves' : '/agent/leaves';
      const r = await api.post(endpoint, {
        start_date: start,
        end_date: end,
        reason,
        ...(admin && filterAgent !== 'ALL' ? { agent_id: filterAgent } : {}),
      });
      setToast({
        title: 'Leave Request Sent!',
        message: 'Your leave application has been submitted to Admin for approval. Tasks and route coverage will be managed by Admin.',
        type: 'success',
      });
      setMessage(r.data.message || 'Leave request submitted successfully.');
      setReason('');
      await refresh();
    } catch (e) {
      const errText = e.response?.data?.message || 'Could not submit leave.';
      setToast({
        title: 'Submission Failed',
        message: errText,
        type: 'error',
      });
      setMessage(errText);
    } finally {
      setBusy(false);
    }
  };

  const assignedGroups = (leave) =>
    groups.filter((g) => (g.assigned_agent_ids || '').split(',').includes(String(leave.agent_id)));

  const review = async (leave, decision) => {
    setBusy(true);
    setMessage('');
    try {
      const picks = assignedGroups(leave);
      const list = picks
        .map((g) => ({
          group_id: g.id,
          covering_agent_id: Number(
            assignments[`${leave.id}:${g.id}`] ||
              coverage.find((c) => Number(c.leave_id) === Number(leave.id) && Number(c.group_id) === Number(g.id))
                ?.covering_agent_id
          ),
        }))
        .filter((x) => x.covering_agent_id);

      if (decision === 'APPROVED' && picks.length && list.length !== picks.length) {
        setToast({
          title: 'Route Coverage Required!',
          message: 'Please assign all absent route tasks to an agent or administrator before approving this leave request.',
          type: 'error',
        });
        setMessage('Select a covering agent or administrator for each route before approving.');
        setBusy(false);
        return;
      }
      await api.put(`/admin/leaves/${leave.id}/review`, { decision, assignments: list });
      setToast({
        title: decision === 'APPROVED' ? 'Leave Approved & Coverage Assigned' : 'Leave Request Rejected',
        message:
          decision === 'APPROVED'
            ? `Leave approved for ${leave.agent_name || 'agent'}. Route coverage has been assigned.`
            : `Leave request for ${leave.agent_name || 'agent'} was rejected.`,
        type: decision === 'APPROVED' ? 'success' : 'info',
      });
      setMessage(`Leave request ${decision.toLowerCase()} successfully.`);
      await refresh();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Could not update leave request.');
    } finally {
      setBusy(false);
    }
  };

  // Filtered Coverage History Table
  const filteredHistory = useMemo(() => {
    let list = history;
    if (filterAgent !== 'ALL') {
      list = list.filter(
        (h) => String(h.absent_agent_id) === String(filterAgent) || String(h.covering_agent_id) === String(filterAgent)
      );
    }
    if (filterGroup !== 'ALL') {
      list = list.filter((h) => String(h.group_id) === String(filterGroup));
    }
    if (searchHistory.trim()) {
      const q = searchHistory.toLowerCase();
      list = list.filter(
        (h) =>
          (h.group_name || '').toLowerCase().includes(q) ||
          (h.absent_agent_name || '').toLowerCase().includes(q) ||
          (h.covering_agent_name || '').toLowerCase().includes(q) ||
          String(h.leave_date).includes(q)
      );
    }
    return list;
  }, [history, filterAgent, filterGroup, searchHistory]);

  const resetFilters = () => {
    setFilterAgent('ALL');
    setFilterGroup('ALL');
    setFilterStatus('ALL');
    setSearchHistory('');
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12 font-sans px-1 sm:px-0">
      {/* Toast Notification */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {/* Page Header */}
      <header className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 shadow-sm shrink-0">
            <Palmtree className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-heading truncate">
              {admin ? 'Field Agent Leaves & Route Coverage Hub' : 'My Leave Calendar & Route Coverage'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {admin
                ? 'Review leave requests, assign temporary coverage, and track attendance.'
                : 'Apply for time-off, view attendance history and temporary task coverage.'}
            </p>
          </div>
        </div>

        {/* Legend Pills: Clear Meanings */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Green: Worked / Working
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Red: Absent (Leave)
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Amber: Pending Leave
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Blue: Joined Date ★
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-700 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-500" />
            White: Future / Upcoming
          </span>
        </div>
      </header>

      {/* Multi-Factor Filter Bar */}
      <section className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 font-heading">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Attendance & Coverage Filters</span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Agent Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Field Agent
            </label>
            {admin ? (
              <select
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Field Agents</option>
                {usersList
                  .filter((u) => u.role === 'COLLECTION_AGENT')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} (@{u.username})
                    </option>
                  ))}
              </select>
            ) : (
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white truncate">
                {user?.full_name || 'My Leaves'} (Self)
              </div>
            )}
          </div>

          {/* Chit Scheme Route */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Chit Scheme Route
            </label>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Chit Schemes</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Attendance / Leave Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="WORKING">Worked / Working Days Only</option>
              <option value="APPROVED">Approved Leave (Red) Only</option>
              <option value="PENDING">Pending Approval (Amber) Only</option>
            </select>
          </div>

          {/* Month Navigator */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Month / Year
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 text-center py-2 px-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-extrabold text-slate-900 dark:text-white font-heading truncate text-xs">
                {month.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </div>
              <button
                type="button"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMonth(new Date())}
                className="px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Current Month"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Status Notice Alert */}
      {message && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-5 h-5 shrink-0 text-blue-600" />
            <span className="break-words">{message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => refresh(true)}
              className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 text-blue-800 dark:text-blue-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => setMessage('')}
              className="p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Calendar View & Apply Leave Form */}
      <div className="grid lg:grid-cols-[1.25fr_.75fr] gap-4 sm:gap-6">
        {/* Calendar View Card */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 font-heading">
              <CalendarDays className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
            </h2>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs font-bold uppercase text-slate-400 font-heading">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1 sm:py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((date, i) => {
              if (!date) {
                return <div key={`blank-${i}`} className="min-h-14 sm:min-h-20 rounded-2xl bg-transparent" />;
              }

              const items = statusFor(date);
              const approved = items.some((x) => x.status === 'APPROVED');
              const pending = items.some((x) => x.status === 'PENDING');
              const isFuture = date > todayYmd;
              const isToday = date === todayYmd;
              const isJoiningDate = date === joiningDate;
              const isBeforeJoining = date < joiningDate;
              const isPastActiveDay = date >= joiningDate && date < todayYmd;

              let cellClass = '';
              let badgeElement = null;

              if (approved) {
                // Approved Leave: Always Red
                cellClass =
                  'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border-rose-300 dark:border-rose-800 shadow-xs ring-1 ring-rose-400/30';
                badgeElement = (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 truncate">
                    Leave
                  </span>
                );
              } else if (pending) {
                // Pending Leave: Always Amber
                cellClass =
                  'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border-amber-300 dark:border-amber-800 shadow-xs ring-1 ring-amber-400/30';
                badgeElement = (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 truncate">
                    Pending
                  </span>
                );
              } else if (isJoiningDate) {
                // Joining Date: Special blue highlight
                cellClass =
                  'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200 border-blue-300 dark:border-blue-800 shadow-xs ring-1 ring-blue-400/30';
                badgeElement = (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 truncate">
                    Joined ★
                  </span>
                );
              } else if (isBeforeJoining) {
                // PRIOR TO JOINING: Neutral grey cell, NEVER GREEN!
                cellClass =
                  'bg-slate-50/50 text-slate-300 dark:bg-slate-900/20 dark:text-slate-600 border-slate-100 dark:border-slate-800/40';
                badgeElement = (
                  <span className="inline-block text-[9px] font-medium text-slate-300 dark:text-slate-600">
                    -
                  </span>
                );
              } else if (isToday) {
                // Current Date: Active Working Day
                cellClass =
                  'bg-emerald-50/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 shadow-xs outline-2 outline-blue-500/80 outline-offset-1';
                badgeElement = (
                  <span className="inline-block text-[8px] sm:text-[9px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                    Working
                  </span>
                );
              } else if (isPastActiveDay) {
                // Completed past day after joining: Marked as Worked
                cellClass =
                  'bg-emerald-50/70 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900/60 shadow-2xs';
                badgeElement = (
                  <span className="inline-block text-[8px] sm:text-[9px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                    Worked ✓
                  </span>
                );
              } else {
                // Future Date: Clean pure white, NO GREEN
                cellClass =
                  'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700';
                badgeElement = (
                  <span className="inline-block text-[8px] sm:text-[9px] font-medium text-slate-400 dark:text-slate-500 truncate">
                    Upcoming
                  </span>
                );
              }

              return (
                <div
                  key={date}
                  className={`min-h-14 sm:min-h-20 rounded-2xl p-1.5 sm:p-2.5 flex flex-col justify-between transition-all border ${cellClass}`}
                  title={
                    isBeforeJoining
                      ? `${date}: Prior to agent joining (${joiningDate})`
                      : items.length > 0
                      ? items.map((x) => `${x.agent_name || 'Agent'}: ${x.status} (${x.reason || 'No reason'})`).join('\n')
                      : isFuture
                      ? `${date}: Upcoming future date`
                      : isToday
                      ? `${date}: Today's active duty shift (Working)`
                      : `${date}: Completed duty day (Worked)`
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs sm:text-sm font-mono">
                      {Number(date.slice(-2))}
                    </span>
                    {approved && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                    {pending && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                    {isJoiningDate && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    {!approved && !pending && !isJoiningDate && (isToday || isPastActiveDay) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </div>

                  <div className="mt-1 truncate">
                    {badgeElement}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Apply Leave Form (Agent) OR Admin Overview */}
        {!admin ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Dynamic Filter-Aware Counters */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block truncate">
                  Pending
                </span>
                <span className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5 block font-heading truncate">
                  {pendingApprovalsCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block truncate">
                  Leaves
                </span>
                <span className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5 block font-heading truncate">
                  {approvedLeavesCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block truncate">
                  Worked
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block font-heading truncate">
                  {workingDaysInMonth} Days
                </span>
              </div>
            </div>

            {/* Enrolment Date Notice */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
              <span className="font-semibold">Joined / Enrolled Date:</span>
              <span className="font-black text-blue-600 dark:text-blue-400 font-mono">
                {label(joiningDate)}
              </span>
            </div>

            {/* Apply Leave Form */}
            <form
              onSubmit={submit}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Palmtree className="w-5 h-5 text-emerald-600 shrink-0" />
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                    Request Time Off / Leave
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Select a single date or date range. Your leave will be submitted for Admin approval.
                </p>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    From Date *
                    <input
                      required
                      type="date"
                      value={start}
                      onChange={(e) => {
                        setStart(e.target.value);
                        if (end < e.target.value) setEnd(e.target.value);
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs font-semibold dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Through Date *
                    <input
                      required
                      type="date"
                      min={start}
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs font-semibold dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reason / Note (Optional)
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder="Medical, personal, emergency note..."
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs font-normal dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white p-3 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{busy ? 'Submitting Leave...' : 'Submit Leave Request'}</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                Admin Leave Administration
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When an agent requests leave, approve and assign absent route stops to covering field agents.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block truncate">
                  Pending
                </span>
                <span className="text-lg sm:text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5 block font-heading truncate">
                  {pendingApprovalsCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block truncate">
                  Approved
                </span>
                <span className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5 block font-heading truncate">
                  {approvedLeavesCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block truncate">
                  Worked
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block font-heading truncate">
                  {workingDaysInMonth} Days
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div>
                Selected Agent Enrolment: <strong className="text-blue-600 dark:text-blue-400 font-mono">{label(joiningDate)}</strong>
              </div>
              <div>
                Filtering Agent: <strong className="text-slate-900 dark:text-white">{filterAgent === 'ALL' ? 'All Agents' : usersList.find(u => String(u.id) === String(filterAgent))?.full_name || filterAgent}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leave Requests & Review Section */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
          {admin ? 'Leave Approval Requests & Route Coverage Assignments' : 'My Leave Requests & Status'}
        </h2>

        <div className="space-y-3">
          {filteredLeaves.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              No leave requests registered matching current filters.
            </div>
          ) : (
            filteredLeaves.map((l) => {
              const eligibleGroups = assignedGroups(l);
              return (
                <article
                  key={l.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 hover:border-blue-300 dark:hover:border-blue-800 transition-all bg-white dark:bg-slate-900/60 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white font-heading">
                          {admin ? l.agent_name : 'Leave Day'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">· {label(l.leave_date)}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {l.reason || 'No specific reason entered.'}
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                        l.status === 'APPROVED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900'
                          : l.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>

                  {admin && (l.status === 'PENDING' || l.status === 'APPROVED') && (
                    <div className="mt-4 pt-2 space-y-3">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-heading">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Assign Temporary Coverage for Absent Routes ({eligibleGroups.length})</span>
                      </div>

                      {eligibleGroups.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">This agent has no active routes assigned.</p>
                      ) : (
                        <>
                          {eligibleGroups.length > 1 && (
                            <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <div>
                                  <span className="text-xs font-bold text-slate-900 dark:text-white font-heading block">
                                    Bulk Assign All Routes ({eligibleGroups.length} Routes)
                                  </span>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Select one agent/admin to cover all chits of this absent agent at once
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <select
                                  id={`bulk-assign-${l.id}`}
                                  defaultValue=""
                                  className="flex-1 sm:w-56 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">-- Choose Covering Agent / Admin --</option>
                                  {usersList
                                    .filter((u) => u.id !== l.agent_id && (u.is_active === 1 || u.is_active === true))
                                    .map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.full_name} ({u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' ? 'Admin' : 'Agent'})
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const selectEl = document.getElementById(`bulk-assign-${l.id}`);
                                    const targetId = selectEl?.value;
                                    if (!targetId) {
                                      setToast({
                                        title: 'Select Agent',
                                        message: 'Please choose an agent from the dropdown first to assign all routes.',
                                        type: 'error',
                                      });
                                      return;
                                    }
                                    const updated = { ...assignments };
                                    eligibleGroups.forEach((g) => {
                                      updated[`${l.id}:${g.id}`] = targetId;
                                    });
                                    setAssignments(updated);
                                    const targetUser = usersList.find((u) => String(u.id) === String(targetId));
                                    setToast({
                                      title: 'All Routes Assigned',
                                      message: `Assigned all ${eligibleGroups.length} routes to ${targetUser?.full_name || 'selected user'}. You can now approve.`,
                                      type: 'success',
                                    });
                                  }}
                                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Assign All</span>
                                </button>
                              </div>
                            </div>
                          )}
                          {eligibleGroups.map((g) => {
                          const current = coverage.find(
                            (c) => Number(c.leave_id) === Number(l.id) && Number(c.group_id) === Number(g.id)
                          );
                          const chosenAgentId =
                            assignments[`${l.id}:${g.id}`] !== undefined
                              ? assignments[`${l.id}:${g.id}`]
                              : current?.covering_agent_id || '';

                          return (
                            <div
                              key={g.id}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div>
                                <span className="font-extrabold text-slate-900 dark:text-white block font-heading">
                                  {g.group_name}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  Installment: ₹{Number(g.installment_amount).toLocaleString('en-IN')} · {g.frequency}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <select
                                  value={chosenAgentId}
                                  onChange={(e) =>
                                    setAssignments((a) => ({ ...a, [`${l.id}:${g.id}`]: e.target.value }))
                                  }
                                  className="rounded-xl border border-slate-300 dark:border-slate-600 p-2 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select Covering Handler...</option>
                                  {usersList
                                    .filter((u) => Number(u.id) !== Number(l.agent_id))
                                    .map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.full_name} ({u.role === 'COLLECTION_AGENT' ? 'Agent' : 'Admin'})
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                        </>
                      )}

                      <div className="flex items-center gap-2 pt-2 flex-wrap">
                        {l.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => review(l, 'APPROVED')}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>Approve Leave & Confirm Coverage</span>
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => review(l, 'REJECTED')}
                              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject Request</span>
                            </button>
                          </>
                        )}
                        {l.status === 'APPROVED' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => review(l, 'APPROVED')}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Update Route Coverage Assignments</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* Coverage Task History & Verification Roster */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                Coverage Task Accounting & Collector History
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed audit trail showing which covering agent or administrator executed each route collection for absent members.
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Search agent, scheme, date..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {(() => {
          const paginatedHistory = filteredHistory.slice((coveragePage - 1) * coveragePageSize, coveragePage * coveragePageSize);
          if (filteredHistory.length === 0) {
            return (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                No approved leave coverage tasks found for this view.
              </div>
            );
          }
          return (
            <div className="space-y-4">
              {paginatedHistory.map((row, i) => {
                const itemKey = `${row.leave_id}-${row.group_id}-${i}`;
                const isStopsExpanded = expandedCoverageStops.has(itemKey);
            const pct = row.total_tasks ? Math.round((row.completed_tasks * 100) / row.total_tasks) : 0;
            const isAbsentAgentViewing = !admin && Number(row.absent_agent_id) === Number(user?.id);
            const isCoveringAgentViewing = !admin && Number(row.covering_agent_id) === Number(user?.id);

            return (
              <article
                key={`${row.leave_id}-${row.group_id}-${i}`}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs space-y-0"
              >
                {isAbsentAgentViewing && (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-200 dark:border-indigo-900 text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span>📢</span>
                      <span>
                        Your tasks on {label(row.leave_date)} were covered by{' '}
                        <strong>{row.covering_agent_name}</strong>.
                      </span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-200 dark:bg-indigo-900 text-[10px] font-mono">
                      {row.completed_tasks} of {row.total_tasks} completed
                    </span>
                  </div>
                )}

                {isCoveringAgentViewing && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-900 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>
                        You covered tasks for absent agent <strong>{row.absent_agent_name}</strong> on {label(row.leave_date)}.
                      </span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-[10px] font-mono">
                      {row.completed_tasks} of {row.total_tasks} done
                    </span>
                  </div>
                )}

                {admin && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span>📋</span>
                      <span>
                        For absent agent <strong>{row.absent_agent_name}</strong>, tasks on {label(row.leave_date)} were handled by{' '}
                        <strong>{row.covering_agent_name}</strong>.
                      </span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">
                      {row.completed_tasks} of {row.total_tasks} done
                    </span>
                  </div>
                )}

                <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base font-heading">
                      {row.group_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Absent Agent: <strong>{row.absent_agent_name}</strong> · Covering Handler:{' '}
                      <strong>{row.covering_agent_name}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-heading">
                      {row.completed_tasks} / {row.total_tasks} Tasks Done ({pct}%)
                    </div>
                    <div className="w-36 h-2 mt-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>

                {/* 4 Financial Status Cards for this Chit Scheme (Matching User Design) */}
                <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  {/* Card 1: Expected Target */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs min-w-0">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                      Expected Target
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 block font-mono tracking-tight truncate">
                      ₹{Number(row.expected_target || (Number(row.installment_amount || 0) * (row.total_tasks || 0))).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Card 2: Cash on Hand */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs min-w-0">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block truncate">
                      Cash on Hand
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block font-mono tracking-tight truncate">
                      ₹{Number(row.cash_collected || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Card 3: UPI / Online */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 shadow-2xs min-w-0">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-purple-800 dark:text-purple-300 truncate">
                      <CreditCard className="w-3.5 h-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                      <span className="truncate">UPI / Online</span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5 block font-mono tracking-tight truncate">
                      ₹{Number(row.upi_collected || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Card 4: Pending Amount */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs min-w-0">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                      Pending Amount
                    </span>
                    <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5 block font-mono tracking-tight truncate">
                      ₹{Number(row.pending_amount !== undefined ? row.pending_amount : Math.max(0, (Number(row.expected_target || 0) - (Number(row.cash_collected || 0) + Number(row.upi_collected || 0))))).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Collapsible Subscriber Stops Breakdown Toggle Bar */}
                <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Route Waypoint Stops (<strong>{row.completed_tasks}</strong> completed · <strong>{row.total_tasks - row.completed_tasks}</strong> pending)
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleCoverageStops(itemKey)}
                    className="px-3 py-1 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>{isStopsExpanded ? 'Hide Stop Breakdown' : 'View Stop Breakdown'}</span>
                    {isStopsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isStopsExpanded && (
                  <div className="p-4 grid md:grid-cols-2 gap-4 animate-fadeIn border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-heading">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed Tasks · Official Receipts</span>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {row.completed_by.length > 0 ? (
                          row.completed_by.map((line, j) => (
                            <div
                              key={j}
                              className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                            >
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>{line}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400">No route collections recorded yet.</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1 font-heading">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending Unpaid Stops</span>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {row.pending_tasks.length > 0 ? (
                          row.pending_tasks.map((task) => (
                            <div
                              key={task.member_id}
                              className="p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs flex items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block font-heading">
                                  {task.member_name}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {task.paid_so_far > 0
                                    ? `₹${task.paid_so_far.toLocaleString('en-IN')} received, ₹${task.remaining_due.toLocaleString('en-IN')} due`
                                    : `₹${task.remaining_due.toLocaleString('en-IN')} due`}
                                  {task.recorded_by ? ` · By ${task.recorded_by}` : ''}
                                </span>
                              </div>

                              {admin && (
                                <a
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 underline shrink-0 cursor-pointer"
                                  href={`/admin/collections?group_id=${row.group_id}&member_id=${task.member_id}&collection_date=${String(row.leave_date).slice(0, 10)}&amount=${task.remaining_due}&absent_agent=${encodeURIComponent(row.absent_agent_name)}`}
                                >
                                  <span>Record Collection</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-emerald-600 font-bold">
                            All assigned route subscriber stops were completed! ✓
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {filteredHistory.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs mt-4">
              <Pagination
                currentPage={coveragePage}
                totalItems={filteredHistory.length}
                pageSize={coveragePageSize}
                onPageChange={setCoveragePage}
                onPageSizeChange={setCoveragePageSize}
                pageSizeOptions={[3, 5, 10, 20]}
              />
            </div>
          )}
        </div>
        );
      })()}
      </section>
    </div>
  );
}
