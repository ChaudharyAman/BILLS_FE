import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Share2,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  getMyProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  getActiveProfileId,
  setActiveProfileId,
} from '../services/clientProfileService';

export default function ClientProfileManagement({ embedded = false }) {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeId, setActiveId] = useState(getActiveProfileId());

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    color: '#3b82f6',
    status: 'ACTIVE',
    isDefault: false,
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMyProfiles();
      setProfiles(res.profiles || []);
      const currentActive = getActiveProfileId();
      if (!currentActive && res.profiles?.length > 0) {
        setActiveProfileId(res.profiles[0]._id);
        setActiveId(res.profiles[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load client profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProfile(null);
    setFormData({
      name: '',
      code: '',
      color: '#3b82f6',
      status: 'ACTIVE',
      isDefault: false,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (profile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      code: profile.code || '',
      color: profile.color || '#3b82f6',
      status: profile.status || 'ACTIVE',
      isDefault: profile.isDefault || false,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingProfile) {
        await updateProfile(editingProfile._id, formData);
        setSuccess('Profile updated successfully');
      } else {
        await createProfile(formData);
        setSuccess('Profile created successfully');
      }
      setShowModal(false);
      fetchProfiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete profile "${name}"? This action cannot be undone.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await deleteProfile(id);
      setSuccess('Profile deleted successfully');
      if (activeId === id) {
        setActiveProfileId(null);
      }
      fetchProfiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete profile');
    }
  };

  const handleSwitch = (profile) => {
    setActiveProfileId(profile._id);
    setActiveId(profile._id);
    if (profile.isShared) {
      sessionStorage.setItem('isSharedViewOnly', 'true');
    } else {
      sessionStorage.removeItem('isSharedViewOnly');
      localStorage.removeItem('isSharedViewOnly');
    }
    window.location.reload();
  };

  const ownedProfiles = profiles.filter((p) => !p.isShared);
  const sharedProfiles = profiles.filter((p) => p.isShared);

  return (
    <div className={embedded ? "space-y-6" : "p-6 max-w-6xl mx-auto"}>
      {/* Header */}
      {embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Workspace Profiles</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage isolated accounts, transactions, and secure view-only profile shares.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus size={16} />
            Create Profile
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-500" />
              Client Profiles & Workspaces
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage isolated accounts, transactions, and secure view-only profile shares.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus size={16} />
            Create Profile
          </button>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Owned Profiles Grid */}
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
          Your Workspaces ({ownedProfiles.length})
        </h2>
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading profiles...</div>
        ) : ownedProfiles.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
            No profiles found. Click "Create Profile" to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedProfiles.map((p) => {
              const isActive = p._id === activeId;
              return (
                <div
                  key={p._id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-blue-500/5 border-blue-500/50 ring-1 ring-blue-500/40 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.color || '#3b82f6' }}
                        />
                        <h3 className="font-semibold text-slate-900 dark:text-white text-base truncate">
                          {p.name}
                        </h3>
                      </div>
                      {p.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                      {p.code && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                          {p.code}
                        </span>
                      )}
                      <span className={p.status === 'ACTIVE' ? 'text-emerald-500' : 'text-slate-400'}>
                        ● {p.status}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Profile"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => navigate(`/profiles/${p._id}/shares`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                        title="Share Settings"
                      >
                        <Share2 size={15} />
                      </button>
                      {!p.isDefault && (
                        <button
                          onClick={() => handleDelete(p._id, p.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete Profile"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {isActive ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <Check size={14} /> Active
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSwitch(p)}
                        className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                      >
                        Switch To
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shared Profiles Section */}
      {sharedProfiles.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-2">
            <ShieldCheck size={16} /> Shared With You ({sharedProfiles.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedProfiles.map((p) => {
              const isActive = p._id === activeId;
              return (
                <div
                  key={p._id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-amber-500/5 border-amber-500/50 ring-1 ring-amber-500/40 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.color || '#f59e0b' }}
                        />
                        <h3 className="font-semibold text-slate-900 dark:text-white text-base truncate">
                          {p.name}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                        View Only
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      Owner: {p.ownerEmail || 'Collaborator'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 italic">Read-only share</span>
                    {isActive ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                        <Check size={14} /> Active
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSwitch(p)}
                        className="px-3 py-1 text-xs font-semibold bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-lg transition-colors"
                      >
                        Switch To
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingProfile ? 'Edit Client Profile' : 'New Client Profile'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Profile Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Acme Studio, APAC Subsidiary"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Profile Code (Optional)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. ACM-01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Theme Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                    />
                    <span className="text-xs font-mono text-slate-500">{formData.color}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isDefault" className="text-xs text-slate-600 dark:text-slate-400">
                  Set as default profile for this account
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors"
                >
                  {editingProfile ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
