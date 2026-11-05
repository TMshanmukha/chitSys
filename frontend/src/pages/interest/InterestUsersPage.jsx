import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  Users,
  UserCheck,
  Shield,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit3,
  KeyRound,
  Phone,
  Clock,
  Loader2,
  Lock,
  UserPlus,
  RefreshCw,
  Landmark,
  X,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import ConfirmModal from '../../components/ConfirmModal';
import ModalPortal from '../../components/ModalPortal';

export default function InterestUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'COLLECTION_AGENT' | 'ADMIN'
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToToggleStatus, setUserToToggleStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    full_name: '',
    username: '',
    phone: '',
    password: '',
    role: 'COLLECTION_AGENT',
    assigned_business: 'INTEREST',
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    phone: '',
    password: '',
    is_active: 1,
    assigned_business: 'INTEREST',
  });

  const loadData = async () => {
    try {
      setError('');
      const res = await api.get('/admin/agents');
      if (res.data?.success) {
        // Filter users assigned to INTEREST or ALL (Admins)
        const allUsers = res.data.data || [];
        const interestUsers = allUsers.filter(
          (u) => u.assigned_business === 'INTEREST' || u.assigned_business === 'ALL' || u.role === 'SUPER_ADMIN' || u.role === 'ADMIN'
        );
        setUsers(interestUsers);
      }
    } catch (err) {
      console.error('Failed to load FinLend users:', err);
      setError('Failed to load users list. Please refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/admin/agents', {
        full_name: createForm.full_name.trim(),
        username: createForm.username.trim().toLowerCase(),
        phone: createForm.phone.trim(),
        password: createForm.password,
        role: createForm.role,
        assigned_business: createForm.role === 'ADMIN' ? 'ALL' : 'INTEREST',
      });

      if (res.data?.success) {
        setSuccess(`Agent account '${createForm.username}' created successfully.`);
        setShowCreateModal(false);
        setCreateForm({
          full_name: '',
          username: '',
          phone: '',
          password: '',
          role: 'COLLECTION_AGENT',
          assigned_business: 'INTEREST',
        });
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create agent account.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      username: user.username || '',
      phone: user.phone || '',
      password: '',
      is_active: user.is_active ? 1 : 0,
      assigned_business: user.assigned_business || 'INTEREST',
    });
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        full_name: editForm.full_name.trim(),
        username: editForm.username.trim().toLowerCase(),
        phone: editForm.phone.trim(),
        is_active: editForm.is_active,
        assigned_business: selectedUser.role === 'ADMIN' ? 'ALL' : editForm.assigned_business,
      };
      if (editForm.password && editForm.password.trim().length >= 4) {
        payload.password = editForm.password.trim();
      }

      const res = await api.put(`/admin/agents/${selectedUser.id}`, payload);
      if (res.data?.success) {
        setSuccess(`Account '${editForm.username}' updated successfully.`);
        setShowEditModal(false);
        setSelectedUser(null);
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatusConfirm = async () => {
    if (!userToToggleStatus) return;
    const target = userToToggleStatus;
    const newStatus = target.is_active ? 0 : 1;
    setUserToToggleStatus(null);
    setError('');

    try {
      const res = await api.patch(`/admin/agents/${target.id}/status`, { is_active: newStatus });
      if (res.data?.success) {
        setSuccess(`User '${target.username}' ${newStatus ? 'activated' : 'deactivated'} successfully.`);
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change account status.');
    }
  };

  // Filter users by search and role
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.phone?.includes(q);
    return matchesRole && matchesSearch;
  });

  const totalAgentsCount = users.filter((u) => u.role === 'COLLECTION_AGENT').length;
  const activeAgentsCount = users.filter((u) => u.role === 'COLLECTION_AGENT' && u.is_active).length;
  const totalAdminsCount = users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN').length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner with Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-heading">
            <UserCheck className="w-4 h-4" />
            <span>FinLend Pro • Access & Staff</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight mt-1">
            User Management & Field Agents
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create and manage FinLend Pro lending collection agents, credentials, and access permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setError('');
              setSuccess('');
              setShowCreateModal(true);
            }}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer font-heading shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add FinLend Agent</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* 2. Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-white/10">
          <span className="text-xs font-bold text-slate-400 font-heading block uppercase">Total FinLend Agents</span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {totalAgentsCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{activeAgentsCount} currently active for field collections</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-white/10">
          <span className="text-xs font-bold text-slate-400 font-heading block uppercase">Administrators</span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {totalAdminsCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Shared multi-engine access</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-white/10">
          <span className="text-xs font-bold text-slate-400 font-heading block uppercase">Business Segregation</span>
          <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1 font-heading">
            Strict Isolation Active
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Agents cannot access ChitFund groups</span>
        </div>
      </div>

      {/* 3. Search and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-white/10">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by agent name, username, phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
          {['ALL', 'COLLECTION_AGENT', 'ADMIN'].map((rf) => (
            <button
              key={rf}
              type="button"
              onClick={() => setRoleFilter(rf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-heading ${
                roleFilter === rf
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {rf === 'ALL' ? 'All Roles' : rf === 'COLLECTION_AGENT' ? 'Agents' : 'Admins'}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Users Table */}
      {loading ? (
        <div className="p-16 text-center rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading user accounts...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-white/40 dark:bg-slate-900/40">
          <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-heading">No Staff Accounts Found</p>
          <p className="text-xs text-slate-400 mt-1">Click &quot;Add FinLend Agent&quot; to register a collection agent.</p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-200/70 dark:border-white/10 font-heading">
                <tr>
                  <th className="py-4 px-5">Staff Member</th>
                  <th className="py-4 px-5">Username</th>
                  <th className="py-4 px-5">Role</th>
                  <th className="py-4 px-5">Assigned Business</th>
                  <th className="py-4 px-5">Phone</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs font-heading shrink-0 shadow-xs">
                          {u.full_name ? u.full_name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white font-heading text-sm">
                            {u.full_name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Created: {formatDate(u.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 font-mono text-slate-700 dark:text-slate-300 font-bold">
                      {u.username}
                    </td>

                    <td className="py-4 px-5">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide border ${
                          u.role === 'SUPER_ADMIN' || u.role === 'ADMIN'
                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40'
                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40'
                        }`}
                      >
                        {u.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : u.role === 'ADMIN' ? 'ADMIN' : 'COLLECTION AGENT'}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5">
                        {u.assigned_business === 'ALL' ? 'All Units' : u.assigned_business === 'INTEREST' ? 'FinLend Pro' : 'ChitFund Pro'}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-slate-600 dark:text-slate-300 font-mono">
                      {u.phone || '—'}
                    </td>

                    <td className="py-4 px-5">
                      <button
                        type="button"
                        onClick={() => setUserToToggleStatus(u)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase cursor-pointer transition-all ${
                          u.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 border border-slate-200/60 dark:border-white/10 hover:bg-slate-200'
                        }`}
                        title="Click to toggle active status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer font-heading"
                      >
                        Edit / Reset PIN
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Create Agent Modal */}
      {showCreateModal && (
        <ModalPortal id="create-finlend-agent-modal" isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-7 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider font-heading">
                  New Staff Account
                </span>
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg font-heading">
                  Create FinLend Agent
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">
                  Username (Agent Login ID) *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder="e.g. suresh_fl"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">
                  10-Digit Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">
                  Password or 4-Digit Security PIN *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Enter login password or PIN"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">
                  Account Role
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-heading text-slate-900 dark:text-white"
                >
                  <option value="COLLECTION_AGENT">Collection Agent (FinLend Pro Field)</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] text-indigo-700 dark:text-indigo-300">
                This agent will be assigned to <strong>FinLend Pro</strong>. ChitFund Pro routes and auction modules will be blocked automatically.
              </div>

              <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 font-bold cursor-pointer font-heading"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-sm font-heading"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* 6. Edit Agent Modal */}
      {showEditModal && selectedUser && (
        <ModalPortal id="edit-finlend-agent-modal" isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-7 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider font-heading">
                  Edit Account
                </span>
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg font-heading">
                  Update {selectedUser.full_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">Username *</label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">
                  Reset Password / PIN (Leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Enter new password/PIN or leave empty"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">Account Status</label>
                <select
                  value={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: parseInt(e.target.value, 10) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-heading text-slate-900 dark:text-white"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive (Login Blocked)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 font-bold cursor-pointer font-heading"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-sm font-heading"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* 7. Confirm Status Toggle Modal */}
      {userToToggleStatus && (
        <ConfirmModal
          isOpen={Boolean(userToToggleStatus)}
          onClose={() => setUserToToggleStatus(null)}
          onConfirm={handleToggleStatusConfirm}
          title={userToToggleStatus.is_active ? 'Deactivate Agent Account?' : 'Activate Agent Account?'}
          message={`Are you sure you want to ${
            userToToggleStatus.is_active ? 'deactivate' : 'activate'
          } '${userToToggleStatus.full_name}' (${userToToggleStatus.username})? ${
            userToToggleStatus.is_active ? 'The agent will not be able to log in to collect loan payments.' : 'The agent will immediately be allowed to collect loan payments.'
          }`}
          confirmText={userToToggleStatus.is_active ? 'Yes, Deactivate' : 'Yes, Activate'}
          confirmVariant={userToToggleStatus.is_active ? 'danger' : 'primary'}
        />
      )}
    </div>
  );
}

