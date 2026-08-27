import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  FaSave, FaUpload, FaBuilding, FaCog, FaEye, FaEyeSlash,
  FaArrowUp, FaArrowDown, FaUndo, FaCheckCircle, FaChevronDown, FaChevronRight, FaPlus, FaMinus, FaThLarge,
  FaCamera, FaTrashAlt
} from 'react-icons/fa';
import * as Icons from 'react-icons/fa';
import * as LucideIcons from 'lucide-react';
import Skeleton from '../components/Skeleton';
import { getSidebarLayout, saveSidebarLayout, resetSidebarLayout } from '../utils/sidebarConfig';

const ICON_MAP = {
  dashboard: LucideIcons.Home,
  bank_statement: LucideIcons.Landmark,
  clients: LucideIcons.Users,
  invoices: LucideIcons.FileText,
  quotes_proformas: LucideIcons.ClipboardList,
  incomes: LucideIcons.TrendingUp,
  recurring: LucideIcons.Repeat,
  vendors: LucideIcons.Truck,
  purchase_orders: LucideIcons.ShoppingCart,
  expenses: LucideIcons.Receipt,
  inventory: LucideIcons.ShoppingBag,
  assets: LucideIcons.Landmark,
  projects: LucideIcons.Layers,
  business_units: LucideIcons.Building2,
  payroll_dashboard: LucideIcons.Banknote,
  employees: LucideIcons.Users,
  payroll_process: LucideIcons.Calculator,
  payroll_calculator: LucideIcons.Calculator,
  payroll_reports: LucideIcons.BarChart3,
  payroll_settings: LucideIcons.Settings,
  payroll_portal: LucideIcons.UserCheck,
  budgets: LucideIcons.Scale,
  categories: LucideIcons.Tags,
  liabilities: LucideIcons.CreditCard,
  accounts_group: LucideIcons.Wallet,
  reports_group: LucideIcons.BarChart3,
  submissions_inbox: LucideIcons.Inbox,
  recycle_bin: LucideIcons.Trash2,
  team_settings: LucideIcons.Users,
  upgrade: LucideIcons.Sparkles,
  settings: LucideIcons.Settings,
  admin_panel: LucideIcons.Lock,
  FaThLarge: LucideIcons.Home,
  FaBox: LucideIcons.ShoppingBag,
  FaShoppingCart: LucideIcons.ShoppingCart,
  FaShoppingBag: LucideIcons.ShoppingBag,
  FaClock: LucideIcons.Clock,
  FaUniversity: LucideIcons.Landmark,
  FaLandmark: LucideIcons.Landmark,
  FaUserTie: LucideIcons.UserCheck,
  FaUsers: LucideIcons.Users,
  FaChartBar: LucideIcons.BarChart3,
  FaFolder: LucideIcons.Folder,
  FaFileInvoice: LucideIcons.FileText,
  FaClipboardList: LucideIcons.ClipboardList,
  FaPlus: LucideIcons.TrendingUp,
  FaMinus: LucideIcons.Receipt,
  FaRedo: LucideIcons.Repeat,
  FaTruck: LucideIcons.Truck,
  FaBuilding: LucideIcons.Building2,
  FaProjectDiagram: LucideIcons.Layers,
  FaMoneyBillWave: LucideIcons.Banknote,
  FaCalculator: LucideIcons.Calculator,
  FaBalanceScale: LucideIcons.Scale,
  FaTags: LucideIcons.Tags,
  FaCreditCard: LucideIcons.CreditCard,
  FaWallet: LucideIcons.Wallet,
  FaInbox: LucideIcons.Inbox,
  FaTrash: LucideIcons.Trash2,
  FaStar: LucideIcons.Sparkles,
  FaCog: LucideIcons.Settings,
  FaLock: LucideIcons.Lock
};

const inputCls = 'w-full border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 text-sm';

