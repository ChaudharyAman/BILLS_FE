import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FaUserTie, FaRegCalendarAlt, FaDownload } from 'react-icons/fa';
import Skeleton from '../../components/Skeleton';
import ExportDropdown from '../../components/ExportDropdown';

const AccountStatement = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [data, setData] = useState({ summary: {}, invoices: [] });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch all clients for the dropdown
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get('/clients?limit=1000');
        setClients(res.data.data || []);
      } catch (err) {
        console.error('Error fetching clients:', err);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Fetch statement when filters change
  useEffect(() => {
    const fetchStatement = async () => {
      if (!selectedClient) {
        setData({ summary: {}, invoices: [] });
        return;
      }
      // Validate date range before fetching
      if (startDate && endDate && endDate < startDate) {
        setData({ summary: {}, invoices: [] });
        return;
      }
      setLoading(true);
      try {
        let url = `/invoices/accounts/statements?clientId=${selectedClient}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        
        const res = await api.get(url);
        setData({
          summary: res.data.summary || {},
          invoices: res.data.invoices || []
        });
      } catch (err) {
        console.error('Error fetching Statement:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatement();
  }, [selectedClient, startDate, endDate]);

  const fmt = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const selectedClientData = clients.find(c => c._id === selectedClient);

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex flex-col">
           <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight flex items-center gap-3">
             <FaUserTie className="text-gray-900" /> Account Statement
           </h1>
           <p className="text-gray-500 mt-2 font-medium">Generate a complete financial ledger for any client.</p>
        </div>
        
        {data.invoices.length > 0 && !loading && (
          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
             <ExportDropdown 
                data={data.invoices.map(row => ({
                   ...row,
                   clientName: selectedClientData?.name || 'Unknown',
                   dateFormatted: new Date(row.date).toLocaleDateString()
                }))}
                filename={`Account_Statement_${selectedClientData?.name || 'Client'}`}
                columns={[
                   { header: 'Client', key: 'clientName' },
                   { header: 'Date', key: 'dateFormatted' },
                   { header: 'Invoice No', key: 'invoiceNo' },
                   { header: 'Type', key: 'invoiceType' },
                   { header: 'Total Billed', key: 'grandTotal' },
                   { header: 'Advance/Paid', key: 'advancePaid' },
                   { header: 'Balance', key: 'balanceDue' }
                ]}
                variant="indigo"
             />
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-6 items-end">
         <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Select Client</label>
            {initialLoading ? (
               <Skeleton width="100%" height="42px" />
            ) : (
               <select 
                 className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2.5 text-gray-800 bg-gray-50"
                 value={selectedClient}
                 onChange={(e) => setSelectedClient(e.target.value)}
               >
                 <option value="">-- Choose a Client --</option>
                 {clients.map(c => (
                   <option key={c._id} value={c._id}>{c.name}</option>
                 ))}
               </select>
            )}
         </div>
         <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Start Date</label>
            <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaRegCalendarAlt className="text-gray-400" />
               </div>
               <input 
                 type="date" 
                 className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2.5 pl-10 text-gray-800 bg-gray-50"
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
               />
            </div>
         </div>
         <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">End Date</label>
            <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaRegCalendarAlt className="text-gray-400" />
               </div>
               <input 
                 type="date" 
                 className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2.5 pl-10 text-gray-800 bg-gray-50"
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
               />
            </div>
         </div>
      </div>

      {/* Date range validation warning */}
      {startDate && endDate && endDate < startDate && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">
          ⚠️ End date cannot be before start date. Please correct the date range.
        </div>
      )}

      {selectedClient && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="relative p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
               <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl bg-blue-500 opacity-75"></div>
               <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2 mt-1">Total Billed</h3>
               <div className="text-3xl font-extrabold text-blue-900">
                 <span className="text-xl font-medium text-gray-400 mr-1">₹</span>
                 {loading ? <Skeleton width="100px" height="36px" className="inline-block" /> : fmt(data.summary?.totalBilled)}
               </div>
            </div>
            <div className="relative p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
               <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl bg-emerald-500 opacity-75"></div>
               <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2 mt-1">Total Received</h3>
               <div className="text-3xl font-extrabold text-emerald-900">
                 <span className="text-xl font-medium text-gray-400 mr-1">₹</span>
                 {loading ? <Skeleton width="100px" height="36px" className="inline-block" /> : fmt(data.summary?.totalReceived)}
               </div>
            </div>
            <div className="relative p-6 bg-white rounded-xl border border-emerald-200 shadow-md transition-shadow bg-gradient-to-br from-emerald-50 to-white">
               <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl bg-red-500 opacity-75"></div>
               <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2 mt-1">Outstanding Balance</h3>
               <div className="text-4xl font-extrabold text-red-700">
                 <span className="text-xl font-medium text-gray-400 mr-1">₹</span>
                 {loading ? <Skeleton width="100px" height="40px" className="inline-block" /> : fmt(data.summary?.totalBalance)}
               </div>
            </div>
         </div>
      )}

      {selectedClient && (
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-800 border-b border-gray-700">
                 <tr>
                   <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tl-lg">Date</th>
                   <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Transaction Details</th>
                   <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Amount Billed</th>
                   <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Amount Paid</th>
                   <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider rounded-tr-lg">Running Balance</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                 {loading ? (
                   [...Array(4)].map((_, i) => (
                     <tr key={i} className="bg-white border-b border-gray-100">
                        <td className="px-6 py-4"><Skeleton width="100px" height="20px" /></td>
                        <td className="px-6 py-4">
                           <Skeleton width="120px" height="20px" className="mb-1" />
                           <Skeleton width="80px" height="15px" />
                        </td>
                        <td className="px-6 py-4"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                        <td className="px-6 py-4"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                        <td className="px-6 py-4"><Skeleton width="100px" height="24px" className="ml-auto" /></td>
                     </tr>
                   ))
                 ) : data.invoices.length === 0 ? (
                   <tr>
                     <td colSpan="5" className="px-6 py-16 text-center text-gray-500">
                        No transactions found for this client in the selected period.
                     </td>
                   </tr>
                 ) : (
                   data.invoices.map((row) => (
                     <tr key={row._id} className="hover:bg-gray-50 transition-colors group">
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                           {new Date(row.date).toLocaleDateString()}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {row.invoiceNo}
                           </div>
                           <div className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">{row.invoiceType}</div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600 font-medium">
                           ₹{fmt(row.grandTotal)}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-emerald-600 font-medium">
                           {row.advancePaid > 0 ? `₹${fmt(row.advancePaid)}` : '-'}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                           <span className={`font-extrabold bg-gray-50/50 ${row.balanceDue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                               ₹{fmt(row.balanceDue)}
                           </span>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Empty State when no client is selected */}
      {!selectedClient && !initialLoading && (
         <div className="mt-8 bg-white border-2 border-dashed border-gray-300 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
               <FaUserTie size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Client Selected</h2>
            <p className="text-gray-500 max-w-md">Please select a client from the dropdown menu above to view their complete account ledger and financial statement.</p>
         </div>
      )}

    </div>
  );
};

export default AccountStatement;
