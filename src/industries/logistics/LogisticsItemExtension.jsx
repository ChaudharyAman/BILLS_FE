import React from 'react';
import { FaShip } from 'react-icons/fa';
import { LOGISTICS_CURRENCIES } from './constants';

/**
 * LogisticsItemExtension
 * 
 * Specialized freight & multi-currency bar for invoice line items.
 * Renders currency dropdown, exchange rate, foreign currency rate, taxable base override,
 * and zero-tax freight exemption toggle.
 */
const LogisticsItemExtension = ({
  item,
  index,
  formData,
  setFormData,
  updateItem,
  isActive = true,
}) => {
  if (!isActive || !formData?.logistics?.enabled) return null;

  return (
    <div
      style={{ gridColumn: '1 / -1' }}
      className="mt-2 pt-2 pb-1.5 px-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-slate-800 dark:to-blue-950/40 rounded-lg border border-blue-200/70 dark:border-blue-900/40 flex flex-wrap items-center gap-3 text-xs"
    >
      <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
        <FaShip className="text-blue-600 dark:text-blue-400 text-xs" />
        <span>Freight & Currency:</span>
      </div>

      {/* Currency */}
      <div className="flex items-center gap-1">
        <span className="text-gray-500 dark:text-slate-400">Currency</span>
        <select
          value={item.currency || 'INR'}
          onChange={(e) => updateItem(index, 'currency', e.target.value)}
          className="border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 font-semibold"
        >
          {LOGISTICS_CURRENCIES.map(curr => (
            <option key={curr.code} value={curr.code}>{curr.label}</option>
          ))}
        </select>
      </div>

      {/* Ex. Rate & Foreign Rate when non-INR */}
      {item.currency && item.currency !== 'INR' && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 dark:text-slate-400">Ex. Rate</span>
            <input
              type="number"
              step="0.0001"
              placeholder="e.g. 96.99"
              value={item.exRate !== undefined ? item.exRate : ''}
              onChange={(e) => {
                const ex = parseFloat(e.target.value) || 0;
                const fRate = parseFloat(item.foreignRate) || 0;
                const newItems = [...formData.items];
                newItems[index] = {
                  ...newItems[index],
                  exRate: ex,
                  rate: fRate > 0 && ex > 0 ? Number((fRate * ex).toFixed(2)) : newItems[index].rate
                };
                setFormData({ ...formData, items: newItems });
              }}
              className="w-20 border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-xs bg-white dark:bg-slate-900 text-right text-gray-900 dark:text-slate-100 font-mono"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 dark:text-slate-400">Foreign Rate ({item.currency})</span>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 250.00"
              value={item.foreignRate !== undefined ? item.foreignRate : ''}
              onChange={(e) => {
                const fRate = parseFloat(e.target.value) || 0;
                const ex = parseFloat(item.exRate) || 1;
                const newItems = [...formData.items];
                newItems[index] = {
                  ...newItems[index],
                  foreignRate: fRate,
                  rate: fRate > 0 && ex > 0 ? Number((fRate * ex).toFixed(2)) : newItems[index].rate
                };
                setFormData({ ...formData, items: newItems });
              }}
              className="w-24 border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-xs bg-white dark:bg-slate-900 text-right text-gray-900 dark:text-slate-100 font-mono"
            />
          </div>
        </>
      )}

      {/* Taxable Amount override */}
      <div className="flex items-center gap-1">
        <span className="text-gray-500 dark:text-slate-400">Taxable Base:</span>
        <input
          type="number"
          step="0.01"
          placeholder={item.isTaxExempt ? '0.00' : 'Auto'}
          value={item.taxableAmount !== undefined && item.taxableAmount !== null ? item.taxableAmount : ''}
          onChange={(e) => {
            const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
            updateItem(index, 'taxableAmount', val);
          }}
          className="w-24 border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-xs bg-white dark:bg-slate-900 text-right text-gray-900 dark:text-slate-100 font-mono"
        />
      </div>

      {/* GST Exemption Checkbox */}
      <label className="flex items-center gap-1.5 cursor-pointer ml-auto text-amber-800 dark:text-amber-300 font-semibold select-none">
        <input
          type="checkbox"
          checked={!!item.isTaxExempt}
          onChange={(e) => {
            const isExempt = e.target.checked;
            const newItems = [...formData.items];
            newItems[index] = {
              ...newItems[index],
              isTaxExempt: isExempt,
              taxRate: isExempt ? 0 : (newItems[index].taxRate || 18),
              taxableAmount: isExempt ? 0 : undefined
            };
            setFormData({ ...formData, items: newItems });
          }}
          className="w-3.5 h-3.5 accent-blue-600 rounded"
        />
        <span>GST Exempt (0% Taxable Freight)</span>
      </label>

      {item.isTaxExempt && (
        <span className="text-[11px] bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
          Zero GST Taxable (SAC {item.hsnCode || '996512'})
        </span>
      )}
    </div>
  );
};

export default LogisticsItemExtension;
