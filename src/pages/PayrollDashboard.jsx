import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { FaFileInvoice, FaMoneyBillWave, FaPlus } from 'react-icons/fa';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const monthName = (month) => new Date(0, month - 1).toLocaleString('en-US', { month: 'long' });

const PayrollDashboard = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayrolls = async (signal) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ month, year, limit: 100 });
      const res = await api.get(`/payroll?${params.toString()}`, { signal });
      setPayrolls(res.data.data || []);
    } catch (error) {
      if (error.name === 'CanceledError' || error.name === 'AbortError') return;
      console.error(error);
      alert('Failed to load payroll');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchPayrolls(controller.signal);
    return () => controller.abort();
  }, [month, year]);

  const stats = useMemo(() => ({
    total: payrolls.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0),
    processed: payrolls.filter(p => p.status === 'processed').length,
    paid: payrolls.filter(p => p.status === 'paid').length,
    cancelled: payrolls.filter(p => p.status === 'cancelled').length,
  }), [payrolls]);

  const markPaid = async (payroll) => {
    if (!window.confirm(`Mark salary for ${payroll.employee?.firstName || 'employee'} as paid?`)) return;
    try {
      await api.post(`/payroll/${payroll._id}/mark-paid`, {
        paymentDate: new Date().toISOString().substring(0, 10),
        paymentMethod: 'Bank Transfer',
      });
      fetchPayrolls();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to mark payroll as paid');
    }
  };

  const generatePayslip = async (payroll) => {
    const res = await api.get(`/payroll/${payroll._id}/generate-payslip`);
    const slip = res.data.payslip;
    alert(`Payslip ready for ${slip.employee.firstName} ${slip.employee.lastName}\nNet Salary: ${fmtMoney(slip.netSalary)}`);
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-gray-500 mt-1">Process salaries and post paid payroll into expenses</p>
        </div>
        <Link to="/payroll/process" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
          <FaPlus size={14} /> Process Payroll
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-sm text-gray-500">Total Payroll</div>
          <div className="text-2xl font-bold mt-2">{fmtMoney(stats.total)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-sm text-blue-600">Processed</div>
          <div className="text-2xl font-bold mt-2 text-blue-700">{stats.processed}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-sm text-green-600">Paid</div>
          <div className="text-2xl font-bold mt-2 text-green-700">{stats.paid}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-sm text-gray-500">Records</div>
          <div className="text-2xl font-bold mt-2">{payrolls.length}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/60 flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <h2 className="font-bold text-gray-800">{monthName(month)} {year}</h2>
          <div className="flex gap-3">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{monthName(m)}</option>)}
            </select>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Earnings</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Deductions</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Net Salary</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">Loading payroll...</td></tr>
              ) : payrolls.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">No payroll processed for this period.</td></tr>
              ) : payrolls.map(payroll => (
                <tr key={payroll._id} className="hover:bg-blue-50/40">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{payroll.employee?.firstName} {payroll.employee?.lastName}</div>
                    <div className="text-xs text-gray-500">{payroll.employee?.employeeId} · {payroll.employee?.department?.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">{fmtMoney(payroll.earnings?.totalEarnings)}</td>
                  <td className="px-6 py-4 text-right text-sm">{fmtMoney(payroll.deductions?.totalDeductions)}</td>
                  <td className="px-6 py-4 text-right font-bold">{fmtMoney(payroll.netSalary)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      payroll.status === 'paid' ? 'bg-green-100 text-green-700' :
                      payroll.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'}
                    `}>
                      {payroll.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-3">
                      <Link to={`/payroll/${payroll._id}/payslip`} className="text-gray-500 hover:text-blue-600" title="Payslip"><FaFileInvoice /></Link>
                      {payroll.status !== 'paid' && <button onClick={() => markPaid(payroll)} className="text-gray-500 hover:text-green-600" title="Mark paid"><FaMoneyBillWave /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayrollDashboard;
