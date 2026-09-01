import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ComposedChart, Legend, Line, Pie, PieChart,
  RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  FaArrowTrendUp, FaCalendarDays, FaFileInvoiceDollar,
  FaReceipt, FaShieldHalved, FaWallet, FaChartLine, FaChartPie,
  FaBriefcase, FaBook, FaSun, FaMoon, FaEye,
} from 'react-icons/fa6';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import TaxDashboard from './TaxDashboard';
import { getStoredTheme, setGlobalTheme } from '../utils/theme';

const fmt = (v, d = 0) =>
  `₹${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}`;

const formatYAxis = (v) => {
  if (v === 0) return '0';
  if (Math.abs(v) >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
};

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

const ThemeContext = React.createContext(false);

/* shared glass card wrapper */
const GW = ({ children, className = '', highlight = false }) => {
  const darkMode = React.useContext(ThemeContext);
  return (
    <div className={`p-5 transition-all duration-300 rounded-2xl border ${
      highlight 
        ? (darkMode ? 'border-indigo-900/45 bg-indigo-950/40 shadow-lg shadow-indigo-950/20' : 'glass-water-highlight') 
        : (darkMode ? 'border-slate-800/80 bg-slate-900/60 shadow-md shadow-slate-950/20' : 'glass-water-card')
    } ${className}`}>{children}</div>
  );
};

const SLabel = ({ children }) => {
  const darkMode = React.useContext(ThemeContext);
  return (
    <div className={`text-[10px] font-bold uppercase tracking-widest mb-2.5 ${
      darkMode ? 'text-indigo-400' : 'text-indigo-600'
    }`}>{children}</div>
  );
};

const TTip = ({ active, payload, label }) => {
  const darkMode = React.useContext(ThemeContext);
  if (!active || !payload?.length) return null;
  return (
    <div className={`p-3 text-xs min-w-[140px] rounded-xl border ${
      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200 shadow-xl shadow-slate-950/50' : 'glass-water-card border-white/60'
    }`}>
      <div className="font-bold text-gray-500 mb-1.5">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className={`font-bold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const ProgBar = ({ label, value, total, color }) => {
  const darkMode = React.useContext(ThemeContext);
  const w = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className={`font-semibold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{label}</span>
        <span className={`font-bold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{fmt(value)}</span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden border ${
        darkMode ? 'bg-slate-950 border-slate-800/80' : 'bg-white/50 border-white/60'
      }`}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w}%`, background: color }} />
      </div>
    </div>
  );
};

const LedgerRow = ({ row, type }) => {
  const darkMode = React.useContext(ThemeContext);
  return (
    <div className={`flex items-center justify-between py-2.5 border-b last:border-0 ${
      darkMode ? 'border-slate-800/50' : 'border-white/40'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${type === 'income' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
        <div className="min-w-0">
          <div className={`text-sm font-semibold truncate ${darkMode ? 'text-slate-200' : 'text-gray-700'}`}>{row.party}</div>
          <div className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>{row.number}</div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>{fmt(row.amount, 2)}</div>
        <div className={`text-[10px] font-bold uppercase ${type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{row.status}</div>
      </div>
    </div>
  );
};

const Skeleton = () => {
  const darkMode = React.useContext(ThemeContext);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.07)' }} />
      ))}
    </div>
  );
};

export default function FinancialDashboard() {
  const [darkMode, setDarkMode] = useState(getStoredTheme);

  useEffect(() => {
    const onThemeSync = (e) => {
      if (e.detail && typeof e.detail.isDark === 'boolean') {
        setDarkMode(e.detail.isDark);
      } else {
        setDarkMode(getStoredTheme());
      }
    };
    window.addEventListener('app-theme-sync', onThemeSync);
    return () => window.removeEventListener('app-theme-sync', onThemeSync);
  }, []);

  const [activeTab, setActiveTab] = useState('This Month');
  const [customMonth, setCustomMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [customRange, setCustomRange] = useState({
    startDate: '',
    endDate: '',
  });
  const monthInputRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');
  const [businessUnits, setBusinessUnits] = useState([]);
  const [businessUnitFilter, setBusinessUnitFilter] = useState('');

  useEffect(() => {
    api.get('/business-units?status=active').then(r => setBusinessUnits(r.data || [])).catch(() => {});
  }, []);

  const [payrollSummary, setPayrollSummary] = useState(null);
  const [payrollLoadingState, setPayrollLoadingState] = useState(false);
  const [selectedSourceDetail, setSelectedSourceDetail] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSourceItemStatusChange = async (item, newStatus) => {
    if (item.status === newStatus) return;
    try {
      const itemId = item.id || item._id;
      if (item.source && item.source.includes('Expense')) {
        await api.put(`/expenses/${itemId}`, { status: newStatus });
      } else if (item.source && item.source.includes('Invoice')) {
        await api.put(`/invoices/${itemId}`, { status: newStatus });
      } else {
        try {
          await api.put(`/expenses/${itemId}`, { status: newStatus });
        } catch (e) {
          await api.put(`/invoices/${itemId}`, { status: newStatus });
        }
      }
      setSelectedSourceDetail(prev => prev ? {
        ...prev,
        items: prev.items.map(i => ((i.id || i._id) === itemId) ? { ...i, status: newStatus } : i)
      } : null);
      setRefreshKey(k => k + 1);
    } catch (e) {
      console.error('Failed to update status:', e);
      alert(e.response?.data?.message || 'Failed to update status');
    }
  };

  const handleViewSource = (label) => {
    if (label === 'Total Revenue') {
      setSelectedSourceDetail({
        title: 'Total Revenue',
        formula: 'Active Invoices + Manual Income in selected period (excludes drafts)',
        items: data?.revenueItems || [],
        linkTo: '/invoices',
        linkLabel: 'Go to Invoices'
      });
    } else if (label === 'Total Expenses') {
      setSelectedSourceDetail({
        title: 'Total Expenses',
        formula: 'Expenses (excluding DRAFT and CANCELLED) within selected period',
        items: data?.expenseItems || [],
        linkTo: '/expenses',
        linkLabel: 'Go to Expenses'
      });
    } else if (label === 'GST Liability') {
      setSelectedSourceDetail({
        title: 'GST Liability',
        formula: 'Output GST on active Invoices within selected period',
        items: data?.gstLiabilityItems || [],
        linkTo: '/reports/gst',
        linkLabel: 'Go to GST Reports'
      });
    } else if (label === 'TDS Deducted') {
      setSelectedSourceDetail({
        title: 'TDS Deducted',
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
    } else if (label === 'Pending POs') {
      setSelectedSourceDetail({
        title: 'Pending POs',
        formula: 'Active Purchase Orders excluding DRAFT, RECEIVED, BILLED, and CANCELLED',
        items: data?.pendingPOItems || [],
        linkTo: '/purchase-orders',
        linkLabel: 'Go to Purchase Orders'
      });
    }
  };

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

  useEffect(() => {
    if (tab !== 'payroll') return;

    let isCancelled = false;
    const fetchPayrollDashboardData = async () => {
      try {
        setPayrollLoadingState(true);
        const [empRes, payrollRes, loanRes, claimRes] = await Promise.all([
          api.get('/employees'),
          api.get('/payroll?limit=200'),
          api.get('/loans'),
          api.get('/reimbursements')
        ]);

        if (isCancelled) return;

        const employees = empRes.data?.data || empRes.data || [];
        const payrolls = payrollRes.data?.data || payrollRes.data || [];
        const loans = loanRes.data || [];
        const claims = claimRes.data || [];

        // Compute statistics
        const activeEmployees = employees.filter(e => !e.leavingDate || new Date(e.leavingDate) > new Date());
        const totalHeadcount = activeEmployees.length;

        // Sum payroll net salary in the selected/current month
        const currentMonthPayrolls = payrolls.filter(p => p.month === (new Date().getMonth() + 1));
        const totalMonthlyNetSalary = currentMonthPayrolls.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
        const totalMonthlyCTC = currentMonthPayrolls.reduce((sum, p) => sum + (Number(p.monthlyCTC) || 0), 0);

        // Loans statistics
        const activeLoans = loans.filter(l => l.status === 'active');
        const pendingLoans = loans.filter(l => l.status === 'pending_approval');
        const totalOutstandingLoans = activeLoans.reduce((sum, l) => sum + (Number(l.remainingBalance) || 0), 0);

        // Claims statistics
        const approvedClaims = claims.filter(c => c.status === 'approved');
        const pendingClaims = claims.filter(c => c.status === 'pending');
        const totalApprovedClaims = approvedClaims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const totalPendingClaims = pendingClaims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

        // Payroll history by month (last 6 months)
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const getMName = (m) => MONTHS[(m - 1) % 12] || '';
        const trendMap = {};
        payrolls.forEach(p => {
          const key = `${p.monthName || getMName(p.month)} ${p.year}`;
          if (!trendMap[key]) {
            trendMap[key] = { month: key, netSalary: 0, ctc: 0 };
          }
          trendMap[key].netSalary += (Number(p.netSalary) || 0);
          trendMap[key].ctc += (Number(p.monthlyCTC) || 0);
        });

        const trendData = Object.values(trendMap).slice(-6);

        setPayrollSummary({
          totalHeadcount,
          totalMonthlyNetSalary,
          totalMonthlyCTC,
          activeLoansCount: activeLoans.length,
          pendingLoansCount: pendingLoans.length,
          totalOutstandingLoans,
          approvedClaimsCount: approvedClaims.length,
          pendingClaimsCount: pendingClaims.length,
          totalApprovedClaims,
          totalPendingClaims,
          trendData,
          employees: employees.slice(0, 5), // top 5 employees for listing
          recentLoans: loans.slice(0, 5),
          recentClaims: claims.slice(0, 5)
        });
      } catch (err) {
        console.error('Error fetching payroll dashboard data:', err);
      } finally {
        if (!isCancelled) {
          setPayrollLoadingState(false);
        }
      }
    };

    fetchPayrollDashboardData();
    return () => {
      isCancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); setError(null);

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

    if (businessUnitFilter) {
      params.businessUnit = businessUnitFilter;
    }

    api.get(`/reports/tax-dashboard?${new URLSearchParams(params)}`, { signal: ctrl.signal })
      .then(r => setData(r.data))
      .catch(e => { if (e.name !== 'CanceledError' && e.name !== 'AbortError') setError(e.response?.data?.message || 'Failed to load'); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [activeTab, customMonth, customRange.startDate, customRange.endDate, businessUnitFilter, refreshKey]);

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


  const revDelta = delta(s.totalRevenue, prev.revenue);
  const expDelta = delta(s.totalExpenses, prev.expenses);

  const KPIs = [
    { label: 'Total Revenue', value: fmt(s.totalRevenue), icon: FaArrowTrendUp, iconBg: 'rgba(16,185,129,0.12)', iconColor: '#10b981', sub: `Tax: ${fmt(s.gstLiability)}`, delta: revDelta, deltaInvert: false },
    { label: 'Total Expenses', value: fmt(s.totalExpenses), icon: FaReceipt, iconBg: 'rgba(236,72,153,0.12)', iconColor: '#ec4899', sub: `Credit: ${fmt(s.gstCredit)}`, delta: expDelta, deltaInvert: true },
    { label: 'GST Liability', value: fmt(s.gstLiability), icon: FaShieldHalved, iconBg: 'rgba(139,92,246,0.12)', iconColor: '#8b5cf6', sub: `Net: ${fmt(s.netGstPayable)}`, delta: null },
    { label: 'TDS Deducted', value: fmt(s.tdsDeducted), icon: FaChartLine, iconBg: 'rgba(99,102,241,0.12)', iconColor: '#6366f1', sub: null, delta: null },
    { label: 'TDS Payable', value: fmt(s.tdsPayable), icon: FaChartPie, iconBg: 'rgba(236,72,153,0.12)', iconColor: '#ec4899', sub: null, delta: null },
    { label: 'Pending POs', value: fmt(s.pendingPO), icon: FaFileInvoiceDollar, iconBg: 'rgba(245,158,11,0.12)', iconColor: '#f59e0b', sub: `${s.pendingPOCount || 0} orders`, delta: null },
  ];

  return (
    <ThemeContext.Provider value={darkMode}>
      <div className={`min-h-full font-sans transition-all duration-300 p-4 sm:p-6`} style={dashboardBgStyle}>
        {/* ── Header ── */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-rise-in">
          <div>
            <div className={`flex items-center gap-2 text-[9px] font-extrabold tracking-widest uppercase mb-1 ${darkMode ? 'text-[#818cf8]' : 'text-[#5b61eb]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${darkMode ? 'bg-[#818cf8]' : 'bg-[#5b61eb]'}`}></span>
              FINANCIAL REPORT CARD
            </div>
            <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-950'}`}>Financial Dashboard</h1>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>Tax · Revenue · GST · Cash Flow</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Dark Mode Switcher */}
            <button
              onClick={() => {
                const nextTheme = !darkMode;
                setDarkMode(nextTheme);
                setGlobalTheme(nextTheme);
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

              {/* Business Unit Selector */}
              <div className="flex items-center">
                <select
                  value={businessUnitFilter}
                  onChange={(e) => setBusinessUnitFilter(e.target.value)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-sm ${
                    darkMode 
                      ? 'bg-slate-800/90 border-slate-700 text-slate-200 focus:border-indigo-500' 
                      : 'bg-white border-slate-200/90 text-slate-700 focus:border-indigo-600'
                  }`}
                >
                  <option value="">All Business Units</option>
                  {businessUnits.map(bu => (
                    <option key={bu._id} value={bu._id}>{bu.name} ({bu.code})</option>
                  ))}
                </select>
              </div>

              {/* Custom Month/Date picker box */}
              {activeTab === 'Custom' && (
                <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 border-t sm:border-t-0 sm:border-l pt-2.5 sm:pt-0 sm:pl-3 ${
                  darkMode ? 'border-slate-800' : 'border-slate-200/80'
                }`}>
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
                        title="Clear date range"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? <Skeleton /> : error ? (
          <GW className="text-center text-rose-500">{error}</GW>
        ) : (
          <>
            {/* ── Draft Warning Banner ── */}
            {drafts.total > 0 && (
              <div className="mb-4 flex items-center gap-3 px-4 py-2.5 rounded-xl border animate-rise-in font-sans" style={{ background: darkMode ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.08)', borderColor: darkMode ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.20)' }}>
                <span className="text-amber-500 text-lg">⚠️</span>
                <span className={`text-xs font-semibold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                  You have <strong>{drafts.invoices}</strong> draft invoice{drafts.invoices !== 1 ? 's' : ''}
                  {drafts.expenses > 0 ? ` and <strong>${drafts.expenses}</strong> draft expense${drafts.expenses !== 1 ? 's' : ''}` : ''} that are excluded from reports.
                </span>
              </div>
            )}

            {/* ── 6 KPI Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
              {KPIs.map((k, i) => {
                const good = k.delta ? (k.deltaInvert ? !k.delta.up : k.delta.up) : null;
                return (
                  <div key={k.label} className={`p-4 rounded-xl border animate-rise-in transition-all duration-300 hover:translate-y-[-3px] ${
                    darkMode 
                      ? 'border-slate-800/80 bg-slate-900/60 shadow-md shadow-slate-950/20' 
                      : 'glass-water-card'
                  }`} style={{ animationDelay: `${i * 55}ms` }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.iconBg }}>
                        <k.icon size={14} style={{ color: k.iconColor }} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {k.delta && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg shrink-0 ${
                            good 
                              ? (darkMode ? 'bg-emerald-950/50 text-emerald-400' : 'bg-emerald-50 text-emerald-600') 
                              : (darkMode ? 'bg-rose-950/50 text-rose-400' : 'bg-rose-50 text-rose-500')
                          }`}>
                            {k.delta.up ? '↑' : '↓'}{k.delta.pct}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`text-sm sm:text-base font-extrabold animate-count-up ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>{k.value}</div>
                    <div 
                      onClick={() => handleViewSource(k.label)}
                      className={`text-[9px] font-bold uppercase tracking-wide mt-0.5 cursor-pointer hover:underline hover:text-indigo-500 transition-colors ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}
                      title={`Click to view ${k.label} source details`}
                    >
                      {k.label}
                    </div>
                    {k.sub && <div className={`text-[9px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>{k.sub}</div>}
                  </div>
                );
              })}
            </div>



          {/* Net Profit highlight bar */}
          <div className="glass-water-highlight p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-rise-in" style={{ 
            animationDelay: '420ms',
            borderLeft: Number(s.netProfit) >= 0 ? '4px solid #10b981' : '4px solid #f43f5e',
            background: Number(s.netProfit) >= 0 ? 'rgba(16,185,129,0.04)' : 'rgba(244,63,94,0.04)'
          }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span 
                  onClick={() => {
                    setSelectedSourceDetail({
                      title: 'Net Profit After Tax',
                      formula: 'Total Revenue (Invoices + Manual Income) - Total Expenses',
                      items: [
                        ...(data?.revenueItems || []).map(r => ({ ...r, source: `${r.source} (Revenue)` })),
                        ...(data?.expenseItems || []).map(e => ({ ...e, amount: -e.amount, source: 'Expense (Deduction)' }))
                      ].sort((a, b) => new Date(b.date) - new Date(a.date)),
                      linkTo: '/reports/profit-loss',
                      linkLabel: 'Go to Profit & Loss'
                    });
                  }}
                  className="text-[10px] font-bold uppercase text-indigo-455 tracking-widest cursor-pointer hover:underline hover:text-indigo-400 transition-colors"
                  title="Click to view Net Profit source details"
                >
                  Net Profit After Tax
                </span>
              </div>
              <div className={`text-3xl font-black ${Number(s.netProfit) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {fmt(s.netProfit, 2)}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { l: 'Net GST Payable', v: s.netGstPayable, bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.20)', c: '#8b5cf6' },
                { l: 'Combined Tax Outflow', v: s.netTaxPayable, bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.20)', c: '#f59e0b' },
                { l: 'TCS Collected', v: s.tcsCollected, bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.20)', c: '#06b6d4' },
              ].map(m => (
                <div key={m.l} className="rounded-xl px-3.5 py-2 text-center border transition-all hover:scale-[1.03]" style={{ background: m.bg, borderColor: m.border }}>
                  <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: m.c }}>{m.l}</div>
                  <div className="text-lg font-extrabold mt-0.5" style={{ color: m.c }}>{fmt(m.v)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Overdue Invoices Aging ── */}
          {overdue.total > 0 && (
            <div className="glass-water-card p-5 mb-5 animate-rise-in" style={{ animationDelay: '480ms', borderLeft: '4px solid #f43f5e', background: 'rgba(244,63,94,0.04)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-0.5">⚡ Overdue Invoices</div>
                  <div className="text-2xl font-black text-rose-600">{fmt(overdue.total, 2)} <span className="text-sm font-semibold text-rose-400">({overdue.count} invoice{overdue.count !== 1 ? 's' : ''})</span></div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[['0–30 days', overdue.aging?.d0_30, '#f59e0b'], ['31–60 days', overdue.aging?.d31_60, '#f97316'], ['61–90 days', overdue.aging?.d61_90, '#ef4444'], ['90+ days', overdue.aging?.d90plus, '#be123c']].map(([label, val, color]) => (
                  <div key={label} className="glass-water-inner p-3 text-center border border-white/60">
                    <div className="text-sm font-extrabold" style={{ color }}>{fmt(val || 0)}</div>
                    <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="flex gap-2 mb-5 w-full">
            {[
              { id: 'overview', label: 'Overview', icon: FaChartPie },
              { id: 'gst', label: 'GST/TDS', icon: FaReceipt },
              { id: 'ledger', label: 'Ledger', icon: FaBook },
              { id: 'analytics', label: 'Analytics', icon: FaChartLine },
              { id: 'payroll', label: 'Payroll', icon: FaBriefcase }
            ].map(t => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isActive
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
                      : 'glass-water-pill text-gray-500 hover:text-gray-800 hover:bg-white/40'
                  }`}
                >
                  <Icon size={12} className={isActive ? 'text-white' : 'text-gray-400'} />
                  {t.label}
                </button>
              );
            })}
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
                      <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
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
                        <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
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

          {/* ══ GST (Exact Tax Dashboard Component Integration) ══ */}
          {tab === 'gst' && (
            <div className="animate-rise-in font-sans">
              <TaxDashboard isEmbedded={true} />
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
                    { l: 'Payables (Unpaid Expenses)', v: s.payables, c: '#ec4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)' },
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

          {/* ══ PAYROLL ══ */}
          {tab === 'payroll' && (
            <div className="space-y-5 animate-rise-in">
              {payrollLoadingState ? (
                <div className="h-60 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : !payrollSummary ? (
                <div className="py-8 text-center text-gray-400 text-sm">No payroll data available. Ensure employees are created and payroll processed.</div>
              ) : (
                <>
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="glass-water-card p-4">
                      <div className="text-2xl font-black text-indigo-600">{payrollSummary.totalHeadcount}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-1">Active Headcount</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Staff on active payroll</div>
                    </div>
                    <div className="glass-water-card p-4">
                      <div className="text-2xl font-black text-emerald-600">{fmt(payrollSummary.totalMonthlyNetSalary)}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-1">Monthly Payroll Cost</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Current month net salary paid</div>
                    </div>
                    <div className="glass-water-card p-4">
                      <div className="text-2xl font-black text-rose-500">{fmt(payrollSummary.totalOutstandingLoans)}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-1">Outstanding Loans</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{payrollSummary.activeLoansCount} active advances</div>
                    </div>
                    <div className="glass-water-card p-4">
                      <div className="text-2xl font-black text-cyan-600">{fmt(payrollSummary.totalApprovedClaims)}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-1">Approved Claims</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{payrollSummary.approvedClaimsCount} reimbursement claims</div>
                    </div>
                  </div>

                  {/* Pending alerts if any */}
                  {(payrollSummary.pendingLoansCount > 0 || payrollSummary.pendingClaimsCount > 0) && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-amber-500 text-lg">⚠️</span>
                        <span className="text-sm font-semibold text-amber-700">
                          Approvals Pending: You have <strong>{payrollSummary.pendingLoansCount} pending loan request(s)</strong> and <strong>{payrollSummary.pendingClaimsCount} pending reimbursement claim(s)</strong> requiring attention.
                        </span>
                      </div>
                      <Link to="/payroll" className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all">
                        Go to Approvals Hub
                      </Link>
                    </div>
                  )}

                  {/* Chart and Employees list */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <GW>
                      <SLabel>Monthly Payroll Trend (6 months)</SLabel>
                      {payrollSummary.trendData.length === 0 ? (
                        <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No historical runs processed.</div>
                      ) : (
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={payrollSummary.trendData}>
                              <CartesianGrid stroke="rgba(99,102,241,0.08)" vertical={false} />
                              <XAxis dataKey="month" stroke="#9ca3af" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                              <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                              <Tooltip content={<TTip />} />
                              <Bar dataKey="netSalary" name="Net Salary Payout" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={30} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </GW>

                    <GW>
                      <SLabel>Active Workforce Overview</SLabel>
                      {payrollSummary.employees.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">No employees created yet.</div>
                      ) : (
                        <div className="space-y-3 max-h-56 overflow-y-auto no-scrollbar pr-1">
                          {payrollSummary.employees.map(emp => (
                            <div key={emp._id} className="flex items-center justify-between text-xs glass-water-inner p-3 rounded-xl">
                              <div>
                                <div className="font-bold text-gray-700">{emp.firstName} {emp.lastName}</div>
                                <div className="text-[10px] text-gray-400">{emp.designation || 'Staff'} · {emp.department?.name || 'No Dept'}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-gray-800">{fmt(emp.monthlyCTC)}/mo</div>
                                <div className="text-[9px] text-indigo-500 font-semibold uppercase tracking-wide">CTC</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </GW>
                  </div>

                  {/* Reimbursement Claims & Loans Summary Lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <GW>
                      <SLabel>Recent Reimbursements</SLabel>
                      {payrollSummary.recentClaims.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">No claims submitted.</div>
                      ) : (
                        <div className="space-y-2.5">
                          {payrollSummary.recentClaims.map(claim => (
                            <div key={claim._id} className="flex items-center justify-between py-2 border-b border-white/40 last:border-0">
                              <div>
                                <div className="text-sm font-semibold text-gray-700">
                                  {claim.employee ? `${claim.employee.firstName} ${claim.employee.lastName}` : 'Employee'}
                                </div>
                                <div className="text-[10px] text-gray-400 capitalize">{claim.category} Claim</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-800">{fmt(claim.amount)}</div>
                                <div className={`text-[10px] font-bold uppercase ${claim.status === 'approved' ? 'text-emerald-500' :
                                  claim.status === 'pending' ? 'text-amber-500' : 'text-rose-500'
                                  }`}>
                                  {claim.status}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </GW>

                    <GW>
                      <SLabel>Recent Loans & Advances</SLabel>
                      {payrollSummary.recentLoans.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">No loan requests.</div>
                      ) : (
                        <div className="space-y-2.5">
                          {payrollSummary.recentLoans.map(loan => (
                            <div key={loan._id} className="flex items-center justify-between py-2 border-b border-white/40 last:border-0">
                              <div>
                                <div className="text-sm font-semibold text-gray-700">
                                  {loan.employee ? `${loan.employee.firstName} ${loan.employee.lastName}` : 'Employee'}
                                </div>
                                <div className="text-[10px] text-gray-400">EMI: {fmt(loan.emiAmount)}/mo</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-800">{fmt(loan.principalAmount)}</div>
                                <div className={`text-[10px] font-bold uppercase ${loan.status === 'active' ? 'text-emerald-500' :
                                  loan.status === 'pending_approval' ? 'text-amber-500' : 'text-rose-500'
                                  }`}>
                                  {loan.status === 'active' ? 'active' : loan.status === 'pending_approval' ? 'pending' : loan.status}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </GW>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Outstanding Receivables & Payables (Cumulative) at bottom of page ── */}
          <div className="mt-8 border-t border-white/40 pt-6">
            <div className="mb-3.5 flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-500/10 border border-amber-500/20 animate-rise-in font-sans" style={{ animationDelay: '100ms' }}>
              <span>⚠️</span>
              <span><strong>Note on Outstanding Balances:</strong> Receivables and Payables are cumulative, all-time outstanding figures and are not filtered by the selected date range.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-rise-in" style={{ animationDelay: '150ms' }}>
              <div className={`p-5 flex items-center justify-between ${darkMode ? 'border-slate-800/80 bg-slate-900/60' : 'glass-water-highlight'}`} style={{ borderLeft: '4px solid #06b6d4', background: darkMode ? 'rgba(6,182,212,0.03)' : 'rgba(6,182,212,0.06)' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      onClick={() => {
                        setSelectedSourceDetail({
                          title: 'Outstanding Receivables',
                          formula: 'Cumulative (all-time) unpaid balances on active Invoices',
                          items: data?.receivableItems || [],
                          linkTo: '/invoices',
                          linkLabel: 'Go to Invoices'
                        });
                      }}
                      className="text-xs font-bold uppercase text-cyan-600 tracking-wider cursor-pointer hover:underline hover:text-cyan-500 transition-colors"
                      title="Click to view Receivables source details"
                    >
                      Outstanding Receivables
                    </span>
                  </div>
                  <div className="text-3xl font-black text-cyan-700">{fmt(s.receivables, 2)}</div>
                  <div className="text-[11px] text-gray-500 mt-1">Unpaid invoices awaiting payment</div>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-cyan-100 text-cyan-600 shadow-sm border border-cyan-200">
                  <FaWallet size={20} />
                </div>
              </div>
              
              <div className={`p-5 flex items-center justify-between ${darkMode ? 'border-slate-800/80 bg-slate-900/60' : 'glass-water-highlight'}`} style={{ borderLeft: '4px solid #f59e0b', background: darkMode ? 'rgba(245,158,11,0.03)' : 'rgba(245,158,11,0.06)' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      onClick={() => {
                        setSelectedSourceDetail({
                          title: 'Outstanding Payables',
                          formula: 'Cumulative (all-time) unpaid balances on active Expenses',
                          items: data?.payableItems || [],
                          linkTo: '/expenses',
                          linkLabel: 'Go to Expenses'
                        });
                      }}
                      className="text-xs font-bold uppercase text-amber-600 tracking-wider cursor-pointer hover:underline hover:text-amber-500 transition-colors"
                      title="Click to view Payables source details"
                    >
                      Outstanding Payables
                    </span>
                  </div>
                  <div className="text-3xl font-black text-amber-700">{fmt(s.payables, 2)}</div>
                  <div className="text-[11px] text-gray-500 mt-1">Unpaid expenses & bills to be settled</div>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-100 text-amber-600 shadow-sm border border-amber-200">
                  <FaFileInvoiceDollar size={20} />
                </div>
              </div>
            </div>
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
                        <tr className={`${darkMode ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-100/80 text-slate-500 border-slate-205'} font-semibold border-b`}>
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
                              <select
                                value={item.status}
                                onChange={(e) => handleSourceItemStatusChange(item, e.target.value)}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border cursor-pointer focus:outline-none focus:ring-1 transition-all ${
                                  ['PAID', 'active', 'approved'].includes(item.status)
                                    ? (darkMode ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                                    : ['PARTIAL', 'pending', 'pending_approval'].includes(item.status)
                                      ? (darkMode ? 'bg-amber-950/80 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200')
                                      : (darkMode ? 'bg-rose-950/80 text-rose-300 border-rose-800' : 'bg-rose-50 text-rose-700 border-rose-200')
                                }`}
                                title="Click to change status"
                              >
                                <option value="PAID" className={darkMode ? 'bg-slate-900 text-emerald-400' : 'bg-white text-emerald-700'}>PAID</option>
                                <option value="UNPAID" className={darkMode ? 'bg-slate-900 text-rose-400' : 'bg-white text-rose-700'}>UNPAID</option>
                                <option value="PARTIAL" className={darkMode ? 'bg-slate-900 text-amber-400' : 'bg-white text-amber-700'}>PARTIAL</option>
                                <option value="DRAFT" className={darkMode ? 'bg-slate-900 text-slate-400' : 'bg-white text-gray-700'}>DRAFT</option>
                                <option value="CANCELLED" className={darkMode ? 'bg-slate-900 text-slate-500' : 'bg-white text-gray-500'}>CANCELLED</option>
                              </select>
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
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </ThemeContext.Provider>
  );
}
