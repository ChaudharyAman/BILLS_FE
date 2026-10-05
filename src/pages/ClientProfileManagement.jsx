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
  Star,
  Search,
  List,
  LayoutGrid,
  X,
} from 'lucide-react';
import {
  getMyProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  setDefaultProfile,
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

  // Search & View Mode State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('workspaceViewMode') || 'list';
  });

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('workspaceViewMode', mode);
  };

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
        if (formData.isDefault) {
          setActiveProfileId(editingProfile._id);
          setActiveId(editingProfile._id);
        }
      } else {
        const created = await createProfile(formData);
        setSuccess('Profile created successfully');
        if (formData.isDefault && created?._id) {
          setActiveProfileId(created._id);
          setActiveId(created._id);
        }
      }
      setShowModal(false);
      fetchProfiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
    }
  };

  const handleSetDefault = async (id) => {
    setError('');
    setSuccess('');
    try {
      await setDefaultProfile(id);
      setSuccess('Default workspace updated successfully');
      fetchProfiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set default profile');
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

  const filterProfiles = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(q);
      const codeMatch = p.code?.toLowerCase().includes(q);
      const statusMatch = p.status?.toLowerCase().includes(q);
      const emailMatch = p.ownerEmail?.toLowerCase().includes(q);
      return Boolean(nameMatch || codeMatch || statusMatch || emailMatch);
    });
  };

  const filteredOwned = filterProfiles(ownedProfiles);
  const filteredShared = filterProfiles(sharedProfiles);

  return (
    <div className={embedded ? "space-y-6" : "p-6 max-w-6xl mx-auto space-y-6"}>
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
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} />
            Create Profile
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
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
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} />
            Create Profile
          </button>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Search Bar & View Mode Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/60 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md">
        {/* Search input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspaces by name, code, status..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 dark:focus:ring-teal-500/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end sm:self-auto border border-slate-200/80 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => handleToggleViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="List View"
          >
            <List size={14} />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Grid View"
          >
            <LayoutGrid size={14} />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Owned Profiles Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
            Your Workspaces ({searchQuery ? `${filteredOwned.length} of ${ownedProfiles.length}` : ownedProfiles.length})
          </h2>
          {searchQuery && (
            <span className="text-xs text-slate-500">
              Filtering by &quot;{searchQuery}&quot;
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading profiles...</div>
        ) : ownedProfiles.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
            No profiles found. Click &quot;Create Profile&quot; to get started.
          </div>
        ) : filteredOwned.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 space-y-2">
            <p className="text-sm">No workspaces match &quot;{searchQuery}&quot;</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
            >
              Clear search filter
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* ── LIST VIEW ── */
          <div className="space-y-2.5">
            {filteredOwned.map((p) => {
              const isActive = p._id === activeId;
              const initials = (p.name || 'W').trim().slice(0, 2).toUpperCase();
              return (
                <div
                  key={p._id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  {/* Left: Info & Badges */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                      style={{ backgroundColor: p.color || '#3b82f6' }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {p.name}
                        </h3>
                        {p.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {p.code && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                            {p.code}
                          </span>
                        )}
                        <span className={p.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}>
                          ● {p.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions & Switch Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit Profile"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => navigate(`/profiles/${p._id}/shares`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                        title="Share Settings"
                      >
                        <Share2 size={15} />
                      </button>
                      {!p.isDefault && (
                        <button
                          onClick={() => handleSetDefault(p._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                          title="Set as Default Workspace"
                        >
                          <Star size={15} />
                        </button>
                      )}
                      {!p.isDefault && (
                        <button
                          onClick={() => handleDelete(p._id, p.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Delete Profile"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="pl-2 border-l border-slate-200 dark:border-slate-800">
                      {isActive ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                          <Check size={14} /> Active
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSwitch(p)}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-teal-600 hover:text-white dark:bg-slate-800 dark:hover:bg-teal-600 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer shadow-xs"
                        >
                          Switch To
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── GRID VIEW ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOwned.map((p) => {
              const isActive = p._id === activeId;
              return (
                <div
                  key={p._id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-blue-500/5 border-blue-500/50 ring-1 ring-blue-500/40 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-xs'
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit Profile"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => navigate(`/profiles/${p._id}/shares`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                        title="Share Settings"
                      >
                        <Share2 size={15} />
                      </button>
                      {!p.isDefault && (
                        <button
                          onClick={() => handleSetDefault(p._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                          title="Set as Default Workspace"
                        >
                          <Star size={15} />
                        </button>
                      )}
                      {!p.isDefault && (
                        <button
                          onClick={() => handleDelete(p._id, p.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
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
                        className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
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
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
              <ShieldCheck size={16} /> Shared With You ({searchQuery ? `${filteredShared.length} of ${sharedProfiles.length}` : sharedProfiles.length})
            </h2>
          </div>

          {filteredShared.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 text-xs">
              No shared workspaces match &quot;{searchQuery}&quot;
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-2.5">
              {filteredShared.map((p) => {
                const isActive = p._id === activeId;
                const initials = (p.name || 'S').trim().slice(0, 2).toUpperCase();
                return (
                  <div
                    key={p._id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                        style={{ backgroundColor: p.color || '#f59e0b' }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                            {p.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                            View Only
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Owner: {p.ownerEmail || 'Collaborator'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 italic">Read-only share</span>
                      {isActive ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                          <Check size={14} /> Active
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSwitch(p)}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white rounded-xl transition-all cursor-pointer shadow-xs"
                        >
                          Switch To
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShared.map((p) => {
                const isActive = p._id === activeId;
                return (
                  <div
                    key={p._id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-amber-500/5 border-amber-500/50 ring-1 ring-amber-500/40 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
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
                          className="px-3 py-1 text-xs font-semibold bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-lg transition-colors cursor-pointer"
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