const Settings = () => {
  const [tab, setTab] = useState('company'); // 'company' | 'software' | 'sidebar'
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [softLoading, setSoftLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Sidebar Preferences Settings ──────────────────────────────────────────
  const [customLayout, setCustomLayout] = useState([]);

  useEffect(() => {
    setCustomLayout(getSidebarLayout());
  }, []);

  const moveSectionUp = (index) => {
    if (index === 0) return;
    const newLayout = [...customLayout];
    const temp = newLayout[index];
    newLayout[index] = newLayout[index - 1];
    newLayout[index - 1] = temp;
    setCustomLayout(newLayout);
  };

  const moveSectionDown = (index) => {
    if (index === customLayout.length - 1) return;
    const newLayout = [...customLayout];
    const temp = newLayout[index];
    newLayout[index] = newLayout[index + 1];
    newLayout[index + 1] = temp;
    setCustomLayout(newLayout);
  };

  const toggleSectionVisibility = (index) => {
    const newLayout = [...customLayout];
    newLayout[index].hidden = !newLayout[index].hidden;
    setCustomLayout(newLayout);
  };

  const moveItemUp = (sectionIndex, itemIndex) => {
    if (itemIndex === 0) return;
    const newLayout = [...customLayout];
    const items = [...newLayout[sectionIndex].items];
    const temp = items[itemIndex];
    items[itemIndex] = items[itemIndex - 1];
    items[itemIndex - 1] = temp;
    newLayout[sectionIndex].items = items;
    setCustomLayout(newLayout);
  };

  const moveItemDown = (sectionIndex, itemIndex) => {
    const newLayout = [...customLayout];
    const items = [...newLayout[sectionIndex].items];
    if (itemIndex === items.length - 1) return;
    const temp = items[itemIndex];
    items[itemIndex] = items[itemIndex + 1];
    items[itemIndex + 1] = temp;
    newLayout[sectionIndex].items = items;
    setCustomLayout(newLayout);
  };

  const toggleItemVisibility = (sectionIndex, itemIndex) => {
    const newLayout = [...customLayout];
    const items = [...newLayout[sectionIndex].items];
    items[itemIndex].hidden = !items[itemIndex].hidden;
    newLayout[sectionIndex].items = items;
    setCustomLayout(newLayout);
  };

  const moveItemToSection = (currentSecIdx, itemIdx, targetSecId) => {
    const targetSecIdx = customLayout.findIndex(s => s.id === targetSecId);
    if (targetSecIdx === -1 || targetSecIdx === currentSecIdx) return;

    const newLayout = [...customLayout];

    const sourceSec = { ...newLayout[currentSecIdx] };
    const sourceItems = [...sourceSec.items];
    const [movedItem] = sourceItems.splice(itemIdx, 1);
    sourceSec.items = sourceItems;
    newLayout[currentSecIdx] = sourceSec;

    const targetSec = { ...newLayout[targetSecIdx] };
    const targetItems = [...targetSec.items];
    targetItems.push(movedItem);
    targetSec.items = targetItems;
    newLayout[targetSecIdx] = targetSec;

    setCustomLayout(newLayout);
  };

  const handleSaveSidebarLayout = () => {
    saveSidebarLayout(customLayout);
    alert('Sidebar layout preferences saved successfully!');
  };

  const handleResetSidebarLayout = () => {
    if (window.confirm('Are you sure you want to reset sidebar layout to default?')) {
      resetSidebarLayout();
      setCustomLayout(getSidebarLayout());
      alert('Sidebar layout reset to defaults!');
    }
  };

  // ── Company Settings ──────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    address: { line1: '', line2: '', city: '', state: '', zip: '', country: '' },
    gstin: '',
    pan: '',
    email: '',
    phone: '',
    website: '',
    logoUrl: '',
    signatureUrl: '',
    bankDetails: {
      accountName: '',
      bankName: '',
      accountNumber: '',
      branch: '',
      ifscCode: '',
    },
  });

  // ── Software / Account Settings ───────────────────────────────────────────
  const [softData, setSoftData] = useState({
    username: '',
    email: '',
    phone: '',
    avatar: '',
    avatarPreview: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data) {
        setFormData(prev => ({
          ...prev, ...res.data,
          address: { ...prev.address, ...(res.data.address || {}) },
        }));
        // Pre-fill software fields from the user object returned in settings
        setSoftData(prev => ({
          ...prev,
          username: res.data.user?.username || '',
          email: res.data.user?.email || '',
          phone: res.data.user?.phone || '',
          avatar: res.data.user?.avatar || '',
          avatarPreview: res.data.user?.avatar || '',
        }));
      }
    } catch (e) { console.error(e); }
    finally { setPageLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('bankDetails.')) {
      const field = name.replace('bankDetails.', '');
      setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, [field]: value } }));
    } else if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }
    setFormData(prev => ({ ...prev, logoFile: file }));
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, logoUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }
    setFormData(prev => ({ ...prev, signatureFile: file }));
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, signatureUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Profile picture must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setSoftData(prev => ({
        ...prev,
        avatar: reader.result,
        avatarPreview: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setSoftData(prev => ({
      ...prev,
      avatar: '',
      avatarPreview: '',
    }));
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'address') {
          Object.keys(formData.address).forEach(k => data.append(`address[${k}]`, formData.address[k]));
        } else if (key === 'bankDetails') {
          Object.keys(formData.bankDetails).forEach(k => data.append(`bankDetails[${k}]`, formData.bankDetails[k] || ''));
        } else if (!['logoFile', 'logoUrl', 'signatureFile', 'signatureUrl', '_id', 'createdAt', 'updatedAt', '__v', 'user', 'integration'].includes(key)) {
          data.append(key, formData[key] || '');
        }
      });
      if (formData.logoFile) {
        data.append('logo', formData.logoFile);
      } else if (formData.logoUrl && !formData.logoUrl.startsWith('data:')) {
        data.append('logoUrl', formData.logoUrl);
      }
      if (formData.signatureFile) {
        data.append('signature', formData.signatureFile);
      } else if (formData.signatureUrl && !formData.signatureUrl.startsWith('data:')) {
        data.append('signatureUrl', formData.signatureUrl);
      }
      const res = await api.put('/settings', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFormData(prev => ({ ...prev, ...res.data, logoFile: null, signatureFile: null }));
      alert('Company settings saved!');
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to save.');
    } finally { setLoading(false); }
  };

  const handleSoftwareSubmit = async (e) => {
    e.preventDefault();
    if (softData.newPassword && softData.newPassword !== softData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    setSoftLoading(true);
    try {
      const payload = {
        username: softData.username,
        email: softData.email,
        phone: softData.phone,
        avatar: softData.avatar,
      };
      if (softData.newPassword) {
        payload.currentPassword = softData.currentPassword;
        payload.newPassword = softData.newPassword;
      }
      const res = await api.put('/auth/profile', payload);
      if (res.data?.user) {
        try {
          const userRaw = localStorage.getItem('user');
          if (userRaw) {
            const parsed = JSON.parse(userRaw);
            parsed.user = { ...parsed.user, ...res.data.user };
            localStorage.setItem('user', JSON.stringify(parsed));
            window.dispatchEvent(new Event('auth-sync'));
          }
        } catch (storageErr) {
          console.error('Failed to sync updated user in storage', storageErr);
        }
      }
      setSoftData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      alert('Account settings updated!');
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update.');
    } finally { setSoftLoading(false); }
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const tabBtn = (t) =>
    `px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${tab === t
      ? 'bg-teal-600 text-white shadow-sm'
      : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="container mx-auto p-6 max-w-5xl">

      {/* ── Page Header + Toggle ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          {tab === 'company' && <FaBuilding className="text-teal-600" size={26} />}
          {tab === 'software' && <FaCog className="text-teal-600" size={26} />}
          {tab === 'sidebar' && <FaCog className="text-teal-600" size={26} />}
          <h1 className="text-2xl font-bold text-gray-800">
            {tab === 'company' && 'Company Settings'}
            {tab === 'software' && 'Software Settings'}
            {tab === 'sidebar' && 'Sidebar Preferences'}
          </h1>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button type="button" onClick={() => setTab('company')} data-testid="settings-company-tab" className={tabBtn('company')}>
            🏢 Company
          </button>
          <button type="button" onClick={() => setTab('software')} data-testid="settings-software-tab" className={tabBtn('software')}>
            ⚙️ Software
          </button>
          <button type="button" onClick={() => setTab('sidebar')} className={tabBtn('sidebar')}>
            🧭 Sidebar Layout
          </button>
          <button type="button" onClick={() => setTab('portal')} className={tabBtn('portal')}>
            🔗 Public Portal
          </button>
        </div>
      </div>

      {/* ── COMPANY SETTINGS ── */}
      {pageLoading ? (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-8 items-start border-b border-gray-100 pb-6 mb-6">
            <div className="w-full md:w-1/3">
              <Skeleton width="100px" height="20px" className="mb-2" />
              <Skeleton width="100%" height="160px" className="rounded-lg" />
            </div>
            <div className="w-full md:w-2/3 space-y-4">
              <div><Skeleton width="120px" height="20px" className="mb-1" /><Skeleton width="100%" height="40px" /></div>
              <div><Skeleton width="80px" height="20px" className="mb-1" /><Skeleton width="100%" height="40px" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Skeleton width="80px" height="20px" className="mb-1" /><Skeleton width="100%" height="40px" /></div>
                <div><Skeleton width="80px" height="20px" className="mb-1" /><Skeleton width="100%" height="40px" /></div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div><Skeleton width="150px" height="24px" className="mb-4" /></div>
            <div><Skeleton width="120px" height="20px" className="mb-1" /><Skeleton width="100%" height="40px" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Skeleton width="80px" height="20px" className="mb-1" /><Skeleton width="100%" height="40px" /></div>
              <div><Skeleton width="80px" height="20px" className="mb-1" /><Skeleton width="100%" height="40px" /></div>
              <div><Skeleton width="80px" height="20px" className="mb-1" /><Skeleton width="100%" height="40px" /></div>
            </div>
          </div>
        </div>
      ) : tab === 'company' && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <form onSubmit={handleCompanySubmit} className="space-y-6">

            {/* Logo + Core Info */}
            <div className="flex flex-col md:flex-row gap-8 items-start border-b border-gray-100 pb-6">
              {/* Logo */}
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center min-h-[160px] bg-gray-50 hover:bg-gray-100 transition-colors relative">
                  {formData.logoUrl ? (
                    <div className="relative w-full flex justify-center">
                      <img src={formData.logoUrl} alt="Logo" className="max-h-32 object-contain" />
                      <button type="button"
                        onClick={() => setFormData(prev => ({ ...prev, logoUrl: '', logoFile: null }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <div className="mx-auto w-12 h-12 mb-2 bg-gray-200 rounded-full flex items-center justify-center">
                        <FaUpload size={20} />
                      </div>
                      <span className="text-xs">Click to upload logo</span>
                      <span className="block text-[10px] mt-1">(Max 5MB)</span>
                    </div>
                  )}
                  <input type="file" accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleLogoUpload} />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Appears on your invoices.</p>
              </div>

              {/* Signature */}
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Digital Signature</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center min-h-[160px] bg-gray-50 hover:bg-gray-100 transition-colors relative">
                  {formData.signatureUrl ? (
                    <div className="relative w-full flex justify-center">
                      <img src={formData.signatureUrl} alt="Signature" className="max-h-32 object-contain" />
                      <button type="button"
                        onClick={() => setFormData(prev => ({ ...prev, signatureUrl: '', signatureFile: null }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <div className="mx-auto w-12 h-12 mb-2 bg-gray-200 rounded-full flex items-center justify-center">
                        <FaUpload size={20} />
                      </div>
                      <span className="text-xs">Upload Signature</span>
                      <span className="block text-[10px] mt-1">(Max 5MB)</span>
                    </div>
                  )}
                  <input type="file" accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleSignatureUpload} />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Appears on invoice print views.</p>
              </div>

              {/* Fields */}
              <div className="w-full md:w-2/3 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input type="text" name="companyName" value={formData.companyName}
                    data-testid="settings-company-name"
                    onChange={handleChange} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input type="text" name="contactName" value={formData.contactName}
                    data-testid="settings-contact-name"
                    onChange={handleChange} className={inputCls} placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input type="text" name="gstin" value={formData.gstin}
                    onChange={handleChange} className={`${inputCls} uppercase`}
                    placeholder="e.g. 29ABCDE1234F1Z5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input type="text" name="website" value={formData.website}
                    onChange={handleChange} className={inputCls}
                    placeholder="e.g. www.mycompany.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" name="email" value={formData.email}
                      onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" name="phone" value={formData.phone}
                      onChange={handleChange} className={inputCls} />
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">Address Details</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address Line 1</label>
                    <input type="text" name="address.line1" value={formData.address?.line1 || ''}
                      onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address Line 2</label>
                    <input type="text" name="address.line2" value={formData.address?.line2 || ''}
                      onChange={handleChange} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input type="text" name="address.city" value={formData.address?.city || ''}
                      onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input type="text" name="address.state" value={formData.address?.state || ''}
                      onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                    <input type="text" name="address.zip" value={formData.address?.zip || ''}
                      onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input type="text" name="address.country" value={formData.address?.country || ''}
                      onChange={handleChange} className={inputCls} placeholder="e.g. India" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">🏦 Bank Details</h3>
              <p className="text-xs text-gray-500 mb-3">These details appear on Invoice, Proforma, and Quote print views.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                  <input type="text" name="bankDetails.accountName" value={formData.bankDetails?.accountName || ''}
                    onChange={handleChange} className={inputCls} placeholder="e.g. My Company Ltd" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input type="text" name="bankDetails.bankName" value={formData.bankDetails?.bankName || ''}
                    onChange={handleChange} className={inputCls} placeholder="e.g. State Bank of India" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input type="text" name="bankDetails.accountNumber" value={formData.bankDetails?.accountNumber || ''}
                    onChange={handleChange} className={inputCls} placeholder="e.g. 1234567890" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <input type="text" name="bankDetails.branch" value={formData.bankDetails?.branch || ''}
                    onChange={handleChange} className={inputCls} placeholder="e.g. New Delhi Main Branch" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input type="text" name="bankDetails.ifscCode" value={formData.bankDetails?.ifscCode || ''}
                    onChange={handleChange} className={`${inputCls} uppercase`} placeholder="e.g. SBIN0001234" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button type="submit" disabled={loading}
                data-testid="save-company-settings"
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors disabled:opacity-50">
                <FaSave size={18} /> {loading ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SOFTWARE / ACCOUNT SETTINGS ── */}
      {!pageLoading && tab === 'software' && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <form onSubmit={handleSoftwareSubmit} className="space-y-6">

            {/* Account Info */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">Account Information</h3>

              {/* Profile Image / Avatar Uploader */}
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {softData.avatarPreview || softData.avatar ? (
                      <img
                        src={softData.avatarPreview || softData.avatar}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{String(softData.username || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload-input"
                    className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-medium"
                    title="Change Profile Photo"
                  >
                    <FaCamera size={14} className="mb-0.5" />
                    <span>Change</span>
                  </label>
                  <input
                    id="avatar-upload-input"
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-sm font-semibold text-slate-800">Profile Photo</h4>
                  <p className="text-xs text-slate-500 mt-0.5 mb-3">
                    Upload your profile picture. Recommended square image (PNG, JPG, or WebP up to 5MB).
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2.5">
                    <label
                      htmlFor="avatar-upload-input"
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:border-teal-500 hover:text-teal-600 text-slate-700 text-xs font-medium rounded-lg shadow-sm cursor-pointer transition-colors inline-flex items-center gap-1.5"
                    >
                      <FaUpload size={12} /> Upload Photo
                    </label>
                    {(softData.avatarPreview || softData.avatar) && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-medium rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
                      >
                        <FaTrashAlt size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input type="text" value={softData.username}
                    data-testid="settings-username"
                    onChange={e => setSoftData(p => ({ ...p, username: e.target.value }))}
                    className={inputCls} placeholder="Your login username" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Login Email</label>
                    <input type="email" value={softData.email}
                      data-testid="settings-email"
                      onChange={e => setSoftData(p => ({ ...p, email: e.target.value }))}
                      className={inputCls} placeholder="your@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input type="text" value={softData.phone}
                      data-testid="settings-phone"
                      onChange={e => setSoftData(p => ({ ...p, phone: e.target.value }))}
                      className={inputCls} placeholder="+91 98765 43210" />
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Change Password</h3>
              <p className="text-xs text-gray-400 mb-4">Leave blank to keep your current password.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <div className="relative">
                    <input type={showCurrent ? 'text' : 'password'} value={softData.currentPassword}
                      onChange={e => setSoftData(p => ({ ...p, currentPassword: e.target.value }))}
                      className={inputCls} placeholder="Enter current password" />
                    <button type="button" onClick={() => setShowCurrent(o => !o)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCurrent ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                      <input type={showNew ? 'text' : 'password'} value={softData.newPassword}
                        onChange={e => setSoftData(p => ({ ...p, newPassword: e.target.value }))}
                        className={inputCls} placeholder="New password" />
                      <button type="button" onClick={() => setShowNew(o => !o)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNew ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input type={showConfirm ? 'text' : 'password'} value={softData.confirmPassword}
                        onChange={e => setSoftData(p => ({ ...p, confirmPassword: e.target.value }))}
                        className={`${inputCls} ${softData.confirmPassword && softData.newPassword !== softData.confirmPassword ? 'border-red-400' : ''}`}
                        placeholder="Confirm new password" />
                      <button type="button" onClick={() => setShowConfirm(o => !o)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                    {softData.confirmPassword && softData.newPassword !== softData.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button type="submit" disabled={softLoading}
                data-testid="save-account-settings"
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors disabled:opacity-50">
                <FaSave size={18} /> {softLoading ? 'Saving…' : 'Save Account Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SIDEBAR SETTINGS ── */}
      {tab === 'sidebar' && (
        <div className="flex flex-col lg:flex-row gap-6 animate-fade-in">
          {/* Left Column: Layout Editor */}
          <div className="flex-1 space-y-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Configure Sidebar Preferences</h3>
                  <p className="text-xs text-gray-500 mt-1">Reorder categories, reorder tabs, or hide sections you don't use.</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetSidebarLayout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                >
                  <FaUndo size={11} /> Reset Defaults
                </button>
              </div>

              {/* List of Custom Sections */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {customLayout.map((section, secIdx) => (
                  <div
                    key={section.id}
                    className={`p-4 rounded-xl border transition-all ${
                      section.hidden
                        ? 'bg-gray-50/60 border-gray-200 opacity-60'
                        : 'bg-gradient-to-r from-teal-500/5 to-transparent border-teal-600/20 shadow-sm'
                    }`}
                  >
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-800 tracking-wide uppercase">
                          {section.title}
                        </span>
                        {section.hidden && (
                          <span className="text-[10px] font-medium bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                            Hidden
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {/* Section Up/Down Arrows */}
                        <button
                          type="button"
                          disabled={secIdx === 0}
                          onClick={() => moveSectionUp(secIdx)}
                          className="p-1 rounded bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors disabled:opacity-30 disabled:hover:bg-white"
                          title="Move section up"
                        >
                          <FaArrowUp size={11} />
                        </button>
                        <button
                          type="button"
                          disabled={secIdx === customLayout.length - 1}
                          onClick={() => moveSectionDown(secIdx)}
                          className="p-1 rounded bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors disabled:opacity-30 disabled:hover:bg-white"
                          title="Move section down"
                        >
                          <FaArrowDown size={11} />
                        </button>
                        {/* Visibility Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(secIdx)}
                          className={`p-1 rounded border transition-colors ${
                            section.hidden
                              ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600'
                              : 'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-600'
                          }`}
                          title={section.hidden ? 'Show category' : 'Hide category'}
                        >
                          {section.hidden ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                        </button>
                      </div>
                    </div>

                    {/* Section Items */}
                    {!section.hidden ? (
                      <div className="space-y-2">
                        {section.items.map((item, itemIdx) => {
                          const ItemIcon = Icons[item.iconName] || Icons.FaMinus;
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 shadow-sm transition-all ${
                                item.hidden ? 'opacity-40 border-dashed bg-gray-50' : 'hover:border-teal-500/30'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">
                                  <ItemIcon size={13} className={item.isSpecial ? "text-amber-400" : "text-gray-500"} />
                                </span>
                                <span className="text-xs font-medium text-gray-700">
                                  {item.label}
                                </span>
                                {item.isPremium && (
                                  <span className="text-[8px] font-bold bg-amber-500/20 text-amber-500 px-1 py-0.5 rounded uppercase">
                                    Pro
                                  </span>
                                )}
                                {item.isSuperAdmin && (
                                  <span className="text-[8px] font-bold bg-red-500/20 text-red-500 px-1 py-0.5 rounded uppercase">
                                    Admin
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                {/* Select Heading Dropdown */}
                                <select
                                  value={section.id}
                                  onChange={(e) => moveItemToSection(secIdx, itemIdx, e.target.value)}
                                  className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50 text-gray-500 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 focus:outline-none max-w-[110px] truncate cursor-pointer transition-all hover:bg-gray-100 mr-1"
                                  title="Move to another heading"
                                >
                                  {customLayout.map(s => (
                                    <option key={s.id} value={s.id}>
                                      Heading: {s.title}
                                    </option>
                                  ))}
                                </select>

                                {/* Item Up/Down Arrows */}
                                <button
                                  type="button"
                                  disabled={itemIdx === 0}
                                  onClick={() => moveItemUp(secIdx, itemIdx)}
                                  className="p-1 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-20"
                                  title="Move item up"
                                >
                                  <FaArrowUp size={10} />
                                </button>
                                <button
                                  type="button"
                                  disabled={itemIdx === section.items.length - 1}
                                  onClick={() => moveItemDown(secIdx, itemIdx)}
                                  className="p-1 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-20"
                                  title="Move item down"
                                >
                                  <FaArrowDown size={10} />
                                </button>
                                {/* Visibility Toggle */}
                                <button
                                  type="button"
                                  onClick={() => toggleItemVisibility(secIdx, itemIdx)}
                                  className={`p-1 rounded transition-colors ${
                                    item.hidden
                                      ? 'text-rose-400 hover:text-rose-600'
                                      : 'text-teal-500 hover:text-teal-700'
                                  }`}
                                  title={item.hidden ? 'Show tab' : 'Hide tab'}
                                >
                                  {item.hidden ? <FaEyeSlash size={11} /> : <FaEye size={11} />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 text-center py-1">Items inside this section are currently hidden.</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Save Layout Action */}
              <div className="flex justify-end pt-4 mt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleSaveSidebarLayout}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
                >
                  <FaSave size={18} /> Save Layout Preferences
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Sidebar Preview */}
          <div className="hidden lg:block w-[260px] flex-shrink-0">
            <div className="sticky top-6 bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                <FaCheckCircle size={14} className="text-teal-600" />
                Live Sidebar Preview
              </h4>
              
              {/* Miniature Sidebar Frame */}
              <div
                className="w-full rounded-lg overflow-hidden border border-slate-200 flex flex-col h-[520px] shadow-md bg-white text-slate-800"
              >
                {/* Mini Header */}
                <div className="px-3.5 py-3 border-b border-slate-200/80 flex items-center gap-1.5 bg-white">
                  <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white">
                    <LucideIcons.LayoutGrid size={10} strokeWidth={2} />
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-[11px] font-bold text-slate-800 leading-none">
                      Flance
                    </h1>
                    <span className="text-[6.5px] text-blue-600 font-semibold uppercase mt-0.5">
                      Pro Plan
                    </span>
                  </div>
                </div>

                {/* Mini Navigation */}
                <div className="flex-1 py-2 overflow-y-auto sidebar-scroll max-h-[440px]">
                  {customLayout.map(section => {
                    if (section.hidden) return null;

                    const visibleItems = section.items.filter(item => !item.hidden);
                    if (visibleItems.length === 0) return null;

                    return (
                      <div key={section.id} className="mb-2">
                        <div className="px-3 pt-1.5 pb-[2px] text-[7.5px] font-bold text-slate-400 tracking-wider uppercase">
                          {section.title}
                        </div>
                        {visibleItems.map(item => {
                          const IconComp =
                            ICON_MAP[item.id] ||
                            ICON_MAP[item.iconName] ||
                            Icons[item.iconName] ||
                            LucideIcons.ShoppingBag;

                          if (item.type === 'collapsible') {
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between px-2.5 py-1 text-[9.5px] text-slate-700 font-medium w-full hover:bg-slate-50 rounded mx-0.5"
                              >
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <LucideIcons.ChevronRight size={8} strokeWidth={2.2} className="text-slate-400 flex-shrink-0" />
                                  <IconComp size={10} strokeWidth={1.8} className="text-slate-500 flex-shrink-0" />
                                  <span className="truncate">{item.label}</span>
                                  {item.isPremium && (
                                    <span className="text-[6px] font-bold bg-amber-100 text-amber-800 px-0.5 rounded uppercase">Pro</span>
                                  )}
                                </span>
                              </div>
                            );
                          }

                          if (item.isSpecial) {
                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 font-semibold border border-amber-200/50 rounded mx-0.5 my-0.5"
                              >
                                <span className="w-1.5 flex-shrink-0" />
                                <IconComp size={10} strokeWidth={1.8} className="text-amber-500 flex-shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] text-slate-700 hover:bg-slate-50 rounded mx-0.5 font-normal"
                            >
                              <span className="w-1.5 flex-shrink-0" />
                              <IconComp size={10} strokeWidth={1.8} className="text-slate-500 flex-shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">Preview dynamically shows how the sidebar updates before saving.</p>
            </div>
          </div>
        </div>
      )}
      {/* ── PUBLIC PORTAL SETTINGS TAB ── */}
      {tab === 'portal' && <PortalSettingsPanel />}

    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Public Submission Portal Settings Panel
// ─────────────────────────────────────────────────────────────────────────────
import { toast } from 'react-hot-toast';
import { FaLink, FaCopy, FaSync, FaInfoCircle } from 'react-icons/fa';

function PortalSettingsPanel() {
  const [config, setConfig] = useState({
    enabled: false,
    portalLink: null,
    token: null,
    companyDisplayName: '',
    allowedCategories: ['invoice', 'expense', 'income', 'purchaseorder'],
    instructionsText: '',
    maxSubmissionsPerDay: 100,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/settings/public-submissions')
      .then((res) => {
        setConfig(res.data);
      })
      .catch((err) => {
        toast.error('Failed to load portal settings');
      })
      .finally(() => setLoading(false));
  }, []);

  const shareableLink = config.token
    ? `${window.location.origin}/submit/${config.token}`
    : config.portalLink;

  const handleCopy = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    toast.success('Portal link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/settings/public-submissions', {
        enabled: config.enabled,
        companyDisplayName: config.companyDisplayName,
        allowedCategories: config.allowedCategories,
        instructionsText: config.instructionsText,
        maxSubmissionsPerDay: config.maxSubmissionsPerDay,
      });
      setConfig(res.data);
      toast.success('Portal settings updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Are you sure you want to regenerate the submission link? The current link will stop working immediately.')) {
      return;
    }
    setRegenerating(true);
    try {
      const res = await api.post('/settings/public-submissions/regenerate-token');
      setConfig(res.data);
      toast.success('New submission link generated');
    } catch (err) {
      toast.error('Failed to regenerate token');
    } finally {
      setRegenerating(false);
    }
  };

  const toggleCategory = (cat) => {
    setConfig(prev => {
      const exists = prev.allowedCategories.includes(cat);
      const updated = exists
        ? prev.allowedCategories.filter(c => c !== cat)
        : [...prev.allowedCategories, cat];
      return { ...prev, allowedCategories: updated };
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded w-full"></div>
          <div className="h-32 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FaLink className="text-teal-600" /> Public Submission Portal
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Allow vendors, clients, and partners to securely upload invoices, bills, and receipts directly to your inbox without logging in.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Toggle Enable */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <span className="text-sm font-semibold text-gray-700 block">Enable Submission Link</span>
            <span className="text-xs text-gray-500">Toggle public submissions on or off.</span>
          </div>
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
              ${config.enabled ? 'bg-teal-600' : 'bg-gray-200'}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                ${config.enabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {config.enabled && (
          <>
            {/* Shareable Link Input */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
              <span className="text-sm font-bold text-teal-800 block">Your Shareable Submission Link</span>
              {shareableLink ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableLink}
                    className="flex-1 bg-white border border-teal-200 rounded-lg px-3 py-2 text-sm text-teal-900 font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="bg-white border border-teal-200 hover:bg-teal-100 text-teal-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <FaCopy /> {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="bg-white border border-teal-200 hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <FaSync className={regenerating ? 'animate-spin' : ''} /> Regenerate Link
                  </button>
                </div>
              ) : (
                <p className="text-xs text-teal-700">Save the settings first to generate your link.</p>
              )}
              <p className="text-xs text-teal-600/90 flex items-start gap-1">
                <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                Regenerating the link immediately invalidates the old one.
              </p>
            </div>

            {/* Config Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Company Display Name</label>
                <input
                  type="text"
                  value={config.companyDisplayName}
                  onChange={(e) => setConfig(prev => ({ ...prev, companyDisplayName: e.target.value }))}
                  placeholder="e.g. Acme Corp Inc."
                  required
                  maxLength={200}
                  className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2.5 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">This name is visible to public uploaders on the portal landing page.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Max Submissions per Day</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={config.maxSubmissionsPerDay}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxSubmissionsPerDay: Math.max(1, parseInt(e.target.value, 10) || 0) }))}
                  required
                  className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2.5 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Daily submission limit to guard against system abuse.</p>
              </div>
            </div>

            {/* Allowed Categories checkboxes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Allowed Document Categories</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'invoice', label: 'Invoice' },
                  { id: 'expense', label: 'Expense / Bill' },
                  { id: 'income', label: 'Income / Receipt' },
                  { id: 'purchaseorder', label: 'Purchase Order' },
                ].map(cat => {
                  const checked = config.allowedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`border-2 rounded-xl p-3 text-sm font-medium transition-all text-center
                        ${checked
                          ? 'border-teal-500 bg-teal-50 text-teal-800'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
              {config.allowedCategories.length === 0 && (
                <p className="text-red-500 text-xs mt-1">Please select at least one document category.</p>
              )}
            </div>

            {/* Instructions Text */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Instructions for Submitters (Optional)</label>
              <textarea
                value={config.instructionsText}
                onChange={(e) => setConfig(prev => ({ ...prev, instructionsText: e.target.value }))}
                placeholder="e.g. Please upload clear scans of your invoices and ensure the GSTIN is visible. If you are a vendor, please select 'Invoice' as the category."
                rows={3}
                maxLength={2000}
                className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2.5 text-sm resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">Provide clear guidelines that will show at the top of the upload form.</p>
            </div>
          </>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving || (config.enabled && config.allowedCategories.length === 0)}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all hover:shadow"
          >
            {saving ? <FaSync className="animate-spin" /> : <FaSave />} Save Portal Settings
          </button>
        </div>
      </form>
    </div>
  );
}

export default Settings;

