import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell
} from 'recharts';
import {
  FaArrowTrendUp, FaCalendarDays, FaCircleNotch, FaFileInvoiceDollar,
  FaReceipt, FaShieldHalved, FaRotateLeft
} from 'react-icons/fa6';
import { getTaxDashboard } from '../api/taxReports';
import { motion } from 'framer-motion';

const fmt = (value, digits = 0) =>
  `Rs ${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const pct = (value) => `${(Number(value) || 0).toFixed(1)}%`;

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-md p-5.5 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
}

const StatCard = ({ title, prefix = '', value, subtext, icon: Icon, tone = 'indigo', delta }) => {
  const ACCENT_COLORS = {
    indigo: {
      border: 'border-t-indigo-500',
      iconBg: 'bg-indigo-50/80 text-indigo-600',
      bar: 'bg-indigo-500',
      text: 'text-indigo-600'
    },
    rose: {
      border: 'border-t-rose-500',
      iconBg: 'bg-rose-50/80 text-rose-600',
      bar: 'bg-rose-500',
      text: 'text-rose-600'
    },
    emerald: {
      border: 'border-t-emerald-500',
      iconBg: 'bg-emerald-50/80 text-emerald-600',
      bar: 'bg-emerald-500',
      text: 'text-emerald-600'
    },
    amber: {
      border: 'border-t-amber-500',
      iconBg: 'bg-amber-50/80 text-amber-600',
      bar: 'bg-amber-500',
      text: 'text-amber-600'
    }
  };

  const theme = ACCENT_COLORS[tone] || ACCENT_COLORS.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/70 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-slate-200/50 border-t-4 ${theme.border} hover:shadow-md transition-all duration-300`}
    >
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{title}</div>
          <div className="flex items-baseline gap-0.5">
            {prefix && <span className="text-lg font-bold text-slate-400">{prefix}</span>}
            <span className="text-2xl font-black text-slate-900 tracking-tight">{value}</span>
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${theme.iconBg} shadow-inner shrink-0`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      {subtext && (
        <div className="mt-3.5 flex items-center gap-1.5">
          <span className={`w-1.5 h-3.5 rounded-full ${theme.bar}`}></span>
          <span className={`text-[11px] font-bold ${
            delta !== undefined ? (Number(delta) >= 0 ? 'text-emerald-600' : 'text-rose-600') : theme.text
          }`}>
            {subtext}
          </span>
        </div>
      )}
    </motion.div>
  );
};

const HorizontalSubMetric = ({ title, value, valueColor = 'text-indigo-650' }) => (
  <div className="text-center px-4">
    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">{title}</div>
    <div className={`text-sm font-black ${valueColor}`}>{value}</div>
  </div>
);


function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/95 backdrop-blur-md p-3.5 shadow-xl text-xs">
      <div className="mb-2 font-bold text-slate-800 border-b border-slate-100 pb-1.5">{label}</div>
      {payload.map((item) => (
        <div key={item.name} className="flex min-w-[140px] justify-between items-center gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
            <span className="font-semibold text-slate-500">{item.name}</span>
          </div>
          <span className="font-black text-slate-800">{fmt(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function TaxDashboard() {
  const navigate = useNavigate();
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

  const dueDateString = useMemo(() => {
    if (summary.dueDate) {
      return new Date(summary.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }
    // Calculate fallback GSTR-3B due date
    const ref = customRange.endDate ? new Date(customRange.endDate) : new Date();
    const nextMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 20);
    return nextMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }, [summary.dueDate, customRange.endDate]);

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
    background: `
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
    <div className="min-h-full font-sans transition-all duration-300 pb-16" style={dashboardBgStyle}>
      <div className="px-4 py-6 sm:px-6">
        
        {/* Top Header Banner */}
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold text-[#5b61eb] tracking-widest uppercase mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5b61eb] animate-pulse"></span>
              GST REPORT CARD
            </div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">
              {getDashboardPeriodLabel()}
            </h1>
          </div>

          {/* Premium Capsule Pill Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-slate-200/50">
            <div className="inline-flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl">
              {['This Month', 'Last 3M', 'This Year', 'Custom'].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      // Reset custom parameters when clicking preset tabs
                      if (tab !== 'Custom') {
                        setCustomRange({ startDate: '', endDate: '' });
                      }
                    }}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-350 ${
                      isActive
                        ? 'bg-[#5b61eb] text-white shadow-md shadow-indigo-500/25'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/30'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Custom Interactive Elements Box */}
            {activeTab === 'Custom' && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-200/80 pt-2.5 sm:pt-0 sm:pl-3"
              >
                {/* Month Selector Option */}
                <div className="relative flex items-center justify-between gap-3 bg-white border border-slate-200/85 rounded-xl px-3.5 py-2 hover:border-[#5b61eb] transition-colors w-40 cursor-pointer shadow-inner-sm">
                  <div className="flex items-center gap-2">
                    <FaCalendarDays className="text-[#5b61eb]" size={12} />
                    <span className="text-xs font-extrabold text-slate-700">
                      {customRange.startDate ? 'Custom Dates' : new Date(customMonth + '-02').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <input
                    type="month"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    value={customMonth}
                    onChange={(e) => {
                      setCustomMonth(e.target.value);
                      setCustomRange({ startDate: '', endDate: '' }); // Clear manual range
                    }}
                  />
                </div>

                {/* Manual Start/End Date Range Selection */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customRange.startDate}
                    onChange={(e) => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="bg-white border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-[#5b61eb]"
                    placeholder="Start"
                  />
                  <span className="text-slate-400 font-bold text-xs">to</span>
                  <input
                    type="date"
                    value={customRange.endDate}
                    onChange={(e) => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="bg-white border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-[#5b61eb]"
                    placeholder="End"
                  />
                  {(customRange.startDate || customRange.endDate) && (
                    <button
                      onClick={() => setCustomRange({ startDate: '', endDate: '' })}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
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

        {/* Loading and Error States */}
        {loading ? (
          <div className="flex h-80 items-center justify-center text-[#5b61eb]">
            <FaCircleNotch className="animate-spin" size={32} />
          </div>
        ) : error ? (
          <Card className="text-rose-600 font-semibold p-6 text-center border-rose-100 bg-rose-50/20">
            {error}
          </Card>
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
              />
              <StatCard
                title="Output liability"
                value={fmt(summary.outputLiability)}
                icon={FaShieldHalved}
                tone="rose"
                delta={summary.momOutput}
                subtext={summary.momOutput !== undefined ? `${summary.momOutput >= 0 ? '↑' : '↓'} ${Math.abs(summary.momOutput).toFixed(1)}% MoM` : '—'}
              />
              <StatCard
                title="Input credit"
                value={fmt(summary.inputCredit)}
                icon={FaReceipt}
                tone="emerald"
                delta={summary.momInput}
                subtext={summary.momInput !== undefined ? `${summary.momInput >= 0 ? '↑' : '↓'} ${Math.abs(summary.momInput).toFixed(1)}% MoM` : '—'}
              />
              <StatCard
                title="Net GST payable"
                value={fmt(summary.netPayable)}
                icon={FaArrowTrendUp}
                tone="amber"
                subtext={dueDateString ? `Due ${dueDateString}` : 'No dues'}
              />
            </div>

            {/* Middle Row Charts */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
              {/* Card 5: Invoice Split Donut Chart */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/70 border border-slate-200/50 backdrop-blur-md p-6 rounded-2xl shadow-sm flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase mb-1">Invoice split</h3>
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
                      <span className="text-2xl font-black text-slate-900 leading-none">{totalCount}</span>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">total</span>
                    </div>
                  </div>

                  {/* Legends Detail table */}
                  <div className="flex-1 space-y-2.5 pl-2">
                    {donutData.map((item, idx) => {
                      const percent = totalCount > 0 ? Math.round((item.value / totalCount) * 100) : 0;
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                            <span className="font-bold text-slate-600">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900 mr-2">{item.value}</span>
                            <span className="text-[10px] font-bold text-slate-400">{percent}%</span>
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
                className="bg-white/70 border border-slate-200/50 backdrop-blur-md p-6 rounded-2xl shadow-sm flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase mb-1">Output vs input by GST slab</h3>
                  <div className="w-8 h-1 bg-[#5b61eb] rounded-full mb-2"></div>
                </div>

                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={slabData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="slab" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                      <YAxis
                        tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <Bar dataKey="output" name="Output" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="input" name="Input" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
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
                className="bg-white/70 border border-slate-200/50 backdrop-blur-md p-6 rounded-2xl shadow-sm flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase mb-1">6-month trend</h3>
                  <div className="w-8 h-1 bg-[#5b61eb] rounded-full mb-2"></div>
                </div>

                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendDataWithNet} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                      <YAxis
                        tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <Line type="monotone" dataKey="output" name="Output" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="input" name="Input" stroke="#10b981" strokeWidth={2.5} strokeDasharray="4 4" dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="net" name="Net Liability" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Horizontal Metrics Overlay */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-t border-slate-200/60 pt-5 mt-5 gap-y-4">
                  <HorizontalSubMetric
                    title="ITC utilisation"
                    value={pct(data?.itcUtilisation)}
                    valueColor="text-emerald-600"
                  />
                  <HorizontalSubMetric
                    title="IGST credit"
                    value={fmt(data?.igstCredit)}
                    valueColor="text-indigo-650"
                  />
                  <HorizontalSubMetric
                    title="CGST+SGST"
                    value={fmt(data?.cgstSgstCredit)}
                    valueColor="text-indigo-650"
                  />
                  <HorizontalSubMetric
                    title="Credit / output"
                    value={pct(data?.creditOutputRatio)}
                    valueColor="text-amber-600"
                  />
                </div>
              </motion.div>

              {/* Card 8: ITC Utilisation Progress box */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/70 border border-slate-200/50 backdrop-blur-md p-6 rounded-2xl shadow-sm flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase mb-1">ITC utilisation</h3>
                  <div className="w-8 h-1 bg-[#5b61eb] rounded-full mb-4"></div>
                </div>

                <div className="flex items-center justify-center py-4">
                  <div className="relative grid h-36 w-36 place-items-center rounded-full border-[12px] border-emerald-500 bg-emerald-50 shadow-inner">
                    <div className="text-center">
                      <div className="text-3xl font-black text-emerald-700 leading-none">{pct(data?.itcUtilisation)}</div>
                      <div className="text-[8px] font-extrabold uppercase text-emerald-500 tracking-wider mt-1.5">Credit/output</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 py-1.5"><span className="text-slate-500 font-medium">IGST credit</span><strong className="text-slate-900 font-bold">{fmt(data?.igstCredit)}</strong></div>
                  <div className="flex justify-between border-b border-slate-100 py-1.5"><span className="text-slate-500 font-medium">CGST+SGST credit</span><strong className="text-slate-900 font-bold">{fmt(data?.cgstSgstCredit)}</strong></div>
                  <div className="flex justify-between py-1.5"><span className="text-slate-500 font-medium">Credit/output ratio</span><strong className="text-slate-900 font-bold">{pct(data?.creditOutputRatio)}</strong></div>
                </div>
              </motion.div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
