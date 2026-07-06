import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell
} from 'recharts';
import {
  FaArrowTrendUp, FaCalendarDays, FaCircleNotch, FaFileInvoiceDollar,
  FaReceipt, FaShieldHalved, FaRotateLeft, FaSun, FaMoon, FaEye
} from 'react-icons/fa6';
import {
  FaCoins, FaPercent, FaInfoCircle, FaArrowRight, FaArrowLeft,
  FaClock, FaFileInvoice, FaBuilding
} from 'react-icons/fa';
import { getTaxDashboard } from '../api/taxReports';
import { motion } from 'framer-motion';

const fmt = (value, digits = 0) =>
  `Rs ${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const pct = (value) => `${(Number(value) || 0).toFixed(1)}%`;

const StatCard = ({ title, prefix = '', value, subtext, icon: Icon, tone = 'indigo', delta, darkMode, onViewSource }) => {
  const ACCENT_COLORS = {
    indigo: {
      border: 'border-t-indigo-500',
      iconBg: darkMode ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/30' : 'bg-indigo-50/80 text-indigo-600 shadow-inner',
      bar: 'bg-indigo-500',
      text: 'text-indigo-600'
    },
    rose: {
      border: 'border-t-rose-500',
      iconBg: darkMode ? 'bg-rose-950/60 text-rose-400 border border-rose-900/30' : 'bg-rose-50/80 text-rose-600 shadow-inner',
      bar: 'bg-rose-500',
      text: 'text-rose-600'
    },
    emerald: {
      border: 'border-t-emerald-500',
      iconBg: darkMode ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/30' : 'bg-emerald-50/80 text-emerald-600 shadow-inner',
      bar: 'bg-emerald-500',
      text: 'text-emerald-600'
    },
    amber: {
      border: 'border-t-amber-500',
      iconBg: darkMode ? 'bg-amber-950/60 text-amber-400 border border-amber-900/30' : 'bg-amber-50/80 text-amber-600 shadow-inner',
      bar: 'bg-amber-500',
      text: 'text-amber-600'
    }
  };

  const theme = ACCENT_COLORS[tone] || ACCENT_COLORS.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 rounded-2xl shadow-sm border border-t-4 ${theme.border} hover:shadow-md transition-all duration-300 relative group ${
        darkMode ? 'border-slate-800/80 bg-slate-900/60 shadow-md shadow-slate-950/20' : 'border-slate-200/50 bg-white/70 backdrop-blur-md'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div 
              onClick={onViewSource}
              className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                onViewSource 
                  ? 'cursor-pointer hover:underline hover:text-[#5b61eb] dark:hover:text-[#818cf8]' 
                  : ''
              } ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}
              title={onViewSource ? `Click to view ${title} source details` : undefined}
            >
              {title}
            </div>
          </div>
          <div className="flex items-baseline gap-0.5">
            {prefix && <span className={`text-lg font-bold ${darkMode ? 'text-slate-500' : 'text-slate-450'}`}>{prefix}</span>}
            <span className={`text-2xl font-black tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{value}</span>
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl shrink-0 ${theme.iconBg}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      {subtext && (
        <div className="mt-3.5 flex items-center gap-1.5">
          <span className={`w-1.5 h-3.5 rounded-full ${theme.bar}`}></span>
          <span className={`text-[11px] font-bold ${
            delta !== undefined ? (Number(delta) >= 0 ? 'text-emerald-600' : 'text-rose-600') : (darkMode ? 'text-[#818cf8]' : theme.text)
          }`}>
            {subtext}
          </span>
        </div>
      )}
    </motion.div>
  );
};



