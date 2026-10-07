import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  FileSpreadsheet,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Eye,
  Check,
  Info,
  Save,
} from 'lucide-react';

const COLUMN_DEFINITIONS = [
  {
    id: 'sno',
    label: 'Serial Number (S.No)',
    description: 'Sequential index numbering for each item row',
    templates: ['modern', 'classic'],
    default: true,
  },
  {
    id: 'name',
    label: 'Item / Product Name',
    description: 'Title and primary name of the product or service',
    templates: ['modern', 'classic'],
    default: true,
  },
  {
    id: 'description',
    label: 'Item Description',
    description: 'Secondary line notes, specifications, or details below item name',
    templates: ['modern', 'classic'],
    default: true,
  },
  {
    id: 'hsnSac',
    label: 'HSN / SAC Code',
    description: 'GST Harmonized System of Nomenclature code',
    templates: ['modern', 'classic'],
    default: true,
  },
  {
    id: 'qty',
    label: 'Quantity (Qty)',
    description: 'Billed quantity count for the line item',
    templates: ['modern', 'classic'],
    default: true,
  },
  {
    id: 'unit',
    label: 'Unit of Measure',
    description: 'Measurement unit (e.g., Pcs, Nos, Kg, Hours, Mtr)',
    templates: ['modern', 'classic'],
    default: true,
  },
  {
    id: 'listPrice',
    label: 'List Price / MRP',
    description: 'Original list price or MRP before discount (prominent in Classic template)',
    templates: ['classic'],
    default: false,
  },
  {
    id: 'rate',
    label: 'Unit Price / Rate',
    description: 'Net unit price charged per quantity',
    templates: ['modern', 'classic'],
    default: true,
  },
  {
    id: 'discount',
    label: 'Discount',
    description: 'Discount percentage applied on unit price or line total',
    templates: ['modern', 'classic'],
    default: true,
  },
  {
    id: 'taxableAmount',
    label: 'Taxable Value',
    description: 'Total value before applying GST rates',
    templates: ['modern'],
    default: true,
  },
  {
    id: 'taxBreakdown',
    label: 'Tax Breakdown (CGST / SGST / IGST)',
    description: 'Split tax amount and rate columns in table',
    templates: ['modern'],
    default: true,
  },
  {
    id: 'total',
    label: 'Amount / Line Total',
    description: 'Final calculated line total including discounts and applicable taxes',
    templates: ['modern', 'classic'],
    default: true,
  },
];

const PRESETS = {
  all: {
    label: 'All Columns',
    columns: {
      sno: true, name: true, description: true, hsnSac: true,
      qty: true, unit: true, listPrice: true, rate: true,
      discount: true, taxableAmount: true, taxBreakdown: true, total: true,
    },
  },
  standardGst: {
    label: 'Standard GST',
    columns: {
      sno: true, name: true, description: true, hsnSac: true,
      qty: true, unit: true, listPrice: false, rate: true,
      discount: true, taxableAmount: true, taxBreakdown: true, total: true,
    },
  },
  minimal: {
    label: 'Simple / Compact',
    columns: {
      sno: true, name: true, description: false, hsnSac: false,
      qty: true, unit: false, listPrice: false, rate: true,
      discount: false, taxableAmount: false, taxBreakdown: false, total: true,
    },
  },
  retailMrp: {
    label: 'Retail & MRP',
    columns: {
      sno: true, name: true, description: false, hsnSac: true,
      qty: true, unit: true, listPrice: true, rate: true,
      discount: true, taxableAmount: false, taxBreakdown: false, total: true,
    },
  },
};

const DEFAULT_SETTINGS = {
  defaultTemplate: 'modern',
  columns: {
    sno: true,
    name: true,
    description: true,
    hsnSac: true,
    qty: true,
    unit: true,
    listPrice: false,
    rate: true,
    discount: true,
    taxableAmount: true,
    taxBreakdown: true,
    total: true,
  },
  modernColumns: {
    sno: true,
    name: true,
    description: true,
    hsnSac: true,
    qty: true,
    unit: true,
    rate: true,
    discount: true,
    taxableAmount: true,
    taxBreakdown: true,
    total: true,
  },
  classicColumns: {
    sno: true,
    name: true,
    description: true,
    hsnSac: true,
    qty: true,
    unit: true,
    listPrice: true,
    discount: true,
    rate: true,
    total: true,
  },
};

