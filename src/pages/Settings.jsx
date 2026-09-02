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

const inputCls = 'w-full border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 p-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors';

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
    avatarFile: null,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // ── Load Company Data ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchSettings = async () => {
      setPageLoading(true);
      try {
        const res = await api.get('/settings');
        const d = res.data || {};
        setFormData({
          companyName: d.companyName || '',
          contactName: d.contactName || '',
          address: {
            line1: d.address?.line1 || '',
            line2: d.address?.line2 || '',
            city: d.address?.city || '',
            state: d.address?.state || '',
            zip: d.address?.zip || '',
            country: d.address?.country || '',
          },
          gstin: d.gstin || '',
          pan: d.pan || '',
          email: d.email || '',
          phone: d.phone || '',
          website: d.website || '',
          logoUrl: d.logoUrl || '',
          signatureUrl: d.signatureUrl || '',
          bankDetails: {
            accountName: d.bankDetails?.accountName || '',
            bankName: d.bankDetails?.bankName || '',
            accountNumber: d.bankDetails?.accountNumber || '',
            branch: d.bankDetails?.branch || '',
            ifscCode: d.bankDetails?.ifscCode || '',
          },
        });
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setPageLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // ── Load User/Software Data ───────────────────────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        const u = res.data?.user || res.data || {};
        setSoftData(prev => ({
          ...prev,
          username: u.username || '',
          email: u.email || '',
          phone: u.phone || '',
          avatar: u.avatar || '',
          avatarPreview: u.avatar || '',
        }));
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    fetchUser();
  }, []);

  // ── Handlers: Company ─────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
    } else if (name.startsWith('bankDetails.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bankDetails: { ...prev.bankDetails, [field]: value },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      setFormData(prev => ({
        ...prev,
        logoFile: file,
        logoUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      setFormData(prev => ({
        ...prev,
        signatureFile: file,
        signatureUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append('companyName', formData.companyName);
      data.append('contactName', formData.contactName);
      data.append('address[line1]', formData.address.line1);
      data.append('address[line2]', formData.address.line2);
      data.append('address[city]', formData.address.city);
      data.append('address[state]', formData.address.state);
      data.append('address[zip]', formData.address.zip);
      data.append('address[country]', formData.address.country);
      data.append('gstin', formData.gstin);
      data.append('pan', formData.pan);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('website', formData.website);
      data.append('bankDetails[accountName]', formData.bankDetails.accountName);
      data.append('bankDetails[bankName]', formData.bankDetails.bankName);
      data.append('bankDetails[accountNumber]', formData.bankDetails.accountNumber);
      data.append('bankDetails[branch]', formData.bankDetails.branch);
      data.append('bankDetails[ifscCode]', formData.bankDetails.ifscCode);

      if (formData.logoFile) {
        data.append('logo', formData.logoFile);
      }
      if (formData.signatureFile) {
        data.append('signature', formData.signatureFile);
      }

      await api.put('/settings', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Company settings saved!');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers: Software / Account ──────────────────────────────────────────
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      setSoftData(prev => ({
        ...prev,
        avatarFile: file,
        avatarPreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleRemoveAvatar = () => {
    setSoftData(prev => ({
      ...prev,
      avatarFile: null,
      avatarPreview: '',
      avatar: '',
    }));
  };

  const handleSoftwareSubmit = async (e) => {
    e.preventDefault();
    if (softData.newPassword && softData.newPassword !== softData.confirmPassword) {
      alert('New password and confirm password do not match.');
      return;
    }
    setSoftLoading(true);
    try {
      const data = new FormData();
      data.append('username', softData.username);
      data.append('email', softData.email);
      data.append('phone', softData.phone);
      if (softData.avatarFile) {
        data.append('avatar', softData.avatarFile);
      } else if (!softData.avatarPreview && !softData.avatar) {
        data.append('removeAvatar', 'true');
      }
      if (softData.currentPassword && softData.newPassword) {
        data.append('currentPassword', softData.currentPassword);
        data.append('newPassword', softData.newPassword);
      }

      const res = await api.put('/auth/updatedetails', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedUser = res.data?.user || res.data;
      if (updatedUser) {
        setSoftData(prev => ({
          ...prev,
          username: updatedUser.username || prev.username,
          email: updatedUser.email || prev.email,
          phone: updatedUser.phone || prev.phone,
          avatar: updatedUser.avatar || '',
          avatarPreview: updatedUser.avatar || '',
          avatarFile: null,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
      }
      alert('Account settings updated successfully!');
    } catch (err) {
      console.error('Error updating account settings:', err);
      alert(err?.response?.data?.message || 'Failed to update account settings.');
    } finally {
      setSoftLoading(false);
    }
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const tabBtn = (t) =>
    `px-5 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${tab === t
      ? 'bg-teal-600 text-white shadow-xs'
      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800'
    }`;

  return (
    <div className="container mx-auto p-6 max-w-5xl font-sans text-slate-900 dark:text-slate-100 min-h-screen transition-colors">

      {/* ── Page Header + Toggle ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          {tab === 'company' && <FaBuilding className="text-teal-600 dark:text-teal-400" size={26} />}
          {tab === 'software' && <FaCog className="text-teal-600 dark:text-teal-400" size={26} />}
          {tab === 'sidebar' && <FaCog className="text-teal-600 dark:text-teal-400" size={26} />}
          {tab === 'portal' && <LucideIcons.Link className="text-teal-600 dark:text-teal-400" size={26} />}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {tab === 'company' && 'Company Settings'}
            {tab === 'software' && 'Software Settings'}
            {tab === 'sidebar' && 'Sidebar Preferences'}
            {tab === 'portal' && 'Public Portal Settings'}
          </h1>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-1 gap-1">
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-8 items-start border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
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
        </div>
      ) : tab === 'company' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 transition-colors">
          <form onSubmit={handleCompanySubmit} className="space-y-6">

            {/* Logo + Core Info */}
            <div className="flex flex-col md:flex-row gap-8 items-start border-b border-slate-100 dark:border-slate-800 pb-6">
              {/* Logo */}
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Company Logo</label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
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
                    <div className="text-center text-slate-400 dark:text-slate-500">
                      <div className="mx-auto w-12 h-12 mb-2 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400">
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">Appears on your invoices.</p>
              </div>

              {/* Signature */}
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Digital Signature</label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
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
                    <div className="text-center text-slate-400 dark:text-slate-500">
                      <div className="mx-auto w-12 h-12 mb-2 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400">
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">Appears on invoice print views.</p>
              </div>

              {/* Fields */}
              <div className="w-full md:w-2/3 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
                  <input type="text" name="companyName" value={formData.companyName}
                    data-testid="settings-company-name"
                    onChange={handleChange} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Name</label>
                  <input type="text" name="contactName" value={formData.contactName}
                    data-testid="settings-contact-name"
                    onChange={handleChange} className={inputCls} placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">GSTIN</label>
                  <input type="text" name="gstin" value={formData.gstin}
                    onChange={handleChange} className={`${inputCls} uppercase`}
                    placeholder="e.g. 29ABCDE1234F1Z5" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Website</label>
                  <input type="text" name="website" value={formData.website}
                    onChange={handleChange} className={inputCls}
                    placeholder="e.g. www.mycompany.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                    <input type="email" name="email" value={formData.email}
                      onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                    <input type="text" name="phone" value={formData.phone}
                      onChange={handleChange} className={inputCls} />
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Address Details</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Street Address Line 1</label>
                    <input type="text" name="address.line1" value={formData.address?.line1 || ''}
                      onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Street Address Line 2</label>
                    <input type="text" name="address.line2" value={formData.address?.line2 || ''}
                      onChange={handleChange} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">City</label>
                    <input type="text" name="address.city" value={formData.address?.city || ''}
                      onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">State</label>
                    <input type="text" name="address.state" value={formData.address?.state || ''}
                      onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Zip Code</label>
                    <input type="text" name="address.zip" value={formData.address?.zip || ''}
                      onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Country</label>
                    <input type="text" name="address.country" value={formData.address?.country || ''}
                      onChange={handleChange} className={inputCls} placeholder="e.g. India" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">🏦 Bank Details</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">These details appear on Invoice, Proforma, and Quote print views.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Holder Name</label>
                  <input type="text" name="bankDetails.accountName" value={formData.bankDetails?.accountName || ''}
                    onChange={handleChange} className={inputCls} placeholder="e.g. My Company Ltd" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                  <input type="text" name="bankDetails.bankName" value={formData.bankDetails?.bankName || ''}
                    onChange={handleChange} className={inputCls} placeholder="e.g. State Bank of India" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
                  <input type="text" name="bankDetails.accountNumber" value={formData.bankDetails?.accountNumber || ''}
                    onChange={handleChange} className={inputCls} placeholder="e.g. 1234567890" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch</label>
                  <input type="text" name="bankDetails.branch" value={formData.bankDetails?.branch || ''}
                    onChange={handleChange} className={inputCls} placeholder="e.g. New Delhi Main Branch" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">IFSC Code</label>
                  <input type="text" name="bankDetails.ifscCode" value={formData.bankDetails?.ifscCode || ''}
                    onChange={handleChange} className={`${inputCls} uppercase`} placeholder="e.g. SBIN0001234" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="submit" disabled={loading}
                data-testid="save-company-settings"
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors disabled:opacity-50 cursor-pointer">
                <FaSave size={18} /> {loading ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SOFTWARE / ACCOUNT SETTINGS ── */}
      {!pageLoading && tab === 'software' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 transition-colors">
          <form onSubmit={handleSoftwareSubmit} className="space-y-6">

            {/* Account Info */}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Account Information</h3>

              {/* Profile Image / Avatar Uploader */}
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
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
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Profile Photo</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                    Upload your profile picture. Recommended square image (PNG, JPG, or WebP up to 5MB).
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2.5">
                    <label
                      htmlFor="avatar-upload-input"
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg shadow-xs cursor-pointer transition-colors inline-flex items-center gap-1.5"
                    >
                      <FaUpload size={12} /> Upload Photo
                    </label>
                    {(softData.avatarPreview || softData.avatar) && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-medium rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <FaTrashAlt size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                  <input type="text" value={softData.username}
                    data-testid="settings-username"
                    onChange={e => setSoftData(p => ({ ...p, username: e.target.value }))}
                    className={inputCls} placeholder="Your login username" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Login Email</label>
                    <input type="email" value={softData.email}
                      data-testid="settings-email"
                      onChange={e => setSoftData(p => ({ ...p, email: e.target.value }))}
                      className={inputCls} placeholder="your@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input type="text" value={softData.phone}
                      data-testid="settings-phone"
                      onChange={e => setSoftData(p => ({ ...p, phone: e.target.value }))}
                      className={inputCls} placeholder="+91 98765 43210" />
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Change Password</h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 mb-4">Leave blank to keep your current password.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                  <div className="relative">
                    <input type={showCurrent ? 'text' : 'password'} value={softData.currentPassword}
                      onChange={e => setSoftData(p => ({ ...p, currentPassword: e.target.value }))}
                      className={inputCls} placeholder="Enter current password" />
                    <button type="button" onClick={() => setShowCurrent(o => !o)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      {showCurrent ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                    <div className="relative">
                      <input type={showNew ? 'text' : 'password'} value={softData.newPassword}
                        onChange={e => setSoftData(p => ({ ...p, newPassword: e.target.value }))}
                        className={inputCls} placeholder="New password" />
                      <button type="button" onClick={() => setShowNew(o => !o)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {showNew ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input type={showConfirm ? 'text' : 'password'} value={softData.confirmPassword}
                        onChange={e => setSoftData(p => ({ ...p, confirmPassword: e.target.value }))}
                        className={`${inputCls} ${softData.confirmPassword && softData.newPassword !== softData.confirmPassword ? 'border-red-400 dark:border-red-500' : ''}`}
                        placeholder="Confirm new password" />
                      <button type="button" onClick={() => setShowConfirm(o => !o)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
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

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="submit" disabled={softLoading}
                data-testid="save-account-settings"
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors disabled:opacity-50 cursor-pointer">
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Configure Sidebar Preferences</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Reorder categories, reorder tabs, or hide sections you don't use.</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetSidebarLayout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors border border-rose-200 dark:border-rose-800 cursor-pointer"
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
                        ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                        : 'bg-gradient-to-r from-teal-500/5 to-transparent border-teal-600/20 dark:border-teal-500/30 shadow-xs'
                    }`}
                  >
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 tracking-wide uppercase">
                          {section.title}
                        </span>
                        {section.hidden && (
                          <span className="text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full">
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
                          className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-30 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 cursor-pointer"
                          title="Move section up"
                        >
                          <FaArrowUp size={11} />
                        </button>
                        <button
                          type="button"
                          disabled={secIdx === customLayout.length - 1}
                          onClick={() => moveSectionDown(secIdx)}
                          className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-30 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 cursor-pointer"
                          title="Move section down"
                        >
                          <FaArrowDown size={11} />
                        </button>
                        {/* Visibility Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(secIdx)}
                          className={`p-1 rounded border transition-colors cursor-pointer ${
                            section.hidden
                              ? 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                              : 'bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400'
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
                              className={`flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-700 shadow-xs transition-all ${
                                item.hidden ? 'opacity-40 border-dashed bg-slate-50 dark:bg-slate-800/50' : 'hover:border-teal-500/30'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 dark:text-slate-500">
                                  <ItemIcon size={13} className={item.isSpecial ? "text-amber-400" : "text-slate-500 dark:text-slate-400"} />
                                </span>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
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
                                  className="text-[10px] border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 focus:outline-none max-w-[110px] truncate cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-700 mr-1"
                                  title="Move to another heading"
                                >
                                  {customLayout.map(s => (
                                    <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                                      Heading: {s.title}
                                    </option>
                                  ))}
                                </select>

                                {/* Item Up/Down Arrows */}
                                <button
                                  type="button"
                                  disabled={itemIdx === 0}
                                  onClick={() => moveItemUp(secIdx, itemIdx)}
                                  className="p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-20 cursor-pointer"
                                  title="Move item up"
                                >
                                  <FaArrowUp size={10} />
                                </button>
                                <button
                                  type="button"
                                  disabled={itemIdx === section.items.length - 1}
                                  onClick={() => moveItemDown(secIdx, itemIdx)}
                                  className="p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-20 cursor-pointer"
                                  title="Move item down"
                                >
                                  <FaArrowDown size={10} />
                                </button>
                                {/* Visibility Toggle */}
                                <button
                                  type="button"
                                  onClick={() => toggleItemVisibility(secIdx, itemIdx)}
                                  className={`p-1 rounded transition-colors cursor-pointer ${
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
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-1">Items inside this section are currently hidden.</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Save Layout Action */}
              <div className="flex justify-end pt-4 mt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveSidebarLayout}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-medium shadow-sm transition-all hover:shadow hover:-translate-y-0.5 cursor-pointer"
                >
                  <FaSave size={18} /> Save Layout Preferences
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Sidebar Preview */}
          <div className="hidden lg:block w-[260px] flex-shrink-0">
            <div className="sticky top-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 transition-colors">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                <FaCheckCircle size={14} className="text-teal-600 dark:text-teal-400" />
                Live Sidebar Preview
              </h4>
              
              {/* Miniature Sidebar Frame */}
              <div
                className="w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col h-[520px] shadow-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                {/* Mini Header */}
                <div className="px-3.5 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 bg-white dark:bg-slate-900">
                  <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white">
                    <LucideIcons.LayoutGrid size={10} strokeWidth={2} />
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-none">
                      Flance
                    </h1>
                    <span className="text-[6.5px] text-blue-600 dark:text-blue-400 font-semibold uppercase mt-0.5">
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
                        <div className="px-3 pt-1.5 pb-[2px] text-[7.5px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
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
                                className="flex items-center justify-between px-2.5 py-1 text-[9.5px] text-slate-700 dark:text-slate-300 font-medium w-full hover:bg-slate-50 dark:hover:bg-slate-800 rounded mx-0.5"
                              >
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <LucideIcons.ChevronRight size={8} strokeWidth={2.2} className="text-slate-400 flex-shrink-0" />
                                  <IconComp size={10} strokeWidth={1.8} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />
                                  <span className="truncate">{item.label}</span>
                                  {item.isPremium && (
                                    <span className="text-[6px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-0.5 rounded uppercase">Pro</span>
                                  )}
                                </span>
                              </div>
                            );
                          }

                          if (item.isSpecial) {
                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200/50 dark:border-amber-800/40 rounded mx-0.5 my-0.5"
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
                              className="flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded mx-0.5 font-normal"
                            >
                              <span className="w-1.5 flex-shrink-0" />
                              <IconComp size={10} strokeWidth={1.8} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center">Preview dynamically shows how the sidebar updates before saving.</p>
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FaLink className="text-teal-600 dark:text-teal-400" /> Public Submission Portal
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Allow vendors, clients, and partners to securely upload invoices, bills, and receipts directly to your inbox without logging in.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Toggle Enable */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">Enable Submission Link</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Toggle public submissions on or off.</span>
          </div>
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
              ${config.enabled ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'}`}
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
            <div className="bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-xl p-4 space-y-3">
              <span className="text-sm font-bold text-teal-800 dark:text-teal-300 block">Your Shareable Submission Link</span>
              {shareableLink ? (
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    readOnly
                    value={shareableLink}
                    className="flex-1 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 rounded-lg px-3 py-2 text-sm text-teal-900 dark:text-teal-200 font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FaCopy /> {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FaSync className={regenerating ? 'animate-spin' : ''} /> Regenerate Link
                  </button>
                </div>
              ) : (
                <p className="text-xs text-teal-700 dark:text-teal-400">Save the settings first to generate your link.</p>
              )}
              <p className="text-xs text-teal-600/90 dark:text-teal-400 flex items-start gap-1">
                <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                Regenerating the link immediately invalidates the old one.
              </p>
            </div>

            {/* Config Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Display Name</label>
                <input
                  type="text"
                  value={config.companyDisplayName}
                  onChange={(e) => setConfig(prev => ({ ...prev, companyDisplayName: e.target.value }))}
                  placeholder="e.g. Acme Corp Inc."
                  required
                  maxLength={200}
                  className={inputCls}
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">This name is visible to public uploaders on the portal landing page.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Submissions per Day</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={config.maxSubmissionsPerDay}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxSubmissionsPerDay: Math.max(1, parseInt(e.target.value, 10) || 0) }))}
                  required
                  className={inputCls}
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Daily submission limit to guard against system abuse.</p>
              </div>
            </div>

            {/* Allowed Categories checkboxes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Allowed Document Categories</label>
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
                      className={`border-2 rounded-xl p-3 text-sm font-medium transition-all text-center cursor-pointer
                        ${checked
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50'
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
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Instructions for Submitters (Optional)</label>
              <textarea
                value={config.instructionsText}
                onChange={(e) => setConfig(prev => ({ ...prev, instructionsText: e.target.value }))}
                placeholder="e.g. Please upload clear scans of your invoices and ensure the GSTIN is visible. If you are a vendor, please select 'Invoice' as the category."
                rows={3}
                maxLength={2000}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs focus:ring-teal-500 focus:border-teal-500 p-2.5 text-sm resize-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Provide clear guidelines that will show at the top of the upload form.</p>
            </div>
          </>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
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

