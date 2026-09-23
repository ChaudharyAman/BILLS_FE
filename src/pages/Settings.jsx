import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import usePermissions from '../hooks/usePermissions';
import ClientProfileManagement from './ClientProfileManagement';
import CompanyDocumentsVault from '../components/CompanyDocumentsVault';

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
  company_documents: LucideIcons.FolderArchive,
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

import toast from 'react-hot-toast';

const inputCls = 'w-full border border-slate-200/90 dark:border-slate-700 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500 p-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all';

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p && ['company', 'software', 'sidebar', 'portal', 'workspaces', 'smtp', 'documents'].includes(p)) return p;
    } catch {
      // fallback
    }
    return 'company';
  });

  useEffect(() => {
    try {
      const p = new URLSearchParams(location.search).get('tab');
      if (p && ['company', 'software', 'sidebar', 'portal', 'workspaces', 'smtp', 'documents'].includes(p)) {
        setTab(prev => (prev !== p ? p : prev));
      }
    } catch {
      // fallback
    }
  }, [location.search]);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [softLoading, setSoftLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── SMTP Email State ──────────────────────────────────────────────────────
  const [smtpData, setSmtpData] = useState({
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromEmail: '',
    fromName: '',
    replyTo: '',
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpPreset, setSmtpPreset] = useState('custom');

  const handleApplyPreset = (presetKey) => {
    setSmtpPreset(presetKey);
    if (presetKey === 'gmail') {
      setSmtpData(prev => ({
        ...prev,
        enabled: true,
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        fromEmail: prev.fromEmail || prev.user || '',
      }));
    } else if (presetKey === 'brevo') {
      setSmtpData(prev => ({
        ...prev,
        enabled: true,
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        fromEmail: prev.fromEmail || prev.user || '',
      }));
    } else if (presetKey === 'office365') {
      setSmtpData(prev => ({
        ...prev,
        enabled: true,
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        fromEmail: prev.fromEmail || prev.user || '',
      }));
    } else {
      setSmtpData(prev => ({
        ...prev,
        host: '',
        port: 587,
        secure: false,
      }));
    }
  };

  const handleSmtpChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setSmtpData(prev => {
      const next = { ...prev, [name]: val };
      if (name === 'port') {
        const numPort = Number(val);
        if (numPort === 465) {
          next.secure = true;
        } else if (numPort === 587 || numPort === 25 || numPort === 2525) {
          next.secure = false;
        }
      }
      return next;
    });
  };

  const handleSaveSmtp = async (e) => {
    if (e) e.preventDefault();
    setSmtpLoading(true);
    try {
      const isEnabled = smtpData.enabled || Boolean(smtpData.host && smtpData.user);
      const payload = {
        smtp: {
          enabled: isEnabled,
          host: (smtpData.host || '').trim(),
          port: Number(smtpData.port) || 587,
          secure: Boolean(smtpData.secure),
          auth: {
            user: (smtpData.user || '').trim(),
            pass: smtpData.pass,
          },
          fromEmail: (smtpData.fromEmail || '').trim(),
          fromName: (smtpData.fromName || '').trim(),
          replyTo: (smtpData.replyTo || '').trim(),
        },
      };
      const res = await api.put('/settings', payload);
      if (res.data?.smtp) {
        setSmtpData(prev => ({
          ...prev,
          enabled: Boolean(res.data.smtp.enabled),
          pass: res.data.smtp.auth?.pass || prev.pass,
        }));
      }

      toast.success('SMTP email settings saved successfully!');
    } catch (err) {
      console.error('Error saving SMTP settings:', err);
      toast.error(err.response?.data?.message || 'Failed to save SMTP settings.');
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    const targetEmail = testRecipient.trim() || formData.email;
    if (!targetEmail) {
      toast.error('Please enter a recipient email for the test.');
      return;
    }
    setTestEmailLoading(true);
    setTestResult(null);
    try {
      const payload = {
        testRecipient: targetEmail,
        host: (smtpData.host || '').trim(),
        port: Number(smtpData.port) || 587,
        secure: Boolean(smtpData.secure),
        user: (smtpData.user || '').trim(),
        pass: smtpData.pass,
        fromEmail: (smtpData.fromEmail || '').trim() || (smtpData.user || '').trim(),
        fromName: (smtpData.fromName || '').trim() || formData.companyName,
        replyTo: (smtpData.replyTo || '').trim(),
      };
      const res = await api.post('/settings/smtp/test', payload);
      setTestResult({ success: true, message: res.data.message });
      toast.success(res.data.message);
    } catch (err) {
      console.error('Error testing SMTP:', err);
      const errMsg = err.response?.data?.message || err.message || 'SMTP connection failed.';
      setTestResult({ success: false, message: errMsg });
      toast.error(errMsg);
    } finally {
      setTestEmailLoading(false);
    }
  };

  // ── Permissions & Scoped Sidebar Preferences ──────────────────────────────
  const { user, can, isModuleEnabled } = usePermissions();
  const isSuperAdmin = user?.role === 'superadmin';

  const isItemPermitted = useCallback((item) => {
    if (!item) return false;
    if (item.isSuperAdmin && !isSuperAdmin) return false;
    if (item.moduleId) {
      if (!isModuleEnabled(item.moduleId)) return false;
      if (can && !can(item.moduleId, 'view')) return false;
    }
    if (item.type === 'collapsible' && Array.isArray(item.children)) {
      return item.children.some(child => isItemPermitted(child));
    }
    return true;
  }, [isSuperAdmin, isModuleEnabled, can]);

  const loadFilteredLayout = useCallback(() => {
    const raw = getSidebarLayout();
    return raw
      .map(sec => ({
        ...sec,
        items: (sec.items || []).filter(isItemPermitted)
      }))
      .filter(sec => sec.items.length > 0);
  }, [isItemPermitted]);

  const [customLayout, setCustomLayout] = useState(() => loadFilteredLayout());

  useEffect(() => {
    const nextLayout = loadFilteredLayout();
    setCustomLayout(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(nextLayout)) {
        return nextLayout;
      }
      return prev;
    });
  }, [loadFilteredLayout]);

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
      setCustomLayout(loadFilteredLayout());
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
    signatureEnabled: true,
    showSignatureOnInvoices: true,
    showSignatureOnQuotes: true,
    showSignatureOnPurchaseOrders: true,
    showLogoOnDocuments: true,
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
          signatureEnabled: d.signatureEnabled !== false,
          showSignatureOnInvoices: d.showSignatureOnInvoices !== false,
          showSignatureOnQuotes: d.showSignatureOnQuotes !== false,
          showSignatureOnPurchaseOrders: d.showSignatureOnPurchaseOrders !== false,
          showLogoOnDocuments: d.showLogoOnDocuments !== false,
          bankDetails: {
            accountName: d.bankDetails?.accountName || '',
            bankName: d.bankDetails?.bankName || '',
            accountNumber: d.bankDetails?.accountNumber || '',
            branch: d.bankDetails?.branch || '',
            ifscCode: d.bankDetails?.ifscCode || '',
          },
        });

        if (d.smtp) {
          setSmtpData({
            enabled: Boolean(d.smtp.enabled),
            host: d.smtp.host || '',
            port: d.smtp.port || 587,
            secure: Boolean(d.smtp.secure),
            user: d.smtp.auth?.user || '',
            pass: d.smtp.auth?.pass || '',
            fromEmail: d.smtp.fromEmail || '',
            fromName: d.smtp.fromName || '',
            replyTo: d.smtp.replyTo || '',
          });
          if (d.smtp.host?.includes('gmail')) setSmtpPreset('gmail');
          else if (d.smtp.host?.includes('brevo')) setSmtpPreset('brevo');
          else if (d.smtp.host?.includes('office365') || d.smtp.host?.includes('outlook')) setSmtpPreset('office365');
          else if (d.smtp.host) setSmtpPreset('custom');
        }
        if (d.email) {
          setTestRecipient(prev => prev || d.email);
        }
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

      data.append('signatureEnabled', formData.signatureEnabled);
      data.append('showSignatureOnInvoices', formData.showSignatureOnInvoices);
      data.append('showSignatureOnQuotes', formData.showSignatureOnQuotes);
      data.append('showSignatureOnPurchaseOrders', formData.showSignatureOnPurchaseOrders);
      data.append('showLogoOnDocuments', formData.showLogoOnDocuments);
      data.append('logoUrl', formData.logoUrl);
      data.append('signatureUrl', formData.signatureUrl);

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

  // ── Tab configuration & Apple Liquid Glass Navigation ─────────────────────
  const SETTINGS_TABS = [
    { id: 'company', label: 'Company', icon: LucideIcons.Building2, testId: 'settings-company-tab' },
    { id: 'documents', label: 'Documents', icon: LucideIcons.FolderArchive, testId: 'settings-documents-tab' },
    { id: 'software', label: 'Software', icon: LucideIcons.SlidersHorizontal, testId: 'settings-software-tab' },
    { id: 'workspaces', label: 'Workspaces', icon: LucideIcons.Briefcase, testId: 'settings-workspaces-tab' },
    { id: 'smtp', label: 'Email / SMTP', icon: LucideIcons.Mail, testId: 'settings-smtp-tab' },
    { id: 'sidebar', label: 'Sidebar Layout', icon: LucideIcons.PanelLeft, testId: 'settings-sidebar-tab' },
  ];

  const TAB_METADATA = {
    company: {
      title: 'Company Settings',
      subtitle: 'Manage legal identity, GSTIN/PAN, bank accounts, and invoice branding',
      icon: LucideIcons.Building2,
    },
    documents: {
      title: 'Company Documents Vault',
      subtitle: 'Store and organize official company registration, tax, banking, license, and legal records',
      icon: LucideIcons.FolderArchive,
    },
    software: {
      title: 'Software Settings',
      subtitle: 'Manage login credentials, profile security, avatar, and account preferences',
      icon: LucideIcons.SlidersHorizontal,
    },
    workspaces: {
      title: 'Workspaces & Client Profiles',
      subtitle: 'Manage multi-tenant workspaces, data isolation, and view-only share links',
      icon: LucideIcons.Briefcase,
    },
    smtp: {
      title: 'Email & SMTP Settings',
      subtitle: 'Configure custom outgoing mail servers for invoices, quotes, and payslips',
      icon: LucideIcons.Mail,
    },
    sidebar: {
      title: 'Sidebar Preferences',
      subtitle: 'Customize navigation items, collapsible sections, and layout order',
      icon: LucideIcons.PanelLeft,
    },
    portal: {
      title: 'Public Portal Settings',
      subtitle: 'Shareable links for external vendor and client bill submissions',
      icon: LucideIcons.Globe,
    },
  };

  const currentMeta = TAB_METADATA[tab] || TAB_METADATA.company;
  const HeaderIcon = currentMeta.icon;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl font-sans text-slate-900 dark:text-slate-100 min-h-screen transition-colors">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/15 via-white/80 to-white/30 dark:from-teal-500/25 dark:via-slate-800/80 dark:to-slate-800/30 backdrop-blur-2xl border border-teal-500/20 dark:border-white/10 shadow-[0_8px_24px_-6px_rgba(20,184,166,0.2),inset_0_1px_2px_rgba(255,255,255,0.9)] dark:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.12)] flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <HeaderIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              {currentMeta.title}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ── Apple Liquid Glass Segmented Pill Dock ── */}
      <div className="mb-8 overflow-x-auto no-scrollbar pb-1">
        <div className="inline-flex min-w-full p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 backdrop-blur-2xl backdrop-saturate-150 border border-slate-200/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.06)] items-center gap-1.5">
          {SETTINGS_TABS.map((t) => {
            const TabIcon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); navigate(`/settings?tab=${t.id}`, { replace: true }); }}
                data-testid={t.testId}
                className={`flex-1 min-w-[110px] sm:min-w-0 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer select-none ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] border border-slate-200/90 dark:border-white/10 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <TabIcon
                  size={16}
                  className={`transition-colors shrink-0 ${
                    isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>{t.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.8)] shrink-0" />
                )}
              </button>
            );
          })}
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

            {/* ── SECTION 1: BRANDING & DOCUMENT APPEARANCE ── */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Branding & Document Appearance</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure company logo, digital signature, and choose which documents they appear on.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* 1A: Company Logo */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Company Logo</label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-indigo-600 dark:text-indigo-400 select-none">
                      <input
                        type="checkbox"
                        name="showLogoOnDocuments"
                        checked={formData.showLogoOnDocuments}
                        onChange={(e) => setFormData(prev => ({ ...prev, showLogoOnDocuments: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Show on Documents</span>
                    </label>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
                    {formData.logoUrl ? (
                      <div className="relative w-full flex justify-center">
                        <img src={formData.logoUrl} alt="Logo" className="max-h-32 object-contain" />
                        <button type="button"
                          onClick={() => setFormData(prev => ({ ...prev, logoUrl: '', logoFile: null }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 cursor-pointer">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 dark:text-slate-500">
                        <div className="mx-auto w-12 h-12 mb-2 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <FaUpload size={20} />
                        </div>
                        <span className="text-xs font-medium">Click to upload logo</span>
                        <span className="block text-[10px] mt-1 text-slate-400">(Max 5MB • PNG, JPG, WebP)</span>
                      </div>
                    )}
                    <input type="file" accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleLogoUpload} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    {formData.showLogoOnDocuments ? '✓ Appears on invoices, quotes & purchase orders' : '✕ Hidden on printed documents'}
                  </p>
                </div>

                {/* 1B: Digital Signature */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Digital Signature</label>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Authorised Signatory</span>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
                    {formData.signatureUrl ? (
                      <div className="relative w-full flex justify-center">
                        <img src={formData.signatureUrl} alt="Signature" className="max-h-32 object-contain" />
                        <button type="button"
                          onClick={() => setFormData(prev => ({ ...prev, signatureUrl: '', signatureFile: null }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 cursor-pointer">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 dark:text-slate-500">
                        <div className="mx-auto w-12 h-12 mb-2 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <FaUpload size={20} />
                        </div>
                        <span className="text-xs font-medium">Upload Signature</span>
                        <span className="block text-[10px] mt-1 text-slate-400">(Max 5MB • PNG, JPG, WebP)</span>
                      </div>
                    )}
                    <input type="file" accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleSignatureUpload} />
                  </div>

                  {/* Document Choice Controls */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Show Signature On Documents:
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, signatureEnabled: !prev.signatureEnabled }))}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                          formData.signatureEnabled
                            ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${formData.signatureEnabled ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                        {formData.signatureEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {formData.signatureEnabled ? (
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Select which documents show your uploaded signature:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                            formData.showSignatureOnInvoices
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-semibold shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={formData.showSignatureOnInvoices}
                              onChange={(e) => setFormData(prev => ({ ...prev, showSignatureOnInvoices: e.target.checked }))}
                              className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>Invoices</span>
                          </label>

                          <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                            formData.showSignatureOnQuotes
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-semibold shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={formData.showSignatureOnQuotes}
                              onChange={(e) => setFormData(prev => ({ ...prev, showSignatureOnQuotes: e.target.checked }))}
                              className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>Quotes</span>
                          </label>

                          <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                            formData.showSignatureOnPurchaseOrders
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-semibold shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={formData.showSignatureOnPurchaseOrders}
                              onChange={(e) => setFormData(prev => ({ ...prev, showSignatureOnPurchaseOrders: e.target.checked }))}
                              className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>Purchase Orders</span>
                          </label>
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 pt-0.5 font-medium">
                          ✓ Uploaded signature image will appear above &quot;Authorised Signatory&quot; on selected documents.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-3 bg-white dark:bg-slate-900/60 text-center space-y-1">
                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Digitally Signed Document
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          This is a computer generated tax invoice, digitally signed, and does not require a physical signature
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 2: COMPANY INFORMATION ── */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Company Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">PAN</label>
                  <input type="text" name="pan" value={formData.pan}
                    onChange={handleChange} className={`${inputCls} uppercase`}
                    placeholder="e.g. ABCDE1234F" />
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
              {customLayout.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="text-sm font-medium">No enabled navigation items available to configure.</p>
                </div>
              ) : (
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
                        section.items.length > 0 ? (
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
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                            No items in this section. Move tabs here or hide this section.
                          </p>
                        )
                      ) : (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-1">Items inside this section are currently hidden.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

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
      {/* ── PUBLIC PORTAL REDIRECT NOTICE ── */}
      {tab === 'portal' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-8 border border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto text-2xl border border-teal-200 dark:border-teal-800">
            <LucideIcons.Link size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Public Submission Portal Has Moved
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Portal link generation, submitter instructions, and allowed categories are now managed directly from your Submissions Inbox.
          </p>
          <div>
            <button
              type="button"
              onClick={() => navigate('/submissions?settings=open')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-all shadow-sm cursor-pointer"
            >
              Open Submissions Inbox Settings
            </button>
          </div>
        </div>
      )}

      {/* ── WORKSPACES & CLIENT PROFILES ── */}
      {tab === 'workspaces' && (
        <ClientProfileManagement embedded={true} />
      )}

      {/* ── COMPANY DOCUMENTS VAULT ── */}
      {tab === 'documents' && (
        <CompanyDocumentsVault hideBanner={true} />
      )}

      {/* ── EMAIL / SMTP SETTINGS ── */}
      {tab === 'smtp' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Main Configuration Card */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/80 dark:border-white/10 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-colors">
            
            {/* Header & Enable Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100/80 dark:border-slate-800/80">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/15 via-white/80 to-white/40 dark:from-teal-500/20 dark:via-slate-800/80 dark:to-slate-800/40 backdrop-blur-xl text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 dark:border-white/10 shadow-[0_4px_16px_rgba(20,184,166,0.15),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] flex-shrink-0">
                  <LucideIcons.Mail size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    SMTP Email Server
                    {smtpData.enabled ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 shadow-xs">
                        Custom Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-500 border border-slate-200/80 dark:border-slate-700/80">
                        Default System Mailer
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Send invoices, payslips, quotes, and receipts directly from your custom domain or SMTP relay.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center bg-white/60 dark:bg-slate-800/50 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                  Enable Custom SMTP
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="enabled"
                    checked={smtpData.enabled}
                    onChange={handleSmtpChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600"></div>
                </label>
              </div>
            </div>

            {/* Provider Quick Presets */}
            <div className="pt-6 pb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Quick Provider Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('gmail')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer backdrop-blur-md ${
                    smtpPreset === 'gmail'
                      ? 'border-teal-500/80 bg-gradient-to-br from-teal-50/90 to-white/90 dark:from-teal-950/40 dark:to-slate-800/80 text-teal-950 dark:text-teal-100 shadow-[0_4px_20px_rgba(20,184,166,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)] ring-1 ring-teal-500/30'
                      : 'border-slate-200/70 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700 bg-white/60 dark:bg-slate-800/40 hover:bg-white/90 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center border border-rose-200/60 dark:border-rose-800/40">
                      <LucideIcons.Mail size={15} className="text-rose-600 dark:text-rose-400" />
                    </div>
                    {smtpPreset === 'gmail' && <LucideIcons.Check size={14} className="text-teal-600 dark:text-teal-400" />}
                  </div>
                  <div className="text-xs font-bold">Gmail / Google</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">smtp.gmail.com:587</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('brevo')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer backdrop-blur-md ${
                    smtpPreset === 'brevo'
                      ? 'border-teal-500/80 bg-gradient-to-br from-teal-50/90 to-white/90 dark:from-teal-950/40 dark:to-slate-800/80 text-teal-950 dark:text-teal-100 shadow-[0_4px_20px_rgba(20,184,166,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)] ring-1 ring-teal-500/30'
                      : 'border-slate-200/70 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700 bg-white/60 dark:bg-slate-800/40 hover:bg-white/90 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center border border-sky-200/60 dark:border-sky-800/40">
                      <LucideIcons.Send size={15} className="text-sky-600 dark:text-sky-400" />
                    </div>
                    {smtpPreset === 'brevo' && <LucideIcons.Check size={14} className="text-teal-600 dark:text-teal-400" />}
                  </div>
                  <div className="text-xs font-bold">Brevo (Sendinblue)</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">smtp-relay.brevo.com:587</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('office365')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer backdrop-blur-md ${
                    smtpPreset === 'office365'
                      ? 'border-teal-500/80 bg-gradient-to-br from-teal-50/90 to-white/90 dark:from-teal-950/40 dark:to-slate-800/80 text-teal-950 dark:text-teal-100 shadow-[0_4px_20px_rgba(20,184,166,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)] ring-1 ring-teal-500/30'
                      : 'border-slate-200/70 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700 bg-white/60 dark:bg-slate-800/40 hover:bg-white/90 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/40">
                      <LucideIcons.Layers size={15} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    {smtpPreset === 'office365' && <LucideIcons.Check size={14} className="text-teal-600 dark:text-teal-400" />}
                  </div>
                  <div className="text-xs font-bold">Microsoft 365</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">smtp.office365.com:587</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('custom')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer backdrop-blur-md ${
                    smtpPreset === 'custom'
                      ? 'border-teal-500/80 bg-gradient-to-br from-teal-50/90 to-white/90 dark:from-teal-950/40 dark:to-slate-800/80 text-teal-950 dark:text-teal-100 shadow-[0_4px_20px_rgba(20,184,166,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)] ring-1 ring-teal-500/30'
                      : 'border-slate-200/70 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700 bg-white/60 dark:bg-slate-800/40 hover:bg-white/90 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center border border-teal-200/60 dark:border-teal-800/40">
                      <LucideIcons.Server size={15} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    {smtpPreset === 'custom' && <LucideIcons.Check size={14} className="text-teal-600 dark:text-teal-400" />}
                  </div>
                  <div className="text-xs font-bold">Custom SMTP</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Custom Host & Port</div>
                </button>
              </div>

              {(smtpPreset === 'gmail' || /gmail|google/i.test(smtpData.host)) && (
                <div className="mt-3 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <LucideIcons.Info size={18} className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-1 leading-relaxed">
                    <strong>Important for Gmail / Google Workspace:</strong> Google does not accept your personal account password on SMTP and will reject it with <em>535 5.7.8 Authentication failed</em>. You must generate a 16-character <strong>App Password</strong>:
                    <ol className="list-decimal ml-4 mt-1 space-y-0.5 font-medium">
                      <li>Go to your Google Account → <strong>Security</strong></li>
                      <li>Verify that <strong>2-Step Verification</strong> is turned ON</li>
                      <li>Click <strong>App passwords</strong> (or search for &quot;App passwords&quot;)</li>
                      <li>Create an app named &quot;Flance Mailer&quot; and copy the 16 letters</li>
                      <li>Paste the code into the password field below (spaces are stripped automatically)</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>


            {/* Server Settings Form */}
            <form onSubmit={handleSaveSmtp} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SMTP Host {smtpData.enabled && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    name="host"
                    value={smtpData.host}
                    onChange={handleSmtpChange}
                    placeholder="e.g. smtp.gmail.com or smtp.mailgun.org"
                    className={inputCls}
                    required={smtpData.enabled}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Port {smtpData.enabled && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    name="port"
                    value={smtpData.port}
                    onChange={handleSmtpChange}
                    placeholder="587"
                    className={inputCls}
                    required={smtpData.enabled}
                  />
                </div>
              </div>

              {/* Encryption & Auth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SMTP Username / Email
                  </label>
                  <input
                    type="text"
                    name="user"
                    value={smtpData.user}
                    onChange={handleSmtpChange}
                    placeholder="your-email@domain.com"
                    className={inputCls}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SMTP Password / App Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSmtpPassword ? 'text' : 'password'}
                      name="pass"
                      value={smtpData.pass}
                      onChange={handleSmtpChange}
                      placeholder={smtpData.pass ? '••••••••' : 'Enter password or app password'}
                      className={`${inputCls} pr-10 font-mono`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showSmtpPassword ? <LucideIcons.EyeOff size={16} /> : <LucideIcons.Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Stored securely with AES-256-GCM encryption at rest. Leave as dots to preserve existing.
                  </p>
                </div>
              </div>

              {/* Security Option */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="smtpSecure"
                  name="secure"
                  checked={smtpData.secure}
                  onChange={handleSmtpChange}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="smtpSecure" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <strong>Use SSL/TLS Connection</strong> (Typically checked for port 465; uncheck for STARTTLS on port 587 or 25)
                </label>
              </div>

              {/* Sender Details */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Sender Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      From Email
                    </label>
                    <input
                      type="email"
                      name="fromEmail"
                      value={smtpData.fromEmail}
                      onChange={handleSmtpChange}
                      placeholder="e.g. billing@company.com"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      From Name (Display Name)
                    </label>
                    <input
                      type="text"
                      name="fromName"
                      value={smtpData.fromName}
                      onChange={handleSmtpChange}
                      placeholder="e.g. Acme Corp Invoicing"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Reply-To Email (Optional)
                    </label>
                    <input
                      type="email"
                      name="replyTo"
                      value={smtpData.replyTo}
                      onChange={handleSmtpChange}
                      placeholder="e.g. support@company.com"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={smtpLoading}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {smtpLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Settings...</span>
                    </>
                  ) : (
                    <>
                      <LucideIcons.Save size={16} />
                      <span>Save SMTP Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Test Email Verification Box */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/80 dark:border-white/10 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-colors">
            <div className="flex items-start gap-3.5 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-white/80 to-white/40 dark:from-emerald-500/20 dark:via-slate-800/80 dark:to-slate-800/40 backdrop-blur-xl text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 dark:border-white/10 shadow-[0_4px_16px_rgba(16,185,129,0.15),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] flex-shrink-0">
                <LucideIcons.Send size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Send Test Verification Email
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirm connection with your mail server and receive a formatted test email to verify credentials before saving.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="Enter recipient email address (e.g. your email)"
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testEmailLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 flex-shrink-0"
              >
                {testEmailLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Verifying & Sending...</span>
                  </>
                ) : (
                  <>
                    <LucideIcons.Send size={15} />
                    <span>Send Test Email</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div
                className={`mt-4 p-4 rounded-xl border flex items-start gap-3 transition-all ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/80 text-red-900 dark:text-red-200'
                }`}
              >
                {testResult.success ? (
                  <LucideIcons.CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <LucideIcons.AlertTriangle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-xs">
                  <div className="font-bold mb-0.5">
                    {testResult.success ? 'Verification Succeeded' : 'Verification Failed'}
                  </div>
                  <div className="opacity-90">{testResult.message}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;

