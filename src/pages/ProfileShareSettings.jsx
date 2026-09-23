import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Share2,
  ArrowLeft,
  Plus,
  Copy,
  Check,
  Trash2,
  Shield,
  Clock,
  Eye,
  Lock,
  Calendar,
  Layers,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Edit2,
  ExternalLink,
  RotateCcw,
  CheckSquare,
  Square,
  KeyRound,
  Search,
  CheckCircle2,
} from 'lucide-react';
import {
  getProfileShares,
  createProfileShare,
  updateProfileShare,
  revokeProfileShare,
} from '../services/profileShareService';
import { getMyProfiles } from '../services/clientProfileService';

export const AVAILABLE_MODULES = [
  // Commercial & Sales
  { id: 'invoices', label: 'Invoices', category: 'Commercial & Sales', desc: 'Invoices & billing records' },
  { id: 'quotes', label: 'Quotes & Estimates', category: 'Commercial & Sales', desc: 'Quotations and cost proposals' },
  { id: 'proformas', label: 'Proformas', category: 'Commercial & Sales', desc: 'Proforma invoices' },
  { id: 'purchaseOrders', label: 'Purchase Orders', category: 'Commercial & Sales', desc: 'Vendor orders & procurement' },
  { id: 'clients', label: 'Clients / Customers', category: 'Commercial & Sales', desc: 'Client directory & records' },
  { id: 'vendors', label: 'Vendors / Suppliers', category: 'Commercial & Sales', desc: 'Supplier & vendor contacts' },
  { id: 'items', label: 'Items & Products', category: 'Commercial & Sales', desc: 'Inventory items & rate list' },

  // Accounting & Finance
  { id: 'expenses', label: 'Expenses', category: 'Accounting & Finance', desc: 'Recorded company expenses' },
  { id: 'incomes', label: 'Incomes', category: 'Accounting & Finance', desc: 'Business income streams' },
  { id: 'recurringTransactions', label: 'Recurring Transactions', category: 'Accounting & Finance', desc: 'Automated recurring schedules' },
  { id: 'bankStatements', label: 'Bank Statements', category: 'Accounting & Finance', desc: 'Bank statement feeds & reconciliations' },
  { id: 'categories', label: 'Categories', category: 'Accounting & Finance', desc: 'Income and expense classifications' },

  // Assets & Liabilities
  { id: 'budgets', label: 'Budgets & Tracking', category: 'Assets & Liabilities', desc: 'Allocated budgets & variances' },
  { id: 'liabilities', label: 'Liabilities', category: 'Assets & Liabilities', desc: 'Debts & loans payable' },
  { id: 'assets', label: 'Fixed Assets', category: 'Assets & Liabilities', desc: 'Capital equipment & asset logs' },

  // Operations & Projects
  { id: 'projects', label: 'Projects & Tasks', category: 'Operations & Projects', desc: 'Milestones, tasks, and budgets' },
  { id: 'businessUnits', label: 'Business Units', category: 'Operations & Projects', desc: 'Branch & business unit entities' },
  { id: 'departments', label: 'Departments', category: 'Operations & Projects', desc: 'Organizational divisions' },

  // HR & Payroll
  { id: 'employees', label: 'Employees Directory', category: 'HR & Payroll', desc: 'Staff directory & profiles' },
  { id: 'payroll', label: 'Payroll & Salaries', category: 'HR & Payroll', desc: 'Salary register & payslips' },
  { id: 'leaves', label: 'Leaves & Attendance', category: 'HR & Payroll', desc: 'Leave tracking & time off' },
  { id: 'reimbursements', label: 'Reimbursements', category: 'HR & Payroll', desc: 'Employee expense claims' },
  { id: 'loans', label: 'Employee Advances & Loans', category: 'HR & Payroll', desc: 'Disbursed employee advances' },

  // Reports & Portals
  { id: 'financialReports', label: 'Financial Reports & Dashboard', category: 'Reports & Portals', desc: 'P&L, balance sheet, cash flow' },
  { id: 'publicSubmissions', label: 'Public Submissions Inbox', category: 'Reports & Portals', desc: 'Public portal form entries' },
];

const MODULE_CATEGORIES = [
  'All',
  'Commercial & Sales',
  'Accounting & Finance',
  'Assets & Liabilities',
  'Operations & Projects',
  'HR & Payroll',
  'Reports & Portals',
];

