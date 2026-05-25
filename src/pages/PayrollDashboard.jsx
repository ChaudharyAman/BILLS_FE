import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FaDownload, FaFileInvoice, FaMoneyBillWave, FaPlus } from 'react-icons/fa';
import api from '../api/axios';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import { fmtMoney, payrollStatusClass } from '../utils/payroll';

const monthName = (month) => new Date(0, month - 1).toLocaleString('en-US', { month: 'short' });
const STATUS_TABS = ['all', 'draft', 'processed', 'approved', 'paid'];

const PayrollDashboard = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payrolls, setPayrolls] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState({});
  const [drawerSlip, setDrawerSlip] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchPayrolls = async (signal) => {
    const params = new URLSearchParams({ month, year, limit: 200 });
    const res = await api.get(`/payroll?${params.toString()}`, { signal });
    return res.data.data || [];
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const list = await fetchPayrolls(controller.signal);
        setPayrolls(list);
        setSelectedIds({});

        const months = Array.from({ length: 6 }, (_, index) => {
          const date = new Date(year, month - 1 - index, 1);
          return { month: date.getMonth() + 1, year: date.getFullYear() };
        }).reverse();

        const trendResponses = await Promise.all(months.map(async (item) => {
          const params = new URLSearchParams({ month: item.month, year: item.year, limit: 200 });
          const res = await api.get(`/payroll?${params.toString()}`, { signal: controller.signal });
          return {
            label: `${monthName(item.month)} ${String(item.year).slice(-2)}`,
            total: (res.data.data || []).reduce((sum, payroll) => sum + (Number(payroll.netSalary) || 0), 0),
          };
        }));
        setTrendData(trendResponses);
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error(error);
        toast.error('Failed to load payroll dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    return () => controller.abort();
  }, [month, year]);

  const filteredPayrolls = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payrolls.filter((payroll) => {
      const matchesStatus = statusFilter === 'all' || payroll.status === statusFilter;
      const employeeName = `${payroll.employee?.firstName || ''} ${payroll.employee?.lastName || ''}`.trim().toLowerCase();
      const employeeCode = String(payroll.employee?.employeeId || '').toLowerCase();
      const matchesSearch = !query || employeeName.includes(query) || employeeCode.includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [payrolls, search, statusFilter]);

  const selectedPayrolls = useMemo(() => filteredPayrolls.filter((payroll) => selectedIds[payroll._id]), [filteredPayrolls, selectedIds]);
  const stats = useMemo(() => ({
    total: filteredPayrolls.reduce((sum, payroll) => sum + (Number(payroll.netSalary) || 0), 0),
    processed: filteredPayrolls.filter((payroll) => payroll.status === 'processed').length,
    approved: filteredPayrolls.filter((payroll) => payroll.status === 'approved').length,
    paid: filteredPayrolls.filter((payroll) => payroll.status === 'paid').length,
  }), [filteredPayrolls]);

  const openPayslipDrawer = async (payrollId) => {
    try {
      setDrawerLoading(true);
      const res = await api.get(`/payroll/${payrollId}/generate-payslip`);
      setDrawerSlip({ id: payrollId, ...res.data.payslip });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to load payslip');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(`/payroll/export?month=${month}&year=${year}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payroll-sheet-${year}-${String(month).padStart(2, '0')}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Payroll export downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export payroll');
    }
  };

  const refreshCurrentMonth = async () => {
    try {
      const refreshed = await fetchPayrolls();
      setPayrolls(refreshed);
      setSelectedIds({});
    } catch (error) {
      console.error(error);
    }
  };

  const confirmAndRun = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.type === 'approve') {
        await api.put('/payroll/bulk-approve', { ids: selectedPayrolls.map((payroll) => payroll._id), month, year });
        toast.success('Selected payroll approved');
      }
      if (confirmAction.type === 'markPaid') {
        await Promise.all(selectedPayrolls.map((payroll) => api.post(`/payroll/${payroll._id}/mark-paid`, {
          paymentDate: new Date().toISOString().substring(0, 10),
          paymentMethod: 'Bank Transfer',
        })));
        toast.success('Selected payroll marked as paid');
      }
      if (confirmAction.type === 'markPaidSingle') {
        await api.post(`/payroll/${confirmAction.payrollId}/mark-paid`, {
          paymentDate: new Date().toISOString().substring(0, 10),
          paymentMethod: 'Bank Transfer',
        });
        toast.success('Payroll marked as paid');
      }

      setConfirmAction(null);
      await refreshCurrentMonth();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Payroll action failed');
    }
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-gray-500 mt-1">Track payroll processing, approvals, payments, and employee payslips</p>
        </div>
        <Link to="/payroll/process" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
          <FaPlus size={14} /> Process Payroll
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Payroll ₹" value={fmtMoney(stats.total)} />
        <StatCard label="Processed Count" value={stats.processed} />
        <StatCard label="Approved Count" value={stats.approved} />
        <StatCard label="Paid Count" value={stats.paid} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg">Net Payroll Trend</h2>
            <p className="text-sm text-gray-500">Last 6 months</p>
          </div>
        </div>
        <div className="h-72">
          {loading ? <Skeleton className="h-full w-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value) => fmtMoney(value)} />
                <Bar dataKey="total" fill="#1a2e44" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/60 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <h2 className="font-bold text-gray-800">{monthName(month)} {year}</h2>
            <div className="flex gap-3 flex-wrap">
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{monthName(value)}</option>)}
              </select>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee..." className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[220px]" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${statusFilter === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {selectedPayrolls.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <span className="text-sm font-semibold text-blue-700">{selectedPayrolls.length} selected</span>
              <button onClick={() => setConfirmAction({ type: 'approve' })} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold">Approve Selected</button>
              <button onClick={handleExport} className="bg-white border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                <FaDownload /> Export Excel
              </button>
              <button onClick={() => setConfirmAction({ type: 'markPaid' })} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-semibold">Mark Paid (Bulk)</button>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    checked={filteredPayrolls.length > 0 && filteredPayrolls.every((payroll) => selectedIds[payroll._id])}
                    onChange={(e) => setSelectedIds(Object.fromEntries(filteredPayrolls.map((payroll) => [payroll._id, e.target.checked])))}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid Days</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Working Days</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Gross</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Employer Contribution</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Variable Pay</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Net Salary</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`payroll-skeleton-${index}`}>
                    <td colSpan="10" className="px-6 py-4"><Skeleton className="h-10 w-full" /></td>
                  </tr>
                ))
              ) : filteredPayrolls.length === 0 ? (
                <tr><td colSpan="10" className="px-6 py-10 text-center text-gray-500">No payroll processed for this period.</td></tr>
              ) : filteredPayrolls.map((payroll) => {
                const employerContribution = (Number(payroll.employerContributions?.grossTotalSalary) || 0) - (Number(payroll.earnings?.totalEarnings) || 0);
                return (
                  <tr key={payroll._id} className="hover:bg-blue-50/40 cursor-pointer" onClick={() => openPayslipDrawer(payroll._id)}>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={Boolean(selectedIds[payroll._id])} onChange={(e) => setSelectedIds((prev) => ({ ...prev, [payroll._id]: e.target.checked }))} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">{payroll.employee?.firstName} {payroll.employee?.lastName}</div>
                      <div className="text-xs text-gray-500">{payroll.employee?.employeeId} · {payroll.employee?.department?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">{payroll.paidDays}</td>
                    <td className="px-6 py-4 text-right text-sm">{payroll.workingDays}</td>
                    <td className="px-6 py-4 text-right text-sm">{fmtMoney(payroll.earnings?.totalEarnings)}</td>
                    <td className="px-6 py-4 text-right text-sm">{fmtMoney(employerContribution)}</td>
                    <td className="px-6 py-4 text-right text-sm">{fmtMoney(payroll.variablePay?.totalVariablePay)}</td>
                    <td className="px-6 py-4 text-right font-bold">{fmtMoney(payroll.netSalary)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${payrollStatusClass[payroll.status] || payrollStatusClass.draft}`}>
                        {payroll.status}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-3">
                        <Link to={`/payroll/${payroll._id}/payslip`} className="text-gray-500 hover:text-blue-600" title="Payslip"><FaFileInvoice /></Link>
                        {payroll.status !== 'paid' && <button onClick={() => setConfirmAction({ type: 'markPaidSingle', payrollId: payroll._id })} className="text-gray-500 hover:text-green-600" title="Mark paid"><FaMoneyBillWave /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {drawerSlip || drawerLoading ? (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl bg-white shadow-2xl border-l border-gray-200 overflow-y-auto">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Payslip Preview</h3>
              <p className="text-sm text-gray-500">{drawerSlip ? `${drawerSlip.employee?.firstName || ''} ${drawerSlip.employee?.lastName || ''}`.trim() : 'Loading...'}</p>
            </div>
            <div className="flex gap-3">
              {drawerSlip ? (
                <button onClick={() => window.open(`/payroll/${drawerSlip.id}/payslip`, '_blank')} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold">
                  Download
                </button>
              ) : null}
              <button onClick={() => setDrawerSlip(null)} className="px-3 py-2 rounded-lg border bg-white text-sm font-semibold">Close</button>
            </div>
          </div>
          <div className="p-5">
            {drawerLoading ? <Skeleton className="h-96 w-full" /> : drawerSlip ? (
              <div className="space-y-5">
                <DrawerSection title="Summary" rows={[
                  ['Period', `${drawerSlip.period?.monthName} ${drawerSlip.period?.year}`],
                  ['Net Salary', fmtMoney(drawerSlip.netSalary)],
                  ['Total Payable', fmtMoney(drawerSlip.totalPayable)],
                  ['Status', drawerSlip.status],
                ]} />
                <DrawerSection title="Earnings" rows={[
                  ['Basic', fmtMoney(drawerSlip.earnings?.basic)],
                  ['HRA', fmtMoney(drawerSlip.earnings?.hra)],
                  ['Flexi', fmtMoney(drawerSlip.earnings?.flexiAmount)],
                  ['Broadband', fmtMoney(drawerSlip.earnings?.broadband)],
                  ['Petrol', fmtMoney(drawerSlip.earnings?.petrol)],
                  ['LTA', fmtMoney(drawerSlip.earnings?.lta)],
                  ['Special Allowance', fmtMoney(drawerSlip.earnings?.specialAllowance)],
                ]} />
                <DrawerSection title="Employer Contributions" rows={[
                  ['PF Employer', fmtMoney(drawerSlip.employerContributions?.pfEmployer)],
                  ['ESI Employer', fmtMoney(drawerSlip.employerContributions?.esiEmployer)],
                  ['Gratuity', fmtMoney(drawerSlip.employerContributions?.gratuity)],
                  ['Insurance', fmtMoney(drawerSlip.employerContributions?.insuranceEmployer)],
                  ['LWF', fmtMoney(drawerSlip.employerContributions?.lwfEmployer)],
                  ['Employer NPS', fmtMoney(drawerSlip.employerContributions?.nps)],
                ]} />
                <DrawerSection title="Variable Pay" rows={[
                  ['Joining Bonus', fmtMoney(drawerSlip.variablePay?.joiningBonus)],
                  ['Loyalty Bonus', fmtMoney(drawerSlip.variablePay?.loyaltyBonus)],
                  ['Incentive', fmtMoney(drawerSlip.variablePay?.incentive)],
                  ['Special Bonus', fmtMoney(drawerSlip.variablePay?.specialBonus)],
                ]} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Modal isOpen={Boolean(confirmAction)} onClose={() => setConfirmAction(null)} title="Confirm Payroll Action">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {confirmAction?.type === 'approve' ? 'Approve all selected payroll records?' :
              confirmAction?.type === 'markPaid' ? 'Mark all selected payroll records as paid?' :
                'Mark this payroll record as paid?'}
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold">Cancel</button>
            <button type="button" onClick={confirmAndRun} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Confirm</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-2xl font-bold mt-2">{value}</div>
  </div>
);

const DrawerSection = ({ title, rows }) => (
  <div className="rounded-xl border border-gray-200 overflow-hidden">
    <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">{title}</div>
    <div className="divide-y divide-gray-200">
      {rows.map(([label, value]) => (
        <div key={`${title}-${label}`} className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-gray-500">{label}</span>
          <span className="font-semibold text-gray-900">{value}</span>
        </div>
      ))}
    </div>
  </div>
);

export default PayrollDashboard;
