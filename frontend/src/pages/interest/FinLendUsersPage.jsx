import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  Shield,
  KeyRound,
  RefreshCw,
  Edit3,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  ArrowLeft,
  Coins,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  MapPin,
  Clock,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeSync } from '../../context/RealtimeContext';
import { formatCurrency, formatDate, formatTime } from '../../utils/interestUtils';
import RoleChip from '../../components/interest-ui/RoleChip';
import PermissionSwitch from '../../components/interest-ui/PermissionSwitch';
import ConfirmModal from '../../components/ConfirmModal';
import ModalPortal from '../../components/ModalPortal';

const ROLE_DESCRIPTIONS = {
  OWNER: 'Full access: manage loans, collections, money, settings, staff and permissions.',
  MANAGER: 'Operations lead: create loans, record collections, inspect reports and assign routes.',
  AGENT: 'Field collector: access Agent portal, collect from assigned borrowers and handover cash.',
  VIEWER: 'Read-only observer: view dashboard and statements for accounting without money actions.',
};

export default function FinLendUsersPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'OWNER' | 'MANAGER' | 'AGENT' | 'VIEWER'
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals & Sheets
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showAdvancedPerms, setShowAdvancedPerms] = useState(false);

  // Password reset modal
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [savingReset, setSavingReset] = useState(false);

  // Deactivate confirmation
  const [confirmToggleUser, setConfirmToggleUser] = useState(null);

  // Customer Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allActiveLoans, setAllActiveLoans] = useState([]);
  const [selectedLoanIds, setSelectedLoanIds] = useState([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Add User Form
  const [addForm, setAddForm] = useState({
    full_name: '',
    phone: '',
    username: '',
    role: 'AGENT',
    temp_password: '',
    assigned_area: '',
    daily_target: '0',
  });
  const [savingAdd, setSavingAdd] = useState(false);

  // Edit User / Staff Form
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    phone: '',
    role: 'AGENT',
    assigned_area: '',
    daily_target: '0',
    password: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const handleOpenEdit = (user, e) => {
    if (e) e.stopPropagation();
    setError('');
    setSuccess('');
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      username: user.username || '',
      phone: user.phone || '',
      role: user.role === 'OWNER' ? 'OWNER' : 'AGENT',
      assigned_area: user.assigned_area || '',
      daily_target: String(user.daily_target || '0'),
      password: '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setSuccess('');

    if (!editForm.full_name.trim()) {
      setError('Please enter user full name.');
      return;
    }
    if (!editForm.username.trim()) {
      setError('Please choose a username or login ID.');
      return;
    }

    try {
      setSavingEdit(true);
      const res = await api.put(`/interest/users/${editingUser.user_id}`, {
        full_name: editForm.full_name.trim(),
        username: editForm.username.trim().toLowerCase(),
        phone: editForm.phone.trim(),
        role: editForm.role,
        assigned_area: editForm.assigned_area.trim(),
        daily_target: editForm.daily_target,
        password: editForm.password ? editForm.password.trim() : undefined,
      });

      if (res.data?.success) {
        setSuccess(`Staff account '${editForm.full_name}' updated successfully.`);
        setEditingUser(null);
        if (selectedUserDetail?.user_id === editingUser.user_id) {
          handleOpenDetail(editingUser);
        }
        await loadUsers(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update staff member.');
    } finally {
      setSavingEdit(false);
    }
  };

  const loadUsers = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError('');

      const res = await api.get('/interest/users');
      if (res.data?.success) {
        setUsers(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user management list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useRealtimeSync(['finlend:users', 'users'], () => {
    loadUsers(true);
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        u.full_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.assigned_area?.toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, searchQuery]);

  // Generate random 6-character memorable temp password
  const generateTempPassword = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAddForm((prev) => ({ ...prev, temp_password: result }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!addForm.full_name.trim()) {
      setError('Please enter user full name.');
      return;
    }
    if (!addForm.username.trim()) {
      setError('Please choose a username or login ID.');
      return;
    }
    if (!addForm.temp_password || addForm.temp_password.length < 4) {
      setError('Temporary password must be at least 4 characters.');
      return;
    }

    try {
      setSavingAdd(true);
      const res = await api.post('/interest/users', addForm);
      if (res.data?.success) {
        setSuccess(`User account created. Username: ${addForm.username}, Temp Password: ${addForm.temp_password}`);
        setIsAddOpen(false);
        setAddForm({
          full_name: '',
          phone: '',
          username: '',
          role: 'AGENT',
          temp_password: '',
          assigned_area: '',
          daily_target: '0',
        });
        await loadUsers(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user account.');
    } finally {
      setSavingAdd(false);
    }
  };

  // Open user detail sheet
  const handleOpenDetail = async (user) => {
    try {
      setError(null);
      setLoadingDetail(true);
      const res = await api.get(`/interest/users/${user.user_id}`);
      if (res.data?.success) {
        setSelectedUserDetail(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Update permission toggle for selected user
  const handleTogglePermission = async (permKey, nextVal) => {
    if (!selectedUserDetail) return;
    try {
      const updatedPerms = {
        ...selectedUserDetail.permissions,
        [permKey]: nextVal,
      };

      await api.put(`/interest/users/${selectedUserDetail.user_id}`, {
        permissions: updatedPerms,
      });

      setSelectedUserDetail((prev) => ({
        ...prev,
        permissions: updatedPerms,
      }));
    } catch (err) {
      setError('Failed to update permission.');
    }
  };

  // Toggle user active status
  const handleToggleActiveConfirmed = async () => {
    if (!confirmToggleUser) return;
    try {
      const nextState = confirmToggleUser.is_active ? 0 : 1;
      const res = await api.patch(`/interest/users/${confirmToggleUser.user_id}/active`, {
        is_active: nextState,
      });
      if (res.data?.success) {
        setSuccess(res.data.message);
        setConfirmToggleUser(null);
        if (selectedUserDetail?.user_id === confirmToggleUser.user_id) {
          setSelectedUserDetail((prev) => ({ ...prev, is_active: nextState }));
        }
        await loadUsers(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status.');
      setConfirmToggleUser(null);
    }
  };

  // Execute password reset
  const handleExecuteResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser || !newPasswordVal) return;
    try {
      setSavingReset(true);
      const res = await api.post(`/interest/users/${resetModalUser.user_id}/reset-password`, {
        new_password: newPasswordVal,
      });
      if (res.data?.success) {
        setSuccess(res.data.message);
        setResetModalUser(null);
        setNewPasswordVal('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setSavingReset(false);
    }
  };

  // Open customer assign modal
  const handleOpenAssignModal = async () => {
    try {
      const res = await api.get('/interest/loans?status=ACTIVE');
      if (res.data?.success) {
        const loans = res.data.data?.loans || res.data.data || [];
        setAllActiveLoans(loans);
        const currentlyAssignedIds = (selectedUserDetail?.assignedLoans || []).map((l) => l.loan_id);
        setSelectedLoanIds(currentlyAssignedIds);
        setShowAssignModal(true);
      }
    } catch (err) {
      setError('Failed to load active loans for assignment.');
    }
  };

  // Save customer assignments
  const handleSaveAssignments = async () => {
    if (!selectedUserDetail) return;
    try {
      setSavingAssignments(true);
      const res = await api.put(`/interest/users/${selectedUserDetail.user_id}/assign-customers`, {
        loan_ids: selectedLoanIds,
      });
      if (res.data?.success) {
        setSuccess(res.data.message);
        setShowAssignModal(false);
        handleOpenDetail(selectedUserDetail);
        loadUsers(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save customer assignments.');
    } finally {
      setSavingAssignments(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn font-sans pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/interest/home')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadUsers(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              generateTempPassword();
              setIsAddOpen(true);
            }}
            className="py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-xs transition-colors font-heading cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
          User & Access Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Assign roles (Owner, Manager, Agent, Viewer) and granular operational permissions
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Role Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['ALL', 'OWNER', 'AGENT'].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              roleFilter === r
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#0c1220] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50'
            }`}
          >
            {r === 'ALL' ? `All Users (${users.length})` : r}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search staff by name, username, phone or area..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
      </div>

      {/* Users List Cards */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 space-y-2">
            <Users className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-heading">
              No matching staff members found
            </p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const initial = (u.full_name || 'U').charAt(0).toUpperCase();
            const isAgent = u.role === 'AGENT';

            return (
              <div
                key={u.user_id}
                onClick={() => handleOpenDetail(u)}
                className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-indigo-400/60 dark:hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-xs font-heading">
                    {initial}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate font-heading group-hover:text-indigo-600 transition-colors">
                        {u.full_name}
                      </span>
                      <RoleChip role={u.role} />
                      {!u.is_active && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200">
                          Deactivated
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-mono">@{u.username}</span>
                      <span>•</span>
                      <span>📱 {u.phone || 'No phone'}</span>
                      {u.assigned_area && (
                        <>
                          <span>•</span>
                          <span>📍 {u.assigned_area}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                  {isAgent && (
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Today: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(u.today_collected_amount)}</strong>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {u.assigned_customers_count || 0} borrowers assigned
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(u, e)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(u)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 1-PAGE ADD USER BOTTOM SHEET */}
      {isAddOpen && (
        <ModalPortal id="finlend-add-user-modal" isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} preventBackdropClose={true}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto my-auto animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white font-heading">
                  Add New Staff Member
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assign user role and setup temporary credentials
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Sharma"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Role: 2 Big Pills (Owner & Agent) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Role *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['OWNER', 'AGENT'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAddForm({ ...addForm, role: r })}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold font-heading border transition-all cursor-pointer ${
                        addForm.role === r
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                  💡 {ROLE_DESCRIPTIONS[addForm.role]}
                </p>
              </div>

              {/* Username & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username (Login ID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. anand_agent"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Temp Password with Auto-generate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Temporary Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateTempPassword}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate New</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={addForm.temp_password}
                  onChange={(e) => setAddForm({ ...addForm, temp_password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest font-black"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  User will be forced to change password on first login.
                </span>
              </div>

              {/* Area & Target (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Route / Area (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Market Route"
                    value={addForm.assigned_area}
                    onChange={(e) => setAddForm({ ...addForm, assigned_area: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Target (₹ Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="30000"
                    value={addForm.daily_target}
                    onChange={(e) => setAddForm({ ...addForm, daily_target: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="w-full py-3 px-4 rounded-xl text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 font-heading cursor-pointer disabled:opacity-50"
                >
                  {savingAdd ? 'Creating User...' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* 1-PAGE EDIT STAFF MODAL */}
      {editingUser && (
        <ModalPortal id="finlend-edit-user-modal" isOpen={Boolean(editingUser)} onClose={() => setEditingUser(null)} preventBackdropClose={true}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto my-auto animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white font-heading">
                  Edit Staff Member
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update personal details, role, and collection routes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Sharma"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Role: 2 Big Pills (Owner & Agent) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Role *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['OWNER', 'AGENT'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, role: r })}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold font-heading border transition-all cursor-pointer ${
                        editForm.role === r
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                  💡 {ROLE_DESCRIPTIONS[editForm.role]}
                </p>
              </div>

              {/* Username & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username (Login ID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. anand_agent"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Area & Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Route / Area (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Market Route"
                    value={editForm.assigned_area}
                    onChange={(e) => setEditForm({ ...editForm, assigned_area: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Target (₹ Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="30000"
                    value={editForm.daily_target}
                    onChange={(e) => setEditForm({ ...editForm, daily_target: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Optional Password Update */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Change Password (Leave blank to keep current)
                </label>
                <input
                  type="text"
                  placeholder="Enter new password if changing"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 font-heading cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Update Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* USER DETAIL & PERMISSION MANAGEMENT MODAL */}
      {selectedUserDetail && (
        <ModalPortal id="finlend-user-detail-modal" isOpen={Boolean(selectedUserDetail)} onClose={() => setSelectedUserDetail(null)} preventBackdropClose={true}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto my-auto animate-scaleUp"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-base shadow-xs font-heading">
                  {(selectedUserDetail.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                      {selectedUserDetail.full_name}
                    </h2>
                    <RoleChip role={selectedUserDetail.role} />
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    @{selectedUserDetail.username} • 📱 {selectedUserDetail.phone || 'No phone'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedUserDetail)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserDetail(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                <div className="text-[11px] text-slate-500">Today Collected</div>
                <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-heading mt-0.5">
                  {formatCurrency(selectedUserDetail.stats?.today_collected || 0)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                <div className="text-[11px] text-slate-500">Cash in Hand</div>
                <div className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 font-heading mt-0.5">
                  {formatCurrency(selectedUserDetail.stats?.cash_in_hand || 0)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                <div className="text-[11px] text-slate-500">Total Month</div>
                <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-heading mt-0.5">
                  {formatCurrency(selectedUserDetail.stats?.total_collected || 0)}
                </div>
              </div>
            </div>

            {/* Assigned Borrowers Section (For Agents) */}
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white font-heading">
                    Assigned Borrowers ({selectedUserDetail.assignedLoans?.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Routes and loans this agent can collect
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAssignModal}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-heading shadow-xs cursor-pointer"
                >
                  Manage Assignments
                </button>
              </div>

              {selectedUserDetail.assignedLoans && selectedUserDetail.assignedLoans.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-white/5 pt-1">
                  {selectedUserDetail.assignedLoans.map((l) => (
                    <div key={l.loan_id} className="pt-1.5 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-800 dark:text-slate-200">{l.customer_name}</strong>
                        <span className="text-slate-400 font-mono ml-2">#{l.loan_account_number}</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 font-mono">
                        Due: {formatCurrency(l.installment_amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Granular Permissions Section */}
            <div className="space-y-2">
              <div
                onClick={() => setShowAdvancedPerms(!showAdvancedPerms)}
                className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/60 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 font-heading">
                    Granular Access Permissions
                  </span>
                </div>
                {showAdvancedPerms ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
              </div>

              {showAdvancedPerms && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/5 divide-y divide-slate-200/60 dark:divide-white/5 space-y-1">
                  <PermissionSwitch
                    label="Can Disburse Loans"
                    description="Create new loan accounts and schedules"
                    checked={Boolean(selectedUserDetail.permissions?.can_disburse_loans)}
                    onChange={(val) => handleTogglePermission('can_disburse_loans', val)}
                    disabled={selectedUserDetail.role === 'OWNER'}
                  />
                  <PermissionSwitch
                    label="Can Collect Payments"
                    description="Record receipts and accept loan installments"
                    checked={Boolean(selectedUserDetail.permissions?.can_collect)}
                    onChange={(val) => handleTogglePermission('can_collect', val)}
                    disabled={selectedUserDetail.role === 'OWNER'}
                  />
                  <PermissionSwitch
                    label="Can Edit Customers"
                    description="Register borrowers and modify customer KYC"
                    checked={Boolean(selectedUserDetail.permissions?.can_edit_customers)}
                    onChange={(val) => handleTogglePermission('can_edit_customers', val)}
                    disabled={selectedUserDetail.role === 'OWNER'}
                  />
                  <PermissionSwitch
                    label="Can View Reports"
                    description="Access day books, statements and business analytics"
                    checked={Boolean(selectedUserDetail.permissions?.can_view_reports)}
                    onChange={(val) => handleTogglePermission('can_view_reports', val)}
                    disabled={selectedUserDetail.role === 'OWNER'}
                  />
                  <PermissionSwitch
                    label="Can Export Data"
                    description="Download CSV and PDF reports"
                    checked={Boolean(selectedUserDetail.permissions?.can_export)}
                    onChange={(val) => handleTogglePermission('can_export', val)}
                    disabled={selectedUserDetail.role === 'OWNER'}
                  />
                  <PermissionSwitch
                    label="Can Approve Cash Handovers"
                    description="Acknowledge end-of-day cash from field agents"
                    checked={Boolean(selectedUserDetail.permissions?.can_approve_cash)}
                    onChange={(val) => handleTogglePermission('can_approve_cash', val)}
                    disabled={selectedUserDetail.role === 'OWNER'}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons: Reset Password & Deactivate */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  setResetModalUser(selectedUserDetail);
                  setNewPasswordVal('');
                }}
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Reset Password</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmToggleUser(selectedUserDetail)}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedUserDetail.is_active
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-950/30'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {selectedUserDetail.is_active ? 'Deactivate User' : 'Activate User'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ASSIGN CUSTOMERS MODAL */}
      {showAssignModal && selectedUserDetail && (
        <ModalPortal id="finlend-assign-customers-modal" isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} preventBackdropClose={true}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col my-auto animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5 shrink-0">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white font-heading">
                  Assign Borrowers to {selectedUserDetail.full_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Select active loan accounts for field collection
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {allActiveLoans.map((loan) => {
                const isSelected = selectedLoanIds.includes(loan.id);

                return (
                  <div
                    key={loan.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedLoanIds(selectedLoanIds.filter((id) => id !== loan.id));
                      } else {
                        setSelectedLoanIds([...selectedLoanIds, loan.id]);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 font-bold'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-white/5'
                    }`}
                  >
                    <div>
                      <div className="text-slate-900 dark:text-white font-heading">
                        {loan.customer_name}
                      </div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        #{loan.loan_account_number} • {loan.customer_phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-indigo-600 dark:text-indigo-400 font-mono">
                        {formatCurrency(loan.installment_amount)} / {loan.repayment_frequency}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isSelected ? '✓ Assigned' : '+ Tap to Assign'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 shrink-0">
              <button
                type="button"
                disabled={savingAssignments}
                onClick={handleSaveAssignments}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md"
              >
                {savingAssignments ? 'Saving...' : `Save ${selectedLoanIds.length} Assignments`}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetModalUser && (
        <ModalPortal id="finlend-reset-password-modal" isOpen={Boolean(resetModalUser)} onClose={() => setResetModalUser(null)} preventBackdropClose={true}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 space-y-4 my-auto animate-scaleUp"
          >
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white font-heading">
              Reset Password for @{resetModalUser.username}
            </h3>
            <form onSubmit={handleExecuteResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  New Temporary Password *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Min 4 characters"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono tracking-wider font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReset || !newPasswordVal}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-xs"
                >
                  {savingReset ? 'Resetting...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {confirmToggleUser && (
        <ConfirmModal
          isOpen={Boolean(confirmToggleUser)}
          title={confirmToggleUser.is_active ? 'Deactivate FinLend Account' : 'Reactivate FinLend Account'}
          message={`Are you sure you want to ${
            confirmToggleUser.is_active ? 'deactivate' : 'reactivate'
          } ${confirmToggleUser.full_name} (@${confirmToggleUser.username}) in FinLend Pro?`}
          confirmText={confirmToggleUser.is_active ? 'Deactivate' : 'Reactivate'}
          confirmVariant={confirmToggleUser.is_active ? 'danger' : 'primary'}
          onConfirm={handleToggleActiveConfirmed}
          onClose={() => setConfirmToggleUser(null)}
        />
      )}
    </div>
  );
}

