import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  FaCalendarAlt, FaChartLine, FaCalculator, FaPercent,
  FaFileInvoiceDollar, FaUndoAlt, FaCoins, FaInfoCircle, FaInbox,
  FaArrowRight, FaArrowLeft, FaReceipt, FaMoneyCheckAlt
} from 'react-icons/fa';
import Skeleton from '../../components/Skeleton';
import ExportDropdown from '../../components/ExportDropdown';

const TdsSummary = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, expRes, clientRes] = await Promise.all([
        api.get('/invoices?limit=1000'),
        api.get('/expenses?limit=1000'),
        api.get('/clients?limit=1000')
      ]);
      setInvoices(invRes.data.data || []);
      setExpenses(expRes.data.data || []);
      setClients(clientRes.data.data || []);
    } catch (err) {
      console.error('Error fetching TDS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePreset = (type) => {
    const now = new Date();
    let start = '';
    let end = '';

    if (type === 'this-month') {
      const y = now.getFullYear();
      const m = now.getMonth();
      start = new Date(y, m, 1).toISOString().split('T')[0];
      end = new Date(y, m + 1, 0).toISOString().split('T')[0];
    } else if (type === 'this-quarter') {
      const y = now.getFullYear();
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(y, q * 3, 1).toISOString().split('T')[0];
      end = new Date(y, (q + 1) * 3, 0).toISOString().split('T')[0];
    } else if (type === 'this-fy') {
      const y = now.getFullYear();
      const startYear = now.getMonth() >= 3 ? y : y - 1;
      start = `${startYear}-04-01`;
      end = `${startYear + 1}-03-31`;
    } else if (type === 'clear') {
      start = '';
      end = '';
    }

    setStartDate(start);
    setEndDate(end);
  };

  // Find Client/Vendor PAN by ID
  const getPan = (partyRef, partySnapName, isClient = true) => {
    if (partyRef) {
      const found = clients.find(c => c._id === partyRef);
      if (found?.pan) return found.pan;
    }
    return 'N/A';
  };

  const getTdsDueDate = (recordDate) => {
    const dateObj = new Date(recordDate);
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    // TDS must be paid by 7th of the next month (except March which is April 30th, but standard is 7th)
    const nextMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 7);
    return nextMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filterByDate = (dateStr) => {
    if (!dateStr) return false;
    const recordDate = new Date(dateStr).getTime();
    if (startDate) {
      const start = new Date(startDate).getTime();
      if (recordDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (recordDate > end.getTime()) return false;
    }
    return true;
  };

  const activePreset = () => {
    if (!startDate && !endDate) return 'all';
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const firstOfM = new Date(y, m, 1).toISOString().split('T')[0];
    const lastOfM = new Date(y, m + 1, 0).toISOString().split('T')[0];
    if (startDate === firstOfM && endDate === lastOfM) return 'this-month';

    const q = Math.floor(now.getMonth() / 3);
    const firstOfQ = new Date(y, q * 3, 1).toISOString().split('T')[0];
    const lastOfQ = new Date(y, (q + 1) * 3, 0).toISOString().split('T')[0];
    if (startDate === firstOfQ && endDate === lastOfQ) return 'this-quarter';

    const startYear = now.getMonth() >= 3 ? y : y - 1;
    const firstOfFY = `${startYear}-04-01`;
    const lastOfFY = `${startYear + 1}-03-31`;
    if (startDate === firstOfFY && endDate === lastOfFY) return 'this-fy';

    return 'custom';
  };

  const currentPreset = activePreset();

  // Filter TDS items
  const filteredPayable = expenses
    .filter(exp => exp.tds_applicable && filterByDate(exp.date))
    .map(exp => ({
      _id: exp._id,
      number: exp.expenseNumber,
      date: exp.date,
      partyName: exp.vendor?.name || 'N/A',
      pan: exp.vendor?.pan || getPan(exp.vendor?.vendorRef, exp.vendor?.name, false),
      section: exp.tds_section || '194C',
      rate: exp.tds_rate || 0,
      amount: exp.tds_amount || 0,
      dueDate: getTdsDueDate(exp.date),
      status: exp.status === 'PAID' ? 'Deposited' : 'Pending'
    }));

  const filteredReceivable = invoices
    .filter(inv => (inv.client_will_deduct_tds || inv.tds_applicable) && filterByDate(inv.date))
    .map(inv => ({
      _id: inv._id,
      number: inv.invoiceNo,
      date: inv.date,
      partyName: inv.client?.name || 'N/A',
      pan: inv.client?.pan || getPan(inv.client?.clientRef, inv.client?.name, true),
      section: inv.tds_section || '194J',
      rate: inv.tds_rate || 0,
      amount: inv.tds_amount || 0,
      expected: inv.tds_amount || 0,
      status: inv.status === 'PAID' ? 'Received' : 'Accrued'
    }));

  const totalPayable = filteredPayable.reduce((sum, item) => sum + item.amount, 0);
  const totalReceivable = filteredReceivable.reduce((sum, item) => sum + item.amount, 0);
  const netTdsPosition = totalReceivable - totalPayable;

  const fmt = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="container mx-auto p-6 font-sans text-slate-900 bg-slate-50/50 min-h-screen">
      
      {/* Header Banner */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-tr from-[#1a2e44] to-slate-700 rounded-xl text-white shadow-md">
              <FaCoins size={24} />
            </span>
            TDS Tax Ledger
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium max-w-xl leading-relaxed">
            Track and claim Tax Deducted at Source (TDS). Manage liability payable to the government and receivables claimable in your ITR.
          </p>
        </div>

        {/* Date Filter Widget */}
        <div className="w-full xl:w-auto flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <FaCalendarAlt className="text-blue-500" /> Date Filter
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => handlePreset('this-month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${currentPreset === 'this-month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              This Month
            </button>
            <button
              onClick={() => handlePreset('this-quarter')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${currentPreset === 'this-quarter' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              This Quarter
            </button>
            <button
              onClick={() => handlePreset('this-fy')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${currentPreset === 'this-fy' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
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
              className="border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium focus:ring-blue-500 focus:border-blue-500 p-2 cursor-pointer transition-all bg-slate-50/50"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-400 text-xs font-semibold">to</span>
            <input
              type="date"
              className="border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium focus:ring-blue-500 focus:border-blue-500 p-2 cursor-pointer transition-all bg-slate-50/50"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Info Callout */}
      <div className="flex items-start gap-3 bg-blue-50/40 border border-blue-100 rounded-xl p-4 mb-8">
        <FaInfoCircle className="text-blue-500 mt-0.5 shrink-0" size={16} />
        <div className="text-xs text-blue-950/80 leading-relaxed font-medium">
          <strong>Tax Filing Notice:</strong> TDS Receivable is an asset claimable against your net income tax liability in your Annual ITR (reconcilable with Form 26AS). TDS Payable represents taxes you deducted from vendor payments and must be deposited to the government by the <strong>7th of the next month</strong>.
        </div>
      </div>

      {/* Stat Grid (Monthly Summary Card) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Payable card */}
        <div className="relative overflow-hidden p-6 bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[148px]">
          <div className="absolute top-0 left-0 w-full h-[3.5px] bg-red-500"></div>
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">TDS Payable (Liabilities)</span>
              <span className="w-8 h-8 rounded-lg border flex items-center justify-center bg-red-50 text-red-600 border-red-100">
                <FaArrowRight size={14} />
              </span>
            </div>
            <div className="text-3xl font-black text-red-600 tracking-tight">
              <span className="text-lg font-bold text-slate-400 mr-0.5">₹</span>
              {fmt(totalPayable)}
            </div>
          </div>
          <span className="text-[10px] text-red-500/85 font-bold mt-3 uppercase tracking-wider">
            ⚠️ Pay by 7th next month
          </span>
        </div>

        {/* Receivable card */}
        <div className="relative overflow-hidden p-6 bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[148px]">
          <div className="absolute top-0 left-0 w-full h-[3.5px] bg-emerald-500"></div>
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">TDS Receivable (Assets)</span>
              <span className="w-8 h-8 rounded-lg border flex items-center justify-center bg-emerald-50 text-emerald-600 border-emerald-100">
                <FaArrowLeft size={14} />
              </span>
            </div>
            <div className="text-3xl font-black text-emerald-600 tracking-tight">
              <span className="text-lg font-bold text-slate-400 mr-0.5">₹</span>
              {fmt(totalReceivable)}
            </div>
          </div>
          <span className="text-[10px] text-emerald-600/85 font-bold mt-3 uppercase tracking-wider">
            Claimable in ITR (Form 26AS)
          </span>
        </div>

        {/* Net position card */}
        <div className="relative overflow-hidden p-6 bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[148px]">
          <div className="absolute top-0 left-0 w-full h-[3.5px] bg-blue-500"></div>
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Net TDS Position</span>
              <span className="w-8 h-8 rounded-lg border flex items-center justify-center bg-blue-50 text-blue-600 border-blue-100">
                <FaChartLine size={14} />
              </span>
            </div>
            <div className={`text-3xl font-black tracking-tight ${netTdsPosition >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              <span className="text-lg font-bold text-slate-400 mr-0.5">₹</span>
              {netTdsPosition >= 0 ? '+' : ''}{fmt(netTdsPosition)}
            </div>
          </div>
          <span className="text-[10px] text-blue-500/85 font-bold mt-3 uppercase tracking-wider">
            {netTdsPosition >= 0 ? 'Net Asset Credit' : 'Net Deposit Liability'}
          </span>
        </div>

      </div>

      {/* TDS Payable Table Section */}
      <div className="mt-8 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl border border-slate-200/80 overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/40">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <FaMoneyCheckAlt className="text-red-500" />
              TDS Payable (Deducted from Vendors)
            </h3>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">Expenses recorded where you deducted tax from supplier payments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-500 bg-slate-200/50 rounded-full px-3 py-1">
              {filteredPayable.length} Record{filteredPayable.length === 1 ? '' : 's'}
            </div>
            <ExportDropdown
              data={filteredPayable}
              filename={`TDS_Payable_Report_${startDate || 'All'}_to_${endDate || 'All'}`}
              columns={[
                { header: 'Expense No', key: 'number' },
                { header: 'Date', key: 'date' },
                { header: 'Vendor Name', key: 'partyName' },
                { header: 'PAN', key: 'pan' },
                { header: 'TDS Section', key: 'section' },
                { header: 'TDS Rate %', key: 'rate' },
                { header: 'TDS Amount', key: 'amount' },
                { header: 'Due Date', key: 'dueDate' },
                { header: 'Status', key: 'status' }
              ]}
              variant="red"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-100 text-xs">
                <th className="px-6 py-3.5 text-left font-bold uppercase tracking-wider">Bill & Date</th>
                <th className="px-6 py-3.5 text-left font-bold uppercase tracking-wider">Vendor & PAN</th>
                <th className="px-6 py-3.5 text-left font-bold uppercase tracking-wider">Section</th>
                <th className="px-6 py-3.5 text-right font-bold uppercase tracking-wider">TDS Rate</th>
                <th className="px-6 py-3.5 text-right font-bold uppercase tracking-wider text-red-300">TDS Amount</th>
                <th className="px-6 py-3.5 text-left font-bold uppercase tracking-wider pl-8">Deposit Due Date</th>
                <th className="px-6 py-3.5 text-center font-bold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="bg-white border-b border-slate-50">
                    <td className="px-6 py-4"><Skeleton width="100px" height="16px" /></td>
                    <td className="px-6 py-4"><Skeleton width="120px" height="16px" /></td>
                    <td className="px-6 py-4"><Skeleton width="60px" height="16px" /></td>
                    <td className="px-6 py-4"><Skeleton width="50px" height="16px" className="ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="70px" height="16px" className="ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="90px" height="16px" /></td>
                    <td className="px-6 py-4"><Skeleton width="70px" height="24px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : filteredPayable.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400 text-sm">
                    <FaInbox className="mx-auto text-slate-300 mb-3" size={24} />
                    No TDS Payable transactions found in this period.
                  </td>
                </tr>
              ) : (
                filteredPayable.map((row, idx) => (
                  <tr key={idx} onClick={() => navigate(`/expenses/edit/${row._id}`)} className="hover:bg-slate-50/60 cursor-pointer transition-colors duration-150 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{row.number}</div>
                      <div className="text-[11px] text-slate-400 mt-1 font-medium">
                        {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900">{row.partyName}</div>
                      <div className="text-[11px] font-bold text-slate-500 font-mono tracking-wider mt-0.5">PAN: {row.pan}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">Sec {row.section}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-600">{row.rate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-red-600 bg-red-50/10">₹{fmt(row.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700 pl-8">{row.dueDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full border shadow-sm ${
                        row.status === 'Deposited' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TDS Receivable Table Section */}
      <div className="bg-white shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl border border-slate-200/80 overflow-hidden mb-12">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/40">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <FaReceipt className="text-emerald-500" />
              TDS Receivable (Deducted by Clients)
            </h3>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">Sales invoices where clients deducted tax before payment</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-500 bg-slate-200/50 rounded-full px-3 py-1">
              {filteredReceivable.length} Record{filteredReceivable.length === 1 ? '' : 's'}
            </div>
            <ExportDropdown
              data={filteredReceivable}
              filename={`TDS_Receivable_Report_${startDate || 'All'}_to_${endDate || 'All'}`}
              columns={[
                { header: 'Invoice No', key: 'number' },
                { header: 'Date', key: 'date' },
                { header: 'Client Name', key: 'partyName' },
                { header: 'PAN', key: 'pan' },
                { header: 'TDS Section', key: 'section' },
                { header: 'TDS Rate %', key: 'rate' },
                { header: 'TDS Amount', key: 'amount' },
                { header: 'Status', key: 'status' }
              ]}
              variant="emerald"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-100 text-xs">
                <th className="px-6 py-3.5 text-left font-bold uppercase tracking-wider">Invoice & Date</th>
                <th className="px-6 py-3.5 text-left font-bold uppercase tracking-wider">Client & PAN</th>
                <th className="px-6 py-3.5 text-left font-bold uppercase tracking-wider">Section</th>
                <th className="px-6 py-3.5 text-right font-bold uppercase tracking-wider">TDS Rate</th>
                <th className="px-6 py-3.5 text-right font-bold uppercase tracking-wider text-emerald-300">Expected 26AS TDS</th>
                <th className="px-6 py-3.5 text-center font-bold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="bg-white border-b border-slate-50">
                    <td className="px-6 py-4"><Skeleton width="100px" height="16px" /></td>
                    <td className="px-6 py-4"><Skeleton width="120px" height="16px" /></td>
                    <td className="px-6 py-4"><Skeleton width="60px" height="16px" /></td>
                    <td className="px-6 py-4"><Skeleton width="50px" height="16px" className="ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="70px" height="16px" className="ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="70px" height="24px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : filteredReceivable.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm">
                    <FaInbox className="mx-auto text-slate-300 mb-3" size={24} />
                    No TDS Receivable transactions found in this period.
                  </td>
                </tr>
              ) : (
                filteredReceivable.map((row, idx) => (
                  <tr key={idx} onClick={() => navigate(`/invoices/edit/${row._id}`)} className="hover:bg-slate-50/60 cursor-pointer transition-colors duration-150 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{row.number}</div>
                      <div className="text-[11px] text-slate-400 mt-1 font-medium">
                        {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900">{row.partyName}</div>
                      <div className="text-[11px] font-bold text-slate-500 font-mono tracking-wider mt-0.5">PAN: {row.pan}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">Sec {row.section}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-600">{row.rate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-emerald-600 bg-emerald-50/10">₹{fmt(row.expected)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full border shadow-sm ${
                        row.status === 'Received' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default TdsSummary;
