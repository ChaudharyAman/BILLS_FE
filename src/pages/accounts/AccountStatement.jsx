import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { 
  FaUserTie, FaTruck, FaRegCalendarAlt, FaDownload, FaFileInvoiceDollar, 
  FaCoins, FaCalculator, FaInbox, FaInfoCircle, FaCalendarAlt, FaReceipt 
} from 'react-icons/fa';
import Skeleton from '../../components/Skeleton';
import ExportDropdown from '../../components/ExportDropdown';

const AccountStatement = () => {
  const navigate = useNavigate();
  const [statementType, setStatementType] = useState('client'); // 'client' | 'vendor'
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [data, setData] = useState({ summary: {}, items: [] });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch both clients and vendors on mount
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const [clientsRes, vendorsRes] = await Promise.all([
          api.get('/clients?limit=1000'),
          api.get('/vendors?limit=1000')
        ]);
        setClients(clientsRes.data.data || []);
        setVendors(vendorsRes.data.data || []);
      } catch (err) {
        console.error('Error fetching parties:', err);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchParties();
  }, []);

  // Reset selected party and data when toggling statement type
  const handleTypeChange = (type) => {
    setStatementType(type);
    setSelectedParty('');
    setData({ summary: {}, items: [] });
  };

  // Fetch statement when filters change
  useEffect(() => {
    const fetchStatement = async () => {
      if (!selectedParty) {
        setData({ summary: {}, items: [] });
        return;
      }
      // Validate date range before fetching
      if (startDate && endDate && endDate < startDate) {
        setData({ summary: {}, items: [] });
        return;
      }
      setLoading(true);
      try {
        let url = statementType === 'client'
          ? `/invoices/accounts/statements?clientId=${selectedParty}`
          : `/expenses/accounts/statements?vendorId=${selectedParty}`;
        
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        
        const res = await api.get(url);
        setData({
          summary: res.data.summary || {},
          items: statementType === 'client' ? (res.data.invoices || []) : (res.data.expenses || [])
        });
      } catch (err) {
        console.error('Error fetching Statement:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatement();
  }, [statementType, selectedParty, startDate, endDate]);

  const fmt = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const currentPartyList = statementType === 'client' ? clients : vendors;
  const selectedPartyData = currentPartyList.find(p => p._id === selectedParty);

  return (
    <div className="container mx-auto p-6 font-sans text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-transparent min-h-screen transition-colors">
      {/* Header Banner & Type Switcher */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-950 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <span className={`p-2.5 rounded-xl text-white shadow-md transition-colors ${
              statementType === 'client' 
                ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-indigo-100 dark:shadow-none' 
                : 'bg-gradient-to-tr from-teal-600 to-teal-500 shadow-teal-100 dark:shadow-none'
            }`}>
              {statementType === 'client' ? <FaUserTie size={24} /> : <FaTruck size={24} />}
            </span>
            {statementType === 'client' ? 'Client Account Statement' : 'Vendor Account Statement'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium max-w-xl leading-relaxed">
            {statementType === 'client' 
              ? 'Generate and audit a complete real-time accounts receivable ledger and collection statement for any client.'
              : 'Generate and audit a complete real-time accounts payable ledger and disbursement statement for any vendor / supplier.'}
          </p>
        </div>

        {/* Type Toggle Pills & Export */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl flex items-center shadow-inner border border-transparent dark:border-slate-700">
            <button
              onClick={() => handleTypeChange('client')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                statementType === 'client'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FaUserTie size={12} />
              Clients (Receivables)
            </button>
            <button
              onClick={() => handleTypeChange('vendor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                statementType === 'vendor'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FaTruck size={12} />
              Vendors (Payables)
            </button>
          </div>

          {data.items.length > 0 && !loading && (
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <FaDownload className={statementType === 'client' ? 'text-indigo-500 dark:text-indigo-400' : 'text-teal-500 dark:text-teal-400'} /> Export
              </div>
              <ExportDropdown 
                data={data.items.map(row => ({
                  ...row,
                  partyName: selectedPartyData?.name || (statementType === 'client' ? 'Client' : 'Vendor'),
                  docNumber: row.invoiceNo || row.expenseNumber || '—',
                  docCategory: row.invoiceType || row.category?.name || 'General',
                  dateFormatted: new Date(row.date).toLocaleDateString('en-IN'),
                  billedVal: row.grandTotal || 0,
                  paidVal: row.advancePaid !== undefined ? row.advancePaid : (row.amountPaid || 0),
                  balanceVal: row.balanceDue || 0
                }))}
                filename={`Account_Statement_${statementType === 'client' ? 'Client' : 'Vendor'}_${selectedPartyData?.name || 'Party'}`}
                columns={[
                  { header: statementType === 'client' ? 'Client' : 'Vendor', key: 'partyName' },
                  { header: 'Date', key: 'dateFormatted' },
                  { header: statementType === 'client' ? 'Invoice No' : 'Bill/Expense No', key: 'docNumber' },
                  { header: 'Category/Type', key: 'docCategory' },
                  { header: statementType === 'client' ? 'Amount Billed' : 'Bill Amount', key: 'billedVal' },
                  { header: 'Amount Paid', key: 'paidVal' },
                  { header: statementType === 'client' ? 'Receivable Balance' : 'Payable Balance', key: 'balanceVal' }
                ]}
                variant={statementType === 'client' ? 'indigo' : 'teal'}
              />
            </div>
          )}
        </div>
      </div>

      {/* Info Callout */}
      <div className={`flex items-start gap-3 rounded-xl p-4 mb-8 border ${
        statementType === 'client' 
          ? 'bg-indigo-50/40 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/60 text-indigo-950/80 dark:text-indigo-200' 
          : 'bg-teal-50/40 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900/60 text-teal-950/80 dark:text-teal-200'
      }`}>
        <FaInfoCircle className={statementType === 'client' ? 'text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0' : 'text-teal-500 dark:text-teal-400 mt-0.5 shrink-0'} size={16} />
        <div className="text-xs leading-relaxed font-medium">
          <strong>Ledger Specifications:</strong> {statementType === 'client'
            ? 'Generate client-centric statements. Billed amounts represent invoiced receivables. Balance due shows computed outstanding revenue.'
            : 'Generate vendor-centric statements. Billed amounts represent vendor expenses/procurements. Balance due shows computed pending liabilities owed to the supplier.'}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-end transition-colors">
        <div className="w-full">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5 uppercase tracking-wider">
            {statementType === 'client' ? 'Select Client' : 'Select Vendor'}
          </label>
          {initialLoading ? (
            <Skeleton width="100%" height="46px" className="rounded-xl" />
          ) : (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                {statementType === 'client' ? <FaUserTie size={14} /> : <FaTruck size={14} />}
              </div>
              <select 
                className={`w-full border border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600 rounded-xl shadow-sm p-3 pl-10 text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 text-sm font-medium transition-all appearance-none cursor-pointer focus:ring ${
                  statementType === 'client' ? 'focus:border-indigo-500 focus:ring-indigo-200/50 dark:focus:ring-indigo-900/50' : 'focus:border-teal-500 focus:ring-teal-200/50 dark:focus:ring-teal-900/50'
                }`}
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
              >
                <option value="" className="dark:bg-slate-800">{statementType === 'client' ? '-- Choose a Client --' : '-- Choose a Vendor --'}</option>
                {currentPartyList.map(p => (
                  <option key={p._id} value={p._id} className="dark:bg-slate-800">{p.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 dark:text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          )}
        </div>
        <div className="w-full">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5 uppercase tracking-wider">Start Date</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <FaRegCalendarAlt size={14} />
            </div>
            <input 
              type="date" 
              className={`w-full border border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600 rounded-xl shadow-sm p-3 pl-10 text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 text-sm font-medium transition-all cursor-pointer focus:ring ${
                statementType === 'client' ? 'focus:border-indigo-500 focus:ring-indigo-200/50 dark:focus:ring-indigo-900/50' : 'focus:border-teal-500 focus:ring-teal-200/50 dark:focus:ring-teal-900/50'
              }`}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5 uppercase tracking-wider">End Date</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <FaRegCalendarAlt size={14} />
            </div>
            <input 
              type="date" 
              className={`w-full border border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600 rounded-xl shadow-sm p-3 pl-10 text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 text-sm font-medium transition-all cursor-pointer focus:ring ${
                statementType === 'client' ? 'focus:border-indigo-500 focus:ring-indigo-200/50 dark:focus:ring-indigo-900/50' : 'focus:border-teal-500 focus:ring-teal-200/50 dark:focus:ring-teal-900/50'
              }`}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Date range validation warning */}
      {startDate && endDate && endDate < startDate && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2">
          <span>⚠️</span> End date cannot be before start date. Please correct the selected date range.
        </div>
      )}

      {/* Stat Grid (shown when party selected) */}
      {selectedParty && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800">
                <Skeleton width="100px" height="14px" className="mb-4" />
                <Skeleton width="60%" height="32px" className="mb-2" />
                <Skeleton width="80%" height="12px" />
              </div>
            ))
          ) : (
            <>
              <StatCard
                title={statementType === 'client' ? "Total Billed" : "Total Billed by Vendor"}
                amount={data.summary?.totalBilled}
                color="blue"
                icon={FaCalculator}
                subtitle={statementType === 'client' ? "Sum of all client invoices" : "Sum of all vendor bills & expenses"}
              />
              <StatCard
                title={statementType === 'client' ? "Total Received" : "Total Paid to Vendor"}
                amount={statementType === 'client' ? data.summary?.totalReceived : data.summary?.totalPaid}
                color="emerald"
                icon={FaCoins}
                subtitle={statementType === 'client' ? "Total client payments settled" : "Total vendor disbursements settled"}
              />
              <StatCard
                title={statementType === 'client' ? "Outstanding Receivables" : "Outstanding Payables"}
                amount={data.summary?.totalBalance}
                color="red"
                icon={statementType === 'client' ? FaFileInvoiceDollar : FaReceipt}
                subtitle={statementType === 'client' ? "Net pending receivables to collect" : "Net pending payables owed to vendor"}
              />
            </>
          )}
        </div>
      )}

      {/* Ledger Table Container */}
      {selectedParty && (
        <div className="bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden mb-12">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/40 dark:bg-slate-800/40">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Transaction Ledger</h3>
              <p className="text-slate-400 dark:text-slate-400 text-xs mt-0.5 font-medium">
                Historical audit of transactions for {selectedPartyData?.name || (statementType === 'client' ? 'selected client' : 'selected vendor')}
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 rounded-full px-3 py-1 border border-transparent dark:border-slate-700">
              {data.items?.length || 0} Record{data.items?.length === 1 ? '' : 's'} found
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-800">
              <thead>
                <tr className="bg-slate-900 dark:bg-slate-800 border-b border-slate-800 dark:border-slate-700 text-slate-100">
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider rounded-tl-2xl">Date</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Transaction Details</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Amount Billed</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Amount Paid</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider rounded-tr-2xl">
                    {statementType === 'client' ? 'Receivable Balance' : 'Payable Balance'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800/50">
                      <td className="px-6 py-4"><Skeleton width="100px" height="18px" /></td>
                      <td className="px-6 py-4">
                        <Skeleton width="120px" height="18px" className="mb-1.5" />
                        <Skeleton width="80px" height="12px" />
                      </td>
                      <td className="px-6 py-4"><Skeleton width="80px" height="18px" className="ml-auto" /></td>
                      <td className="px-6 py-4"><Skeleton width="80px" height="18px" className="ml-auto" /></td>
                      <td className="px-6 py-4"><Skeleton width="100px" height="20px" className="ml-auto" /></td>
                    </tr>
                  ))
                ) : data.items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mb-3.5 border border-slate-200 dark:border-slate-700">
                          <FaInbox size={20} />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">No Transactions Found</h4>
                        <p className="text-slate-400 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">
                          There are no recorded transactions in the selected date range.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.items.map((row) => {
                    const isClient = statementType === 'client';
                    const docNumber = isClient ? row.invoiceNo : row.expenseNumber;
                    const docBadge = isClient ? row.invoiceType : (row.category?.name || 'General Expense');
                    const paidAmount = isClient ? row.advancePaid : row.amountPaid;
                    const editPath = isClient ? `/invoices/edit/${row._id}` : `/expenses/edit/${row._id}`;

                    return (
                      <tr 
                        key={row._id} 
                        onClick={() => navigate(editPath)} 
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-all duration-150 group cursor-pointer"
                      >
                        <td className="px-6 py-4.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <FaCalendarAlt size={10} className="text-slate-400" />
                            {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <div className={`text-sm font-bold text-slate-900 dark:text-slate-100 transition-colors ${
                            isClient ? 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400' : 'group-hover:text-teal-600 dark:group-hover:text-teal-400'
                          }`}>
                            {docNumber}
                          </div>
                          <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 mt-1 inline-block uppercase tracking-wider border ${
                            isClient 
                              ? 'text-indigo-650 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100/50 dark:border-indigo-800/60' 
                              : 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border-teal-100/50 dark:border-teal-800/60'
                          }`}>
                            {docBadge}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                          ₹{fmt(row.grandTotal)}
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/10 dark:bg-emerald-950/10">
                          {paidAmount > 0 ? `₹${fmt(paidAmount)}` : '—'}
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-extrabold">
                          <span className={`px-2 py-1 rounded ${
                            row.balanceDue > 0 
                              ? (isClient ? 'text-red-700 dark:text-red-300 bg-red-50/40 dark:bg-red-950/40 border border-red-100/30 dark:border-red-800/40' : 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/40') 
                              : 'text-slate-900 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50'
                          }`}>
                            ₹{fmt(row.balanceDue)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State when no party is selected */}
      {!selectedParty && !initialLoading && (
        <div className="mt-8 bg-white dark:bg-slate-900 border border-dashed border-slate-350/80 dark:border-slate-700 rounded-2xl p-16 flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-sm transition-colors">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mb-4 border border-slate-200/60 dark:border-slate-700 shadow-inner">
            {statementType === 'client' ? <FaUserTie size={24} /> : <FaTruck size={24} />}
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
            {statementType === 'client' ? 'No Client Selected' : 'No Vendor Selected'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm">
            {statementType === 'client'
              ? 'Please select a client from the dropdown menu above to retrieve their complete ledger and statement transaction history.'
              : 'Please select a vendor / supplier from the dropdown menu above to retrieve their complete accounts payable ledger and bills.'}
          </p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, amount, color, icon: Icon, subtitle }) => {
  const THEME_MAP = {
    blue: {
      accent: 'bg-blue-600',
      iconContainer: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border-blue-100 dark:border-blue-800',
      amountText: 'text-blue-900 dark:text-blue-200',
    },
    emerald: {
      accent: 'bg-emerald-600',
      iconContainer: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800',
      amountText: 'text-emerald-900 dark:text-emerald-200',
    },
    red: {
      accent: 'bg-rose-600',
      iconContainer: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-100 dark:border-rose-800',
      amountText: 'text-rose-900 dark:text-rose-200',
    },
  };

  const currentTheme = THEME_MAP[color] || THEME_MAP.blue;

  return (
    <div className="relative overflow-hidden p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[148px]">
      {/* Decorative Gradient Background Bar */}
      <div className={`absolute top-0 left-0 w-full h-[3.5px] ${currentTheme.accent}`}></div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-400 uppercase">{title}</span>
          {Icon && (
            <span className={`w-8 h-8 rounded-lg border flex items-center justify-center ${currentTheme.iconContainer}`}>
              <Icon size={14} />
            </span>
          )}
        </div>

        <div className={`text-3xl font-black ${currentTheme.amountText} tracking-tight`}>
          <span className="text-lg font-bold text-slate-400 mr-0.5">₹</span>
          {Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {subtitle && (
        <span className="text-[11px] text-slate-400 dark:text-slate-400 font-semibold mt-3 flex items-center gap-1">
          {subtitle}
        </span>
      )}
    </div>
  );
};

export default AccountStatement;
