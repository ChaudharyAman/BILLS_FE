import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { 
  FaCalendarAlt, FaDownload, FaChartPie, FaCoins, FaHandHoldingUsd, 
  FaFileInvoice, FaUndoAlt, FaInbox, FaUsers 
} from 'react-icons/fa';
import Skeleton from '../../components/Skeleton';
import ExportDropdown from '../../components/ExportDropdown';

const RevenueReport = () => {
  const navigate = useNavigate();
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
      setData(res.data || []);
    } catch (err) {
      console.error('Error fetching Revenue report:', err);
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

  // Calculate totals
  const totalSummary = {
    revenue: data.reduce((sum, r) => sum + Number(r.totalRevenue || 0), 0),
    advance: data.reduce((sum, r) => sum + Number(r.totalAdvancePaid || 0), 0),
    due: data.reduce((sum, r) => sum + Number(r.totalBalanceDue || 0), 0),
    invoices: data.reduce((sum, r) => sum + Number(r.totalInvoices || 0), 0),
    clients: data.length,
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
          <div className="flex items-center gap-2.5 text-emerald-600 font-bold text-sm tracking-wide uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            Accounts Receivable
          </div>
          <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-tr from-emerald-600 to-emerald-500 rounded-xl text-white shadow-md shadow-emerald-100">
              <FaChartPie size={24} />
            </span>
            Client Revenue Report
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium max-w-xl leading-relaxed">
            Performance analytics detailing individual client revenue margins, contract invoice completions, and outstanding receivables.
          </p>
        </div>

        {/* Date Filter Widget */}
        <div className="w-full xl:w-auto flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <FaCalendarAlt className="text-emerald-500" /> Date Filter
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
              type="date" 
              className="border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium focus:ring-emerald-500 focus:border-emerald-500 p-2 cursor-pointer transition-all bg-slate-50/50"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-400 text-xs font-semibold">to</span>
            <input 
              type="date" 
              className="border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium focus:ring-emerald-500 focus:border-emerald-500 p-2 cursor-pointer transition-all bg-slate-50/50"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-slate-200 md:pl-2">
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
      </div>

      {/* Stat Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
              <Skeleton width="100px" height="14px" className="mb-4" />
              <Skeleton width="60%" height="32px" className="mb-2" />
              <Skeleton width="80%" height="12px" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Receivables (Gross)" 
            amount={totalSummary.revenue} 
            color="blue" 
            icon={FaCoins} 
            subtitle="Calculated before collection"
          />
          <StatCard 
            title="Collected Advances" 
            amount={totalSummary.advance} 
            color="emerald" 
            icon={FaHandHoldingUsd} 
            subtitle="Direct realized cash collections"
          />
          <StatCard 
            title="Outstanding Balance" 
            amount={totalSummary.due} 
            color="rose" 
            icon={FaFileInvoice} 
            subtitle="Client debt awaiting collection"
          />
          <StatCard 
            title="Aggregate Analytics" 
            amount={totalSummary.clients} 
            color="purple" 
            icon={FaUsers} 
            isCount
            subtitle={`${totalSummary.invoices} invoices processed`}
          />
        </div>
      )}

      {/* Ledger Table Container */}
      <div className="bg-white shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl border border-slate-200/80 overflow-hidden mb-12">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/40">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Client Ledger Summary</h3>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">Individual account summaries for the filtered period</p>
          </div>
          <div className="text-xs font-semibold text-slate-500 bg-slate-200/50 rounded-full px-3 py-1">
            {data.length} Client{data.length === 1 ? '' : 's'} Audited
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-100">
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider rounded-tl-2xl">Client Information</th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Invoices Count</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Total Revenue</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Realized Cash (Advance)</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider rounded-tr-2xl">Ledger Balance Due</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="bg-white border-b border-slate-50">
                    <td className="px-6 py-4"><Skeleton width="130px" height="18px" /><Skeleton width="85px" height="12px" className="mt-1.5" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton width="40px" height="18px" className="mx-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="75px" height="18px" className="ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="75px" height="18px" className="ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="75px" height="18px" className="ml-auto" /></td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3.5">
                        <FaInbox size={20} />
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">No Data Available</h4>
                      <p className="text-slate-455 text-xs mt-1.5 leading-relaxed">
                        There are no client revenue statistics recorded in the selected period. Adjust your dates or initialize transactions.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {data.map((row, idx) => (
                    <tr key={idx} onClick={() => navigate(`/clients/edit/${row._id}`)} className="hover:bg-slate-50/60 transition-all duration-150 group cursor-pointer">
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{row.clientName || 'N/A'}</div>
                        <div className="text-[11px] font-semibold text-slate-400 mt-1">
                          {row.clientEmail || row.clientPhone || 'No contact details registered'}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-center text-sm font-medium">
                        <span className="bg-slate-100/80 border border-slate-200 text-slate-700 px-3 py-1 rounded-full font-bold text-xs">
                          {row.totalInvoices}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-extrabold text-slate-900 bg-slate-50/20">
                        ₹{fmt(row.totalRevenue)}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-semibold text-emerald-605">
                        ₹{fmt(row.totalAdvancePaid)}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-black">
                        <span className={row.totalBalanceDue > 0 ? 'text-rose-600 bg-rose-50/40 border border-rose-100 rounded px-2.5 py-1 inline-block' : 'text-slate-400 bg-slate-50/50 rounded px-2.5 py-1 inline-block'}>
                          ₹{fmt(row.totalBalanceDue)}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Summary Footer Row */}
                  <tr className="bg-slate-50 border-t-2 border-slate-900 font-extrabold text-slate-900">
                    <td className="px-6 py-4.5 text-left text-xs uppercase tracking-wider font-black text-slate-950">
                      Total Ledger Aggregates
                    </td>
                    <td className="px-6 py-4.5 text-center text-sm font-bold text-slate-900 bg-slate-100/20">
                      <span className="bg-slate-200 text-slate-800 px-3.5 py-1 rounded-full font-black text-xs">
                        {totalSummary.invoices}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right text-sm font-black text-slate-950 bg-slate-50/50">
                      ₹{fmt(totalSummary.revenue)}
                    </td>
                    <td className="px-6 py-4.5 text-right text-sm font-black text-emerald-705">
                      ₹{fmt(totalSummary.advance)}
                    </td>
                    <td className="px-6 py-4.5 text-right text-sm font-black text-rose-705 bg-rose-50/20">
                      ₹{fmt(totalSummary.due)}
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

const StatCard = ({ title, amount, color, icon: Icon, subtitle, isCount = false }) => {
  const THEME_MAP = {
    blue: {
      accent: 'bg-blue-600',
      iconContainer: 'bg-blue-50 text-blue-600 border-blue-100',
      amountText: 'text-blue-900',
    },
    emerald: {
      accent: 'bg-emerald-600',
      iconContainer: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      amountText: 'text-emerald-950',
    },
    rose: {
      accent: 'bg-rose-600',
      iconContainer: 'bg-rose-50 text-rose-650 border-rose-100',
      amountText: 'text-rose-900',
    },
    purple: {
      accent: 'bg-purple-600',
      iconContainer: 'bg-purple-50 text-purple-600 border-purple-100',
      amountText: 'text-purple-900',
    },
  };

  const currentTheme = THEME_MAP[color] || THEME_MAP.blue;

  return (
    <div className="relative overflow-hidden p-6 bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[148px]">
      {/* Decorative Accent */}
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

        <div className={`text-3xl font-black ${currentTheme.amountText} tracking-tight`}>
          {!isCount && <span className="text-lg font-bold text-slate-400 mr-0.5">₹</span>}
          {isCount ? amount : Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

export default RevenueReport;
