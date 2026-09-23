import React from 'react';
import { Eye, Edit3, LogOut, ShieldCheck } from 'lucide-react';

export default function ShareBanner() {
  const isShared =
    sessionStorage.getItem('isSharedSession') === 'true' ||
    sessionStorage.getItem('isSharedViewOnly') === 'true' ||
    localStorage.getItem('isSharedViewOnly') === 'true';

  const watermark = sessionStorage.getItem('shareWatermark') || localStorage.getItem('shareWatermark');
  const accessLevel =
    sessionStorage.getItem('shareAccessLevel') ||
    (sessionStorage.getItem('isSharedViewOnly') === 'true' ? 'VIEW_ONLY' : 'VIEW_ONLY');

  const isCanEdit = accessLevel === 'CAN_EDIT';

  if (!isShared) return null;

  const handleExit = () => {
    const shareLinkToken = sessionStorage.getItem('shareLinkToken');
    if (shareLinkToken) {
      sessionStorage.removeItem(`sharePasscode_${shareLinkToken}`);
      sessionStorage.removeItem('shareLinkToken');
    }
    sessionStorage.removeItem('isSharedSession');
    sessionStorage.removeItem('shareAccessLevel');
    sessionStorage.removeItem('isSharedViewOnly');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('activeProfileId');
    sessionStorage.removeItem('shareWatermark');
    sessionStorage.removeItem('shareRules');
    localStorage.removeItem('isSharedViewOnly');
    localStorage.removeItem('shareWatermark');
    window.location.href = '/login';
  };

  if (isCanEdit) {
    return (
      <div className="w-full bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-medium z-30 sticky top-0 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>
            <strong>Collaborator Mode (Can Edit):</strong> You can create and edit records in permitted modules. Sensitive fields and admin operations remain restricted.
          </span>
        </div>
        <div className="flex items-center gap-3">
          {watermark && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-semibold uppercase tracking-wider">
              {watermark}
            </span>
          )}
          <button
            onClick={handleExit}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
            title="Exit Shared Workspace and return to your account"
          >
            <LogOut size={12} />
            <span>Exit Workspace</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-amber-500 dark:text-amber-400 text-xs font-medium z-30 sticky top-0 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
        <span>
          <strong>Shared View-Only Mode:</strong> You are viewing this workspace in read-only mode. Changes, exports, or deletions are restricted.
        </span>
      </div>
      <div className="flex items-center gap-3">
        {watermark && (
          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[11px] font-semibold uppercase tracking-wider">
            {watermark}
          </span>
        )}
        <button
          onClick={handleExit}
          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/30 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          title="Exit Shared View-Only Mode and return to your account"
        >
          <LogOut size={12} />
          <span>Exit Shared View</span>
        </button>
      </div>
    </div>
  );
}
