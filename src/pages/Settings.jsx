import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Save, Upload, Building, Settings as SettingsIcon, Eye, EyeOff } from 'lucide-react';

const inputCls = 'w-full border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 text-sm';

const Settings = () => {
  const [tab, setTab] = useState('company'); // 'company' | 'software'
  const [loading, setLoading] = useState(false);
  const [softLoading, setSoftLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Company Settings ──────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    companyName: '',
    address: { line1: '', city: '', state: '', zip: '' },
    gstin: '',
    email: '',
    phone: '',
    website: '',
    logoUrl: '',
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
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
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

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'address') {
          Object.keys(formData.address).forEach(k => data.append(`address[${k}]`, formData.address[k]));
        } else if (!['logoFile', 'logoUrl', '_id', 'createdAt', 'updatedAt', '__v', 'user'].includes(key)) {
          data.append(key, formData[key]);
        }
      });
      if (formData.logoFile) {
        data.append('logo', formData.logoFile);
      } else if (formData.logoUrl && !formData.logoUrl.startsWith('data:')) {
        data.append('logoUrl', formData.logoUrl);
      }
      const res = await api.put('/settings', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFormData(prev => ({ ...prev, ...res.data, logoFile: null }));
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
    `px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
      tab === t
        ? 'bg-teal-600 text-white shadow-sm'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="container mx-auto p-6 max-w-5xl">

      {/* ── Page Header + Toggle ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {tab === 'company'
            ? <Building className="text-teal-600" size={26} />
            : <SettingsIcon className="text-teal-600" size={26} />}
          <h1 className="text-2xl font-bold text-gray-800">
            {tab === 'company' ? 'Company Settings' : 'Software Settings'}
          </h1>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button type="button" onClick={() => setTab('company')} className={tabBtn('company')}>
            🏢 Company
          </button>
          <button type="button" onClick={() => setTab('software')} className={tabBtn('software')}>
            ⚙️ Software
          </button>
        </div>
      </div>

      {/* ── COMPANY SETTINGS ── */}
      {tab === 'company' && (
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
                        <Upload size={20} />
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

              {/* Fields */}
              <div className="w-full md:w-2/3 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input type="text" name="companyName" value={formData.companyName}
                    onChange={handleChange} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input type="text" name="gstin" value={formData.gstin}
                    onChange={handleChange} className={`${inputCls} uppercase`}
                    placeholder="e.g. 29ABCDE1234F1Z5" />
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

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button type="submit" disabled={loading}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors disabled:opacity-50">
                <Save size={18} /> {loading ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SOFTWARE / ACCOUNT SETTINGS ── */}
      {tab === 'software' && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <form onSubmit={handleSoftwareSubmit} className="space-y-6">

            {/* Account Info */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input type="text" value={softData.username}
                    onChange={e => setSoftData(p => ({ ...p, username: e.target.value }))}
                    className={inputCls} placeholder="Your login username" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Login Email</label>
                    <input type="email" value={softData.email}
                      onChange={e => setSoftData(p => ({ ...p, email: e.target.value }))}
                      className={inputCls} placeholder="your@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input type="text" value={softData.phone}
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
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
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
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
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
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
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
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors disabled:opacity-50">
                <Save size={18} /> {softLoading ? 'Saving…' : 'Save Account Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Settings;
