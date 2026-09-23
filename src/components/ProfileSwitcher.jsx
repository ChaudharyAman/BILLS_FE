import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronsUpDown,
  Check,
  Plus,
  Settings,
  Briefcase,
  Share2,
  User,
  ShieldCheck,
  CheckCircle2,
  FolderArchive
} from 'lucide-react';
import { getMyProfiles, getActiveProfileId, setActiveProfileId } from '../services/clientProfileService';
import CompanyDocumentsModal from './CompanyDocumentsModal';

export default function ProfileSwitcher({ currentUser, isSuperAdmin, isCollapsed, isDark: isDarkProp }) {
  const isDark = typeof isDarkProp === 'boolean'
    ? isDarkProp
    : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isSharedSession =
    sessionStorage.getItem('isSharedSession') === 'true' ||
    sessionStorage.getItem('isSharedViewOnly') === 'true';

  // Fallback to localStorage if currentUser is not passed or hydrating
  const user = React.useMemo(() => {
    if (isSharedSession) {
      return { username: activeProfile?.name || 'Shared Workspace', email: '' };
    }
    if (currentUser?.username) return currentUser;
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.user || parsed;
      }
    } catch {}
    return currentUser || {};
  }, [currentUser, isSharedSession, activeProfile?.name]);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await getMyProfiles();
      const rawProfiles = data.profiles || [];
      const allProfiles = rawProfiles.map((p) => ({
        ...p,
        isShared: Boolean(p.isShared || p.source === 'share' || p.source === 'shared_link'),
      }));
      setProfiles(allProfiles);

      const activeId = getActiveProfileId();
      const current = allProfiles.find((p) => String(p._id) === String(activeId)) || allProfiles.find((p) => p.isDefault) || allProfiles[0] || null;
      setActiveProfile(current);

      if (current && (!activeId || String(activeId) !== String(current._id))) {
        setActiveProfileId(current._id);
      }
    } catch (err) {
      console.error('Failed to load client profiles:', err);
    }
  };

  const handleSelect = (profile) => {
    if (activeProfile?._id === profile._id) {
      setIsOpen(false);
      return;
    }
    setActiveProfileId(profile._id);
    if (profile.isShared || profile.source === 'share' || profile.source === 'shared_link') {
      const isEdit = profile.accessLevel === 'CAN_EDIT';
      sessionStorage.setItem('isSharedSession', 'true');
      sessionStorage.setItem('shareAccessLevel', profile.accessLevel || 'VIEW_ONLY');
      sessionStorage.setItem('isSharedViewOnly', isEdit ? 'false' : 'true');
      if (profile.shareRules) {
        sessionStorage.setItem('shareRules', JSON.stringify(profile.shareRules));
      }
    } else {
      sessionStorage.removeItem('isSharedViewOnly');
      sessionStorage.removeItem('isSharedSession');
      sessionStorage.removeItem('shareAccessLevel');
      sessionStorage.removeItem('shareWatermark');
      sessionStorage.removeItem('shareRules');
      localStorage.removeItem('isSharedViewOnly');
      localStorage.removeItem('shareWatermark');
    }
    setActiveProfile(profile);
    setIsOpen(false);
    window.location.reload();
  };

  const isCurrentProfileShared = Boolean(
    activeProfile && (activeProfile.isShared || activeProfile.source === 'share' || activeProfile.source === 'shared_link')
  );

  const ownedProfiles = profiles.filter((p) => !p.isShared && p.source !== 'share' && p.source !== 'shared_link');
  const sharedProfiles = profiles.filter((p) => p.isShared || p.source === 'share' || p.source === 'shared_link');

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* ── Single Unified User & Profile Card ── */}
      {isSharedSession ? (
        <div
          className={`w-full flex items-center justify-between gap-1.5 rounded-xl border p-2 text-left select-none ${
            isDark
              ? 'bg-slate-900/40 border-slate-800/80'
              : 'bg-slate-50/80 border-slate-200/80'
          }`}
          title={`Shared Workspace: ${activeProfile?.name || 'Shared Profile'}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div
                className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200/40 flex items-center justify-center text-white text-xs font-bold shadow-xs"
                style={{ backgroundColor: activeProfile?.color || '#3b82f6' }}
              >
                <span>{String(activeProfile?.name || 'S').charAt(0).toUpperCase()}</span>
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className={`text-[12px] font-bold truncate leading-tight ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  {activeProfile?.name || 'Shared Workspace'}
                </span>
                <span className="text-[10px] font-semibold truncate text-amber-500">
                  {sessionStorage.getItem('shareAccessLevel') === 'CAN_EDIT' ? 'Collaborator Access' : 'View-Only Access'}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : !isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-1.5 rounded-xl border p-2 transition-all cursor-pointer text-left select-none ${
            isOpen
              ? isDark
                ? 'bg-slate-800/90 border-slate-700 shadow-md'
                : 'bg-slate-100 border-slate-300 shadow-sm'
              : isDark
                ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-800/60'
                : 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/70'
          }`}
          title={`User: ${user?.username || 'User'} • Workspace: ${activeProfile?.name || 'Default'}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200/40 bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{String(user?.username || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0f172a]"
                style={{ backgroundColor: activeProfile?.color || '#3b82f6' }}
                title={`Active Workspace: ${activeProfile?.name || 'Default'}`}
              />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className={`text-[12px] font-bold truncate leading-tight ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}>
                {user?.username || 'User'}
              </span>
              <span className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {user?.email || ''}
              </span>
            </div>
          </div>

          {/* Chevron Sign button */}
          <div
            className={`p-1.5 rounded-lg border transition-all shrink-0 ${
              isOpen
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 shadow-2xs'
            }`}
            title="Switch Workspace Profile"
          >
            <ChevronsUpDown size={13} />
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer ${
            isOpen
              ? isDark
                ? 'bg-slate-800 border-slate-700 shadow-md'
                : 'bg-slate-200 border-slate-300 shadow-sm'
              : isDark
                ? 'hover:bg-slate-800/80 border-transparent'
                : 'hover:bg-slate-100 border-transparent'
          }`}
          title={`User: ${user?.username || 'User'} • Profile: ${activeProfile?.name || 'Default'}`}
        >
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200/40 bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{String(user?.username || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0f172a]"
              style={{ backgroundColor: activeProfile?.color || '#3b82f6' }}
              title={`Active Profile: ${activeProfile?.name || 'Default'}`}
            />
          </div>
        </button>
      )}

      {/* ── Multifunctional Popover Menu ── */}
      {isOpen && !isSharedSession && (
        <div
          className={`absolute ${
            isCollapsed
              ? 'left-full bottom-0 ml-2.5'
              : 'left-0 bottom-full mb-2'
          } w-64 rounded-2xl shadow-2xl border z-50 overflow-hidden text-xs py-2 backdrop-blur-xl ${
            isDark
              ? 'bg-slate-900/95 border-slate-700/80 text-slate-100 shadow-black/80'
              : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/40'
          }`}
        >
          {/* User Details & Identity */}
          <div className={`px-3 pb-2.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className={`font-bold text-sm truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {user?.username || 'User'}
                </span>
                <span className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {user?.email || ''}
                </span>
              </div>
              {isCurrentProfileShared ? (
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase shrink-0 ${
                  activeProfile?.accessLevel === 'CAN_EDIT'
                    ? isDark
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : isDark
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}>
                  {activeProfile?.accessLevel === 'CAN_EDIT' ? 'Collaborator' : 'Shared View'}
                </span>
              ) : isSuperAdmin ? (
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase shrink-0 ${
                  isDark
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-purple-100 text-purple-700 border border-purple-200'
                }`}>
                  Super Admin
                </span>
              ) : (
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase shrink-0 ${
                  isDark
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  {user?.isOwner || activeProfile?.source === 'owner' ? 'Owner' : user?.role || 'Admin'}
                </span>
              )}
            </div>
          </div>

          {/* Workspaces Section */}
          <div className="pt-2">
            <div className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span className="flex items-center gap-1.5">
                <Briefcase size={12} className={isDark ? 'text-slate-400' : 'text-slate-500'} /> Workspaces
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/settings?tab=workspaces');
                }}
                className={`font-semibold flex items-center gap-0.5 cursor-pointer transition-colors ${
                  isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                <Plus size={11} /> New
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto py-1">
              {ownedProfiles.map((p) => {
                const isSelected = activeProfile?._id === p._id;
                return (
                  <button
                    type="button"
                    key={p._id}
                    onClick={() => handleSelect(p)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-blue-600/20 font-semibold text-blue-400'
                          : 'bg-blue-50/80 font-semibold text-blue-600'
                        : isDark
                          ? 'hover:bg-slate-800/80 text-slate-300'
                          : 'hover:bg-slate-100/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color || '#3b82f6' }}
                      />
                      <span className="truncate text-xs">{p.name}</span>
                      {p.code && (
                        <span className={`text-[9.5px] truncate font-mono ${
                          isSelected
                            ? isDark ? 'text-blue-400/80' : 'text-blue-500'
                            : isDark ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          [{p.code}]
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={14} className={`${isDark ? 'text-blue-400' : 'text-blue-600'} shrink-0 ml-2`} />
                    )}
                  </button>
                );
              })}

              {sharedProfiles.length > 0 && (
                <>
                  <div className={`px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border-t mt-1 ${
                    isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'
                  }`}>
                    <Share2 size={11} className={isDark ? 'text-slate-400' : 'text-slate-500'} /> Shared With Me
                  </div>
                  {sharedProfiles.map((p) => {
                    const isSelected = activeProfile?._id === p._id;
                    return (
                      <button
                        type="button"
                        key={p._id}
                        onClick={() => handleSelect(p)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? isDark
                              ? 'bg-amber-600/20 font-semibold text-amber-400'
                              : 'bg-amber-50/80 font-semibold text-amber-700'
                            : isDark
                              ? 'hover:bg-slate-800/80 text-slate-300'
                              : 'hover:bg-slate-100/80 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: p.color || '#f59e0b' }}
                          />
                          <span className="truncate text-xs">{p.name}</span>
                        </div>
                        {isSelected && (
                          <Check size={14} className={`${isDark ? 'text-amber-400' : 'text-amber-600'} shrink-0 ml-2`} />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Quick Settings Links */}
          <div className={`border-t px-1.5 pt-1.5 mt-1 space-y-0.5 ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsDocsModalOpen(true);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors font-medium text-xs ${
                isDark
                  ? 'text-teal-300 hover:text-white hover:bg-slate-800/80'
                  : 'text-teal-700 hover:text-teal-900 hover:bg-teal-50/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderArchive size={14} className={isDark ? 'text-teal-400' : 'text-teal-600'} />
                <span className="font-semibold">Company Documents</span>
              </div>
              <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${
                isDark
                  ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                  : 'bg-teal-100 text-teal-800 border-teal-200'
              }`}>
                Vault
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/settings?tab=workspaces');
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors font-medium text-xs ${
                isDark
                  ? 'text-slate-200 hover:text-white hover:bg-slate-800/80'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Briefcase size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              <span>Manage Workspaces</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/settings?tab=software');
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors font-medium text-xs ${
                isDark
                  ? 'text-slate-200 hover:text-white hover:bg-slate-800/80'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <User size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              <span>Account Settings</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/settings?tab=company');
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors font-medium text-xs ${
                isDark
                  ? 'text-slate-200 hover:text-white hover:bg-slate-800/80'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              <span>Company Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick In-Place Company Documents Modal */}
      <CompanyDocumentsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
      />
    </div>
  );
}
