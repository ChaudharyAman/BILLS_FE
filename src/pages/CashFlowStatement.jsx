import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import {
  FaCalendarAlt, FaDownload, FaCoins, FaInfoCircle, FaInbox,
  FaUndoAlt, FaArrowUp, FaArrowDown, FaRegHandshake, FaChartLine,
  FaBriefcase, FaHandHoldingUsd, FaPiggyBank
} from 'react-icons/fa';
import Skeleton from '../components/Skeleton';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthStart = () => getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const getMonthEnd = () => getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));

const CashFlowStatement = () => {
  const [startDate, setStartDate] = useState(getMonthStart);
  const [endDate, setEndDate] = useState(getMonthEnd);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get(`/reports/cash-flow?startDate=${startDate}&endDate=${endDate}`, { signal: controller.signal });
        setReport(res.data);
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        console.error(err);
        setError('Failed to load Cash Flow Statement');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
    return () => controller.abort();
  }, [startDate, endDate]);

  const handlePreset = (type) => {
    const now = new Date();
    let start = '';
    let end = '';

    if (type === 'this-month') {
      const y = now.getFullYear();
      const m = now.getMonth();
      start = getLocalDateString(new Date(y, m, 1));
      end = getLocalDateString(new Date(y, m + 1, 0));
    } else if (type === 'this-quarter') {
      const y = now.getFullYear();
      const q = Math.floor(now.getMonth() / 3);
      start = getLocalDateString(new Date(y, q * 3, 1));
      end = getLocalDateString(new Date(y, (q + 1) * 3, 0));
    } else if (type === 'this-fy') {
      const y = now.getFullYear();
      const startYear = now.getMonth() >= 3 ? y : y - 1;
      start = `${startYear}-04-01`;
      end = `${startYear + 1}-03-31`;
    } else if (type === 'clear') {
      start = getMonthStart();
      end = getMonthEnd();
    }

    setStartDate(start);
    setEndDate(end);
  };

  const activePreset = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const firstOfM = getLocalDateString(new Date(y, m, 1));
    const lastOfM = getLocalDateString(new Date(y, m + 1, 0));
    if (startDate === firstOfM && endDate === lastOfM) return 'this-month';

    const q = Math.floor(now.getMonth() / 3);
    const firstOfQ = getLocalDateString(new Date(y, q * 3, 1));
    const lastOfQ = getLocalDateString(new Date(y, (q + 1) * 3, 0));
    if (startDate === firstOfQ && endDate === lastOfQ) return 'this-quarter';

    const startYear = now.getMonth() >= 3 ? y : y - 1;
    const firstOfFY = `${startYear}-04-01`;
    const lastOfFY = `${startYear + 1}-03-31`;
    if (startDate === firstOfFY && endDate === lastOfFY) return 'this-fy';

    return 'custom';
  };

  const currentPreset = activePreset();

  const normalizedNetCashFlow = Number(report?.netCashFlow);
  const netCashFlow = Number.isFinite(normalizedNetCashFlow) ? normalizedNetCashFlow : 0;
  const closingBalance = openingBalance + netCashFlow;
  const isNetInflow = netCashFlow >= 0;

  return (
    <div className="container mx-auto p-6 font-sans text-slate-900 bg-slate-50/50 min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-tr from-indigo-650 to-indigo-500 rounded-xl text-white shadow-md shadow-indigo-100">
              <FaHandHoldingUsd size={24} />
            </span>
            Cash Flow Statement
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium max-w-xl leading-relaxed">
            Monitor liquid resource generation and usage across operating, investing, and financing channels.
          </p>
        </div>

        {/* Date Filter & Input Widget */}
        <div className="w-full xl:w-auto flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <FaCalendarAlt className="text-indigo-500" /> Options
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => handlePreset('this-month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${currentPreset === 'this-month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              This Month
            </button>
            <button
              onClick={() => handlePreset('this-quarter')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${currentPreset === 'this-quarter' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              This Quarter
            </button>
            <button
              onClick={() => handlePreset('this-fy')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${currentPreset === 'this-fy' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              FY
            </button>
            {(startDate || endDate) && (
              <button
                onClick={() => handlePreset('clear')}
                title="Reset Filters"
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
              >
                <FaUndoAlt size={11} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-3">
            <input
              type="date"
              className="border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium focus:ring-indigo-500 focus:border-indigo-500 p-2 cursor-pointer transition-all bg-slate-50/50"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-400 text-xs font-semibold">to</span>
            <input
              type="date"
              className="border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium focus:ring-indigo-500 focus:border-indigo-500 p-2 cursor-pointer transition-all bg-slate-50/50"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Opening Balance Interactive Input */}
          <div className="flex items-center gap-1.5 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening ₹:</span>
            <input
              type="number"
              value={openingBalance || ''}
              onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
              placeholder="Opening ₹"
              className="w-24 border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-indigo-750 focus:ring-indigo-500 focus:border-indigo-500 p-2 bg-slate-50/50"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-slate-200 cursor-pointer print:hidden md:ml-2"
          >
            <FaDownload size={12} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="flex items-start gap-3 bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 mb-8 print:hidden">
        <FaInfoCircle className="text-indigo-500 mt-0.5 shrink-0" size={16} />
        <div className="text-xs text-indigo-950/80 leading-relaxed font-medium">
          <strong>Liquidity Tracking Note:</strong> Displays cash flows derived dynamically from active ledger transactions. Use the opening balance input in the filters to offset initial bank deposits.
        </div>
      </div>

      {/* Loading state skeletons */}
      {isLoading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <Skeleton width="100px" height="14px" className="mb-4" />
                <Skeleton width="60%" height="32px" className="mb-2" />
                <Skeleton width="80%" height="12px" />
              </div>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            <Skeleton width="150px" height="24px" className="mb-6" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} height="48px" />)}
            </div>
          </div>
        </>
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-8 text-center text-red-650 font-bold mb-8">
          {error}
        </div>
      ) : report ? (
        <>
          {/* Stat Metric Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Opening Balance"
              amount={openingBalance}
              color="blue"
              icon={FaPiggyBank}
              subtitle="Initial liquid resources"
            />
            <StatCard
              title="Net Cash Flow"
              amount={netCashFlow}
              color={isNetInflow ? 'emerald' : 'rose'}
              icon={isNetInflow ? FaArrowUp : FaArrowDown}
              subtitle={isNetInflow ? 'Net period liquidity addition' : 'Net period liquidity reduction'}
            />
            <StatCard
              title="Closing Bank Cash"
              amount={closingBalance}
              color="emerald"
              icon={FaCoins}
              subtitle="Actual cash position on hand"
              isGrand
            />
          </div>

          {/* Core Activities Breakdown */}
          <div className="bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl border border-slate-200/80 overflow-hidden mb-12 p-8 print:shadow-none print:border-0">
            <div className="border-b border-slate-100 pb-3 mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-500 rounded"></span>
                Cash Flow Ledger Breakdown
              </h3>
              <p className="text-slate-400 text-xs mt-0.5 font-medium">Activity classification statement</p>
            </div>

            <div className="space-y-3.5">
              <ActivityRow
                title="Core Operating Activities"
                value={report.operating}
                icon={FaBriefcase}
                color="blue"
                description="Accrued from day-to-day sales, category outlays, and invoices."
              />
              <ActivityRow
                title="Investing Activities"
                value={report.investing}
                icon={FaChartLine}
                color="indigo"
                description="Investments, physical asset acquisitions, or equipment holdings."
              />
              <ActivityRow
                title="Financing Activities"
                value={report.financing}
                icon={FaRegHandshake}
                color="violet"
                description="Shareholder deposits, corporate loans, and equity structures."
              />

              <div className="my-8 border-t border-slate-100"></div>

              {/* Bottom Totals Recap Ledger */}
              <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-200/40 space-y-3 font-semibold text-sm text-slate-700">
                <div className="flex justify-between items-center px-2">
                  <span className="text-slate-500">Subtotal: Period Net Cash Flow</span>
                  <span className={`font-bold ${isNetInflow ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {isNetInflow ? '+' : ''}{fmtMoney(netCashFlow)}
                  </span>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-slate-500">Add: Initial Opening Cash Balance</span>
                  <span className="text-slate-800 font-bold">{fmtMoney(openingBalance)}</span>
                </div>
                <div className="border-t border-slate-200/60 pt-3 flex justify-between items-center px-2 font-black text-slate-900 text-base">
                  <span className="text-slate-950 uppercase tracking-tight">Closing Balance Position</span>
                  <span className="text-emerald-750 font-black">{fmtMoney(closingBalance)}</span>
                </div>
              </div>

            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

const ActivityRow = ({ title, value, icon: Icon, color, description }) => {
  const isPositive = Number(value) >= 0;

  const THEME_MAP = {
    blue: {
      avatar: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    indigo: {
      avatar: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    violet: {
      avatar: 'bg-violet-50 text-violet-600 border-violet-100',
    },
  };

  const currentTheme = THEME_MAP[color] || THEME_MAP.blue;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-200/70 hover:border-slate-300 rounded-xl hover:bg-slate-50/20 transition-all group">
      <div className="flex items-start gap-3.5">
        <span className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${currentTheme.avatar}`}>
          <Icon size={16} />
        </span>
        <div>
          <h4 className="font-bold text-slate-800 group-hover:text-indigo-650 transition-colors text-sm">{title}</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-lg font-medium leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="text-left sm:text-right shrink-0">
        <div className={`text-base font-extrabold flex items-center sm:justify-end gap-1.5 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isPositive ? <FaArrowUp size={11} /> : <FaArrowDown size={11} />}
          <span>{fmtMoney(value)}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1 block">
          {isPositive ? 'Net Period Inflow' : 'Net Period Outflow'}
        </span>
      </div>
    </div>
  );
};

const StatCard = ({ title, amount, color, icon: Icon, subtitle, isGrand = false }) => {
  const THEME_MAP = {
    blue: {
      accent: 'bg-blue-600',
      iconContainer: 'bg-blue-50 text-blue-600 border-blue-100',
      amountText: 'text-blue-900',
    },
    amber: {
      accent: 'bg-amber-500',
      iconContainer: 'bg-amber-50 text-amber-600 border-amber-100',
      amountText: 'text-amber-900',
    },
    emerald: {
      accent: 'bg-emerald-600',
      iconContainer: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      amountText: 'text-emerald-900',
    },
    rose: {
      accent: 'bg-rose-500',
      iconContainer: 'bg-rose-50 text-rose-600 border-rose-100',
      amountText: 'text-rose-900',
    },
  };

  const currentTheme = THEME_MAP[color] || THEME_MAP.blue;

  return (
    <div className="relative overflow-hidden p-6 bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[148px]">
      <div className={`absolute top-0 left-0 w-full h-[3.5px] ${currentTheme.accent}`}></div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs font-bold tracking-wider text-slate-450 uppercase">{title}</span>
          {Icon && (
            <span className={`w-8 h-8 rounded-lg border flex items-center justify-center ${currentTheme.iconContainer}`}>
              <Icon size={14} />
            </span>
          )}
        </div>

        <div className={`text-3xl font-black ${isGrand ? 'text-slate-950 font-black' : currentTheme.amountText} tracking-tight`}>
          <span className="text-lg font-bold text-slate-400 mr-0.5">₹</span>
          {Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {subtitle && (
        <span className="text-[11px] text-slate-400 font-semibold mt-3 flex items-center gap-1">
          {subtitle}
        </span>
      )}
    </div>
  );
};

export default CashFlowStatement;
