import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  FaBalanceScale, FaDownload, FaCoins, FaInfoCircle, FaInbox,
  FaCheckCircle, FaExclamationTriangle, FaUniversity, FaCreditCard,
  FaShieldAlt, FaRegFileAlt, FaCalendarAlt, FaExternalLinkAlt,
  FaPlusCircle, FaTimes, FaCheck, FaTasks, FaBoxes, FaTags
} from 'react-icons/fa';
import Skeleton from '../components/Skeleton';

const fmtMoney = (value) => {
  if (value === null || value === undefined) return '—';
  return `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const BalanceSheet = () => {
  const navigate = useNavigate();
  const currentYearNow = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYearNow);
  const [report, setReport] = useState(null);
  const [setupStatus, setSetupStatus] = useState(null);
  const [isChecklistDismissed, setIsChecklistDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Equity Transaction Modal State
  const [isEquityModalOpen, setIsEquityModalOpen] = useState(false);
  const [equityForm, setEquityForm] = useState({
    type: 'owner_contribution',
    amount: '',
    shares: '',
    pricePerShare: '',
    parValue: '10',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [equitySubmitting, setEquitySubmitting] = useState(false);
  const [equityModalError, setEquityModalError] = useState(null);

  // Accrual Entry Modal State
  const [isAccrualModalOpen, setIsAccrualModalOpen] = useState(false);
  const [accrualForm, setAccrualForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'accrued',
    notes: '',
  });
  const [accrualSubmitting, setAccrualSubmitting] = useState(false);
  const [accrualModalError, setModalAccrualError] = useState(null);

  const fetchReport = async (year) => {
    setLoading(true);
    setError(null);
    try {
      const [resReport, resSetup] = await Promise.all([
        api.get(`/reports/balance-sheet?year=${year}`),
        api.get('/reports/balance-sheet/setup-status').catch(() => ({ data: null })),
      ]);
      setReport(resReport.data);
      if (resSetup?.data) {
        setSetupStatus(resSetup.data);
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to retrieve Balance Sheet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedYear);
  }, [selectedYear]);

  const assetsRows = Array.isArray(report?.assets)
    ? report.assets.map(item => [item.category, item.total])
    : [];
  const liabilitiesRows = Array.isArray(report?.liabilities)
    ? report.liabilities.map(item => [item.type, item.total])
    : [];

  const totalAssets = report?.totalAssets ?? 0;
  const totalLiabilities = report?.totalLiabilities ?? 0;
  const equity = report?.equity ?? 0;
  
  const balanceCheck = report?.balanceCheck?.currentYear;
  const isBalanced = balanceCheck ? balanceCheck.balanced : Math.abs(totalAssets - (totalLiabilities + equity)) < 0.01;
  const discrepancy = balanceCheck ? Math.abs(balanceCheck.difference) : Math.abs(totalAssets - (totalLiabilities + equity));

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

  const openEquitySetup = (defaultType = 'owner_contribution') => {
    setEquityForm({
      type: defaultType,
      amount: '',
      shares: '',
      pricePerShare: '',
      parValue: '10',
      date: new Date(Date.UTC(selectedYear, 0, 15)).toISOString().slice(0, 10),
      notes: '',
    });
    setEquityModalError(null);
    setIsEquityModalOpen(true);
  };

  const handleEquitySubmit = async (e) => {
    e.preventDefault();
    setEquitySubmitting(true);
    setEquityModalError(null);

    try {
      let payload = {
        type: equityForm.type,
        date: equityForm.date,
        notes: equityForm.notes,
      };

      if (equityForm.type === 'share_issuance') {
        const shares = Number(equityForm.shares) || 0;
        const price = Number(equityForm.pricePerShare) || 0;
        const par = Number(equityForm.parValue) || 10;
        const totalProceeds = shares * price;
        const commonStockPortion = Math.min(totalProceeds, shares * par);
        const apicPortion = Math.max(0, totalProceeds - commonStockPortion);

        payload = {
          ...payload,
          amount: totalProceeds,
          shares,
          pricePerShare: price,
          parValue: par,
          commonStockAmount: commonStockPortion,
          apicAmount: apicPortion,
        };
      } else {
        payload = {
          ...payload,
          amount: Number(equityForm.amount),
        };
      }

      await api.post('/equity', payload);
      setIsEquityModalOpen(false);
      fetchReport(selectedYear);
    } catch (err) {
      console.error(err);
      setEquityModalError(err?.response?.data?.message || 'Failed to record equity transaction');
    } finally {
      setEquitySubmitting(false);
    }
  };

  const openAccrualSetup = () => {
    setAccrualForm({
      amount: '',
      description: '',
      date: new Date(Date.UTC(selectedYear, 11, 31)).toISOString().slice(0, 10),
      status: 'accrued',
      notes: '',
    });
    setModalAccrualError(null);
    setIsAccrualModalOpen(true);
  };

  const handleAccrualSubmit = async (e) => {
    e.preventDefault();
    setAccrualSubmitting(true);
    setModalAccrualError(null);
    try {
      await api.post('/accruals', {
        ...accrualForm,
        amount: Number(accrualForm.amount),
      });
      setIsAccrualModalOpen(false);
      fetchReport(selectedYear);
    } catch (err) {
      console.error(err);
      setModalAccrualError(err?.response?.data?.message || 'Failed to record accrual entry');
    } finally {
      setAccrualSubmitting(false);
    }
  };

  const handleRowSetupAction = (categoryName) => {
    const name = (categoryName || '').toLowerCase();
    if (name.includes('accrual')) {
      openAccrualSetup();
    } else if (name.includes('stock') || name.includes('capital')) {
      openEquitySetup(name.includes('stock') ? 'common_stock_issued' : 'additional_paid_in_capital');
    } else if (name.includes('cogs')) {
      navigate('/categories');
    } else if (name.includes('fixed asset') || name.includes('depreciation')) {
      navigate('/assets');
    } else if (name.includes('debt') || name.includes('notes') || name.includes('payable')) {
      navigate('/liabilities');
    } else if (name.includes('interest')) {
      navigate('/categories');
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
            A comprehensive statement of verified assets, obligations, and shareholder equity backed by single-source ledger entries.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Year Filter */}
          <div className="bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 whitespace-nowrap">
            <FaCalendarAlt className="text-slate-400" size={12} />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {[currentYearNow + 1, currentYearNow, currentYearNow - 1, currentYearNow - 2, currentYearNow - 3].map((yr) => (
                <option key={yr} value={yr}>
                  FY {yr}
                </option>
              ))}
            </select>
          </div>

          {/* View Switcher Pills */}
          <div className="bg-white border border-slate-200/80 p-0.5 rounded-xl shadow-xs flex items-center gap-0.5 whitespace-nowrap">
            <button
              onClick={() => setViewMode('comparative')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'comparative' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comparative Statement
            </button>
            <button
              onClick={() => setViewMode('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'standard' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standard Balance Sheet
            </button>
          </div>

          {/* Export PDF */}
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer print:hidden whitespace-nowrap"
          >
            <FaDownload size={11} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Onboarding / Setup Status Checklist Widget */}
      {setupStatus && !setupStatus.isFullyConfigured && !isChecklistDismissed && (
        <div className="bg-white border border-indigo-100 rounded-2xl p-5 mb-8 shadow-xs relative print:hidden">
          <button
            onClick={() => setIsChecklistDismissed(true)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            title="Dismiss checklist"
          >
            <FaTimes size={14} />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FaTasks size={14} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Balance Sheet Setup Progress ({setupStatus.completedCount} of {setupStatus.totalCount} completed)
              </h3>
              <p className="text-xs text-slate-500">
                Complete these initial configurations to populate every line item with genuine audit-backed accounting data.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
            {/* Step 1: Equity */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              setupStatus.steps.equity ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>1. Equity Records</span>
                  {setupStatus.steps.equity ? <FaCheck className="text-emerald-600" size={11} /> : <span className="text-amber-600 text-[10px]">Pending</span>}
                </div>
                <p className="text-[11px] text-slate-500">Common stock & paid-in capital</p>
              </div>
              <button
                onClick={() => openEquitySetup('common_stock_issued')}
                className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 text-left cursor-pointer"
              >
                {setupStatus.steps.equity ? 'Add more →' : 'Record equity →'}
              </button>
            </div>

            {/* Step 2: COGS Categories */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              setupStatus.steps.cogsCategories ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>2. COGS Categories</span>
                  {setupStatus.steps.cogsCategories ? <FaCheck className="text-emerald-600" size={11} /> : <span className="text-amber-600 text-[10px]">Pending</span>}
                </div>
                <p className="text-[11px] text-slate-500">Flag expense categories as COGS</p>
              </div>
              <button
                onClick={() => navigate('/categories')}
                className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 text-left cursor-pointer"
              >
                {setupStatus.steps.cogsCategories ? 'Manage categories →' : 'Set up COGS →'}
              </button>
            </div>

            {/* Step 3: Fixed Assets */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              setupStatus.steps.fixedAssets ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>3. Fixed Assets</span>
                  {setupStatus.steps.fixedAssets ? <FaCheck className="text-emerald-600" size={11} /> : <span className="text-amber-600 text-[10px]">Pending</span>}
                </div>
                <p className="text-[11px] text-slate-500">Track equipment & depreciation</p>
              </div>
              <button
                onClick={() => navigate('/assets')}
                className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 text-left cursor-pointer"
              >
                {setupStatus.steps.fixedAssets ? 'View assets →' : 'Add fixed asset →'}
              </button>
            </div>

            {/* Step 4: Liabilities */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              setupStatus.steps.liabilityCategorization ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>4. Debt & Liabilities</span>
                  {setupStatus.steps.liabilityCategorization ? <FaCheck className="text-emerald-600" size={11} /> : <span className="text-amber-600 text-[10px]">Pending</span>}
                </div>
                <p className="text-[11px] text-slate-500">Long-term debt & loans</p>
              </div>
              <button
                onClick={() => navigate('/liabilities')}
                className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 text-left cursor-pointer"
              >
                {setupStatus.steps.liabilityCategorization ? 'View debt →' : 'Add liability →'}
              </button>
            </div>

            {/* Step 5: Interest Expense */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              setupStatus.steps.interestExpenseCategory ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>5. Interest Expense</span>
                  {setupStatus.steps.interestExpenseCategory ? <FaCheck className="text-emerald-600" size={11} /> : <span className="text-amber-600 text-[10px]">Pending</span>}
                </div>
                <p className="text-[11px] text-slate-500">Record loan interest expenses</p>
              </div>
              <button
                onClick={() => navigate('/categories')}
                className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 text-left cursor-pointer"
              >
                {setupStatus.steps.interestExpenseCategory ? 'View categories →' : 'Set up interest category →'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          {/* Double-Entry Balancing Warning / Audit Banner */}
          <div className={`flex items-start gap-4 border rounded-2xl p-5 mb-8 shadow-sm transition-all ${
            isBalanced 
              ? 'bg-emerald-50/40 border-emerald-250 text-emerald-950 shadow-emerald-50' 
              : 'bg-rose-50/60 border-rose-300 text-rose-950 shadow-rose-50'
          }`}>
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${
              isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {isBalanced ? <FaCheckCircle size={18} /> : <FaExclamationTriangle size={18} />}
            </span>
            <div className="flex-1">
              <h3 className="font-bold text-base flex items-center justify-between">
                <span>{isBalanced ? 'Double-Entry Audit Balanced' : 'Data Integrity Warning: Balance Sheet Unbalanced'}</span>
                {!isBalanced && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-800 font-extrabold uppercase tracking-wide">
                    Difference: {fmtMoney(discrepancy)}
                  </span>
                )}
              </h3>
              <p className="text-xs opacity-85 font-medium mt-1 leading-relaxed">
                {isBalanced 
                  ? 'Your financial ledger balances accurately. Total assets equal total liabilities plus owner equity ($Assets = Liabilities + Equity$).' 
                  : `This balance sheet doesn't balance by ${fmtMoney(discrepancy)} between assets (${fmtMoney(totalAssets)}) and liabilities + equity (${fmtMoney(totalLiabilities + equity)}). Please review unclassified transactions or record opening equity.`}
              </p>
            </div>
          </div>

          {/* COMPARATIVE STATEMENT VIEW */}
          {viewMode === 'comparative' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 mb-12 max-w-5xl mx-auto print:shadow-none print:border-0 font-sans">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-medium border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-950 text-slate-950 font-bold">
                          <th className="py-2.5 pr-6 underline underline-offset-4 font-bold text-base">Category</th>
                          <th className="py-2.5 px-4 text-right underline underline-offset-4 font-bold whitespace-nowrap">{priorYearLabel}</th>
                          <th className="py-2.5 px-4 text-right underline underline-offset-4 font-bold whitespace-nowrap">{currentYearLabel}</th>
                          <th className="py-2.5 pl-4 text-left font-bold text-xs uppercase tracking-wider text-slate-400 print:hidden">Data Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {categoriesList.map((row) => {
                          const isUnavailable = row.source?.type === 'unavailable' || (row.priorYear === null && row.currentYear === null);

                          return (
                            <tr key={row.category} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2 pr-6 font-semibold flex items-center gap-1.5">
                                <span>{row.category}</span>
                                {row.source?.description && (
                                  <span 
                                    title={row.source.description} 
                                    className="text-slate-400 hover:text-indigo-600 cursor-help print:hidden text-xs"
                                  >
                                    <FaInfoCircle size={11} />
                                  </span>
                                )}
                              </td>

                              {/* Prior Year */}
                              <td className="py-2 px-4 text-right font-mono text-xs">
                                {row.priorYear !== null && row.priorYear !== undefined ? (
                                  Number(row.priorYear).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                ) : (
                                  <button
                                    onClick={() => handleRowSetupAction(row.category)}
                                    className="text-slate-500 hover:text-indigo-600 italic text-[11px] bg-slate-100 hover:bg-indigo-50 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                  >
                                    — Set up required
                                  </button>
                                )}
                              </td>

                              {/* Current Year */}
                              <td className="py-2 px-4 text-right font-mono text-xs">
                                {row.currentYear !== null && row.currentYear !== undefined ? (
                                  <span className="font-semibold text-slate-900">
                                    {Number(row.currentYear).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleRowSetupAction(row.category)}
                                    className="text-slate-500 hover:text-indigo-600 italic text-[11px] bg-slate-100 hover:bg-indigo-50 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                  >
                                    — Set up required
                                  </button>
                                )}
                              </td>

                              {/* Source Info Badge */}
                              <td className="py-2 pl-4 text-xs text-slate-500 print:hidden">
                                {isUnavailable ? (
                                  <span 
                                    onClick={() => handleRowSetupAction(row.category)}
                                    className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 cursor-pointer hover:bg-amber-100 transition-colors"
                                  >
                                    <FaInfoCircle size={10} /> {row.source?.reason || 'Not configured'}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                                    {row.source?.model || 'Ledger'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Cash Change Question & Interactive Submission Box */}
                  <div className="mt-10 pt-6 border-t border-slate-200 max-w-xl print:hidden">
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

                  {/* PDF Footnotes Section */}
                  <div className="mt-8 pt-4 border-t border-slate-200 text-[11px] text-slate-500">
                    <div className="font-bold text-slate-700 mb-1">Source & Audit Footnotes:</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Cash is computed from verified CashAccount opening balances and signed CashLedgerEntry transactions.</li>
                      <li>Receivables and Payables reflect outstanding invoice and vendor balances as of period end.</li>
                      {categoriesList.filter(c => c.source?.type === 'unavailable').map(c => (
                        <li key={c.category} className="text-amber-850">
                          <strong>{c.category}</strong>: {c.source.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

          {/* STANDARD BALANCE SHEET VIEW */}
          {viewMode === 'standard' && (
            <>
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
                  subtitle="Accumulated net capital worth"
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
                        <EmptyPanelRows message="No assets recorded for this period." />
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
                          <EmptyPanelRows message="No liabilities recorded for this period." />
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

      {/* QUICK EQUITY TRANSACTION MODAL */}
      {isEquityModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsEquityModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <FaTimes size={16} />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-1">
              <FaShieldAlt className="text-emerald-600" /> Record Equity Transaction
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Add genuine paid-in capital or common stock to populate shareholder equity lines on your balance sheet.
            </p>

            {equityModalError && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl">
                {equityModalError}
              </div>
            )}

            <form onSubmit={handleEquitySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Type</label>
                <select
                  value={equityForm.type}
                  onChange={(e) => setEquityForm({ ...equityForm, type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-indigo-600 focus:bg-white"
                >
                  <option value="owner_contribution">Owner / Shareholder Contribution</option>
                  <option value="share_issuance">Share Issuance (Auto-calculates Common Stock & APIC)</option>
                  <option value="owner_distribution">Owner / Shareholder Distribution</option>
                  <option value="opening_equity_balance">Opening Equity Balance</option>
                  <option value="accountant_adjustment">Accountant Adjustment (Advanced)</option>
                </select>
              </div>

              {equityForm.type === 'share_issuance' ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Shares</label>
                      <input
                        type="number"
                        required
                        min="1"
                        step="1"
                        placeholder="e.g. 1000"
                        value={equityForm.shares}
                        onChange={(e) => setEquityForm({ ...equityForm, shares: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Price / Share (₹)</label>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        placeholder="e.g. 100"
                        value={equityForm.pricePerShare}
                        onChange={(e) => setEquityForm({ ...equityForm, pricePerShare: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Par Value (₹)</label>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        placeholder="e.g. 10"
                        value={equityForm.parValue}
                        onChange={(e) => setEquityForm({ ...equityForm, parValue: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Live Split Calculation Box */}
                  {Number(equityForm.shares) > 0 && Number(equityForm.pricePerShare) > 0 && (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
                      <div className="font-bold text-emerald-950 flex justify-between">
                        <span>Total Capital Proceeds:</span>
                        <span>{fmtMoney((Number(equityForm.shares) || 0) * (Number(equityForm.pricePerShare) || 0))}</span>
                      </div>
                      <div className="text-slate-600 flex justify-between text-[11px]">
                        <span>➜ Common Stock (Par):</span>
                        <span>{fmtMoney(Math.min((Number(equityForm.shares) || 0) * (Number(equityForm.pricePerShare) || 0), (Number(equityForm.shares) || 0) * (Number(equityForm.parValue) || 10)))}</span>
                      </div>
                      <div className="text-slate-600 flex justify-between text-[11px]">
                        <span>➜ Additional Paid-in Capital (APIC):</span>
                        <span>{fmtMoney(Math.max(0, ((Number(equityForm.shares) || 0) * (Number(equityForm.pricePerShare) || 0)) - ((Number(equityForm.shares) || 0) * (Number(equityForm.parValue) || 10))))}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {equityForm.type === 'owner_distribution' ? 'Distribution Amount (₹)' : 'Contribution Amount (₹)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    placeholder="e.g. 50000"
                    value={equityForm.amount}
                    onChange={(e) => setEquityForm({ ...equityForm, amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={equityForm.date}
                  onChange={(e) => setEquityForm({ ...equityForm, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Founder initial capital deposit"
                  value={equityForm.notes}
                  onChange={(e) => setEquityForm({ ...equityForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEquityModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={equitySubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {equitySubmitting ? 'Saving...' : 'Save Equity Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ACCRUAL ENTRY MODAL */}
      {isAccrualModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsAccrualModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <FaTimes size={16} />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-1">
              <FaCreditCard className="text-indigo-600" /> Record Accrual Entry
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Record recognized obligations and unbilled expenses to accurately populate the Accruals balance sheet line.
            </p>

            {accrualModalError && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl">
                {accrualModalError}
              </div>
            )}

            <form onSubmit={handleAccrualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unbilled December Electricity & Utilities"
                  value={accrualForm.description}
                  onChange={(e) => setAccrualForm({ ...accrualForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Accrual Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  placeholder="e.g. 15000"
                  value={accrualForm.amount}
                  onChange={(e) => setAccrualForm({ ...accrualForm, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Accrual Date</label>
                <input
                  type="date"
                  required
                  value={accrualForm.date}
                  onChange={(e) => setAccrualForm({ ...accrualForm, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={accrualForm.status}
                  onChange={(e) => setAccrualForm({ ...accrualForm, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-indigo-600 focus:bg-white"
                >
                  <option value="accrued">Accrued (Active Obligation)</option>
                  <option value="settled">Settled</option>
                  <option value="reversed">Reversed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Estimate based on historical monthly billing"
                  value={accrualForm.notes}
                  onChange={(e) => setAccrualForm({ ...accrualForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAccrualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={accrualSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {accrualSubmitting ? 'Saving...' : 'Save Accrual Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
