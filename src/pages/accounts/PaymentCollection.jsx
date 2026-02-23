import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FaFileInvoiceDollar, FaRegClock, FaDownload } from 'react-icons/fa';
import Skeleton from '../../components/Skeleton';
import ExportDropdown from '../../components/ExportDropdown';

const PaymentCollection = () => {
  const [data, setData] = useState({ summary: {}, invoices: [] });
  const [loading, setLoading] = useState(true);

  const fetchCollection = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices/accounts/payments');
      setData({
        summary: res.data.summary || {},
        invoices: res.data.invoices || []
      });
    } catch (err) {
      console.error('Error fetching Payment Collection:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollection();
  }, []);

  const fmt = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const calculateDaysOverdue = (dueDateStr) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffTime = now - due;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (diffDays) => {
    if (diffDays === null) return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-semibold">Unknown Date</span>;
    if (diffDays <= 0) {
      return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-semibold">Due in {Math.abs(diffDays)} Days</span>;
    }
    if (diffDays <= 7) {
      return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-semibold">Overdue by {diffDays} Days</span>;
    }
    return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">Overdue by {diffDays} Days</span>;
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex flex-col">
           <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight flex items-center gap-3">
             <FaFileInvoiceDollar className="text-gray-900" /> Payment Collection
           </h1>
           <p className="text-gray-500 mt-2 font-medium">Prioritize and track your outstanding invoices.</p>
        </div>
        
        {data.invoices.length > 0 && !loading && (
          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
             <ExportDropdown 
                data={data.invoices.map(row => {
                  const days = calculateDaysOverdue(row.dueDate);
                  return {
                     ...row,
                     clientName: row.client?.name,
                     computedStatus: days !== null ? (days > 0 ? `Overdue by ${days} days` : `Due in ${Math.abs(days)} days`) : 'Unknown'
                  };
                })}
                filename={`Payment_Collection_Report`}
                columns={[
                   { header: 'Client', key: 'clientName' },
                   { header: 'Invoice No', key: 'invoiceNo' },
                   { header: 'Date', key: 'date' },
                   { header: 'Due Date', key: 'dueDate' },
                   { header: 'Status', key: 'computedStatus'},
                   { header: 'Total Amount', key: 'grandTotal' },
                   { header: 'Advance Paid', key: 'advancePaid' },
                   { header: 'Balance Due', key: 'balanceDue' }
                ]}
                variant="indigo"
             />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
         <div className="relative p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
           <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl bg-indigo-500 opacity-75"></div>
           <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2 mt-1">Total Outstanding</h3>
           <div className="text-4xl font-extrabold text-gray-900">
             <span className="text-xl font-medium text-gray-500 mr-1">₹</span>
             {loading ? <Skeleton width="150px" height="40px" className="inline-block" /> : fmt(data.summary?.totalOutstanding)}
           </div>
         </div>
         <div className="relative p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
           <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl bg-orange-500 opacity-75"></div>
           <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2 mt-1">Unpaid Invoices Count</h3>
           <div className="text-4xl font-extrabold text-gray-900">
             {loading ? <Skeleton width="100px" height="40px" className="inline-block" /> : data.summary?.invoiceCount || 0}
           </div>
         </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
         <div className="overflow-x-auto">
           <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-800 border-b border-gray-700">
               <tr>
                 <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tl-lg">Client</th>
                 <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Invoice / Due Date</th>
                 <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Status</th>
                 <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Total Amount</th>
                 <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider rounded-tr-lg">Balance Due</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
               {loading ? (
                 [...Array(5)].map((_, i) => (
                   <tr key={i} className="bg-white border-b border-gray-100">
                      <td className="px-6 py-4"><Skeleton width="140px" height="20px" /></td>
                      <td className="px-6 py-4">
                         <Skeleton width="100px" height="20px" className="mb-1" />
                         <Skeleton width="80px" height="15px" />
                      </td>
                      <td className="px-6 py-4"><Skeleton width="120px" height="26px" /></td>
                      <td className="px-6 py-4"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                      <td className="px-6 py-4"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                   </tr>
                 ))
               ) : data.invoices.length === 0 ? (
                 <tr>
                   <td colSpan="5" className="px-6 py-16 text-center">
                     <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                           <FaRegClock size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">All Caught Up!</h3>
                        <p className="text-gray-500 text-sm max-w-sm">There are currently no outstanding invoices waiting for payment collection.</p>
                     </div>
                   </td>
                 </tr>
               ) : (
                 data.invoices.map((row) => (
                   <tr key={row._id} className="hover:bg-gray-50 transition-colors group">
                     <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {row.client?.name || 'Unknown Client'}
                         </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm font-semibold text-gray-800">{row.invoiceNo}</div>
                         <div className="text-xs text-gray-500 mt-0.5">Due: {new Date(row.dueDate).toLocaleDateString()}</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm">
                         {getStatusBadge(calculateDaysOverdue(row.dueDate))}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600 font-medium">
                         ₹{fmt(row.grandTotal)}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                         <span className="text-red-600 font-extrabold bg-gray-50/50">
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
    </div>
  );
};

export default PaymentCollection;
