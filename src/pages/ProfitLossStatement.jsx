import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import {
  FaCalendarAlt, FaDownload, FaChartLine, FaCalculator, FaUndoAlt,
  FaCoins, FaInfoCircle, FaInbox, FaArrowUp, FaArrowDown, FaRegFileAlt
} from 'react-icons/fa';
import Skeleton from '../components/Skeleton';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultDateRange = () => {
  const today = new Date();
  return {
    startDate: getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: getLocalDateString(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
};

const ProfitLossStatement = () => {
  const [startDate, setStartDate] = useState(getDefaultDateRange().startDate);
  const [endDate, setEndDate] = useState(getDefaultDateRange().endDate);
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get(`/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`, { signal: controller.signal });
        setReport(res.data);
      } catch (fetchError) {
        if (fetchError.name === 'CanceledError' || fetchError.name === 'AbortError') return;
        console.error(fetchError);
        setError('Failed to load P&L report');
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
      const def = getDefaultDateRange();
      start = def.startDate;
      end = def.endDate;
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
  const netIncome = report?.netIncome ?? 0;
  const isSurplus = netIncome >= 0;

  return (
    <div className="container mx-auto p-6 font-sans text-slate-900 bg-slate-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-tr from-emerald-600 to-emerald-500 rounded-xl text-white shadow-md shadow-emerald-100">
              <FaChartLine size={24} />
            </span>
            Profit & Loss Statement
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium max-w-xl leading-relaxed">
            Analyze your income streams, ongoing operating expenses, and overall bottom-line net profit.
          </p>
        </div>

        {/* Date Filter & Actions */}
        <div className="w-full xl:w-auto flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <FaCalendarAlt className="text-emerald-500" /> Date Preset
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => handlePreset('this-month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${currentPreset === 'this-month' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              This Month
            </button>
            <button
              onClick={() => handlePreset('this-quarter')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${currentPreset === 'this-quarter' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              This Quarter
            </button>
            <button
              onClick={() => handlePreset('this-fy')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${currentPreset === 'this-fy' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
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
              id="pl-start-date"
              type="date"
              className="border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium focus:ring-emerald-500 focus:border-emerald-500 p-2 cursor-pointer transition-all bg-slate-50/50"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-400 text-xs font-semibold">to</span>
            <input
              id="pl-end-date"
              type="date"
              className="border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium focus:ring-emerald-500 focus:border-emerald-500 p-2 cursor-pointer transition-all bg-slate-50/50"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-slate-250 cursor-pointer print:hidden md:ml-2"
          >
            <FaDownload size={12} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Info Callout */}
      <div className="flex items-start gap-3 bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 mb-8 print:hidden">
        <FaInfoCircle className="text-emerald-500 mt-0.5 shrink-0" size={16} />
        <div className="text-xs text-emerald-950/80 leading-relaxed font-medium">
          <strong>Accrual Basis Reporting:</strong> All values are compiled dynamically based on registered invoice totals and category expenses matching the active statement dates.
        </div>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
              <Skeleton width="100px" height="14px" className="mb-4" />
              <Skeleton width="60%" height="32px" className="mb-2" />
              <Skeleton width="80%" height="12px" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-8 text-center text-red-650 font-bold mb-8">
          {error}
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Total Revenue"
              amount={report.totalRevenue}
              color="blue"
              icon={FaCoins}
              subtitle="All registered sales income"
            />
            <StatCard
              title="Total Operating Expenses"
              amount={report.totalExpenses}
              color="amber"
              icon={FaCalculator}
              subtitle="All operating expense outlays"
            />
            <StatCard
              title="Bottom Line Net Income"
              amount={report.netIncome}
              color={isSurplus ? 'emerald' : 'rose'}
              icon={isSurplus ? FaArrowUp : FaArrowDown}
              subtitle={isSurplus ? 'Net positive profit margin' : 'Net statement operating deficit'}
              isGrand
            />
          </div>

          {/* Statement Detailed Ledger Card */}
          <div className="bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl border border-slate-200/80 overflow-hidden mb-12 p-8 print:shadow-none print:border-0">
            
            {/* Revenue Block */}
            <div className="mb-8">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded"></span>
                  Revenue Accounts
                </h3>
                <span className="text-xs font-semibold text-slate-400">Accrued Invoices</span>
              </div>
              <StatementRows rows={report.revenue} emptyMessage="No revenue transactions registered." />
              <div className="flex justify-between border-t-2 border-dashed border-slate-200 pt-3 mt-4 font-black text-slate-900 bg-slate-50/50 p-3 rounded-lg">
                <span className="text-sm">Total Revenue</span>
                <span className="text-sm">{fmtMoney(report.totalRevenue)}</span>
              </div>
            </div>

            {/* Expenses Block */}
            <div className="mb-8">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-amber-500 rounded"></span>
                  Operating Expenses
                </h3>
                <span className="text-xs font-semibold text-slate-400">Category Allocations</span>
              </div>
              <StatementRows rows={report.expenses} emptyMessage="No expenses recorded in this period." />
              <div className="flex justify-between border-t-2 border-dashed border-slate-200 pt-3 mt-4 font-black text-slate-900 bg-slate-50/50 p-3 rounded-lg">
                <span className="text-sm">Total Operating Expenses</span>
                <span className="text-sm text-amber-750">{fmtMoney(report.totalExpenses)}</span>
              </div>
            </div>

            {/* Bottom Line Summary Bar */}
            <div className={`mt-10 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border transition-all ${
              isSurplus 
                ? 'bg-emerald-50/40 border-emerald-250 text-emerald-900 shadow-sm shadow-emerald-50' 
                : 'bg-rose-50/40 border-rose-250 text-rose-900 shadow-sm shadow-rose-50'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  isSurplus ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {isSurplus ? <FaArrowUp size={16} /> : <FaArrowDown size={16} />}
                </span>
                <div>
                  <h4 className="font-bold text-base">Net Statement Result</h4>
                  <p className="text-xs opacity-75 font-medium mt-0.5">
                    {isSurplus 
                      ? 'Congratulations! Your business yielded a positive surplus.' 
                      : 'Attention required: Expenses exceeded revenues in the selected range.'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase font-bold tracking-wider opacity-60">Net Income</span>
                <div className="text-3xl font-black tracking-tight mt-0.5">{fmtMoney(report.netIncome)}</div>
              </div>
            </div>

          </div>
        </>
      ) : null}
    </div>
  );
};

const StatementRows = ({ rows, emptyMessage }) => {
  if (!rows || rows.length === 0) {
    return (
      <div className="py-6 text-center text-slate-400 text-sm font-semibold flex items-center justify-center gap-2 bg-slate-50/40 border border-dashed border-slate-200 rounded-xl">
        <FaInbox size={14} />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.name} className="flex justify-between items-center text-sm hover:bg-slate-50/60 p-2.5 rounded-lg transition-colors border border-transparent hover:border-slate-100">
          <span className="text-slate-650 font-semibold capitalize flex items-center gap-2">
            <FaRegFileAlt className="text-slate-400" size={11} />
            {row.name}
          </span>
          <span className="font-bold text-slate-900">{fmtMoney(row.total)}</span>
        </div>
      ))}
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

export default ProfitLossStatement;
