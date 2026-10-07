import React from 'react';
import { Eye, Users, LogOut, ArrowRightLeft, ShieldAlert } from 'lucide-react';

const ImpersonationBanner = ({ switchedBy, onOpenSwitcher, onExitSwitch, exiting }) => {
  // Read target user details from storage
  let targetUser = null;
  try {
    // switch_user_target is stored in sessionStorage (tab-scoped, cleared on close)
    const rawTarget = sessionStorage.getItem('switch_user_target');
    if (rawTarget) targetUser = JSON.parse(rawTarget);
    else {
      // Fallback: read from user profile in localStorage (not a secret)
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        targetUser = parsed.user || parsed;
      }
    }
  } catch {}

  const displayName = targetUser?.username || 'Target User';
  const displayEmail = targetUser?.email || '';
  const displayRole = (targetUser?.role || 'user').toUpperCase();
  const masterName = switchedBy?.username || 'Master Admin';

  return (
    <div className="sticky top-0 z-[100] w-full bg-gradient-to-r from-amber-950 via-slate-900 to-purple-950 text-white border-b border-amber-500/40 shadow-xl backdrop-blur-md transition-all duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left identity details */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 flex-shrink-0 animate-pulse">
            <Eye size={15} strokeWidth={2.2} />
          </div>

          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 min-w-0">
            <span className="font-semibold text-amber-200 tracking-wide uppercase text-[10.5px] flex items-center gap-1">
              <ShieldAlert size={12} className="text-amber-400" />
              Impersonation Active:
            </span>
            <span className="font-medium text-slate-100 truncate">
              Viewing as <strong className="text-white font-bold">{displayName}</strong>
              {displayEmail && <span className="text-slate-300 ml-1">({displayEmail})</span>}
            </span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {displayRole}
            </span>
            <span className="text-slate-400 text-[11px] hidden md:inline">
              • Switched by <span className="text-slate-200 font-semibold">{masterName}</span>
            </span>
          </div>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          <button
            onClick={onOpenSwitcher}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 font-medium transition-all duration-150 shadow-sm hover:shadow"
            title="Switch to another user in the system"
          >
            <ArrowRightLeft size={13} strokeWidth={2.2} className="text-amber-400" />
            <span>Switch User</span>
          </button>

          <button
            onClick={onExitSwitch}
            disabled={exiting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white font-semibold transition-all duration-150 shadow-sm hover:shadow hover:bg-red-500 disabled:opacity-50"
            title="Restore Master Admin session"
          >
            <LogOut size={13} strokeWidth={2.2} />
            <span>{exiting ? 'Exiting...' : 'Exit to Master'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ImpersonationBanner;
