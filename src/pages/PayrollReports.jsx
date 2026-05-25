import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaDownload } from 'react-icons/fa';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';

const PayrollReports = () => {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchEmployees = async () => {
      try {
        const res = await api.get('/employees?limit=200', { signal: controller.signal });
        setEmployees(res.data.data || []);
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
    return () => controller.abort();
  }, []);

  const downloadReport = async (key, url, filename) => {
    try {
      setDownloading(key);
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      toast.success('Report downloaded');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to export report');
    } finally {
      setDownloading('');
    }
  };

  if (loading) {
    return (
      <div className="glass-water-bg min-h-full p-4 sm:p-6 font-sans space-y-6">
        <Skeleton className="h-12 w-72 rounded-2xl animate-pulse" />
        <Skeleton className="h-40 w-full rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-water-bg min-h-full p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between animate-rise-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">Payroll Reports</h1>
          <p className="text-gray-400 text-sm mt-1">Generate month-end payroll sheets, bank transfer files, and compliance registers.</p>
        </div>
      </div>

      {/* Control Panel Card */}
      <div className="glass-water-card p-5 mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-rise-in">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Select Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full border border-white/50 rounded-xl px-3.5 py-2.5 text-sm bg-white/70 backdrop-blur-md outline-none text-gray-700 font-semibold focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{new Date(0, value - 1).toLocaleString('en-US', { month: 'long' })}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Select Year</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full border border-white/50 rounded-xl px-3.5 py-2.5 text-sm bg-white/70 backdrop-blur-md outline-none text-gray-700 font-semibold focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" />
        </div>

        <div className="lg:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Target Employee (For Annual Summary)</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full border border-white/50 rounded-xl px-3.5 py-2.5 text-sm bg-white/70 backdrop-blur-md outline-none text-gray-700 font-semibold focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all">
            <option value="">Select employee for annual summary</option>
            {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName}</option>)}
          </select>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-rise-in" style={{ animationDelay: '100ms' }}>
        <ReportCard
          title="📄 Payroll Register"
          description="Complete consolidated payroll summary sheet for all active/processed employees in the selected month."
          onClick={() => downloadReport('payroll-sheet', `/payroll/export?month=${month}&year=${year}`, `payroll-sheet-${year}-${String(month).padStart(2, '0')}.xlsx`)}
          loading={downloading === 'payroll-sheet'}
        />
        <ReportCard
          title="🏦 Bank Transfer Sheet"
          description="Ready-to-upload Excel sheet containing employee account numbers, bank details, IFSC codes, and net salary payouts."
          onClick={() => downloadReport('bank-transfer', `/reports/payroll-summary/bank-transfer?month=${month}&year=${year}&format=excel`, `bank-transfer-${year}-${String(month).padStart(2, '0')}.xlsx`)}
          loading={downloading === 'bank-transfer'}
        />
        <ReportCard
          title="🛡️ PF Challan Summary"
          description="Aggregated statutory Provident Fund summary report detailing processed employer and employee PF contributions."
          onClick={() => downloadReport('pf-challan', `/reports/payroll-summary/pf-challan?month=${month}&year=${year}&format=excel`, `pf-challan-${year}-${String(month).padStart(2, '0')}.xlsx`)}
          loading={downloading === 'pf-challan'}
        />
        <ReportCard
          title="📊 Monthly TDS Register"
          description="Complete log of monthly TDS deductions made per employee for tax accounting and compliance auditing."
          onClick={() => downloadReport('tds-summary', `/reports/payroll-summary/tds-summary?year=${year}&format=excel`, `tds-summary-fy-${year}-${year + 1}.xlsx`)}
          loading={downloading === 'tds-summary'}
        />
        <ReportCard
          title="👤 Annual Employee Summary"
          description="Chronological, year-long financial ledger report detailing monthly payouts, CTC allocations, and deductions."
          onClick={() => {
            if (!employeeId) {
              toast.error('Select an employee first');
              return;
            }
            downloadReport('employee-summary', `/reports/payroll-summary/annual-employee-summary?employeeId=${employeeId}&year=${year}&format=excel`, `employee-summary-${year}.xlsx`);
          }}
          loading={downloading === 'employee-summary'}
        />
      </div>
    </div>
  );
};

const ReportCard = ({ title, description, onClick, loading }) => (
  <div className="glass-water-card p-6 flex flex-col justify-between hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group">
    <div>
      <h2 className="text-lg font-extrabold text-gray-800 group-hover:text-indigo-600 transition-colors duration-300">{title}</h2>
      <p className="mt-2 text-xs text-gray-400 font-semibold leading-relaxed">{description}</p>
    </div>
    <button onClick={onClick} disabled={loading} className="mt-5 w-full bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-100 disabled:opacity-60 transition-all duration-200">
      <FaDownload className="text-[10px]" /> {loading ? 'Generating Excel...' : 'Export Excel Sheet'}
    </button>
  </div>
);

export default PayrollReports;
