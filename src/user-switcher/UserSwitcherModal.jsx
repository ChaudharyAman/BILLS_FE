import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Users,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Lock,
  KeyRound,
} from 'lucide-react';

const UserSwitcherModal = ({
  isOpen,
  onClose,
  users = [],
  loading = false,
  onSwitchUser,
  switchingUserId,
  onRefresh,
  authRequired = false,
  onAuthenticateAsMaster,
  authenticating = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [masterUsername, setMasterUsername] = useState('');
  const [masterPassword, setMasterPassword] = useState('');

  // Read current active user ID from storage
  const currentUserId = useMemo(() => {
    try {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        return parsed.user?._id || parsed._id;
      }
    } catch {}
    return null;
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q));

      const matchRole =
        selectedRole === 'ALL' ||
        (selectedRole === 'ADMIN' && (u.role === 'admin' || u.isOwner)) ||
        (selectedRole === 'USER' && u.role !== 'admin' && !u.isOwner);

      return matchSearch && matchRole;
    });
  }, [users, search, selectedRole]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <Users size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Switch User & Impersonate
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  Master Feature
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantly navigate and view the application as any registered account.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onRefresh && !authRequired && (
              <button
                onClick={onRefresh}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Refresh user list"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close modal"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Secure Authentication Required Screen */}
        {authRequired ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (onAuthenticateAsMaster) {
                onAuthenticateAsMaster({ username: masterUsername.trim(), password: masterPassword });
              }
            }}
            className="p-8 flex flex-col items-center justify-center text-center space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center">
              <Lock size={26} strokeWidth={2} />
            </div>

            <div className="max-w-md space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Master Authentication Required
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your Master Administrator credentials to browse accounts and perform impersonation.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-3 pt-2 text-left">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Master Username or Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="Master username"
                  value={masterUsername}
                  onChange={(e) => setMasterUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Master Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter Master password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <button
                type="submit"
                disabled={authenticating || !masterPassword || !masterUsername.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {authenticating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    <span>Authenticate Master Session</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Filter and Search Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0f172a] space-y-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center gap-1.5 text-xs">
                {['ALL', 'USER', 'ADMIN'].map((roleKey) => (
                  <button
                    key={roleKey}
                    onClick={() => setSelectedRole(roleKey)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all duration-150 text-[11px] ${
                      selectedRole === roleKey
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {roleKey === 'ALL'
                      ? `All Accounts (${users.length})`
                      : roleKey === 'ADMIN'
                      ? 'Admins / Owners'
                      : 'Standard Users'}
                  </button>
                ))}
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[50vh] divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw size={24} className="animate-spin text-blue-500" />
                  <p className="text-xs">Loading registered users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">No users found</p>
                  <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search criteria</p>
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = String(u._id) === String(currentUserId);
                  const isTargetSwitching = switchingUserId === u._id;
                  const isSuper = u.role === 'superadmin';
                  const isPro = u.subscription?.plan === 'pro';

                  return (
                    <div
                      key={u._id}
                      className={`pt-2 pb-2 px-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                        isCurrent
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* User info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold uppercase flex-shrink-0 ${
                            isSuper
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {u.username?.charAt(0) || 'U'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {u.username}
                            </span>

                            {isSuper && (
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center gap-0.5">
                                <Shield size={9} />
                                Admin
                              </span>
                            )}

                            {isPro && (
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center gap-0.5">
                                <Sparkles size={9} />
                                Pro
                              </span>
                            )}

                            {u.isMasterUser && (
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                Master
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-2 mt-0.5">
                            <span>{u.email}</span>
                            {u.phone && <span>• {u.phone}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Action button */}
                      <div className="flex-shrink-0">
                        {isCurrent ? (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => onSwitchUser(u)}
                            disabled={isTargetSwitching || Boolean(switchingUserId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all duration-150 disabled:opacity-50"
                          >
                            {isTargetSwitching ? (
                              <>
                                <RefreshCw size={12} className="animate-spin" />
                                <span>Switching...</span>
                              </>
                            ) : (
                              <>
                                <span>Switch</span>
                                <ArrowRight size={12} strokeWidth={2.2} />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>
                Showing {filteredUsers.length} of {users.length} users
              </span>
              <span className="italic">
                Return to Master User anytime via the top banner.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserSwitcherModal;
