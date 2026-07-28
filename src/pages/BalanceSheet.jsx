import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import {
  FaBalanceScale, FaDownload, FaCoins, FaInfoCircle, FaInbox,
  FaCheckCircle, FaExclamationTriangle, FaUniversity, FaCreditCard,
  FaShieldAlt, FaRegFileAlt
} from 'react-icons/fa';
import Skeleton from '../components/Skeleton';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BalanceSheet = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/reports/balance-sheet');
        setReport(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to retrieve Balance Sheet data');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const assetsRows = Array.isArray(report?.assets)
    ? report.assets.map(item => [item.category, item.total])
    : [];
  const liabilitiesRows = Array.isArray(report?.liabilities)
    ? report.liabilities.map(item => [item.type, item.total])
    : [];

  const totalAssets = report?.totalAssets ?? 0;
  const totalLiabilities = report?.totalLiabilities ?? 0;
  const equity = report?.equity ?? 0;
  const rightSide = totalLiabilities + equity;
  const balanced = Math.abs(totalAssets - rightSide) < 0.01;
  const discrepancy = Math.abs(totalAssets - rightSide);

  const [viewMode, setViewMode] = useState('comparative'); // 'comparative' | 'standard'
  const [userAnswer, setUserAnswer] = useState('');
  const [answerFeedback, setAnswerFeedback] = useState(null);

  const categoriesList = Array.isArray(report?.categories) ? report.categories : [];
  const priorYearLabel = report?.priorYearLabel || 'Prior Year';
  const currentYearLabel = report?.currentYearLabel || 'Current Year';
  const actualCashChange = report?.changeInCash ?? 0;

  const handleCalculateSubmit = (e) => {
    e.preventDefault();
    const val = Number(userAnswer.trim());
    if (isNaN(val)) {
      setAnswerFeedback({ type: 'error', message: 'Please enter a valid number.' });
      return;
    }
    const diff = Math.abs(val - actualCashChange);
    if (diff < 1) {
      setAnswerFeedback({
        type: 'success',
        message: `Correct! Total change in cash = ${fmtMoney(actualCashChange)}.`
      });
    } else {
      setAnswerFeedback({
        type: 'error',
        message: `Incorrect. Expected ${fmtMoney(actualCashChange)}, but you entered ${val}.`
      });
    }
  };

  return (
    <div className="container mx-auto p-6 font-sans text-slate-900 bg-slate-50/50 min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-tr from-indigo-650 to-indigo-500 rounded-xl text-white shadow-md shadow-indigo-100">
              <FaBalanceScale size={24} />
            </span>
            Balance Sheet
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium max-w-xl leading-relaxed">
            A comprehensive statement of your company's assets, active liabilities, shareholder equity, and comparative financial categories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher Pills */}
          <div className="bg-white border border-slate-200/80 p-1 rounded-xl shadow-sm flex items-center gap-1">
            <button
              onClick={() => setViewMode('comparative')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'comparative' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comparative Statement
            </button>
            <button
              onClick={() => setViewMode('standard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'standard' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standard Balance Sheet
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-slate-200 cursor-pointer print:hidden"
          >
            <FaDownload size={12} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
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
        </>
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-8 text-center text-red-650 font-bold mb-8">
          {error}
        </div>
      ) : report ? (
        <>
          {/* COMPARATIVE STATEMENT VIEW (MATCHING USER REFERENCE IMAGE) */}
          {viewMode === 'comparative' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 mb-12 max-w-4xl mx-auto print:shadow-none print:border-0 font-sans">
              <div className="flex items-start gap-4 mb-6">
                <span className="bg-amber-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-lg shrink-0 shadow-sm">
                  #6
                </span>
                <div className="flex-1 border-l-2 border-slate-300 pl-6">
                  {/* Category Table */}
                  <div className="overflow-x-auto max-w-xl">
                    <table className="w-full text-left text-sm font-medium border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-950 text-slate-950 font-bold">
                          <th className="py-2.5 pr-8 underline underline-offset-4 font-bold text-base">Category</th>
                          <th className="py-2.5 px-4 text-right underline underline-offset-4 font-bold whitespace-nowrap">{priorYearLabel}</th>
                          <th className="py-2.5 pl-4 text-right underline underline-offset-4 font-bold whitespace-nowrap">{currentYearLabel}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {categoriesList.map((row) => (
                          <tr key={row.category} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-1.5 pr-8 font-semibold">{row.category}</td>
                            <td className="py-1.5 px-4 text-right font-mono text-xs">
                              {row.priorYear !== undefined ? (Number(row.priorYear) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '???'}
                            </td>
                            <td className="py-1.5 pl-4 text-right font-mono text-xs">
                              {row.currentYear !== undefined ? (Number(row.currentYear) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '???'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Cash Change Question & Interactive Submission Box */}
                  <div className="mt-10 pt-6 border-t border-slate-200 max-w-xl">
                    <p className="text-sm font-bold text-slate-900 mb-3">
                      What is the firm's total change in cash from the prior year to the current year?
                    </p>
                    <form onSubmit={handleCalculateSubmit} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Enter amount (e.g. 5200)"
                        className="bg-white border border-slate-300 rounded-lg px-3.5 py-1.5 text-sm font-mono outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 w-64 shadow-inner"
                      />
                      <button
                        type="submit"
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        Submit
                      </button>
                    </form>
                    <p className="text-[11px] text-slate-500 italic mt-2">
                      Answer format: Number: Round to: 0 decimal places. (Actual change: {fmtMoney(actualCashChange)})
                    </p>

                    {answerFeedback && (
                      <div className={`mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        answerFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <span>{answerFeedback.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STANDARD BALANCE SHEET VIEW */}
          {viewMode === 'standard' && (
            <>
              {/* Double-Entry Balancing Banner */}
              <div className={`flex items-start gap-4 border rounded-2xl p-5 mb-8 shadow-sm transition-all ${
                balanced 
                  ? 'bg-emerald-50/40 border-emerald-250 text-emerald-950 shadow-emerald-50' 
                  : 'bg-amber-50/40 border-amber-250 text-amber-950 shadow-amber-50'
              }`}>
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${
                  balanced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {balanced ? <FaCheckCircle size={18} /> : <FaExclamationTriangle size={18} />}
                </span>
                <div>
                  <h3 className="font-bold text-base">
                    {balanced ? 'Double-Entry Audit Balanced' : 'Double-Entry Balancing Warning'}
                  </h3>
                  <p className="text-xs opacity-80 font-medium mt-1 leading-relaxed">
                    {balanced 
                      ? 'Your financial ledger matches standard bookkeeping specifications. Total assets are exactly equal to total liabilities plus shareholder equity.' 
                      : `There is a discrepancy of ${fmtMoney(discrepancy)} between assets and liabilities + equity. Please review recent journal entries.`}
                  </p>
                </div>
              </div>

              {/* Metric Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                  title="Total Assets"
                  amount={totalAssets}
                  color="blue"
                  icon={FaUniversity}
                  subtitle="Everything your business owns"
                />
                <StatCard
                  title="Total Liabilities"
                  amount={totalLiabilities}
                  color="amber"
                  icon={FaCreditCard}
                  subtitle="Everything your business owes"
                />
                <StatCard
                  title="Owner Shareholder Equity"
                  amount={equity}
                  color="emerald"
                  icon={FaShieldAlt}
                  subtitle="Remaining capital net worth"
                  isGrand
                />
              </div>

              {/* Dual Ledger Breakdown Container */}
              <div className="bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl border border-slate-200/80 overflow-hidden mb-12 p-8 print:shadow-none print:border-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Assets Panel (Left Column) */}
                  <div className="border border-slate-250/70 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 font-bold text-white flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <FaUniversity size={14} className="text-blue-400" /> Assets
                      </span>
                      <span className="text-xs font-medium text-slate-400">Ledger Items</span>
                    </div>
                    <div className="p-5 space-y-3">
                      {assetsRows.length === 0 ? (
                        <EmptyPanelRows message="No assets recorded." />
                      ) : (
                        assetsRows.map(([label, value]) => (
                          <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-colors capitalize">
                            <span className="text-slate-600 font-semibold text-sm flex items-center gap-2">
                              <FaRegFileAlt className="text-slate-400" size={11} />
                              {label}
                            </span>
                            <span className="font-bold text-sm text-slate-950">{fmtMoney(value)}</span>
                          </div>
                        ))
                      )}
                      <div className="border-t-2 border-dashed border-slate-200 pt-4 flex justify-between items-center font-black text-slate-900 bg-slate-50/50 p-3 rounded-xl mt-4">
                        <span className="text-sm">Total Assets</span>
                        <span className="text-sm text-indigo-700">{fmtMoney(totalAssets)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Liabilities and Equity Panel (Right Column) */}
                  <div className="space-y-6">
                    
                    {/* Liabilities Sub-Panel */}
                    <div className="border border-slate-250/70 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 font-bold text-white flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <FaCreditCard size={14} className="text-amber-400" /> Liabilities
                        </span>
                        <span className="text-xs font-medium text-slate-400">Direct Obligations</span>
                      </div>
                      <div className="p-5 space-y-3">
                        {liabilitiesRows.length === 0 ? (
                          <EmptyPanelRows message="No liabilities recorded." />
                        ) : (
                          liabilitiesRows.map(([label, value]) => (
                            <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-colors capitalize">
                              <span className="text-slate-600 font-semibold text-sm flex items-center gap-2">
                                <FaRegFileAlt className="text-slate-400" size={11} />
                                {label}
                              </span>
                              <span className="font-bold text-sm text-slate-950">{fmtMoney(value)}</span>
                            </div>
                          ))
                        )}
                        <div className="border-t-2 border-dashed border-slate-200 pt-4 flex justify-between items-center font-black text-slate-900 bg-slate-50/50 p-3 rounded-xl mt-4">
                          <span className="text-sm">Total Liabilities</span>
                          <span className="text-sm text-amber-700">{fmtMoney(totalLiabilities)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Equity Sub-Panel */}
                    <div className="border border-slate-250/70 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-emerald-50/10">
                      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 font-bold text-white flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <FaShieldAlt size={14} className="text-emerald-400" /> Shareholder Equity
                        </span>
                        <span className="text-xs font-medium text-slate-400">Net Business Worth</span>
                      </div>
                      <div className="p-5">
                        <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-colors capitalize">
                          <span className="text-slate-600 font-semibold text-sm flex items-center gap-2">
                            <FaRegFileAlt className="text-slate-400" size={11} />
                            Accumulated Retained Earnings
                          </span>
                          <span className="font-bold text-sm text-slate-950">{fmtMoney(equity)}</span>
                        </div>
                        <div className="border-t-2 border-dashed border-slate-200 pt-4 flex justify-between items-center font-black text-slate-900 bg-slate-100/60 p-3 rounded-xl mt-4">
                          <span className="text-sm">Total Owner Equity</span>
                          <span className="text-sm text-emerald-700">{fmtMoney(equity)}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
};

const EmptyPanelRows = ({ message }) => (
  <div className="py-8 text-center text-slate-400 text-sm font-semibold flex items-center justify-center gap-2 bg-slate-50/40 border border-dashed border-slate-200 rounded-xl">
    <FaInbox size={14} />
    <span>{message}</span>
  </div>
);

const StatCard = ({ title, amount, color, icon: Icon, subtitle, isGrand = false }) => {
  const THEME_MAP = {
    blue: {
      accent: 'bg-blue-605',
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

export default BalanceSheet;
