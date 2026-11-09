import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  ChevronRight,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Camera,
  Image as ImageIcon,
  Trash2,
  Edit3,
} from 'lucide-react';
import api from '../../api/client';
import { useRealtimeSync } from '../../context/RealtimeContext';
import ModalPortal from '../../components/ModalPortal';
import { formatCurrency, formatDate } from '../../utils/interestUtils';

export default function FinLendCustomersPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Add Customer Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [formError, setFormError] = useState('');
  const [showKycFields, setShowKycFields] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    city: '',
    address: '',
    aadhaar_number: '',
    pan_number: '',
    photo_url: '',
  });

  // Edit Customer Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);
  const [editFormError, setEditFormError] = useState('');
  const [editShowKycFields, setEditShowKycFields] = useState(false);
  const [editPhotoPreview, setEditPhotoPreview] = useState('');
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    alternate_phone: '',
    city: '',
    address: '',
    aadhaar_number: '',
    pan_number: '',
    photo_url: '',
    status: 'ACTIVE',
  });

  const openEditModal = (c, e) => {
    e?.stopPropagation();
    setEditingCustomer(c);
    setEditFormData({
      full_name: c.full_name || '',
      phone: c.phone || '',
      alternate_phone: c.alternate_phone || '',
      city: c.city || '',
      address: c.address || '',
      aadhaar_number: c.aadhaar_number || '',
      pan_number: c.pan_number || '',
      photo_url: c.photo_url || '',
      status: c.status || 'ACTIVE',
    });
    setEditPhotoPreview(c.photo_url || '');
    setEditFormError('');
    setEditShowKycFields(Boolean(c.aadhaar_number || c.pan_number || c.alternate_phone));
    setIsEditOpen(true);
  };

  const handleEditPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setEditFormError('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhotoPreview(reader.result);
        setEditFormData((prev) => ({ ...prev, photo_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editingCustomer?.id) return;
    setEditFormError('');

    if (!editFormData.full_name.trim()) {
      setEditFormError('Please enter the customer full name.');
      return;
    }
    if (!editFormData.phone.trim() || editFormData.phone.trim().length < 10) {
      setEditFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setUpdatingCustomer(true);
      const res = await api.put(`/interest/customers/${editingCustomer.id}`, editFormData);
      if (res.data?.success) {
        setIsEditOpen(false);
        setEditingCustomer(null);
        await loadCustomers(true);
      } else {
        setEditFormError(res.data?.message || 'Failed to update customer.');
      }
    } catch (err) {
      setEditFormError(err.response?.data?.message || 'Failed to update customer details.');
    } finally {
      setUpdatingCustomer(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setFormData((prev) => ({ ...prev, photo_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const loadCustomers = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await api.get('/interest/customers');
      if (res.data?.success) {
        setCustomers(res.data.data?.customers || res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useRealtimeSync(['finlend:customers', 'finlend:loans', 'customers', 'loans'], () => {
    loadCustomers(true);
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.customer_code?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
      );
    });
  }, [customers, statusFilter, searchQuery]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.full_name.trim()) {
      setFormError('Please enter the customer full name.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.trim().length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setSavingCustomer(true);
      const res = await api.post('/interest/customers', formData);
      if (res.data?.success) {
        setIsAddOpen(false);
        setPhotoPreview('');
        setFormData({
          full_name: '',
          phone: '',
          city: '',
          address: '',
          aadhaar_number: '',
          pan_number: '',
          photo_url: '',
        });
        await loadCustomers(true);
        if (res.data.data?.id) {
          navigate(`/interest/customers/${res.data.data.id}`);
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register customer.');
    } finally {
      setSavingCustomer(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn font-sans pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
            Customers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Total {customers.length} registered borrowers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadCustomers(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95 font-heading"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customer name, phone, village..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
      </div>

      {/* Customer Cards List */}
      <div className="space-y-2.5">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 space-y-3">
            <Users className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-heading">
              No customers found
            </p>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add first customer</span>
            </button>
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const initial = (c.full_name || 'C').charAt(0).toUpperCase();

            return (
              <div
                key={c.id}
                onClick={() => navigate(`/interest/customers/${c.id}`)}
                className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 flex items-center justify-between gap-3 shadow-xs hover:border-indigo-400/60 dark:hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 dark:from-indigo-950/60 dark:to-purple-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-base shrink-0 border border-indigo-200/60 dark:border-indigo-800/40 font-heading group-hover:scale-105 transition-transform">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate font-heading group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {c.full_name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {c.customer_code}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {c.phone}
                      </span>
                      {c.city && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {c.city}
                          </span>
                        </>
                      )}
                      {Number(c.active_loans_count || 0) > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {c.active_loans_count} Active Loan{c.active_loans_count !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {Number(c.total_balance_to_close || 0) > 0 ? (
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] text-slate-400">Balance to Close</div>
                      <div className="text-xs font-black text-slate-900 dark:text-white font-heading">
                        {formatCurrency(c.total_balance_to_close)}
                      </div>
                    </div>
                  ) : Number(c.total_loans_count || 0) > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 hidden sm:inline">
                      All Settled
                    </span>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => openEditModal(c, e)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800/80 dark:hover:bg-indigo-950/60 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                      title="Edit customer details"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Edit</span>
                    </button>

                    <div className="flex items-center gap-1.5 pl-1">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hidden sm:inline">
                        Passbook
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddOpen && (
        <ModalPortal id="finlend-add-customer-modal" isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} preventBackdropClose={true}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-4 my-auto animate-scaleUp"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white font-heading">
                  Add Customer
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Quick customer registration
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

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              {/* Photo Input (Storage or Direct Camera) */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10">
                <div className="relative w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Customer" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Customer Photo
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold cursor-pointer hover:bg-indigo-100 transition-colors">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold cursor-pointer hover:bg-emerald-100 transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview('');
                          setFormData((prev) => ({ ...prev, photo_url: '' }));
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Phone *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Village / City / Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Market Street, Tenali"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Collapsed KYC Details */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowKycFields(!showKycFields)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>{showKycFields ? '- Hide ID Details' : '+ Add ID Details (Optional Aadhaar / PAN)'}</span>
                </button>

                {showKycFields && (
                  <div className="mt-2.5 space-y-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Aadhaar Number
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        placeholder="12-digit Aadhaar"
                        value={formData.aadhaar_number}
                        onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        PAN Card Number
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        placeholder="10-digit PAN"
                        value={formData.pan_number}
                        onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="w-full py-3 px-4 rounded-xl text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all font-heading cursor-pointer disabled:opacity-50"
                >
                  {savingCustomer ? 'Registering...' : 'Save & Open Passbook'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Edit Customer Modal */}
      {isEditOpen && editingCustomer && (
        <ModalPortal id="finlend-edit-customer-modal" isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} preventBackdropClose={true}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-4 my-auto animate-scaleUp max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white font-heading">
                    Edit Customer
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {editingCustomer.customer_code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update borrower details and contact info
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editFormError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCustomer} className="space-y-3.5">
              {/* Photo Input */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10">
                <div className="relative w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700">
                  {editPhotoPreview ? (
                    <img src={editPhotoPreview} alt="Customer" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Customer Photo
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold cursor-pointer hover:bg-indigo-100 transition-colors">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditPhotoUpload}
                        className="hidden"
                      />
                    </label>

                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold cursor-pointer hover:bg-emerald-100 transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleEditPhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {editPhotoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditPhotoPreview('');
                          setEditFormData((prev) => ({ ...prev, photo_url: '' }));
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit number"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alternate Phone
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Optional 10-digit"
                    value={editFormData.alternate_phone}
                    onChange={(e) => setEditFormData({ ...editFormData, alternate_phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Village / City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tenali, Ward 4"
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Address / Landmark
                </label>
                <input
                  type="text"
                  placeholder="Door No, Street name, Landmark"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              {/* Collapsed KYC Details */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setEditShowKycFields(!editShowKycFields)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{editShowKycFields ? '- Hide ID Details' : '+ Edit ID Details (Aadhaar / PAN)'}</span>
                </button>

                {editShowKycFields && (
                  <div className="mt-2.5 space-y-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Aadhaar Number
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        placeholder="12-digit Aadhaar"
                        value={editFormData.aadhaar_number}
                        onChange={(e) => setEditFormData({ ...editFormData, aadhaar_number: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        PAN Card Number
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        placeholder="10-digit PAN"
                        value={editFormData.pan_number}
                        onChange={(e) => setEditFormData({ ...editFormData, pan_number: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="w-1/3 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCustomer}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all font-heading cursor-pointer disabled:opacity-50"
                >
                  {updatingCustomer ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

