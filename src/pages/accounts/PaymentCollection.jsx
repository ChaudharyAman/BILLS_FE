import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { 
  FaFileInvoiceDollar, FaRegClock, FaDownload, FaCalendarAlt, FaInbox, FaInfoCircle 
} from 'react-icons/fa';
import Skeleton from '../../components/Skeleton';
import ExportDropdown from '../../components/ExportDropdown';

const PaymentCollection = () => {
  const navigate = useNavigate();
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
    if (diffDays === null) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
          Unknown Date
        </span>
      );
    }
    if (diffDays <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-150 px-2.5 py-1 rounded-lg text-xs font-semibold">
          Due in {Math.abs(diffDays)} Days
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-150 px-2.5 py-1 rounded-lg text-xs font-semibold">
          Overdue by {diffDays} Days
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-150 px-2.5 py-1 rounded-lg text-xs font-bold">
        Overdue by {diffDays} Days
      </span>
    );
  };

  return (
    <div className="container mx-auto p-6 font-sans text-slate-900 bg-slate-50/50 min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl text-white shadow-md shadow-indigo-100">
              <FaFileInvoiceDollar size={24} />
            </span>
            Payment Collection
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium max-w-xl leading-relaxed">
            Prioritize, track, and streamline your business's outstanding invoices and pending receivables.
          </p>
        </div>
        
        {data.invoices.length > 0 && !loading && (
          <div className="w-full lg:w-auto flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex items-center gap-2.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <FaDownload className="text-indigo-500" /> Export
            </div>
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

      {/* Info Callout */}
      <div className="flex items-start gap-3 bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 mb-8">
        <FaInfoCircle className="text-indigo-500 mt-0.5 shrink-0" size={16} />
        <div className="text-xs text-indigo-950/80 leading-relaxed font-medium">
          <strong>Collection Summary:</strong> Outdated payments negatively affect cash flow. Review the list below to prioritize invoices by overdue days and execute timely collection processes.
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {loading ? (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
              <Skeleton width="100px" height="14px" className="mb-4" />
              <Skeleton width="60%" height="32px" className="mb-2" />
              <Skeleton width="80%" height="12px" />
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
              <Skeleton width="100px" height="14px" className="mb-4" />
              <Skeleton width="60%" height="32px" className="mb-2" />
              <Skeleton width="80%" height="12px" />
            </div>
          </>
        ) : (
          <>
            <StatCard
              title="Total Outstanding"
              amount={data.summary?.totalOutstanding}
              color="indigo"
              icon={FaFileInvoiceDollar}
              subtitle="Total pending collections balance"
            />
            <StatCard
              title="Unpaid Invoices Count"
              amount={data.summary?.invoiceCount}
              color="amber"
              icon={FaRegClock}
              isCurrency={false}
              subtitle="Total count of active outstanding invoices"
            />
          </>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl border border-slate-200/80 overflow-hidden mb-12">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/40">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Outstanding Receivables</h3>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">Detailed queue of clients and invoices pending payment</p>
          </div>
          <div className="text-xs font-semibold text-slate-500 bg-slate-200/50 rounded-full px-3 py-1">
            {data.invoices?.length || 0} Invoice{data.invoices?.length === 1 ? '' : 's'} pending
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-100">
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider rounded-tl-2xl">Client</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Invoice & Due Date</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Total Amount</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider rounded-tr-2xl">Balance Due</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white border-b border-slate-50">
                    <td className="px-6 py-4"><Skeleton width="140px" height="18px" /></td>
                    <td className="px-6 py-4">
                      <Skeleton width="100px" height="18px" className="mb-1.5" />
                      <Skeleton width="80px" height="12px" />
                    </td>
                    <td className="px-6 py-4"><Skeleton width="120px" height="24px" /></td>
                    <td className="px-6 py-4"><Skeleton width="80px" height="18px" className="ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="80px" height="18px" className="ml-auto" /></td>
                  </tr>
                ))
              ) : data.invoices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3.5 border border-emerald-100">
                        <FaRegClock size={20} />
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">All Caught Up!</h4>
                      <p className="text-slate-455 text-xs mt-1.5 leading-relaxed">
                        There are currently no outstanding invoices waiting for payment collection.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.invoices.map((row) => (
                  <tr key={row._id} onClick={() => navigate(`/invoices/edit/${row._id}`)} className="hover:bg-slate-50/60 transition-all duration-150 group cursor-pointer">
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {row.client?.name || 'Unknown Client'}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-800">{row.invoiceNo}</div>
                      <div className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
                        <FaCalendarAlt size={10} className="text-slate-350" />
                        Due: {row.dueDate && !isNaN(new Date(row.dueDate).getTime()) ? new Date(row.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      {getStatusBadge(calculateDaysOverdue(row.dueDate))}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-medium text-slate-500">
                      ₹{fmt(row.grandTotal)}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-bold text-red-600 bg-red-50/10">
                      ₹{fmt(row.balanceDue)}
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

const StatCard = ({ title, amount, color, icon: Icon, subtitle, isCurrency = true }) => {
  const THEME_MAP = {
    indigo: {
      accent: 'bg-indigo-600',
      iconContainer: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      amountText: 'text-indigo-900',
    },
    amber: {
      accent: 'bg-amber-500',
      iconContainer: 'bg-amber-50 text-amber-600 border-amber-100',
      amountText: 'text-amber-900',
    },
  };

  const currentTheme = THEME_MAP[color] || THEME_MAP.indigo;

  return (
    <div className="relative overflow-hidden p-6 bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[148px]">
      {/* Decorative Gradient Background Bar */}
      <div className={`absolute top-0 left-0 w-full h-[3.5px] ${currentTheme.accent}`}></div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">{title}</span>
          {Icon && (
            <span className={`w-8 h-8 rounded-lg border flex items-center justify-center ${currentTheme.iconContainer}`}>
              <Icon size={14} />
            </span>
          )}
        </div>

        <div className={`text-3xl font-black ${currentTheme.amountText} tracking-tight`}>
          {isCurrency && <span className="text-lg font-bold text-slate-400 mr-0.5">₹</span>}
          {isCurrency 
            ? Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : Number(amount || 0).toLocaleString('en-IN')
          }
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

export default PaymentCollection;
