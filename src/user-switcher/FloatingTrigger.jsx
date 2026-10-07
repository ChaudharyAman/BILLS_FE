import React from 'react';
import { ArrowRightLeft, Shield } from 'lucide-react';

const FloatingTrigger = ({ onOpenSwitcher, isMasterUser }) => {
  return (
    <div
      id="user-switcher-floating-trigger"
      className="fixed bottom-6 right-6 z-[99999] pointer-events-auto select-none"
    >
      <button
        onClick={onOpenSwitcher}
        type="button"
        className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_15px_30px_-5px_rgba(79,70,229,0.7)] hover:scale-105 active:scale-95 transition-all duration-200 border border-white/30 backdrop-blur-md cursor-pointer"
        title="Switch User & Master Impersonation"
      >
        {/* Glowing pulse ring */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-60 blur-sm group-hover:opacity-100 transition duration-300 animate-pulse pointer-events-none" />

        <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-white shadow-inner">
          <ArrowRightLeft size={13} strokeWidth={2.4} />
        </span>

        <span className="relative tracking-wider font-semibold text-[12.5px]">
          Switch User
        </span>

        <span className="relative text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase shadow-sm">
          {isMasterUser ? 'Master' : 'Admin'}
        </span>
      </button>
    </div>
  );
};

export default FloatingTrigger;
