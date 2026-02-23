import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FaCalendarAlt, FaDownload, FaChartPie } from 'react-icons/fa';
import Skeleton from '../../components/Skeleton';
import ExportDropdown from '../../components/ExportDropdown';

const RevenueReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = '/invoices/reports/revenue';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      console.error('Error fetching Revenue report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const fmt = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex flex-col">
           <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight flex items-center gap-3">
             <FaChartPie className="text-gray-900" /> Client Revenue Report
           </h1>
           <p className="text-gray-500 mt-2 font-medium">Breakdown of revenue generated per client</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 px-2 text-sm text-gray-600">
             <FaCalendarAlt className="text-gray-400" /> Filter
          </div>
          <input 
            type="date" 
            className="border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-gray-400">-</span>
          <input 
            type="date" 
            className="border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <ExportDropdown 
              data={data}
              filename={`Revenue_Report_${startDate || 'All'}_to_${endDate || 'All'}`}
              columns={[
                 { header: 'Client Name', key: 'clientName' },
                 { header: 'Email', key: 'clientEmail' },
                 { header: 'Phone', key: 'clientPhone' },
                 { header: 'Invoices', key: 'totalInvoices' },
                 { header: 'Total Revenue', key: 'totalRevenue' },
                 { header: 'Advance Paid', key: 'totalAdvancePaid' },
                 { header: 'Balance Due', key: 'totalBalanceDue' }
              ]}
              variant="emerald"
           />
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
         <div className="overflow-x-auto">
           <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-800 border-b border-gray-700">
               <tr>
                 <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tl-lg">Client Details</th>
                 <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Invoices Count</th>
                 <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Total Revenue</th>
                 <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Advance Paid</th>
                 <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider rounded-tr-lg">Balance Due</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
               {loading ? (
                 [...Array(5)].map((_, i) => (
                   <tr key={i} className="bg-white border-b border-gray-100">
                      <td className="px-6 py-4">
                         <Skeleton width="120px" height="20px" className="mb-1" />
                         <Skeleton width="80px" height="15px" />
                      </td>
                      <td className="px-6 py-4 text-center"><Skeleton width="40px" height="20px" className="mx-auto" /></td>
                      <td className="px-6 py-4"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                      <td className="px-6 py-4"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                      <td className="px-6 py-4"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                   </tr>
                 ))
               ) : data.length === 0 ? (
                 <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500 text-sm">No revenue data found for this period.</td></tr>
               ) : (
                 data.map((row, idx) => (
                   <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                     <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{row.clientName || 'Unknown Client'}</div>
                         <div className="text-xs text-gray-500 mt-0.5">{row.clientEmail || row.clientPhone || 'No contact info'}</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-600">
                         <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{row.totalInvoices}</span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-extrabold text-gray-900 bg-gray-50/50">
                         ₹{fmt(row.totalRevenue)}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-emerald-600 font-medium">
                         ₹{fmt(row.totalAdvancePaid)}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                         <span className={row.totalBalanceDue > 0 ? 'text-red-500' : 'text-gray-400'}>
                             ₹{fmt(row.totalBalanceDue)}
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

export default RevenueReport;
