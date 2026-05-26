import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  FaSave, FaUpload, FaBuilding, FaCog, FaEye, FaEyeSlash,
  FaArrowUp, FaArrowDown, FaUndo, FaCheckCircle, FaChevronDown, FaChevronRight, FaPlus, FaMinus, FaThLarge
} from 'react-icons/fa';
import * as Icons from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import { getSidebarLayout, saveSidebarLayout, resetSidebarLayout } from '../utils/sidebarConfig';

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
    address: { line1: '', city: '', state: '', zip: '' },
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
        } else if (!['logoFile', 'logoUrl', 'signatureFile', 'signatureUrl', '_id', 'createdAt', 'updatedAt', '__v', 'user'].includes(key)) {
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
      };
      if (softData.newPassword) {
        payload.currentPassword = softData.currentPassword;
        payload.newPassword = softData.newPassword;
      }
      await api.put('/auth/profile', payload);
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                  <input type="text" name="address.line1" value={formData.address?.line1 || ''}
                    onChange={handleChange} className={inputCls} />
                </div>
                <div className="grid grid-cols-3 gap-3">
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
                className="w-full rounded-lg overflow-hidden border border-slate-700 flex flex-col h-[520px] shadow-lg shadow-slate-900/10"
                style={{ background: '#1a2e44' }}
              >
                {/* Mini Header */}
                <div className="px-3.5 py-3 border-b border-white/10 flex flex-col">
                  <h1 className="text-[12px] font-bold text-white flex items-center gap-1.5 tracking-wide">
                    <FaThLarge size={11} className="text-blue-400" />
                    Flance
                  </h1>
                  <span className="text-[6px] text-slate-400 font-bold tracking-widest uppercase ml-[17px] mt-[0.5px]">
                    Pro Member
                  </span>
                </div>

                {/* Mini Navigation */}
                <div className="flex-1 py-2 overflow-y-auto no-scrollbar max-h-[440px]">
                  {customLayout.map(section => {
                    if (section.hidden) return null;

                    const visibleItems = section.items.filter(item => !item.hidden);
                    if (visibleItems.length === 0) return null;

                    return (
                      <div key={section.id} className="mb-2">
                        <div className="px-3.5 pt-1.5 pb-[2px] text-[7.5px] font-bold text-slate-400/80 tracking-wider uppercase">
                          {section.title}
                        </div>
                        {visibleItems.map(item => {
                          const IconComp = Icons[item.iconName] || Icons.FaMinus;

                          if (item.type === 'collapsible') {
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between px-3.5 py-1 text-[10px] text-slate-300 font-medium w-full"
                              >
                                <span className="flex items-center gap-1.5">
                                  <IconComp size={9} /> {item.label}
                                  {item.isPremium && (
                                    <span className="text-[6px] font-bold bg-amber-500/20 text-amber-400 px-0.5 rounded uppercase">Pro</span>
                                  )}
                                </span>
                                <FaChevronRight size={7} className="text-slate-500" />
                              </div>
                            );
                          }

                          if (item.isSpecial) {
                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-1.5 px-3.5 py-1 text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 font-bold w-full"
                              >
                                <IconComp size={9} className="text-amber-400" /> {item.label}
                              </div>
                            );
                          }

                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-1.5 px-3.5 py-1 text-[10px] text-slate-300 font-medium w-full"
                            >
                              <IconComp size={9} /> {item.label}
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
    </div>
  );
};

export default Settings;
