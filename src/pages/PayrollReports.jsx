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
      <div className="container mx-auto p-6 font-sans text-gray-900 space-y-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Payroll Reports</h1>
        <p className="text-gray-500 mt-1">Generate month-end payroll sheets, transfer files, and compliance summaries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
          {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
            <option key={value} value={value}>{new Date(0, value - 1).toLocaleString('en-US', { month: 'long' })}</option>
          ))}
        </select>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm lg:col-span-2">
          <option value="">Select employee for annual summary</option>
          {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ReportCard
          title="Payroll Sheet"
          description="Full payroll sheet for all employees in the selected month."
          onClick={() => downloadReport('payroll-sheet', `/payroll/export?month=${month}&year=${year}`, `payroll-sheet-${year}-${String(month).padStart(2, '0')}.xlsx`)}
          loading={downloading === 'payroll-sheet'}
        />
        <ReportCard
          title="Bank Transfer"
          description="Employee name, account number, IFSC, and net salary."
          onClick={() => downloadReport('bank-transfer', `/reports/payroll-summary/bank-transfer?month=${month}&year=${year}&format=excel`, `bank-transfer-${year}-${String(month).padStart(2, '0')}.xlsx`)}
          loading={downloading === 'bank-transfer'}
        />
        <ReportCard
          title="PF Challan"
          description="Employee and employer PF contribution summary."
          onClick={() => downloadReport('pf-challan', `/reports/payroll-summary/pf-challan?month=${month}&year=${year}&format=excel`, `pf-challan-${year}-${String(month).padStart(2, '0')}.xlsx`)}
          loading={downloading === 'pf-challan'}
        />
        <ReportCard
          title="TDS Summary"
          description="Monthly TDS per employee for the selected financial year."
          onClick={() => downloadReport('tds-summary', `/reports/payroll-summary/tds-summary?year=${year}&format=excel`, `tds-summary-fy-${year}-${year + 1}.xlsx`)}
          loading={downloading === 'tds-summary'}
        />
        <ReportCard
          title="Employee Summary"
          description="Year-long payroll summary for a selected employee."
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
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col justify-between">
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
    <button onClick={onClick} disabled={loading} className="mt-5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
      <FaDownload /> {loading ? 'Generating...' : 'Export Excel'}
    </button>
  </div>
);

export default PayrollReports;
