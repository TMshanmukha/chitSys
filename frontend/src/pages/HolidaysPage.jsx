import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Palmtree,
  Sun,
  ShieldCheck,
  Info,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRealtimeSync } from '../context/RealtimeContext';
import Toast from '../components/Toast';
import ModalPortal from '../components/ModalPortal';
import { formatDate, getServerDate, getServerYMD } from '../utils/dateUtils';
import { getFriendlyErrorMessage } from '../utils/friendlyError';

export default function HolidaysPage() {
  const { user } = useAuth();
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);

  const [holidays, setHolidays] = useState([]);
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  // Calendar Navigation State
  const [currentMonth, setCurrentMonth] = useState(getServerDate());
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    holiday_type: 'FESTIVAL',
    start_date: getServerYMD(),
    end_date: getServerYMD(),
    description: '',
  });

  const loadHolidays = async (showSpinner = false) => {
    try {
      if (showSpinner) setRefreshing(true);
      const res = await api.get(isAdmin ? '/admin/holidays' : '/agent/holidays');
      if (res.data?.success) {
        setHolidays(res.data.data?.holidays || []);
        setTodayStatus(res.data.data?.todayStatus || null);
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: getFriendlyErrorMessage(err, 'Failed to load company holidays.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, [isAdmin]);

  useRealtimeSync(['holidays'], () => {
    loadHolidays(true);
  });

  const handleDeclareHoliday = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setToast({ type: 'warning', message: 'Please provide a holiday or festival name.' });
      return;
    }
    if (!form.start_date) {
      setToast({ type: 'warning', message: 'Please select a valid start date.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/admin/holidays', {
        title: form.title.trim(),
        holiday_type: form.holiday_type,
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        description: form.description?.trim() || null,
      });

      if (res.data?.success) {
        setToast({
          type: 'success',
          message: res.data.message || 'Holiday declared successfully.',
        });
        setShowDeclareModal(false);
        setForm({
          title: '',
          holiday_type: 'FESTIVAL',
          start_date: getServerYMD(),
          end_date: getServerYMD(),
          description: '',
        });
        loadHolidays();
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: getFriendlyErrorMessage(err, 'Failed to declare holiday.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      const res = await api.delete(`/admin/holidays/${id}`);
      if (res.data?.success) {
        setToast({ type: 'success', message: res.data.message || 'Holiday removed.' });
        setDeleteConfirmId(null);
        loadHolidays();
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: getFriendlyErrorMessage(err, 'Could not remove holiday.'),
      });
    }
  };

  // Calendar Calculation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(ymd);
    }
    return days;
  }, [currentMonth]);

  const holidaysMap = useMemo(() => {
    const map = new Map();
    holidays.forEach((h) => {
      const d = String(h.holiday_date).slice(0, 10);
      map.set(d, h);
    });
    return map;
  }, [holidays]);

  const todayYMD = getServerYMD();

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-heading">
                Company Holidays & Calendar Offs
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official weekly off rules, declared festival holidays, and task pause calendars.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowDeclareModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer font-heading"
            >
              <Plus className="w-4 h-4" />
              <span>Declare Holiday</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadHolidays(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
            title="Refresh Holidays"
          >
            <Clock className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top 4 Key Metric & Policy Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tuesday Rule */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50/80 via-white to-blue-50/40 dark:from-sky-950/40 dark:via-slate-900 dark:to-blue-950/20 border border-sky-200 dark:border-sky-800/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider font-heading">
              Weekly Off Policy
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
              MANDATORY
            </span>
          </div>
          <div className="my-2">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-heading">
              Every Tuesday
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              52 days / year authoritative weekly holiday across all branches.
            </p>
          </div>
          <div className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Automatically applied everywhere</span>
          </div>
        </div>

        {/* Card 2: Today's Status */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
              Today's Status
            </span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                todayStatus?.isHoliday
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
              }`}
            >
              {todayStatus?.isHoliday ? 'HOLIDAY' : 'WORKING DAY'}
            </span>
          </div>
          <div className="my-2">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-heading">
              {todayStatus?.isHoliday ? todayStatus.title : 'Active Collections'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {formatDate(getServerDate())}
            </p>
          </div>
          <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0 text-blue-500" />
            <span>{todayStatus?.isHoliday ? 'Daily field work paused' : 'Field agents active on duty'}</span>
          </div>
        </div>

        {/* Card 3: Declared Holidays Count */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
              Declared Holidays
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
              {currentMonth.getFullYear()}
            </span>
          </div>
          <div className="my-2">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading font-mono">
              {holidays.length}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Festivals, national days, and admin declarations
            </p>
          </div>
          <div className="text-[10px] font-medium text-slate-400">
            Excludes recurring weekly Tuesdays
          </div>
        </div>

        {/* Card 4: Chit Duration Invariant */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-800/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider font-heading">
              Chit Installment Rule
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
              PRESERVED
            </span>
          </div>
          <div className="my-2">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
              Days Count Paused
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Holidays do not consume installments. Remaining days count stays intact.
            </p>
          </div>
          <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Mathematical scheme duration preserved</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Monthly Calendar & Declared Holiday Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left: Monthly Calendar (7 Cols) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
                }
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h2>
              <button
                type="button"
                onClick={() =>
                  setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
                }
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCurrentMonth(getServerDate())}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Current Month
            </button>
          </div>

          {/* Legend Strip */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Tuesday Weekly Off</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Declared Festival / Holiday</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Working Day</span>
            </span>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs font-bold uppercase text-slate-400 font-heading">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                className={`py-1.5 ${d === 'Tue' ? 'text-sky-600 dark:text-sky-400 font-black' : ''}`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((date, idx) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-14 sm:min-h-16 rounded-xl bg-transparent"
                  />
                );
              }

              const [y, m, d] = date.split('-').map(Number);
              const dayOfWeek = new Date(y, m - 1, d).getDay();
              const isTuesday = dayOfWeek === 2;
              const holiday = holidaysMap.get(date);
              const isToday = date === todayYMD;

              let cellBg =
                'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200';
              let badgeText = null;
              let badgeClass = '';

              if (isTuesday) {
                cellBg =
                  'bg-sky-50/80 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-100';
                badgeText = 'Tuesday Off';
                badgeClass = 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200';
              } else if (holiday) {
                cellBg =
                  'bg-amber-50/90 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100';
                badgeText = holiday.title;
                badgeClass = 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200';
              }

              return (
                <div
                  key={date}
                  className={`min-h-14 sm:min-h-16 rounded-xl p-1.5 sm:p-2 border flex flex-col justify-between transition-all ${cellBg} ${
                    isToday ? 'ring-2 ring-blue-500 shadow-xs' : ''
                  }`}
                  title={
                    isTuesday
                      ? `${date}: Tuesday Weekly Off`
                      : holiday
                      ? `${date}: ${holiday.title}`
                      : `${date}: Regular Working Day`
                  }
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{d}</span>
                    {isToday && (
                      <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400">
                        Today
                      </span>
                    )}
                  </div>

                  {badgeText && (
                    <div
                      className={`text-[8px] sm:text-[9px] font-bold px-1 py-0.5 rounded truncate text-center font-heading ${badgeClass}`}
                    >
                      {badgeText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Declared Holidays Registry (5 Cols) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Declared Holidays ({holidays.length})</span>
              </h2>
            </div>

            {holidays.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Palmtree className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No additional holidays declared yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Every Tuesday automatically remains an active weekly off.
                </p>
              </div>
            ) : (
              <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {holidays.map((h) => {
                  const dObj = new Date(h.holiday_date + 'T00:00:00');
                  const dayName = dObj.toLocaleDateString(undefined, { weekday: 'short' });

                  return (
                    <div
                      key={h.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2.5 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {h.title}
                          </h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                            {h.holiday_type || 'HOLIDAY'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {formatDate(h.holiday_date)} ({dayName})
                        </p>
                        {h.description && (
                          <p className="text-[11px] text-slate-400 italic truncate">{h.description}</p>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="shrink-0">
                          {deleteConfirmId === h.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteHoliday(h.id)}
                                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(h.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete Holiday"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-200 font-medium">
            💡 <strong>Note:</strong> On holidays, agent collection tasks are paused cleanly. Active chit remaining duration count does not advance or decrease.
          </div>
        </div>
      </div>

      {/* Modal: Declare Single Day or Date Range Holiday */}
      {showDeclareModal && (
        <ModalPortal
          id="declare-holiday-modal"
          isOpen={showDeclareModal}
          onClose={() => setShowDeclareModal(false)}
        >
          <div
            className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-auto relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
                  <Palmtree className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-heading">
                  Declare Company Holiday
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeclareModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeclareHoliday} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Holiday Title or Festival *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Festival, Pongal, Independence Day"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        start_date: newStart,
                        end_date: prev.end_date < newStart ? newStart : prev.end_date,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    min={form.start_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Holiday Type
                </label>
                <select
                  value={form.holiday_type}
                  onChange={(e) => setForm({ ...form, holiday_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FESTIVAL">Festival Holiday</option>
                  <option value="NATIONAL">National Holiday</option>
                  <option value="ADMIN_DECLARED">Admin Declared Holiday</option>
                  <option value="EMERGENCY">Emergency / Weather Off</option>
                  <option value="OTHER">Other Custom Off</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide any additional notice or remarks for staff..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeclareModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{submitting ? 'Declaring...' : 'Declare Holiday'}</span>
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