export default function InvoiceTemplateSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState('both'); // 'both' | 'modern' | 'classic'
  const [previewTemplate, setPreviewTemplate] = useState('modern'); // 'modern' | 'classic'

  const [tplState, setTplState] = useState(DEFAULT_SETTINGS);

  // Fetch settings on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/settings');
        if (res.data?.invoiceTemplate && isMounted) {
          const it = res.data.invoiceTemplate;
          setTplState({
            defaultTemplate: it.defaultTemplate || 'modern',
            columns: { ...DEFAULT_SETTINGS.columns, ...(it.columns || {}) },
            modernColumns: { ...DEFAULT_SETTINGS.modernColumns, ...(it.modernColumns || {}) },
            classicColumns: { ...DEFAULT_SETTINGS.classicColumns, ...(it.classicColumns || {}) },
          });
          setPreviewTemplate(it.defaultTemplate || 'modern');
        }
      } catch (err) {
        console.error('Failed to load invoice template settings:', err);
        toast.error('Could not load invoice template settings');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Compute effective columns for a given template
  const getEffectiveColumns = (templateType) => {
    const base = tplState.columns || {};
    if (templateType === 'classic') {
      return { ...base, ...(tplState.classicColumns || {}) };
    }
    return { ...base, ...(tplState.modernColumns || {}) };
  };

  const currentColumnsForConfig = () => {
    if (activeConfigTab === 'both') return tplState.columns;
    if (activeConfigTab === 'modern') return { ...tplState.columns, ...tplState.modernColumns };
    return { ...tplState.columns, ...tplState.classicColumns };
  };

  const handleToggleColumn = (colId) => {
    setTplState(prev => {
      if (activeConfigTab === 'both') {
        const currentVal = prev.columns?.[colId] !== false;
        const newVal = !currentVal;
        return {
          ...prev,
          columns: { ...prev.columns, [colId]: newVal },
          modernColumns: { ...prev.modernColumns, [colId]: newVal },
          classicColumns: { ...prev.classicColumns, [colId]: newVal },
        };
      }
      if (activeConfigTab === 'modern') {
        const currentVal = (prev.modernColumns?.[colId] ?? prev.columns?.[colId]) !== false;
        return {
          ...prev,
          modernColumns: { ...prev.modernColumns, [colId]: !currentVal },
        };
      }
      // classic
      const currentVal = (prev.classicColumns?.[colId] ?? prev.columns?.[colId]) !== false;
      return {
        ...prev,
        classicColumns: { ...prev.classicColumns, [colId]: !currentVal },
      };
    });
  };

  const handleApplyPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    setTplState(prev => {
      if (activeConfigTab === 'both') {
        return {
          ...prev,
          columns: { ...prev.columns, ...preset.columns },
          modernColumns: { ...prev.modernColumns, ...preset.columns },
          classicColumns: { ...prev.classicColumns, ...preset.columns },
        };
      }
      if (activeConfigTab === 'modern') {
        return {
          ...prev,
          modernColumns: { ...prev.modernColumns, ...preset.columns },
        };
      }
      return {
        ...prev,
        classicColumns: { ...prev.classicColumns, ...preset.columns },
      };
    });
    toast.success(`Applied "${preset.label}" column preset`);
  };

  const handleResetDefaults = () => {
    setTplState(DEFAULT_SETTINGS);
    toast.success('Reset columns to default settings');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', {
        invoiceTemplate: {
          defaultTemplate: tplState.defaultTemplate,
          columns: tplState.columns,
          modernColumns: tplState.modernColumns,
          classicColumns: tplState.classicColumns,
        },
      });
      toast.success('Invoice template settings saved successfully!');
    } catch (err) {
      console.error('Failed to save invoice template settings:', err);
      toast.error(err?.response?.data?.message || 'Failed to save invoice template settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (newTab) => {
    setActiveConfigTab(newTab);
    if (newTab === 'classic') {
      setPreviewTemplate('classic');
    } else if (newTab === 'modern') {
      setPreviewTemplate('modern');
    } else {
      setPreviewTemplate(tplState.defaultTemplate || 'modern');
    }
  };

  const activeCols = currentColumnsForConfig();
  const previewCols = getEffectiveColumns(previewTemplate);
  const displayedColumns = COLUMN_DEFINITIONS.filter(col => {
    if (activeConfigTab === 'modern') return col.templates.includes('modern');
    if (activeConfigTab === 'classic') return col.templates.includes('classic');
    return true;
  });

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-8 border border-slate-200 dark:border-slate-800 animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── HEADER CARD WITH DEFAULT TEMPLATE SELECTOR ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 sm:p-7 border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="text-teal-600 dark:text-teal-400" size={20} />
              Invoice Item Columns Settings
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Control which columns appear in the line items table when printing invoices.
            </p>
          </div>

          {/* Compact Default Template Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              Default Template:
            </span>
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setTplState(p => ({ ...p, defaultTemplate: 'modern' }));
                  if (activeConfigTab === 'both') setPreviewTemplate('modern');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tplState.defaultTemplate === 'modern'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tplState.defaultTemplate === 'modern' && <Check size={12} strokeWidth={3} />}
                Modern
              </button>
              <button
                type="button"
                onClick={() => {
                  setTplState(p => ({ ...p, defaultTemplate: 'classic' }));
                  if (activeConfigTab === 'both') setPreviewTemplate('classic');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tplState.defaultTemplate === 'classic'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tplState.defaultTemplate === 'classic' && <Check size={12} strokeWidth={3} />}
                Classic GST
              </button>
            </div>
          </div>
        </div>

        {/* ── TOOLBAR: SCOPE TABS & PRESETS ── */}
        <div className="pt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Scope Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-fit">
            <button
              type="button"
              onClick={() => handleTabChange('both')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeConfigTab === 'both'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Templates (Global)
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('modern')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeConfigTab === 'modern'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Modern Template
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('classic')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeConfigTab === 'classic'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Classic GST
            </button>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mr-1">Presets:</span>
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleApplyPreset(key)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleResetDefaults}
              className="p-1 text-xs text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Reset to factory defaults"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* ── COLUMNS LIST VIEW ── */}
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {displayedColumns.map((col, idx) => {
            const isChecked = activeCols?.[col.id] !== false;
            return (
              <div
                key={col.id}
                onClick={() => handleToggleColumn(col.id)}
                className={`p-4 transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                  isChecked
                    ? 'hover:bg-teal-50/20 dark:hover:bg-teal-950/10'
                    : 'bg-slate-50/50 dark:bg-slate-850/40 opacity-70 hover:opacity-90'
                }`}
              >
                {/* Left: Index + Name & Description */}
                <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0 pt-0.5 sm:pt-0">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {col.label}
                      </span>
                      {/* Template Pills */}
                      <div className="flex items-center gap-1">
                        {col.templates.includes('modern') && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
                            Modern
                          </span>
                        )}
                        {col.templates.includes('classic') && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Classic
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {col.description}
                    </p>
                  </div>
                </div>

                {/* Right: Status badge & Toggle switch */}
                <div className="flex items-center gap-3.5 shrink-0">
                  <span className={`text-xs font-semibold hidden sm:inline-block ${
                    isChecked ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {isChecked ? 'Shown' : 'Hidden'}
                  </span>
                  <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                    isChecked ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                      isChecked ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION: LIVE PRINT PREVIEW ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 sm:p-7 border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Eye className="text-teal-600 dark:text-teal-400" size={20} />
                Live Interactive Table Preview
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
                {previewTemplate === 'classic' ? 'Classic GST Template' : 'Modern Template'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Instant preview showing line item table headers and sample row formatted for <span className="font-semibold text-teal-600 dark:text-teal-400">{previewTemplate === 'classic' ? 'Classic GST' : 'Modern'}</span>.
            </p>
          </div>

          {activeConfigTab === 'both' ? (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPreviewTemplate('modern')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  previewTemplate === 'modern'
                    ? 'bg-teal-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Modern Style
              </button>
              <button
                type="button"
                onClick={() => setPreviewTemplate('classic')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  previewTemplate === 'classic'
                    ? 'bg-slate-800 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Classic GST Style
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              <span>Showing {activeConfigTab === 'classic' ? 'Classic GST' : 'Modern Template'} Preview</span>
            </div>
          )}
        </div>

        {/* Simulated Document Paper */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="min-w-[680px] bg-white text-slate-900 rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {previewTemplate === 'modern' ? 'Modern Template Table View' : 'Classic GST Table View'}
            </div>

            {previewTemplate === 'modern' ? (
              /* Modern Mock Table */
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white uppercase text-[10px] tracking-wide">
                    {previewCols.sno !== false && <th className="p-2 text-center w-10">S.No</th>}
                    {(previewCols.name !== false || previewCols.description !== false) && (
                      <th className="p-2">Item Description</th>
                    )}
                    {previewCols.hsnSac !== false && <th className="p-2 text-center">HSN/SAC</th>}
                    {previewCols.qty !== false && <th className="p-2 text-right">Qty</th>}
                    {previewCols.unit !== false && <th className="p-2 text-center">Unit</th>}
                    {previewCols.rate !== false && <th className="p-2 text-right">Price (₹)</th>}
                    {previewCols.discount !== false && <th className="p-2 text-right">Disc (%)</th>}
                    {previewCols.taxableAmount !== false && <th className="p-2 text-right">Taxable (₹)</th>}
                    {previewCols.taxBreakdown !== false && (
                      <>
                        <th className="p-2 text-right">CGST (₹)</th>
                        <th className="p-2 text-right">SGST (₹)</th>
                      </>
                    )}
                    {previewCols.total !== false && <th className="p-2 text-right">Amount (₹)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/50">
                    {previewCols.sno !== false && <td className="p-2.5 text-center font-bold">1</td>}
                    {(previewCols.name !== false || previewCols.description !== false) && (
                      <td className="p-2.5">
                        {previewCols.name !== false && <div className="font-bold text-teal-700">Cloud Consulting & Architecture</div>}
                        {previewCols.description !== false && (
                          <div className="text-[10px] text-slate-500">Design and implementation of microservices</div>
                        )}
                      </td>
                    )}
                    {previewCols.hsnSac !== false && <td className="p-2.5 text-center font-medium">998311</td>}
                    {previewCols.qty !== false && <td className="p-2.5 text-right font-bold">2.00</td>}
                    {previewCols.unit !== false && <td className="p-2.5 text-center text-slate-600">Hours</td>}
                    {previewCols.rate !== false && <td className="p-2.5 text-right font-bold">1,500.00</td>}
                    {previewCols.discount !== false && <td className="p-2.5 text-right text-slate-600">5%</td>}
                    {previewCols.taxableAmount !== false && <td className="p-2.5 text-right font-bold">2,850.00</td>}
                    {previewCols.taxBreakdown !== false && (
                      <>
                        <td className="p-2.5 text-right font-bold">256.50 <span className="text-[9px] text-slate-400 block font-normal">9%</span></td>
                        <td className="p-2.5 text-right font-bold">256.50 <span className="text-[9px] text-slate-400 block font-normal">9%</span></td>
                      </>
                    )}
                    {previewCols.total !== false && <td className="p-2.5 text-right font-bold text-slate-900">3,363.00</td>}
                  </tr>
                </tbody>
              </table>
            ) : (
              /* Classic Mock Table */
              <table className="w-full text-left text-xs border-collapse border border-black">
                <thead>
                  <tr className="border-b border-black text-[11px] font-bold">
                    {previewCols.sno !== false && <th className="p-2 border-r border-black text-center w-10">S.N.</th>}
                    {(previewCols.name !== false || previewCols.description !== false) && (
                      <th className="p-2 border-r border-black">Description of Goods</th>
                    )}
                    {previewCols.hsnSac !== false && <th className="p-2 border-r border-black">HSN/SAC</th>}
                    {previewCols.qty !== false && <th className="p-2 border-r border-black text-right">Qty.</th>}
                    {previewCols.unit !== false && <th className="p-2 border-r border-black">Unit</th>}
                    {previewCols.listPrice !== false && <th className="p-2 border-r border-black text-right">List Price</th>}
                    {previewCols.discount !== false && <th className="p-2 border-r border-black">Discount</th>}
                    {previewCols.rate !== false && <th className="p-2 border-r border-black text-right">Price</th>}
                    {previewCols.total !== false && <th className="p-2 text-right">Amount (₹)</th>}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black">
                    {previewCols.sno !== false && <td className="p-2 border-r border-black text-center">1.</td>}
                    {(previewCols.name !== false || previewCols.description !== false) && (
                      <td className="p-2 border-r border-black">
                        {previewCols.name !== false && <div className="font-semibold">Industrial Metal Fabrication</div>}
                        {previewCols.description !== false && (
                          <div className="text-[10px] text-slate-600">Grade 316 Stainless Steel Sheet 2mm</div>
                        )}
                      </td>
                    )}
                    {previewCols.hsnSac !== false && <td className="p-2 border-r border-black">7219</td>}
                    {previewCols.qty !== false && <td className="p-2 border-r border-black text-right">10.00</td>}
                    {previewCols.unit !== false && <td className="p-2 border-r border-black">Kgs</td>}
                    {previewCols.listPrice !== false && <td className="p-2 border-r border-black text-right">450.00</td>}
                    {previewCols.discount !== false && <td className="p-2 border-r border-black">10%</td>}
                    {previewCols.rate !== false && <td className="p-2 border-r border-black text-right">405.00</td>}
                    {previewCols.total !== false && <td className="p-2 text-right font-bold">4,050.00</td>}
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── SAVE ACTION BAR ── */}
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Info size={14} className="text-teal-600 shrink-0" />
          <span>Changes take effect immediately upon next invoice print or download.</span>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm transition-all hover:shadow hover:-translate-y-0.5 flex items-center gap-2 text-sm cursor-pointer"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Template Settings'}
        </button>
      </div>
    </div>
  );
}
