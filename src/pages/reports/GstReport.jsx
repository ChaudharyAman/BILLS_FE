import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  FaCalendarAlt, FaDownload, FaChartLine, FaCalculator, FaPercent,
  FaFileInvoiceDollar, FaUndoAlt, FaCoins, FaInfoCircle, FaInbox
} from 'react-icons/fa';
import Skeleton from '../../components/Skeleton';
import ExportDropdown from '../../components/ExportDropdown';

const GstReport = () => {
  const navigate = useNavigate();
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

  const fmt = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Calculate table sum totals
  const pageTotals = {
    taxable: data?.details?.reduce((sum, r) => sum + Number(r.taxableAmount || 0), 0) || 0,
    cgst: data?.details?.reduce((sum, r) => sum + Number(r.cgst || 0), 0) || 0,
    sgst: data?.details?.reduce((sum, r) => sum + Number(r.sgst || 0), 0) || 0,
    igst: data?.details?.reduce((sum, r) => sum + Number(r.igst || 0), 0) || 0,
    tax: data?.details?.reduce((sum, r) => sum + Number(r.totalTax || 0), 0) || 0,
    grand: data?.details?.reduce((sum, r) => sum + Number(r.grandTotal || 0), 0) || 0,
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

  return (
    <div className="container mx-auto p-6 font-sans text-slate-900 bg-slate-50/50 min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        <div>
          {/* <div className="flex items-center gap-2.5 text-indigo-600 font-bold text-sm tracking-wide uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Financial Intelligence
          </div> */}
          <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl text-white shadow-md shadow-indigo-100">
              <FaChartLine size={24} />
            </span>
            GST Return Ledger
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium max-w-xl leading-relaxed">
            Real-time tax aggregation, audit-ready calculations, and input tax credit analysis for your business.
          </p>
        </div>

        {/* Date Filter Widget */}
        <div className="w-full xl:w-auto flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <FaCalendarAlt className="text-indigo-500" /> Date Filter
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

          <div className="flex justify-end pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-slate-200 md:pl-2">
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
      </div>

      {/* Info Callout */}
      <div className="flex items-start gap-3 bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 mb-8">
        <FaInfoCircle className="text-indigo-500 mt-0.5 shrink-0" size={16} />
        <div className="text-xs text-indigo-950/80 leading-relaxed font-medium">
          <strong>Tax Rules Notice:</strong> CGST & SGST apply to intra-state sales (where client is registered in the same state as your home branch). IGST applies to inter-state and export transactions. All rates automatically balance to audit specifications.
        </div>
      </div>

      {/* Stat Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
              <Skeleton width="100px" height="14px" className="mb-4" />
              <Skeleton width="60%" height="32px" className="mb-2" />
              <Skeleton width="80%" height="12px" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Taxable Value"
            amount={data?.totals?.totalTaxableAmount}
            color="blue"
            icon={FaCalculator}
            subtitle="Before tax ledger balance"
          />
          <StatCard
            title="Central GST (CGST)"
            amount={data?.totals?.totalCGST}
            color="violet"
            icon={FaPercent}
            subtitle="Intra-state central revenue"
          />
          <StatCard
            title="State GST (SGST)"
            amount={data?.totals?.totalSGST}
            color="purple"
            icon={FaPercent}
            subtitle="Intra-state state revenue"
          />
          <StatCard
            title="Integrated GST (IGST)"
            amount={data?.totals?.totalIGST}
            color="pink"
            icon={FaCoins}
            subtitle="Inter-state & export revenue"
          />
          <StatCard
            title="Total Tax Collected"
            amount={data?.totals?.totalTax}
            color="amber"
            icon={FaFileInvoiceDollar}
            subtitle="Sum of CGST, SGST & IGST"
          />
          <StatCard
            title="Gross Revenue"
            amount={data?.totals?.totalGrandTotal}
            color="emerald"
            icon={FaChartLine}
            isGrand
            subtitle="All sales including tax liability"
          />
        </div>
      )}

      {/* Ledger Table Container */}
      <div className="mt-8 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl border border-slate-200/80 overflow-hidden mb-12">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/40">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Detailed Transactions</h3>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">Individual ledger entries matching report dates</p>
          </div>
          <div className="text-xs font-semibold text-slate-500 bg-slate-200/50 rounded-full px-3 py-1">
            {data?.details?.length || 0} Invoice{data?.details?.length === 1 ? '' : 's'} found
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-100">
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider rounded-tl-2xl">Invoice & Date</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Client Details</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Taxable Value</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">CGST</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">SGST</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">IGST</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-amber-300">Total Tax</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider rounded-tr-2xl">Grand Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="bg-white border-b border-slate-50">
                    <td className="px-6 py-4"><Skeleton width="110px" height="18px" /><Skeleton width="70px" height="12px" className="mt-1.5" /></td>
                    <td className="px-6 py-4"><Skeleton width="130px" height="18px" /><Skeleton width="85px" height="12px" className="mt-1.5" /></td>
                    <td className="px-6 py-4"><Skeleton width="70px" height="18px" className="ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="60px" height="18px" className="ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="60px" height="18px" className="ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="60px" height="18px" className="ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="65px" height="18px" className="ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="85px" height="18px" className="ml-auto" /></td>
                  </tr>
                ))
              ) : !data?.details || data.details.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3.5">
                        <FaInbox size={20} />
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">No Data Available</h4>
                      <p className="text-slate-450 text-xs mt-1.5 leading-relaxed">
                        There are no GST transactions recorded in the selected period. Adjust your dates or initialize transactions.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {data.details.map((row, idx) => (
                    <tr key={idx} onClick={() => navigate(`/invoices/edit/${row._id}`)} className="hover:bg-slate-50/60 transition-all duration-150 group cursor-pointer">
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{row.invoiceNo}</div>
                        <div className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
                          <FaCalendarAlt size={10} className="text-slate-350" />
                          {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900 leading-snug">{row.clientName || 'N/A'}</div>
                        <div className="text-[11px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100/50 rounded px-1.5 py-0.5 mt-1 inline-block uppercase tracking-wider">
                          State: {row.clientState || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-bold text-slate-700">
                        ₹{fmt(row.taxableAmount)}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-medium text-slate-500">
                        {row.cgst > 0 ? `₹${fmt(row.cgst)}` : '—'}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-medium text-slate-500">
                        {row.sgst > 0 ? `₹${fmt(row.sgst)}` : '—'}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-medium text-slate-500">
                        {row.igst > 0 ? `₹${fmt(row.igst)}` : '—'}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm text-red-600 font-bold bg-red-50/10">
                        ₹{fmt(row.totalTax)}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-black text-slate-900 bg-slate-50/40">
                        ₹{fmt(row.grandTotal)}
                      </td>
                    </tr>
                  ))}

                  {/* Summary Calculation Footer Row */}
                  <tr className="bg-slate-50 border-t-2 border-slate-900 font-extrabold text-slate-900">
                    <td colSpan="2" className="px-6 py-4.5 text-left text-xs uppercase tracking-wider font-black text-slate-950">
                      Total Ledger Page Aggregates
                    </td>
                    <td className="px-6 py-4.5 text-right text-sm font-black text-slate-950">
                      ₹{fmt(pageTotals.taxable)}
                    </td>
                    <td className="px-6 py-4.5 text-right text-sm font-extrabold text-slate-650">
                      ₹{fmt(pageTotals.cgst)}
                    </td>
                    <td className="px-6 py-4.5 text-right text-sm font-extrabold text-slate-650">
                      ₹{fmt(pageTotals.sgst)}
                    </td>
                    <td className="px-6 py-4.5 text-right text-sm font-extrabold text-slate-650">
                      ₹{fmt(pageTotals.igst)}
                    </td>
                    <td className="px-6 py-4.5 text-right text-sm font-black text-red-700 bg-red-50/30">
                      ₹{fmt(pageTotals.tax)}
                    </td>
                    <td className="px-6 py-4.5 text-right text-sm font-black text-slate-950 bg-slate-100/50">
                      ₹{fmt(pageTotals.grand)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
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
    violet: {
      accent: 'bg-violet-600',
      iconContainer: 'bg-violet-50 text-violet-600 border-violet-100',
      amountText: 'text-violet-900',
    },
    purple: {
      accent: 'bg-purple-600',
      iconContainer: 'bg-purple-50 text-purple-600 border-purple-100',
      amountText: 'text-purple-900',
    },
    pink: {
      accent: 'bg-pink-600',
      iconContainer: 'bg-pink-50 text-pink-600 border-pink-100',
      amountText: 'text-pink-900',
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
      {/* Decorative Gradient Background Bar */}
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

export default GstReport;
