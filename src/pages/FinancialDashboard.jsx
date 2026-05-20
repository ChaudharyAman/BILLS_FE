import React, { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ComposedChart, Legend, Line, Pie, PieChart,
  RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  FaArrowTrendUp, FaCalendarDays, FaFileInvoiceDollar,
  FaReceipt, FaShieldHalved, FaWallet, FaChartLine, FaChartPie,
} from 'react-icons/fa6';
import api from '../api/axios';

const fmt = (v, d = 0) =>
  `₹${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}`;

const localDate = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
};
const monthRange = () => {
  const n = new Date();
  return { startDate: localDate(new Date(n.getFullYear(), n.getMonth(), 1)), endDate: localDate(new Date(n.getFullYear(), n.getMonth() + 1, 0)) };
};
const PALETTE = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const QRANGES = [
  { label: 'This Month', fn: monthRange },
  { label: 'Last 3M', fn: () => { const n = new Date(); return { startDate: localDate(new Date(n.getFullYear(), n.getMonth() - 2, 1)), endDate: localDate(new Date(n.getFullYear(), n.getMonth() + 1, 0)) }; } },
  { label: 'This Year', fn: () => { const n = new Date(); return { startDate: `${n.getFullYear()}-01-01`, endDate: `${n.getFullYear()}-12-31` }; } },
  { label: 'Custom', fn: null },
];

/* shared glass card wrapper */
const GW = ({ children, className = '', highlight = false }) => (
  <div className={`${highlight ? 'glass-water-highlight' : 'glass-water-card'} p-5 ${className}`}>{children}</div>
);

const SLabel = ({ children }) => (
  <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-3">{children}</div>
);

const TTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-water-card p-3 text-xs min-w-[140px] !rounded-xl">
      <div className="font-bold text-gray-500 mb-1.5">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const ProgBar = ({ label, value, total, color }) => {
  const w = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-500 font-semibold">{label}</span>
        <span className="text-gray-800 font-bold">{fmt(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/50 overflow-hidden border border-white/60">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w}%`, background: color }} />
      </div>
    </div>
  );
};

const LedgerRow = ({ row, type }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-white/40 last:border-0">
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${type === 'income' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-700 truncate">{row.party}</div>
        <div className="text-[11px] text-gray-400">{row.number}</div>
      </div>
    </div>
    <div className="text-right flex-shrink-0">
      <div className="text-sm font-bold text-gray-800">{fmt(row.amount, 2)}</div>
      <div className={`text-[10px] font-bold uppercase ${type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{row.status}</div>
    </div>
  </div>
);

const Skeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(99,102,241,0.07)' }} />
    ))}
  </div>
);

export default function FinancialDashboard() {
  const [qIdx, setQIdx] = useState(0);
  const [range, setRange] = useState(monthRange);
  const [customVisible, setCustomVisible] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); setError(null);
    api.get(`/reports/tax-dashboard?${new URLSearchParams(range)}`, { signal: ctrl.signal })
      .then(r => setData(r.data))
      .catch(e => { if (e.name !== 'CanceledError' && e.name !== 'AbortError') setError(e.response?.data?.message || 'Failed to load'); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [range]);

  const s = data?.summary || {};
  const gst = data?.gst || {};
  const trend = data?.trend || [];
  const overdue = data?.overdueInvoices || { total: 0, count: 0, aging: {} };
  const topClients = data?.topClients || [];
  const drafts = data?.draftCounts || { invoices: 0, expenses: 0, total: 0 };
  const prev = data?.previousPeriod || { revenue: 0, expenses: 0 };

  const delta = (curr, prior) => {
    if (!prior) return null;
    const pct = ((curr - prior) / prior) * 100;
    return { pct: Math.abs(pct).toFixed(1), up: pct >= 0 };
  };

  const catData = useMemo(() =>
    (data?.categories || []).map((c, i) => ({ ...c, fill: PALETTE[i % PALETTE.length] }))
  , [data]);

  const barData = useMemo(() =>
    trend.map(t => ({ month: t.month, Income: t.revenue, Expenses: t.expenses, Profit: Math.max(0, t.revenue - t.expenses) }))
  , [trend]);

  const radialData = [
    { name: 'CGST', value: gst.cgst || 0, fill: '#6366f1' },
    { name: 'SGST', value: gst.sgst || 0, fill: '#06b6d4' },
    { name: 'IGST', value: gst.igst || 0, fill: '#10b981' },
  ];

  const handleRange = (i) => {
    setQIdx(i);
    if (QRANGES[i].fn) { setRange(QRANGES[i].fn()); setCustomVisible(false); }
    else setCustomVisible(true);
  };

  const revDelta  = delta(s.totalRevenue, prev.revenue);
  const expDelta  = delta(s.totalExpenses, prev.expenses);

  const KPIs = [
    { label: 'Total Revenue',  value: fmt(s.totalRevenue),    icon: FaArrowTrendUp,      iconBg: 'rgba(16,185,129,0.12)',  iconColor: '#10b981', sub: `Tax: ${fmt(s.gstLiability)}`,  delta: revDelta,  deltaInvert: false },
    { label: 'Total Expenses', value: fmt(s.totalExpenses),   icon: FaReceipt,            iconBg: 'rgba(236,72,153,0.12)',  iconColor: '#ec4899', sub: `Credit: ${fmt(s.gstCredit)}`, delta: expDelta,  deltaInvert: true  },
    { label: 'Receivable',     value: fmt(s.receivables, 2),  icon: FaWallet,             iconBg: 'rgba(6,182,212,0.12)',   iconColor: '#06b6d4', sub: 'Unpaid invoices',             delta: null },
    { label: 'Payable',        value: fmt(s.payables, 2),     icon: FaFileInvoiceDollar,  iconBg: 'rgba(245,158,11,0.12)', iconColor: '#f59e0b', sub: 'Unpaid expenses',             delta: null },
    { label: 'GST Liability',  value: fmt(s.gstLiability),    icon: FaShieldHalved,       iconBg: 'rgba(139,92,246,0.12)', iconColor: '#8b5cf6', sub: `Net: ${fmt(s.netGstPayable)}`, delta: null },
    { label: 'TDS Deducted',   value: fmt(s.tdsDeducted),     icon: FaChartLine,          iconBg: 'rgba(99,102,241,0.12)', iconColor: '#6366f1', sub: null,                          delta: null },
    { label: 'TDS Payable',    value: fmt(s.tdsPayable),      icon: FaChartPie,           iconBg: 'rgba(236,72,153,0.12)', iconColor: '#ec4899', sub: null,                          delta: null },
    { label: 'Pending POs',    value: fmt(s.pendingPO),       icon: FaFileInvoiceDollar,  iconBg: 'rgba(245,158,11,0.12)', iconColor: '#f59e0b', sub: `${s.pendingPOCount || 0} orders`, delta: null },
  ];

  return (
    <div className="glass-water-bg min-h-full p-4 sm:p-6 font-sans">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-rise-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">Financial Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Tax · Revenue · GST · Cash Flow</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Range pills */}
          <div className="glass-water-pill flex gap-1 p-1.5">
            {QRANGES.map((r, i) => (
              <button key={r.label} onClick={() => handleRange(i)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${qIdx === i ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200' : 'text-gray-500 hover:text-gray-800'}`}>
                {r.label}
              </button>
            ))}
          </div>
          {customVisible && (
            <div className="glass-water-pill flex items-center gap-2 px-3 py-2">
              <FaCalendarDays className="text-indigo-400" size={13} />
              <input type="date" value={range.startDate} onChange={e => setRange(p => ({ ...p, startDate: e.target.value }))}
                className="bg-transparent text-xs text-gray-700 outline-none" />
              <span className="text-gray-300">–</span>
              <input type="date" value={range.endDate} onChange={e => setRange(p => ({ ...p, endDate: e.target.value }))}
                className="bg-transparent text-xs text-gray-700 outline-none" />
            </div>
          )}
        </div>
      </div>

      {loading ? <Skeleton /> : error ? (
        <GW className="text-center text-rose-500">{error}</GW>
      ) : (
        <>
      {/* ── Draft Warning Banner ── */}
      {drafts.total > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl animate-rise-in" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}>
          <span className="text-amber-500 text-lg">⚠️</span>
          <span className="text-sm font-semibold text-amber-700">
            You have <strong>{drafts.invoices}</strong> draft invoice{drafts.invoices !== 1 ? 's' : ''}
            {drafts.expenses > 0 ? ` and <strong>${drafts.expenses}</strong> draft expense${drafts.expenses !== 1 ? 's' : ''}` : ''} that are excluded from reports.
          </span>
        </div>
      )}

          {/* ── 8 KPI Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
            {KPIs.map((k, i) => {
              const good = k.delta ? (k.deltaInvert ? !k.delta.up : k.delta.up) : null;
              return (
                <div key={k.label} className="glass-water-card p-4 animate-rise-in" style={{ animationDelay: `${i * 55}ms` }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.iconBg }}>
                      <k.icon size={14} style={{ color: k.iconColor }} />
                    </div>
                    {k.delta && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${good ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                        {k.delta.up ? '↑' : '↓'}{k.delta.pct}%
                      </span>
                    )}
                  </div>
                  <div className="text-base font-extrabold text-gray-800 animate-count-up">{k.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-0.5">{k.label}</div>
                  {k.sub && <div className="text-[10px] text-gray-400 mt-1">{k.sub}</div>}
                </div>
              );
            })}
          </div>

          {/* Net Profit highlight bar */}
          <div className="glass-water-highlight p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-rise-in" style={{ animationDelay: '420ms' }}>
            <div>
              <div className="text-[10px] font-bold uppercase text-indigo-400 tracking-widest mb-1">Net Profit After Tax</div>
              <div className={`text-4xl font-black ${Number(s.netProfit) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {fmt(s.netProfit, 2)}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { l: 'Net GST Payable', v: s.netGstPayable, bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.25)', c: '#8b5cf6' },
                { l: 'Net Tax Payable', v: s.netTaxPayable, bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', c: '#f59e0b' },
                { l: 'TCS Collected',   v: s.tcsCollected,  bg: 'rgba(6,182,212,0.10)',  border: 'rgba(6,182,212,0.25)',  c: '#06b6d4' },
              ].map(m => (
                <div key={m.l} className="rounded-2xl px-4 py-3 text-center" style={{ background: m.bg, border: `1px solid ${m.border}` }}>
                  <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: m.c }}>{m.l}</div>
                  <div className="text-xl font-extrabold mt-0.5" style={{ color: m.c }}>{fmt(m.v)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Overdue Invoices Aging ── */}
          {overdue.total > 0 && (
            <div className="glass-water-card p-5 mb-5 animate-rise-in" style={{ animationDelay: '480ms', border: '1px solid rgba(236,72,153,0.25)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-rose-400 mb-0.5">⚡ Overdue Invoices</div>
                  <div className="text-2xl font-black text-rose-600">{fmt(overdue.total, 2)} <span className="text-sm font-semibold text-rose-400">({overdue.count} invoice{overdue.count !== 1 ? 's' : ''})</span></div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[['0–30 days', overdue.aging?.d0_30, '#f59e0b'], ['31–60 days', overdue.aging?.d31_60, '#f97316'], ['61–90 days', overdue.aging?.d61_90, '#ef4444'], ['90+ days', overdue.aging?.d90plus, '#be123c']].map(([label, val, color]) => (
                  <div key={label} className="glass-water-inner p-3 text-center">
                    <div className="text-sm font-extrabold" style={{ color }}>{fmt(val || 0)}</div>
                    <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="flex gap-2 mb-5">
            {[{ id: 'overview', label: '📊 Overview' }, { id: 'gst', label: '🧾 GST' }, { id: 'ledger', label: '📋 Ledger' }, { id: 'analytics', label: '📈 Analytics' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t.id ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200' : 'glass-water-pill text-gray-500 hover:text-gray-800'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ══ OVERVIEW ══ */}
          {tab === 'overview' && (
            <div className="space-y-5 animate-rise-in">
              <GW>
                <SLabel>Revenue vs Expenses — Monthly</SLabel>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={barData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="lInc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} /><stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                        </linearGradient>
                        <linearGradient id="lExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ec4899" stopOpacity={0.9} /><stop offset="100%" stopColor="#ec4899" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(99,102,241,0.08)" vertical={false} />
                      <XAxis dataKey="month" stroke="#9ca3af" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip content={<TTip />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
                      <Bar dataKey="Income" fill="url(#lInc)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="Expenses" fill="url(#lExp)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      <Line type="monotone" dataKey="Profit" name="Net Profit" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </GW>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <GW>
                  <SLabel>Cash Flow Trend (6 months)</SLabel>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend}>
                        <defs>
                          <linearGradient id="aInc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="aExp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.20} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(99,102,241,0.08)" vertical={false} />
                        <XAxis dataKey="month" stroke="#9ca3af" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                        <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                        <Tooltip content={<TTip />} />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#aInc)" />
                        <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#6366f1" strokeWidth={2} fill="url(#aExp)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GW>

                <GW>
                  <SLabel>Expense Breakdown by Category</SLabel>
                  {catData.length === 0 ? (
                    <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data for period.</div>
                  ) : (
                    <div className="flex items-center gap-4 h-52">
                      <ResponsiveContainer width={148} height="100%">
                        <PieChart>
                          <Pie data={catData} dataKey="total" innerRadius={46} outerRadius={66} paddingAngle={3}>
                            {catData.map(c => <Cell key={c.name} fill={c.fill} />)}
                          </Pie>
                          <Tooltip content={<TTip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2 overflow-y-auto max-h-44 no-scrollbar pr-1">
                        {catData.map(c => (
                          <div key={c.name} className="flex items-center justify-between text-xs glass-water-inner px-2.5 py-1.5">
                            <span className="flex items-center gap-2 text-gray-600">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.fill }} />
                              <span className="truncate max-w-[90px]">{c.name}</span>
                            </span>
                            <span className="font-bold text-gray-800">{fmt(c.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </GW>
              </div>
            </div>
          )}

          {/* ══ GST ══ */}
          {tab === 'gst' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-rise-in">
              <GW>
                <SLabel>GST Summary</SLabel>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { l: 'GST Liability',   v: gst.liability,    c: '#ec4899' },
                    { l: 'GST Credit',      v: gst.credit,       c: '#10b981' },
                    { l: 'Net GST Payable', v: gst.netPayable,   c: '#6366f1' },
                    { l: 'Net Tax Payable', v: s.netTaxPayable,  c: '#f59e0b' },
                  ].map(m => (
                    <div key={m.l} className="glass-water-inner p-3">
                      <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">{m.l}</div>
                      <div className="text-xl font-extrabold" style={{ color: m.c }}>{fmt(m.v)}</div>
                    </div>
                  ))}
                </div>
                <SLabel>GST Split</SLabel>
                <div className="space-y-3">
                  <ProgBar label="CGST" value={gst.cgst} total={gst.liability} color="#6366f1" />
                  <ProgBar label="SGST" value={gst.sgst} total={gst.liability} color="#06b6d4" />
                  <ProgBar label="IGST" value={gst.igst} total={gst.liability} color="#10b981" />
                </div>
              </GW>

              <GW>
                <SLabel>GST Component Radial</SLabel>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="30%" outerRadius="90%" data={radialData} startAngle={180} endAngle={-180}>
                      <RadialBar dataKey="value" cornerRadius={6} label={{ position: 'insideStart', fill: '#fff', fontSize: 10, fontWeight: 'bold' }} />
                      <Tooltip content={<TTip />} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass-water-inner p-3 mt-3">
                  <div className="text-[11px] text-indigo-500 font-bold mb-1">💡 RCM Note</div>
                  <div className="text-[11px] text-gray-500 leading-relaxed">
                    Invoices with Reverse Charge exclude GST from their grand total. Tax here reflects full recorded GST for GSTR filing.
                  </div>
                </div>
              </GW>

              <GW className="lg:col-span-2">
                <SLabel>Revenue vs Expenses — Monthly</SLabel>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="rgba(99,102,241,0.08)" vertical={false} />
                      <XAxis dataKey="month" stroke="#9ca3af" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip content={<TTip />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
                      <Bar dataKey="revenue" name="Revenue" fill="#10b981" opacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={26} />
                      <Bar dataKey="expenses" name="Expenses" fill="#6366f1" opacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={26} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GW>
            </div>
          )}

          {/* ══ LEDGER ══ */}
          {tab === 'ledger' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-rise-in">
              <GW>
                <SLabel>Recent Income</SLabel>
                {!(data?.recentIncome?.length)
                  ? <div className="py-8 text-center text-gray-400 text-sm">No income entries for this period.</div>
                  : data.recentIncome.map(r => <LedgerRow key={r.id} row={r} type="income" />)}
              </GW>
              <GW>
                <SLabel>Recent Expenses</SLabel>
                {!(data?.recentExpenses?.length)
                  ? <div className="py-8 text-center text-gray-400 text-sm">No expense entries for this period.</div>
                  : data.recentExpenses.map(r => <LedgerRow key={r.id} row={r} type="expense" />)}
              </GW>
              <GW className="lg:col-span-2">
                <SLabel>Receivables vs Payables</SLabel>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { l: 'Receivables (Unpaid Invoices)', v: s.receivables, c: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
                    { l: 'Payables (Unpaid Expenses)',    v: s.payables,    c: '#ec4899', bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.25)' },
                  ].map(m => (
                    <div key={m.l} className="rounded-2xl p-5 text-center" style={{ background: m.bg, border: `1px solid ${m.border}`, backdropFilter: 'blur(10px)' }}>
                      <div className="text-3xl font-black mb-2" style={{ color: m.c }}>{fmt(m.v, 2)}</div>
                      <div className="text-xs text-gray-400 font-semibold uppercase">{m.l}</div>
                    </div>
                  ))}
                </div>
              </GW>
            </div>
          )}

          {/* ══ ANALYTICS ══ */}
          {tab === 'analytics' && (
            <div className="space-y-5 animate-rise-in">
              <GW>
                <SLabel>Top 5 Clients by Revenue</SLabel>
                {topClients.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">No client revenue data for this period.</div>
                ) : (
                  <div className="space-y-3">
                    {topClients.map((c, i) => {
                      const max = topClients[0]?.total || 1;
                      const w = Math.min((c.total / max) * 100, 100);
                      return (
                        <div key={c.name}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-semibold text-gray-600 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: PALETTE[i % PALETTE.length] }}>{i + 1}</span>
                              {c.name}
                            </span>
                            <span className="font-bold text-gray-800">{fmt(c.total)}</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-white/50 overflow-hidden border border-white/60">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w}%`, background: PALETTE[i % PALETTE.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GW>

              <GW>
                <SLabel>Monthly Invoice Volume (6 months)</SLabel>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="rgba(99,102,241,0.08)" vertical={false} />
                      <XAxis dataKey="month" stroke="#9ca3af" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip content={<TTip />} />
                      <Bar dataKey="invoiceCount" name="Invoices" fill="#6366f1" opacity={0.85} radius={[6, 6, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GW>

              <GW className="">
                <SLabel>Drafts Pending Review</SLabel>
                <div className="grid grid-cols-2 gap-4">
                  {[['Draft Invoices', drafts.invoices, '#6366f1', 'rgba(99,102,241,0.10)'], ['Draft Expenses', drafts.expenses, '#f59e0b', 'rgba(245,158,11,0.10)']].map(([label, count, color, bg]) => (
                    <div key={label} className="rounded-2xl p-5 text-center" style={{ background: bg, border: `1px solid ${color}30` }}>
                      <div className="text-4xl font-black" style={{ color }}>{count}</div>
                      <div className="text-xs text-gray-400 font-semibold uppercase mt-1">{label}</div>
                      {count > 0 && <div className="text-[10px] text-gray-400 mt-1">Not included in reports</div>}
                    </div>
                  ))}
                </div>
              </GW>
            </div>
          )}
        </>
      )}
    </div>
  );
}