function ChartTooltip({ active, payload, label, darkMode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={`rounded-2xl border p-3.5 shadow-xl text-xs backdrop-blur-md ${
      darkMode ? 'bg-slate-950/95 border-slate-800 text-slate-200' : 'border-slate-100 bg-white/95 text-slate-800'
    }`}>
      <div className={`mb-2 font-bold border-b pb-1.5 ${darkMode ? 'text-slate-100 border-slate-800' : 'text-slate-800 border-slate-100'}`}>{label}</div>
      {payload.map((item) => (
        <div key={item.name} className="flex min-w-[140px] justify-between items-center gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
            <span className={`font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.name}</span>
          </div>
          <span className={`font-black ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{fmt(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function TaxDashboard() {
  const navigate = useNavigate();
  const monthInputRef = useRef(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tax-dashboard-theme') === 'dark');
  const [activeTab, setActiveTab] = useState('This Month');
  const [customMonth, setCustomMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [customRange, setCustomRange] = useState({
    startDate: '',
    endDate: '',
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSourceDetail, setSelectedSourceDetail] = useState(null);

  const handleViewSource = (label) => {
    if (label === 'Total invoices') {
      setSelectedSourceDetail({
        title: 'Total Invoices',
        formula: 'Active Invoices issued in this period (excluding drafts and manual incomes)',
        items: (data?.revenueItems || []).filter(item => item.source === 'Invoice'),
        linkTo: '/invoices',
        linkLabel: 'Go to Invoices'
      });
    } else if (label === 'Output liability') {
      setSelectedSourceDetail({
        title: 'Output Liability',
        formula: 'Output GST on active Invoices within selected period',
        items: data?.gstLiabilityItems || [],
        linkTo: '/reports/gst',
        linkLabel: 'Go to GST Reports'
      });
    } else if (label === 'Input credit') {
      setSelectedSourceDetail({
        title: 'Input Credit',
        formula: 'Input GST paid on active Expenses in selected period (excluding reverse charge)',
        items: data?.expenseItems || [],
        linkTo: '/expenses',
        linkLabel: 'Go to Expenses'
      });
    } else if (label === 'Net GST payable') {
      setSelectedSourceDetail({
        title: 'Net GST Payable',
        formula: 'Output GST Liability (₹Output) - GST Input Credit (₹Input). Cannot be negative.',
        items: [
          ...(data?.gstLiabilityItems || []).map(g => ({ ...g, source: `${g.source} (Liability)` })),
          ...(data?.expenseItems || []).map(e => ({ ...e, amount: -e.amount, source: 'Expense ITC (Deduction)' }))
        ].sort((a,b) => new Date(b.date) - new Date(a.date)),
        linkTo: '/reports/gst',
        linkLabel: 'Go to GST Reports'
      });
    } else if (label === 'TDS Receivable') {
      setSelectedSourceDetail({
        title: 'TDS Receivable',
        formula: 'TDS withheld by clients from paid/unpaid Invoices within selected period',
        items: data?.tdsDeductedItems || [],
        linkTo: '/reports/tds',
        linkLabel: 'Go to TDS Summary'
      });
    } else if (label === 'TDS Payable') {
      setSelectedSourceDetail({
        title: 'TDS Payable',
        formula: 'TDS deducted by you from vendor Expenses or Payroll runs in selected period',
        items: data?.tdsPayableItems || [],
        linkTo: '/reports/tds',
        linkLabel: 'Go to TDS Summary'
      });
    } else if (label === 'Combined Tax Outflow') {
      setSelectedSourceDetail({
        title: 'Combined Tax Outflow',
        formula: 'Net GST Payable + TDS Payable (sum of current obligations)',
        items: [
          ...(data?.gstLiabilityItems || []).map(g => ({ ...g, source: `${g.source} (GST Liability)` })),
          ...(data?.tdsPayableItems || []).map(t => ({ ...t, source: `${t.source} (TDS Payable)` }))
        ].sort((a,b) => new Date(b.date) - new Date(a.date)),
        linkTo: '/reports/gst',
        linkLabel: 'Go to GST Reports'
      });
    }
  };


  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    let params = {};
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (activeTab === 'This Month') {
      params = { month: m + 1, year: y };
    } else if (activeTab === 'Last 3M') {
      const start = new Date(y, m - 2, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      params = {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    } else if (activeTab === 'This Year') {
      const start = new Date(y, 0, 1);
      const end = new Date(y, 12, 0, 23, 59, 59, 999);
      params = {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    } else if (activeTab === 'Custom') {
      if (customRange.startDate && customRange.endDate) {
        params = {
          startDate: customRange.startDate,
          endDate: customRange.endDate
        };
      } else {
        const [cy, cm] = customMonth.split('-').map(Number);
        params = { month: cm, year: cy };
      }
    }

    getTaxDashboard(params)
      .then((response) => {
        if (!cancelled) setData(response.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load tax dashboard.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, customMonth, customRange.startDate, customRange.endDate]);

  const slabData = useMemo(() => data?.slabComparison || [], [data]);
  const split = data?.invoiceSplit || {};
  const summary = data?.summary || {};

  const gstDueDateString = useMemo(() => {
    if (summary.gstDueDate) {
      return new Date(summary.gstDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }
    const ref = customRange.endDate ? new Date(customRange.endDate) : new Date();
    const nextMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 20);
    return nextMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }, [summary.gstDueDate, customRange.endDate]);

  const tdsDueDateString = useMemo(() => {
    if (summary.tdsDueDate) {
      return new Date(summary.tdsDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }
    const ref = customRange.endDate ? new Date(customRange.endDate) : new Date();
    const nextMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 7);
    return nextMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }, [summary.tdsDueDate, customRange.endDate]);

  const trendDataWithNet = useMemo(() => {
    const rawTrend = data?.trend || [];
    return rawTrend.map(t => ({
      ...t,
      net: Math.max(Math.round((Number(t.output || 0) - Number(t.input || 0)) * 100) / 100, 0)
    }));
  }, [data]);

  const donutData = useMemo(() => {
    if (!data?.invoiceSplit) return [];
    return [
      { name: 'B2B', value: split.b2b || 0, color: '#5b61eb' },
      { name: 'B2C', value: split.b2c || 0, color: '#10b981' },
      { name: 'Exports', value: split.export || 0, color: '#f59e0b' },
      { name: 'Nil rated', value: split.nilRated || 0, color: '#94a3b8' }
    ];
  }, [data, split]);

  const totalCount = useMemo(() => {
    if (!data?.invoiceSplit) return 0;
    return (split.b2b || 0) + (split.b2c || 0) + (split.export || 0) + (split.nilRated || 0);
  }, [data, split]);

  const dashboardBgStyle = {
    background: darkMode
      ? `
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(244, 63, 94, 0.08) 0px, transparent 50%),
        radial-gradient(at 50% 100%, rgba(16, 185, 129, 0.08) 0px, transparent 50%),
        #090d16
      `
      : `
        radial-gradient(at 0% 0%, rgba(224, 231, 255, 0.4) 0px, transparent 50%),
        radial-gradient(at 50% 0%, rgba(254, 243, 199, 0.4) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(253, 224, 71, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(252, 165, 165, 0.2) 0px, transparent 50%),
        radial-gradient(at 0% 100%, rgba(244, 63, 94, 0.08) 0px, transparent 50%),
        #f8fafc
      `,
  };

  const getDashboardPeriodLabel = () => {
    if (activeTab === 'This Month') {
      return `${data?.period?.month || 'Tax'} ${data?.period?.year || ''}`;
    }
    if (activeTab === 'Last 3M') {
      return 'Last 3 Months';
    }
    if (activeTab === 'This Year') {
      return `This Year ${new Date().getFullYear()}`;
    }
    if (activeTab === 'Custom') {
      if (customRange.startDate && customRange.endDate) {
        const sOpt = new Date(customRange.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const eOpt = new Date(customRange.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        return `${sOpt} - ${eOpt}`;
      }
      return `${data?.period?.month || 'Tax'} ${data?.period?.year || ''}`;
    }
    return 'GST Analytics';
  };

  return (
    <div className={`min-h-full font-sans transition-all duration-300 pb-16`} style={dashboardBgStyle}>
      <div className="px-4 py-6 sm:px-6">
        
        {/* Top Header Banner */}
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className={`flex items-center gap-2 text-[10px] font-extrabold tracking-widest uppercase mb-1 ${darkMode ? 'text-[#818cf8]' : 'text-[#5b61eb]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${darkMode ? 'bg-[#818cf8]' : 'bg-[#5b61eb]'}`}></span>
              GST REPORT CARD
            </div>
            <h1 className={`text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-950'}`}>
              {getDashboardPeriodLabel()}
            </h1>
          </div>

          {/* Premium Capsule Pill Selector and Sun/Moon Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Dark Mode Switcher */}
            <button
              onClick={() => {
                const nextTheme = !darkMode;
                setDarkMode(nextTheme);
                localStorage.setItem('tax-dashboard-theme', nextTheme ? 'dark' : 'light');
              }}
              className={`p-2.5 rounded-xl border transition-all duration-300 shrink-0 ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-800/80 shadow-md shadow-amber-950/10'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-[#5b61eb] hover:bg-slate-50 shadow-sm'
              }`}
              title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {darkMode ? <FaSun size={14} /> : <FaMoon size={14} />}
            </button>

            {/* Presets and Filters Capsule */}
            <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-2 rounded-2xl shadow-sm border ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white/80 backdrop-blur-md border-slate-200/50'
            }`}>
              <div className={`inline-flex items-center gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-slate-100/70'}`}>
                {['This Month', 'Last 3M', 'This Year', 'Custom'].map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        if (tab !== 'Custom') {
                          setCustomRange({ startDate: '', endDate: '' });
                        }
                      }}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-350 ${
                        isActive
                          ? 'bg-[#5b61eb] text-white shadow-md shadow-indigo-500/25'
                          : (darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/30')
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Custom Drawer Box */}
              {activeTab === 'Custom' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 border-t sm:border-t-0 sm:border-l pt-2.5 sm:pt-0 sm:pl-3 ${
                    darkMode ? 'border-slate-800' : 'border-slate-200/80'
                  }`}
                >
                  {/* Month Selection */}
                  <div 
                    onClick={() => {
                      if (monthInputRef.current) {
                        if (typeof monthInputRef.current.showPicker === 'function') {
                          monthInputRef.current.showPicker();
                        } else {
                          monthInputRef.current.click();
                        }
                      }
                    }}
                    className={`relative flex items-center justify-between gap-3 border rounded-xl px-3.5 py-2 transition-colors w-40 cursor-pointer shadow-inner-sm ${
                      darkMode ? 'bg-slate-900 border-slate-800 hover:border-[#818cf8]' : 'bg-white border-slate-200/85 hover:border-[#5b61eb]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FaCalendarDays className={darkMode ? 'text-[#818cf8]' : 'text-[#5b61eb]'} size={12} />
                      <span className={`text-xs font-extrabold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {customRange.startDate ? 'Custom Dates' : new Date(customMonth + '-02').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <input
                      ref={monthInputRef}
                      type="month"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-none"
                      value={customMonth}
                      onChange={(e) => {
                        setCustomMonth(e.target.value);
                        setCustomRange({ startDate: '', endDate: '' });
                      }}
                    />
                  </div>

                  {/* Manual Calendar Picker Box */}
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={customRange.startDate}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className={`border rounded-xl px-2.5 py-1.5 text-[11px] font-bold outline-none ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-[#818cf8]' : 'bg-white border-slate-200/80 text-slate-700 focus:border-[#5b61eb]'
                      }`}
                    />
                    <span className="text-slate-400 font-bold text-xs">to</span>
                    <input
                      type="date"
                      value={customRange.endDate}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className={`border rounded-xl px-2.5 py-1.5 text-[11px] font-bold outline-none ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-[#818cf8]' : 'bg-white border-slate-200/80 text-slate-700 focus:border-[#5b61eb]'
                      }`}
                    />
                    {(customRange.startDate || customRange.endDate) && (
                      <button
                        onClick={() => setCustomRange({ startDate: '', endDate: '' })}
                        className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-950/20' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                        title="Clear Range"
                      >
                        <FaRotateLeft size={10} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading ? (
          <div className="flex h-80 items-center justify-center text-[#5b61eb]">
            <FaCircleNotch className="animate-spin" size={32} />
          </div>
        ) : error ? (
          <div className={`p-6 rounded-2xl border text-center font-semibold ${
            darkMode ? 'bg-rose-950/20 border-rose-900/50 text-rose-400' : 'bg-rose-50/20 border-rose-100 text-rose-600'
          }`}>
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 4 Premium Stat Cards Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total invoices"
                value={summary.totalInvoices || 0}
                icon={FaFileInvoiceDollar}
                tone="indigo"
                subtext="Issued items"
                darkMode={darkMode}
                onViewSource={() => handleViewSource('Total invoices')}
              />
              <StatCard
                title="Output liability"
                value={fmt(summary.outputLiability)}
                icon={FaShieldHalved}
                tone="rose"
                delta={summary.momOutput}
                subtext={summary.momOutput !== undefined ? `${summary.momOutput >= 0 ? '↑' : '↓'} ${Math.abs(summary.momOutput).toFixed(1)}% MoM` : '—'}
                darkMode={darkMode}
                onViewSource={() => handleViewSource('Output liability')}
              />
              <StatCard
                title="Input credit"
                value={fmt(summary.inputCredit)}
                icon={FaReceipt}
                tone="emerald"
                delta={summary.momInput}
                subtext={summary.momInput !== undefined ? `${summary.momInput >= 0 ? '↑' : '↓'} ${Math.abs(summary.momInput).toFixed(1)}% MoM` : '—'}
                darkMode={darkMode}
                onViewSource={() => handleViewSource('Input credit')}
              />
              <StatCard
                title="Net GST payable"
                value={fmt(summary.netPayable)}
                icon={FaArrowTrendUp}
                tone="amber"
                subtext={gstDueDateString ? `Due ${gstDueDateString}` : 'No dues'}
                darkMode={darkMode}
                onViewSource={() => handleViewSource('Net GST payable')}
              />
            </div>

            {/* TDS & Combined Tax Ledger Summary Panel */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={`p-6 rounded-2xl border transition-all duration-300 ${
                darkMode ? 'border-slate-800 bg-slate-900/60 shadow-md shadow-slate-950/20' : 'border-slate-200/50 bg-white/70 backdrop-blur-md'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <FaCoins className={darkMode ? 'text-[#818cf8]' : 'text-[#5b61eb]'} size={16} />
                <h3 className={`text-xs font-black tracking-wider uppercase ${darkMode ? 'text-slate-300' : 'text-slate-850'}`}>
                  TDS & Final Tax Obligations
                </h3>
                <div className="flex-1 h-[1px] bg-slate-800/80 rounded ml-2"></div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* TDS Receivable */}
                <div className={`p-4 rounded-xl border ${
                  darkMode ? 'bg-slate-950/40 border-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200/60 text-slate-800'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span 
                      onClick={() => handleViewSource('TDS Receivable')}
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:underline hover:text-emerald-500 transition-colors"
                      title="Click to view TDS Receivable source details"
                    >
                      TDS Receivable (Asset)
                    </span>
                    <span className={`p-1.5 rounded-lg ${darkMode ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                      <FaArrowLeft size={10} />
                    </span>
                  </div>
                  <div className="text-xl font-black text-emerald-600">{fmt(summary.tdsDeducted, 2)}</div>
                  <div className="text-[9px] font-semibold text-slate-450 mt-1">Withheld by clients</div>
                </div>

                {/* TDS Payable */}
                <div className={`p-4 rounded-xl border ${
                  darkMode ? 'bg-slate-950/40 border-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200/60 text-slate-800'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span 
                      onClick={() => handleViewSource('TDS Payable')}
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:underline hover:text-rose-500 transition-colors"
                      title="Click to view TDS Payable source details"
                    >
                      TDS Payable (Liability)
                    </span>
                    <span className={`p-1.5 rounded-lg ${darkMode ? 'bg-rose-950/40 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                      <FaArrowRight size={10} />
                    </span>
                  </div>
                  <div className="text-xl font-black text-rose-600">{fmt(summary.tdsPayable, 2)}</div>
                  <div className="text-[9px] font-semibold text-slate-450 mt-1">Deducted from vendors/payroll · Due {tdsDueDateString}</div>
                </div>

                {/* Combined Tax Position */}
                <div className={`p-4 rounded-xl border ${
                  darkMode ? 'bg-slate-950/40 border-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200/60 text-slate-800'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span 
                      onClick={() => handleViewSource('Combined Tax Outflow')}
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:underline hover:text-amber-500 transition-colors"
                      title="Click to view Combined Tax Outflow source details"
                    >
                      Combined Tax Outflow
                    </span>
                    <span className={`p-1.5 rounded-lg ${darkMode ? 'bg-amber-950/40 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                      <FaCoins size={10} />
                    </span>
                  </div>
                  <div className="text-xl font-black text-amber-600">{fmt(summary.netTaxPayable, 2)}</div>
                  <div className="text-[9px] font-semibold text-amber-500 mt-1 flex items-center gap-1">
                    <FaInfoCircle size={10} /> Sum of active dues. Pay separately at GST & IT portals.
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Middle Row Charts */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
              {/* Card 5: Invoice Split Donut Chart */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${
                  darkMode ? 'border-slate-800/80 bg-slate-900/60 shadow-md shadow-slate-950/20' : 'border-slate-200/50 bg-white/70 backdrop-blur-md'
                }`}
              >
                <div>
                  <h3 className={`text-xs font-black tracking-wider uppercase mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-850'}`}>Invoice split</h3>
                  <div className="w-8 h-1 bg-[#5b61eb] rounded-full mb-4"></div>
                </div>

                <div className="flex flex-row items-center justify-between gap-4 py-4 min-h-[160px]">
                  {/* Donut Pie */}
                  <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={64}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center overlay label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className={`text-2xl font-black leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>{totalCount}</span>
                      <span className={`text-[9px] font-extrabold uppercase tracking-widest mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>total</span>
                    </div>
                  </div>

                  {/* Legends Detail */}
                  <div className="flex-1 space-y-2.5 pl-2">
                    {donutData.map((item, idx) => {
                      const percent = totalCount > 0 ? Math.round((item.value / totalCount) * 100) : 0;
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                            <span className={`font-bold ${darkMode ? 'text-slate-405' : 'text-slate-600'}`}>{item.name}</span>
                          </div>
                          <div className="text-right flex items-center gap-1.5 justify-end">
                            <span className={`font-black ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{item.value}</span>
                            <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>({percent}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Card 6: Output vs Input by GST slab Bar Chart */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${
                  darkMode ? 'border-slate-800/80 bg-slate-900/60 shadow-md shadow-slate-950/20' : 'border-slate-200/50 bg-white/70 backdrop-blur-md'
                }`}
              >
                <div>
                  <h3 className={`text-xs font-black tracking-wider uppercase mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-850'}`}>Output vs input by GST slab</h3>
                  <div className="w-8 h-1 bg-[#5b61eb] rounded-full mb-2"></div>
                </div>

                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={slabData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#1e293b' : '#e2e8f0'} />
                      <XAxis dataKey="slab" tickLine={false} axisLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }} />
                      <YAxis
                        tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: 700 }}
                      />
                      <Tooltip content={<ChartTooltip darkMode={darkMode} />} />
                      <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: darkMode ? '#cbd5e1' : '#475569' }} />
                      <Bar dataKey="output" name="Output" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="input" name="Input" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* GST Component Breakdown & Overdue Aging Row */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* GST Component Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className={`p-6 rounded-2xl border transition-all duration-300 ${
                  darkMode ? 'border-slate-800/80 bg-slate-900/60 shadow-md shadow-slate-950/20' : 'border-slate-200/50 bg-white/70 backdrop-blur-md'
                }`}
              >
                <div>
                  <h3 className={`text-xs font-black tracking-wider uppercase mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-850'}`}>GST component breakdown</h3>
                  <div className="w-8 h-1 bg-[#5b61eb] rounded-full mb-4"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Output (Collected) Side */}
                  <div>
                    <div className={`text-[10px] font-extrabold uppercase tracking-wider mb-2.5 ${darkMode ? 'text-rose-400/80' : 'text-rose-500'}`}>
                      Output Tax (Collected)
                    </div>
                    <div className="space-y-2.5">
                      <div className={`flex justify-between border-b pb-2 ${darkMode ? 'border-slate-800/80' : 'border-slate-100'}`}>
                        <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>IGST (Inter-State)</span>
                        <strong className={`text-sm font-black ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{fmt(data?.gst?.igst, 2)}</strong>
                      </div>
                      <div className={`flex justify-between border-b pb-2 ${darkMode ? 'border-slate-800/80' : 'border-slate-100'}`}>
                        <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>CGST (Central)</span>
                        <strong className={`text-sm font-black ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{fmt(data?.gst?.cgst, 2)}</strong>
                      </div>
                      <div className={`flex justify-between border-b pb-2 ${darkMode ? 'border-slate-800/80' : 'border-slate-100'}`}>
                        <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>SGST (State)</span>
                        <strong className={`text-sm font-black ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{fmt(data?.gst?.sgst, 2)}</strong>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className={`text-xs font-extrabold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Total Output</span>
                        <strong className="text-sm font-black text-rose-600">{fmt(data?.gst?.liability, 2)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Input (Credit) Side */}
                  <div>
                    <div className={`text-[10px] font-extrabold uppercase tracking-wider mb-2.5 ${darkMode ? 'text-emerald-400/80' : 'text-emerald-600'}`}>
                      Input Tax Credit (ITC)
                    </div>
                    <div className="space-y-2.5">
                      <div className={`flex justify-between border-b pb-2 ${darkMode ? 'border-slate-800/80' : 'border-slate-100'}`}>
                        <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>IGST Credit</span>
                        <strong className={`text-sm font-black ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{fmt(data?.gst?.inputIgst || data?.igstCredit, 2)}</strong>
                      </div>
                      <div className={`flex justify-between border-b pb-2 ${darkMode ? 'border-slate-800/80' : 'border-slate-100'}`}>
                        <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>CGST+SGST Credit</span>
                        <strong className={`text-sm font-black ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{fmt(data?.gst?.inputCgstSgst || data?.cgstSgstCredit, 2)}</strong>
                      </div>
                      <div className={`flex justify-between border-b pb-2 ${darkMode ? 'border-slate-800/80' : 'border-slate-100'}`}>
                        <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Utilisation Rate</span>
                        <strong className={`text-sm font-black ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{pct(data?.itcUtilisation)}</strong>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className={`text-xs font-extrabold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Total Input Credit</span>
                        <strong className="text-sm font-black text-emerald-600">{fmt(data?.gst?.credit, 2)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net payable summary row */}
                <div className={`mt-4 pt-3 border-t flex justify-between items-center ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <span className={`text-xs font-extrabold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Net GST Payable (Output − Input)</span>
                  <strong className="text-base font-black text-amber-600">{fmt(data?.gst?.netPayable, 2)}</strong>
                </div>
              </motion.div>

              {/* Overdue Debt Aging & Drafts Box */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className={`p-6 rounded-2xl border transition-all duration-300 ${
                  darkMode ? 'border-slate-800/80 bg-slate-900/60 shadow-md shadow-slate-950/20' : 'border-slate-200/50 bg-white/70 backdrop-blur-md'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-xs font-black tracking-wider uppercase mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-850'}`}>Outstanding debt aging</h3>
                    <div className="w-8 h-1 bg-[#5b61eb] rounded-full mb-4"></div>
                  </div>
                  {data?.draftCounts?.total > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 border border-amber-500/40 text-amber-550 uppercase tracking-wide">
                      {data?.draftCounts?.total} Drafts Pending
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-slate-950/40' : 'bg-slate-50'}`}>
                    <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>0-30 Days</div>
                    <div className={`text-xs font-black ${darkMode ? 'text-slate-200' : 'text-slate-850'}`}>{fmt(data?.overdueInvoices?.aging?.d0_30)}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-slate-950/40' : 'bg-slate-50'}`}>
                    <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>31-60 Days</div>
                    <div className={`text-xs font-black ${darkMode ? 'text-slate-200' : 'text-slate-850'}`}>{fmt(data?.overdueInvoices?.aging?.d31_60)}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-slate-950/40' : 'bg-slate-50'}`}>
                    <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>61-90 Days</div>
                    <div className={`text-xs font-black ${darkMode ? 'text-slate-200' : 'text-slate-850'}`}>{fmt(data?.overdueInvoices?.aging?.d61_90)}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-slate-950/40' : 'bg-slate-50'}`}>
                    <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>90+ Days</div>
                    <div className="text-xs font-black text-rose-500">{fmt(data?.overdueInvoices?.aging?.d90plus)}</div>
                  </div>
                </div>

                <div className={`mt-4 border-t pt-3 flex justify-between items-center text-xs ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <span className={`font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Overdue Receivable ({data?.overdueInvoices?.count || 0} Invoices):</span>
                  <strong className={`font-black ${darkMode ? 'text-slate-200' : 'text-slate-850'}`}>{fmt(data?.overdueInvoices?.total)}</strong>
                </div>
              </motion.div>
            </div>

            {/* Bottom Row Trend & Circular ITC */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              {/* Card 7: Trailing 6-month trend and sub-metrics */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${
                  darkMode ? 'border-slate-800/80 bg-slate-900/60 shadow-md shadow-slate-950/20' : 'border-slate-200/50 bg-white/70 backdrop-blur-md'
                }`}
              >
                <div>
                  <h3 className={`text-xs font-black tracking-wider uppercase mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-850'}`}>6-month trend</h3>
                  <div className="w-8 h-1 bg-[#5b61eb] rounded-full mb-2"></div>
                </div>

                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendDataWithNet} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#1e293b' : '#e2e8f0'} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }} />
                      <YAxis
                        tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: 700 }}
                      />
                      <Tooltip content={<ChartTooltip darkMode={darkMode} />} />
                      <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: darkMode ? '#cbd5e1' : '#475569' }} />
                      <Line type="monotone" dataKey="output" name="Output" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="input" name="Input" stroke="#10b981" strokeWidth={2.5} strokeDasharray="4 4" dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="net" name="Net Liability" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Card 8: ITC Utilisation Circular Progress */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${
                  darkMode ? 'border-slate-800/80 bg-slate-900/60 shadow-md shadow-slate-950/20' : 'border-slate-200/50 bg-white/70 backdrop-blur-md'
                }`}
              >
                <div>
                  <h3 className={`text-xs font-black tracking-wider uppercase mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-850'}`}>ITC utilisation</h3>
                  <div className="w-8 h-1 bg-[#5b61eb] rounded-full mb-4"></div>
                </div>

                <div className="flex items-center justify-center py-4">
                  <div className={`relative grid h-36 w-36 place-items-center rounded-full border-[12px] shadow-inner ${
                    darkMode ? 'border-emerald-600 bg-emerald-950/30' : 'border-emerald-500 bg-emerald-55'
                  }`}>
                    <div className="text-center">
                      <div className={`text-3xl font-black leading-none ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{pct(data?.itcUtilisation)}</div>
                      <div className={`text-[8px] font-extrabold uppercase tracking-wider mt-1.5 ${darkMode ? 'text-emerald-500' : 'text-emerald-550'}`}>Credit/output</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className={`flex justify-between border-b py-1.5 ${darkMode ? 'border-slate-800/85' : 'border-slate-100'}`}>
                    <span className={darkMode ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>IGST credit</span>
                    <strong className={darkMode ? 'text-slate-100 font-bold' : 'text-slate-900 font-bold'}>{fmt(data?.igstCredit)}</strong>
                  </div>
                  <div className={`flex justify-between border-b py-1.5 ${darkMode ? 'border-slate-800/85' : 'border-slate-100'}`}>
                    <span className={darkMode ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>CGST+SGST credit</span>
                    <strong className={darkMode ? 'text-slate-100 font-bold' : 'text-slate-900 font-bold'}>{fmt(data?.cgstSgstCredit)}</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className={darkMode ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>Credit/output ratio</span>
                    <strong className={darkMode ? 'text-slate-100 font-bold' : 'text-slate-900 font-bold'}>{pct(data?.creditOutputRatio)}</strong>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Source Detail Modal */}
            {selectedSourceDetail && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
                {/* Backdrop */}
                <div 
                  className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
                  onClick={() => setSelectedSourceDetail(null)}
                />
                
                {/* Modal Content */}
                <div className={`relative w-full max-w-4xl rounded-2xl border p-6 shadow-2xl transition-all duration-300 transform scale-100 animate-rise-in ${
                  darkMode 
                    ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-slate-950/50' 
                    : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/40'
                }`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold tracking-tight">{selectedSourceDetail.title} Source Details</h3>
                      <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        <strong>Origin / Formula:</strong> {selectedSourceDetail.formula}
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedSourceDetail(null)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                      }`}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Content table */}
                  <div className={`overflow-hidden rounded-xl border max-h-96 overflow-y-auto ${darkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200/80 bg-slate-50/40'} pr-1`}>
                    {!selectedSourceDetail.items || selectedSourceDetail.items.length === 0 ? (
                      <div className={`py-12 text-center text-sm ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                        No contributing transactions found for this period.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className={`${darkMode ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-100/80 text-slate-500 border-slate-200'} font-semibold border-b`}>
                            <th className="p-3">Date</th>
                            <th className="p-3">Doc #</th>
                            <th className="p-3">Party</th>
                            <th className="p-3">Source</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-800/60' : 'divide-slate-200/60'}`}>
                          {selectedSourceDetail.items.map((item, idx) => (
                            <tr 
                              key={item.id || idx} 
                              className={`transition-colors ${
                                darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100/50'
                              }`}
                            >
                              <td className="p-3">
                                {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                              </td>
                              <td className="p-3 font-semibold">{item.number}</td>
                              <td className="p-3 truncate max-w-[150px]">{item.party}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.source.includes('Invoice')
                                    ? (darkMode ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-50 text-indigo-600')
                                    : item.source.includes('Expense')
                                      ? (darkMode ? 'bg-pink-950 text-pink-300' : 'bg-pink-50 text-pink-600')
                                      : (darkMode ? 'bg-amber-950 text-amber-300' : 'bg-amber-50 text-amber-600')
                                }`}>
                                  {item.source}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  ['PAID', 'active', 'approved'].includes(item.status)
                                    ? (darkMode ? 'bg-emerald-950/50 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                                    : ['PARTIAL', 'pending', 'pending_approval'].includes(item.status)
                                      ? (darkMode ? 'bg-amber-950/50 text-amber-400' : 'bg-amber-50 text-amber-600')
                                      : (darkMode ? 'bg-rose-950/50 text-rose-400' : 'bg-rose-50 text-rose-600')
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold">
                                {fmt(item.amount, 2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-5 flex items-center justify-end gap-3">
                    {selectedSourceDetail.linkTo && (
                      <Link 
                        to={selectedSourceDetail.linkTo} 
                        onClick={() => setSelectedSourceDetail(null)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/25"
                      >
                        {selectedSourceDetail.linkLabel}
                      </Link>
                    )}
                    <button 
                      onClick={() => setSelectedSourceDetail(null)}
                      className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
                        darkMode 
                          ? 'border-slate-800 text-slate-300 hover:bg-slate-800' 
                          : 'border-slate-200 text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
