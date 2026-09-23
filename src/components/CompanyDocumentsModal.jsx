import React from 'react';
import * as LucideIcons from 'lucide-react';
import CompanyDocumentsVault from './CompanyDocumentsVault';

export default function CompanyDocumentsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Sticky Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 shadow-xs">
              <LucideIcons.FolderArchive size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Company Documents &amp; Files
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official registration certificates, tax cards, licenses, and banking documents.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
            title="Close"
          >
            <LucideIcons.X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Vault Body */}
        <div className="p-6 overflow-y-auto flex-1 overscroll-contain">
          <CompanyDocumentsVault isCompact={true} />
        </div>
      </div>
    </div>
  );
}
