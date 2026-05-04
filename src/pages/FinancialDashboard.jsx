import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FaArrowTrendUp, FaCalendarDays, FaFileInvoiceDollar, FaReceipt, FaShieldHalved } from 'react-icons/fa6';
import api from '../api/axios';

const money = (value, digits = 0) => `${'\u20b9'}${(Number(value) || 0).toLocaleString('en-IN', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
})}`;

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthRange = () => {
  const now = new Date();
  return {
    startDate: formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

const COLORS = ['#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#22d3ee'];

const FinancialDashboard = () => {
  const [range, setRange] = useState(getMonthRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(range);
        const res = await api.get(`/reports/tax-dashboard?${params.toString()}`, { signal: controller.signal });
        setData(res.data);
      } catch (fetchError) {
        if (fetchError.name === 'CanceledError' || fetchError.name === 'AbortError') return;
        console.error('Failed to load tax dashboard:', fetchError);
        setError(fetchError.response?.data?.message || 'Failed to load tax dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    return () => controller.abort();
  }, [range]);

  const summary = data?.summary || {};
  const gst = data?.gst || {};

  const expenseCategories = useMemo(() => (
    (data?.categories || []).map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length],
    }))
  ), [data]);

  const netProfitTone = Number(summary.netProfit) >= 0 ? 'text-emerald-200' : 'text-rose-200';

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Tax & Revenue Dashboard</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
            <FaCalendarDays className="ml-1 text-cyan-300" />
            <label htmlFor="dashboard-start-date" className="sr-only">Start date</label>
            <input
              id="dashboard-start-date"
              type="date"
              aria-label="Start date"
              value={range.startDate}
              onChange={(event) => setRange((prev) => ({ ...prev, startDate: event.target.value }))}
              className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
            />
            <span className="text-slate-500">to</span>
            <label htmlFor="dashboard-end-date" className="sr-only">End date</label>
            <input
              id="dashboard-end-date"
              type="date"
              aria-label="End date"
              value={range.endDate}
              onChange={(event) => setRange((prev) => ({ ...prev, endDate: event.target.value }))}
              className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
            />
          </div>
        </div>

        <div className="rounded-lg border border-cyan-300/30 bg-slate-900/80 p-4 shadow-[0_0_35px_rgba(34,211,238,0.12)] sm:p-6">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <div className="p-8 text-center text-red-400">{error}</div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1.1fr]">
                <section className="space-y-4">
                  <SectionTitle title="Income" />
                  <LedgerList rows={data?.recentIncome || []} type="income" />

                  <SectionTitle title="Expenses" />
                  <LedgerList rows={data?.recentExpenses || []} type="expense" />
                </section>

                <section className="flex flex-col justify-between gap-4">
                  <div className="rounded-lg border border-cyan-300/30 bg-slate-950/70 p-5 text-center shadow-[0_0_30px_rgba(168,85,247,0.22)]">
                    <div className="mb-2 text-sm font-semibold uppercase text-slate-300">Net Profit After Tax</div>
                    <div className={`text-4xl font-extrabold ${netProfitTone}`}>{money(summary.netProfit, 2)}</div>
                    <div className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase text-slate-300">
                      Monthly
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="GST Liability" value={gst.liability} tone="cyan" />
                    <Metric label="GST Credit" value={gst.credit} tone="emerald" />
                    <Metric label="Net GST Payable" value={gst.netPayable} tone="violet" />
                    <Metric label="Net Tax Payable" value={summary.netTaxPayable} tone="amber" />
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-slate-300">
                      <FaFileInvoiceDollar className="text-cyan-300" />
                      GST Split
                    </div>
                    <div className="space-y-3">
                      <TaxRow label="CGST" value={gst.cgst} total={gst.liability} />
                      <TaxRow label="SGST" value={gst.sgst} total={gst.liability} />
                      <TaxRow label="IGST" value={gst.igst} total={gst.liability} />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <SectionTitle title="Expense Categories" compact />
                    <div className="grid min-h-[210px] grid-cols-1 items-center gap-2 sm:grid-cols-[190px_1fr]">
                      <ResponsiveContainer width="100%" height={190}>
                        <PieChart>
                          <Pie data={expenseCategories} dataKey="total" innerRadius={54} outerRadius={78} paddingAngle={3}>
                            {expenseCategories.map((item) => (
                              <Cell key={item.name} fill={item.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => money(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {expenseCategories.map((item) => (
                          <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                            <span className="flex min-w-0 items-center gap-2 text-slate-300">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                              <span className="truncate">{item.name}</span>
                            </span>
                            <span className="font-semibold text-white">{money(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <SectionTitle title="Monthly Cash Flow Trends" compact />
                    <div className="h-[230px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data?.trend || []}>
                          <defs>
                            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#34d399" stopOpacity={0.45} />
                              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                          <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                          <Tooltip formatter={(value) => money(value)} contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }} />
                          <Area type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={3} fill="url(#revenueFill)" />
                          <Area type="monotone" dataKey="expenses" stroke="#a78bfa" strokeWidth={2} fill="transparent" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                <BottomMetric icon={<FaArrowTrendUp />} label="Total Revenue" value={summary.totalRevenue} />
                <BottomMetric icon={<FaReceipt />} label="Total Expenses" value={summary.totalExpenses} />
                <BottomMetric label="Receivable" value={summary.receivables} />
                <BottomMetric label="Payable" value={summary.payables} />
                <BottomMetric label="GST Liability" value={summary.gstLiability} />
                <BottomMetric label="TDS Deducted" value={summary.tdsDeducted} />
                <BottomMetric label="TDS Payable" value={summary.tdsPayable} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ title, compact = false }) => (
  <div className={`${compact ? 'mb-3' : 'mb-3 border-b border-white/10 pb-2'} text-sm font-bold uppercase tracking-wide text-slate-300`}>
    {title}
  </div>
);

const LedgerList = ({ rows, type }) => {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-500">
        No {type} entries for this period.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{row.party}</div>
              <div className="text-xs text-slate-500">{row.number}</div>
            </div>
            <span className="rounded-md border border-cyan-300/20 px-2 py-1 text-xs font-semibold text-cyan-200">
              GST {money(row.tax)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-white">{money(row.amount, 2)}</span>
            <span className={`text-xs font-semibold uppercase ${type === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {row.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const Metric = ({ label, value, tone }) => {
  const tones = {
    cyan: 'border-cyan-300/25 text-cyan-200',
    emerald: 'border-emerald-300/25 text-emerald-200',
    violet: 'border-violet-300/25 text-violet-200',
    amber: 'border-amber-300/25 text-amber-200',
  };

  return (
    <div className={`rounded-lg border bg-white/[0.03] p-4 ${tones[tone] || tones.cyan}`}>
      <div className="mb-2 text-xs font-bold uppercase text-slate-400">{label}</div>
      <div className="text-xl font-extrabold">{money(value)}</div>
    </div>
  );
};

const TaxRow = ({ label, value, total }) => {
  const rawPct = total > 0 ? (Number(value) / Number(total)) * 100 : 0;
  const pct = Math.max(0, Math.min(Number.isFinite(rawPct) ? rawPct : 0, 100));

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold text-slate-400">{label}</span>
        <span className="font-bold text-white">{money(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const BottomMetric = ({ icon, label, value }) => (
  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
      {icon && <span className="text-cyan-300">{icon}</span>}
      {label}
    </div>
    <div className="text-lg font-extrabold text-white">{money(value, 2)}</div>
  </div>
);

const LoadingState = () => (
  <div className="grid gap-4 md:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="h-40 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
    ))}
  </div>
);

export default FinancialDashboard;
