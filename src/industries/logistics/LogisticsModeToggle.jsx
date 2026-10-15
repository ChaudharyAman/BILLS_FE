import React from 'react';
import { FaShip } from 'react-icons/fa';

/**
 * LogisticsModeToggle
 * 
 * Header action button to toggle logistics mode on an invoice.
 * Completely encapsulated inside the logistics industry folder.
 */
const LogisticsModeToggle = ({ isLogisticsIndustry, formData, setFormData }) => {
  if (!isLogisticsIndustry) return null;

  const isEnabled = Boolean(formData.logistics?.enabled);

  return (
    <button
      type="button"
      onClick={() => setFormData(prev => ({
        ...prev,
        logistics: { ...prev.logistics, enabled: !prev.logistics?.enabled }
      }))}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
        isEnabled
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-blue-400'
      }`}
      title="Toggle Logistics & Freight Forwarding Fields"
    >
      <FaShip className={isEnabled ? 'text-white' : 'text-blue-500'} />
      <span>Logistics Mode</span>
      {isEnabled && (
        <span className="ml-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      )}
    </button>
  );
};

export default LogisticsModeToggle;