const formatDateForInput = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ProfileShareSettings() {
  const { profileId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Modal State (Create or Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingShare, setEditingShare] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Module filter state inside modal
  const [activeCategory, setActiveCategory] = useState('All');
  const [moduleSearch, setModuleSearch] = useState('');

  const [formData, setFormData] = useState({
    shareType: 'PUBLIC_LINK',
    accessLevel: 'VIEW_ONLY',
    modulePermissions: {},
    email: '',
    passcode: '',
    clearPasscode: false,
    status: 'active',
    expiresAt: '',
    watermarkLabel: '',
    allowDataExport: false,
    allowPdfDownload: true,
    modules: AVAILABLE_MODULES.map((m) => m.id),
    dateRangeFrom: '',
    dateRangeTo: '',
    hiddenFields: 'monthlyCTC, settings.bankDetails, pan, gstin',
  });

  useEffect(() => {
    fetchData();
  }, [profileId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profRes, sharesRes] = await Promise.all([
        getMyProfiles(),
        getProfileShares(profileId),
      ]);
      const current = profRes.profiles?.find((p) => p._id === profileId);
      setProfile(current);
      setShares(Array.isArray(sharesRes) ? sharesRes : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile share settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (share) => {
    const origin = window.location.origin;
    const url = `${origin}/shared/${share.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(share._id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenCreate = () => {
    setEditingShare(null);
    setActiveCategory('All');
    setModuleSearch('');
    setFormData({
      shareType: 'PUBLIC_LINK',
      accessLevel: 'VIEW_ONLY',
      modulePermissions: {},
      email: '',
      passcode: '',
      clearPasscode: false,
      status: 'active',
      expiresAt: '',
      watermarkLabel: profile ? `Shared View • ${profile.name}` : 'Shared View',
      allowDataExport: false,
      allowPdfDownload: true,
      modules: AVAILABLE_MODULES.map((m) => m.id),
      dateRangeFrom: '',
      dateRangeTo: '',
      hiddenFields: 'monthlyCTC, settings.bankDetails, pan, gstin',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (share) => {
    setEditingShare(share);
    setActiveCategory('All');
    setModuleSearch('');
    const rules = share.rules || {};
    const modArray = Array.isArray(rules.modules) ? rules.modules : [];

    setFormData({
      shareType: share.shareType || 'PUBLIC_LINK',
      accessLevel: rules.accessLevel || 'VIEW_ONLY',
      modulePermissions: rules.modulePermissions || {},
      email: share.sharedWithEmail || '',
      passcode: '',
      clearPasscode: false,
      status: share.status || 'active',
      expiresAt: formatDateForInput(share.expiresAt),
      watermarkLabel: rules.watermarkLabel || '',
      allowDataExport: Boolean(rules.allowDataExport),
      allowPdfDownload: rules.allowPdfDownload !== false,
      modules: modArray,
      dateRangeFrom: formatDateForInput(rules.dateRange?.from),
      dateRangeTo: formatDateForInput(rules.dateRange?.to),
      hiddenFields: Array.isArray(rules.hiddenFields)
        ? rules.hiddenFields.join(', ')
        : (rules.hiddenFields || 'monthlyCTC, settings.bankDetails, pan, gstin'),
    });
    setShowModal(true);
  };

  const handleRevoke = async (shareId) => {
    if (!window.confirm('Are you sure you want to revoke this share? Anyone using this link will immediately lose access.')) {
      return;
    }
    try {
      await revokeProfileShare(profileId, shareId);
      setSuccessMsg('Share revoked successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke share');
    }
  };

  const isModuleSelected = (modId) => {
    if (formData.modules.includes(modId)) return true;
    if (modId === 'incomes' && formData.modules.includes('income')) return true;
    if (modId === 'financialReports' && formData.modules.includes('reports')) return true;
    return false;
  };

  const handleToggleModule = (modId) => {
    setFormData((prev) => {
      const isSel = isModuleSelected(modId);
      let newMods = [...prev.modules];
      if (isSel) {
        newMods = newMods.filter(
          (m) =>
            m !== modId &&
            !(modId === 'incomes' && m === 'income') &&
            !(modId === 'financialReports' && m === 'reports')
        );
      } else {
        newMods.push(modId);
      }
      return { ...prev, modules: newMods };
    });
  };

  const handleSelectAllModules = () => {
    setFormData((prev) => ({
      ...prev,
      modules: AVAILABLE_MODULES.map((m) => m.id),
    }));
  };

  const handleDeselectAllModules = () => {
    setFormData((prev) => ({
      ...prev,
      modules: [],
    }));
  };

  const handleToggleCategory = (catName) => {
    const catModules = AVAILABLE_MODULES.filter((m) => m.category === catName).map((m) => m.id);
    const allCatSelected = catModules.every((id) => isModuleSelected(id));

    setFormData((prev) => {
      let newMods;
      if (allCatSelected) {
        // Deselect all in category
        newMods = prev.modules.filter((id) => !catModules.includes(id));
      } else {
        // Select all in category
        const toAdd = catModules.filter((id) => !prev.modules.includes(id));
        newMods = [...prev.modules, ...toAdd];
      }
      return { ...prev, modules: newMods };
    });
  };

  const filteredModules = useMemo(() => {
    return AVAILABLE_MODULES.filter((m) => {
      const matchesCat = activeCategory === 'All' || m.category === activeCategory;
      const matchesSearch =
        !moduleSearch.trim() ||
        m.label.toLowerCase().includes(moduleSearch.toLowerCase()) ||
        m.id.toLowerCase().includes(moduleSearch.toLowerCase()) ||
        m.category.toLowerCase().includes(moduleSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, moduleSearch]);

  const getModulePermission = (modId) => {
    if (formData.accessLevel === 'VIEW_ONLY') return 'view';
    return formData.modulePermissions?.[modId] || 'edit';
  };

  const handleSetModulePermission = (modId, perm, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setFormData((prev) => ({
      ...prev,
      modulePermissions: {
        ...prev.modulePermissions,
        [modId]: perm,
      },
    }));
  };

  const handleSetAllModulePermissions = (perm) => {
    const newPerms = {};
    for (const mod of AVAILABLE_MODULES) {
      newPerms[mod.id] = perm;
    }
    setFormData((prev) => ({
      ...prev,
      modulePermissions: newPerms,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const rulesPayload = {
        accessLevel: formData.accessLevel,
        modules: formData.modules,
        modulePermissions: formData.accessLevel === 'CAN_EDIT' ? formData.modulePermissions : {},
        watermarkLabel: formData.watermarkLabel || (profile ? `Shared View • ${profile.name}` : 'Shared View'),
        allowDataExport: Boolean(formData.allowDataExport),
        allowPdfDownload: Boolean(formData.allowPdfDownload),
        hiddenFields: formData.hiddenFields
          ? formData.hiddenFields.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        dateRange: {
          from: formData.dateRangeFrom ? new Date(formData.dateRangeFrom).toISOString() : null,
          to: formData.dateRangeTo ? new Date(formData.dateRangeTo).toISOString() : null,
        },
      };

      if (editingShare) {
        const updatePayload = {
          rules: rulesPayload,
          expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
          status: formData.status,
        };

        if (formData.clearPasscode) {
          updatePayload.passcode = '';
        } else if (formData.passcode && formData.passcode.trim()) {
          updatePayload.passcode = formData.passcode.trim();
        }

        await updateProfileShare(profileId, editingShare._id, updatePayload);
        setSuccessMsg('Share settings updated successfully!');
      } else {
        const createPayload = {
          shareType: formData.shareType,
          email: formData.shareType === 'USER_INVITE' ? formData.email : undefined,
          passcode: formData.passcode ? formData.passcode.trim() : undefined,
          expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
          rules: rulesPayload,
        };

        await createProfileShare(profileId, createPayload);
        setSuccessMsg('Share link created successfully!');
      }

      setShowModal(false);
      setEditingShare(null);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editingShare ? 'update' : 'create'} profile share`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => navigate('/settings?tab=workspaces')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white mb-2 font-medium transition-colors"
          >
            <ArrowLeft size={14} /> Back to Workspaces
          </button>
          <div className="flex items-center gap-3">
            {profile && (
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: profile.color || '#3b82f6' }}
              />
            )}
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {profile ? `${profile.name} — Share Settings` : 'Profile Share Settings'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Create and edit scoped, view-only links with granular module visibility across all {AVAILABLE_MODULES.length} platform modules, expiration, and data redaction rules.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          Create Share Link
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Share Links List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading share links...</div>
        ) : shares.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
            <Share2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No active shares</p>
            <p className="text-xs text-slate-400 mt-1">
              Generate a public link or user invitation to share this workspace securely.
            </p>
          </div>
        ) : (
          shares.map((share) => {
            const isRevoked = share.status === 'revoked';
            const isExpired = share.expiresAt && new Date(share.expiresAt) < new Date();
            const activeStatus = isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active';

            return (
              <div
                key={share._id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        activeStatus === 'Active'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : isExpired
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {activeStatus}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {share.shareType === 'PUBLIC_LINK' ? 'Public Link' : `Invite: ${share.sharedWithEmail}`}
                    </span>
                    {share.rules?.accessLevel === 'CAN_EDIT' ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Edit2 size={11} /> Can Edit
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        <Eye size={11} /> View Only
                      </span>
                    )}
                    {share.hasPasscode && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <Lock size={11} /> Passcode Protected
                      </span>
                    )}
                  </div>

                  {share.token && (
                    <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 max-w-lg border border-slate-200/60 dark:border-slate-800">
                      <span className="truncate">{`${window.location.origin}/shared/${share.token}`}</span>
                      <button
                        onClick={() => handleCopyLink(share)}
                        className="ml-auto text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 flex-shrink-0 font-sans text-xs font-semibold"
                        title="Copy Public Link"
                      >
                        {copiedId === share._id ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedId === share._id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <a
                        href={`${window.location.origin}/shared/${share.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0"
                        title="Open Shared View in New Tab"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {share.accessCount || 0} views
                    </span>
                    {share.expiresAt ? (
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> Expires {new Date(share.expiresAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> No expiration
                      </span>
                    )}
                    {share.rules?.modules && (
                      <span className="flex items-center gap-1">
                        <Layers size={12} /> {share.rules.modules.length} of {AVAILABLE_MODULES.length} modules allowed
                      </span>
                    )}
                    {share.rules?.watermarkLabel && (
                      <span className="truncate max-w-[200px] text-slate-400/80">
                        "{share.rules.watermarkLabel}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: Edit & Revoke */}
                <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
                  <button
                    onClick={() => handleOpenEdit(share)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors shadow-sm"
                  >
                    <Edit2 size={13} className="text-blue-500" />
                    Edit
                  </button>

                  {!isRevoked ? (
                    <button
                      onClick={() => handleRevoke(share._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold transition-colors"
                    >
                      <Trash2 size={13} />
                      Revoke
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleOpenEdit(share);
                        setFormData((prev) => ({ ...prev, status: 'active' }));
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-xs font-semibold transition-colors"
                    >
                      <RotateCcw size={13} />
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Share Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {editingShare ? <Edit2 size={18} /> : <Shield size={18} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingShare ? 'Edit Share Link Settings' : 'Generate Secure View-Only Share'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editingShare
                      ? 'Update permissions, modules, passcode, and expiration for this link.'
                      : 'Configure permissions and generate a secure view link for external access.'}
                  </p>
                </div>
              </div>
            </div>

            {editingShare && editingShare.token && (
              <div className="mb-4 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-between gap-3 text-xs">
                <div className="truncate">
                  <span className="font-semibold text-blue-900 dark:text-blue-300 block mb-0.5">
                    Share Link URL (Unchanged)
                  </span>
                  <span className="font-mono text-slate-600 dark:text-slate-400 truncate block">
                    {`${window.location.origin}/shared/${editingShare.token}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyLink(editingShare)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1 flex-shrink-0 transition-colors"
                >
                  {copiedId === editingShare._id ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedId === editingShare._id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* If editing, show status toggle */}
              {editingShare && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Link Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active (Access Allowed)</option>
                      <option value="revoked">Revoked (Access Blocked)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Share Type
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formData.shareType === 'PUBLIC_LINK' ? 'Public Link' : `Invite: ${formData.email}`}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {!editingShare && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Share Type
                  </label>
                  <select
                    value={formData.shareType}
                    onChange={(e) => setFormData({ ...formData, shareType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PUBLIC_LINK">Public Link (Unauthenticated or Passcode)</option>
                    <option value="USER_INVITE">User Invite (Registered MyBillFlow Account)</option>
                  </select>
                </div>
              )}

              {!editingShare && formData.shareType === 'USER_INVITE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Invitee Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="partner@client.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Access Permission Level (View Only vs Can Edit) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Access Permission Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* View Only Card */}
                  <div
                    onClick={() => setFormData({ ...formData, accessLevel: 'VIEW_ONLY' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      formData.accessLevel === 'VIEW_ONLY'
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl flex-shrink-0 ${
                        formData.accessLevel === 'VIEW_ONLY'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Eye size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">View Only</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Read-Only
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Recipients can view permitted records. Write, create, and delete actions are strictly blocked.
                      </p>
                    </div>
                  </div>

                  {/* Can Edit Card */}
                  <div
                    onClick={() => setFormData({ ...formData, accessLevel: 'CAN_EDIT' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      formData.accessLevel === 'CAN_EDIT'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl flex-shrink-0 ${
                        formData.accessLevel === 'CAN_EDIT'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Edit2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Can Edit</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Collaborator
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Recipients can view, create, and edit records in allowed modules. Super admin & deletion remain guarded.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passcode Protection */}
              {formData.shareType === 'PUBLIC_LINK' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <KeyRound size={14} className="text-amber-500" />
                      Passcode Protection
                    </label>
                    {editingShare?.hasPasscode && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        <Lock size={10} /> Currently Protected
                      </span>
                    )}
                  </div>

                  {editingShare?.hasPasscode && (
                    <label className="flex items-center gap-2 text-xs text-red-500 font-medium cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={formData.clearPasscode}
                        onChange={(e) => setFormData({ ...formData, clearPasscode: e.target.checked })}
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                      />
                      <span>Remove passcode protection (make completely public)</span>
                    </label>
                  )}

                  {!formData.clearPasscode && (
                    <input
                      type="password"
                      placeholder={
                        editingShare?.hasPasscode
                          ? 'Enter new passcode (Leave blank to keep current)'
                          : 'Enter passcode (Leave blank for public access)'
                      }
                      value={formData.passcode}
                      onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              )}

              {/* Expiration & Watermark */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Clear date for link that never expires.
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Watermark / Banner Label
                  </label>
                  <input
                    type="text"
                    placeholder={`Shared View • ${profile?.name || ''}`}
                    value={formData.watermarkLabel}
                    onChange={(e) => setFormData({ ...formData, watermarkLabel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Optional Date Range Restrictions */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Restrict Records by Date Range (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">From Date</label>
                    <input
                      type="date"
                      value={formData.dateRangeFrom}
                      onChange={(e) => setFormData({ ...formData, dateRangeFrom: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">To Date</label>
                    <input
                      type="date"
                      value={formData.dateRangeTo}
                      onChange={(e) => setFormData({ ...formData, dateRangeTo: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Comprehensive Module Visibility Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Allowed Modules ({formData.modules.length} of {AVAILABLE_MODULES.length} selected)
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {formData.accessLevel === 'CAN_EDIT'
                        ? 'Select modules and fine-tune whether collaborators can edit records or only view them.'
                        : 'Granularly grant view-only access across commercial, financial, HR, and reporting modules.'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllModules}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                    >
                      Select All ({AVAILABLE_MODULES.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllModules}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                    >
                      Deselect All
                    </button>
                    {formData.accessLevel === 'CAN_EDIT' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSetAllModulePermissions('edit')}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                          title="Set all selected modules to Can Edit"
                        >
                          All Can Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllModulePermissions('view')}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors"
                          title="Set all selected modules to View Only"
                        >
                          All View Only
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search modules..."
                      value={moduleSearch}
                      onChange={(e) => setModuleSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {MODULE_CATEGORIES.map((cat) => {
                      const isActive = activeCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setActiveCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {filteredModules.map((mod) => {
                    const isChecked = isModuleSelected(mod.id);
                    const isModEdit = formData.accessLevel === 'CAN_EDIT' && getModulePermission(mod.id) === 'edit';
                    return (
                      <div
                        key={mod.id}
                        onClick={() => handleToggleModule(mod.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all flex flex-col justify-between gap-2 ${
                          isChecked
                            ? isModEdit
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 shadow-xs'
                              : 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by container click
                            className={`mt-0.5 rounded border-slate-300 pointer-events-none ${
                              isModEdit ? 'text-emerald-600 focus:ring-emerald-500' : 'text-blue-600 focus:ring-blue-500'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold truncate">{mod.label}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{mod.desc}</div>
                          </div>
                        </div>

                        {isChecked && formData.accessLevel === 'CAN_EDIT' && (
                          <div
                            className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] text-slate-400 font-medium">Access:</span>
                            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-semibold">
                              <button
                                type="button"
                                onClick={(e) => handleSetModulePermission(mod.id, 'edit', e)}
                                className={`px-2 py-0.5 rounded-md transition-colors ${
                                  getModulePermission(mod.id) === 'edit'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                              >
                                Can Edit
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleSetModulePermission(mod.id, 'view', e)}
                                className={`px-2 py-0.5 rounded-md transition-colors ${
                                  getModulePermission(mod.id) === 'view'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                              >
                                View Only
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Redacted Fields */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Redacted Fields (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.hiddenFields}
                  onChange={(e) => setFormData({ ...formData, hiddenFields: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  These fields will be completely stripped from JSON API responses for this share (e.g., bank details, salary).
                </span>
              </div>

              {/* Export Toggles */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowPdfDownload}
                    onChange={(e) => setFormData({ ...formData, allowPdfDownload: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Allow PDF Downloads</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowDataExport}
                    onChange={(e) => setFormData({ ...formData, allowDataExport: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Allow CSV/Excel Exports</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingShare(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
                >
                  {submitting ? (
                    'Saving...'
                  ) : editingShare ? (
                    <>
                      <Check size={14} /> Save Changes
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Create Share Link
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
