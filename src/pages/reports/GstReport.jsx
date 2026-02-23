import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FaCalendarAlt, FaDownload, FaChartLine } from 'react-icons/fa';
import Skeleton from '../../components/Skeleton';
import ExportDropdown from '../../components/ExportDropdown';

const GstReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = '/invoices/reports/gst';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      console.error('Error fetching GST report:', err);
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
             <FaChartLine className="text-gray-900" /> GST Report
           </h1>
           <p className="text-gray-500 mt-2 font-medium">Comprehensive tax overview and aggregation</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 px-2 text-sm text-gray-600">
             <FaCalendarAlt className="text-gray-400" /> Filter
          </div>
          <input 
            type="date" 
            className="border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-gray-400">-</span>
          <input 
            type="date" 
            className="border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <ExportDropdown 
              data={data?.details || []}
              filename={`GST_Detailed_Report_${startDate || 'All'}_to_${endDate || 'All'}`}
              columns={[
                 { header: 'Invoice No', key: 'invoiceNo' },
                 { header: 'Client', key: 'clientName' },
                 { header: 'State', key: 'clientState' },
                 { header: 'Taxable Amount', key: 'taxableAmount' },
                 { header: 'CGST', key: 'cgst' },
                 { header: 'SGST', key: 'sgst' },
                 { header: 'IGST', key: 'igst' },
                 { header: 'Total Tax', key: 'totalTax' },
                 { header: 'Grand Total', key: 'grandTotal' },
              ]}
              variant="indigo"
           />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <Skeleton width="100px" height="20px" className="mb-4" />
                <Skeleton width="70%" height="40px" />
             </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Total Taxable Amount" amount={data?.totals?.totalTaxableAmount} color="blue" />
          <StatCard title="Total CGST Collected" amount={data?.totals?.totalCGST} color="indigo" />
          <StatCard title="Total SGST Collected" amount={data?.totals?.totalSGST} color="purple" />
          <StatCard title="Total IGST Collected" amount={data?.totals?.totalIGST} color="pink" />
          <StatCard title="Total Tax (All)" amount={data?.totals?.totalTax} color="red" />
          <StatCard title="Grand Total (Including Tax)" amount={data?.totals?.totalGrandTotal} color="emerald" isGrand />
        </div>
      )}

      <div className="mt-8 bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden mb-8">
         <div className="overflow-x-auto">
           <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-800 border-b border-gray-700">
               <tr>
                 <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tl-lg">Invoice / Date</th>
                 <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Client</th>
                 <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Taxable</th>
                 <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">CGST</th>
                 <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">SGST</th>
                 <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">IGST</th>
                 <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Total Tax</th>
                 <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider rounded-tr-lg">Grand Total</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
               {loading ? (
                 [...Array(5)].map((_, i) => (
                   <tr key={i} className="bg-white border-b border-gray-100">
                      <td className="px-6 py-4"><Skeleton width="100px" height="20px" /></td>
                      <td className="px-6 py-4"><Skeleton width="120px" height="20px" /></td>
                      <td className="px-6 py-4"><Skeleton width="60px" height="20px" className="ml-auto" /></td>
                      <td className="px-6 py-4"><Skeleton width="60px" height="20px" className="ml-auto" /></td>
                      <td className="px-6 py-4"><Skeleton width="60px" height="20px" className="ml-auto" /></td>
                      <td className="px-6 py-4"><Skeleton width="60px" height="20px" className="ml-auto" /></td>
                      <td className="px-6 py-4"><Skeleton width="60px" height="20px" className="ml-auto" /></td>
                      <td className="px-6 py-4"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                   </tr>
                 ))
               ) : !data?.details || data.details.length === 0 ? (
                 <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500 text-sm">No GST details found for this period.</td></tr>
               ) : (
                 data.details.map((row, idx) => (
                   <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                     <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{row.invoiceNo}</div>
                         <div className="text-xs text-gray-500 mt-0.5">{new Date(row.date).toLocaleDateString()}</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm font-medium text-gray-900">{row.clientName || 'Unknown Client'}</div>
                         <div className="text-xs text-gray-500 mt-0.5">{row.clientState || 'N/A'}</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-700">
                         ₹{fmt(row.taxableAmount)}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                         ₹{fmt(row.cgst)}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                         ₹{fmt(row.sgst)}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                         ₹{fmt(row.igst)}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 font-semibold">
                         ₹{fmt(row.totalTax)}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-extrabold text-gray-900 bg-gray-50/50">
                         ₹{fmt(row.grandTotal)}
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

const StatCard = ({ title, amount, color, isGrand = false }) => {
  const COLOR_MAP = {
    blue: 'border-blue-500 text-blue-600',
    indigo: 'border-indigo-500 text-indigo-600',
    purple: 'border-purple-500 text-purple-600',
    pink: 'border-pink-500 text-pink-600',
    red: 'border-red-500 text-red-600',
    emerald: 'border-emerald-500 text-emerald-600',
  };

  const accentColor = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <div className={`relative p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow`}>
       {/* Top accent border */}
       <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-xl ${accentColor.split(' ')[0]} bg-current opacity-75`}></div>
       
       <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2 mt-1">{title}</h3>
       <div className={`text-4xl font-extrabold ${isGrand ? 'text-gray-900' : 'text-gray-800'}`}>
         <span className={`text-xl font-medium ${isGrand ? 'text-gray-500' : 'text-gray-400'} mr-1`}>₹</span>
         {Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
       </div>
    </div>
  );
};

export default GstReport;
