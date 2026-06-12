import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FaDownload, FaFileInvoice, FaMoneyBillWave, FaPlus, FaTimes, FaCheck, FaHourglassHalf, FaReceipt, FaPaperclip } from 'react-icons/fa';
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

  // Approvals Hub & Dynamic Requests States
  const [activeDashboardTab, setActiveDashboardTab] = useState('runs');
  const [loans, setLoans] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [claimsLoading, setClaimsLoading] = useState(false);

  const fetchLoans = async () => {
    try {
      setLoansLoading(true);
      const res = await api.get('/loans');
      setLoans(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load employee loans');
    } finally {
      setLoansLoading(false);
    }
  };

  const fetchClaims = async () => {
    try {
      setClaimsLoading(true);
      const res = await api.get('/reimbursements');
      setClaims(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load reimbursement claims');
    } finally {
      setClaimsLoading(false);
    }
  };

  useEffect(() => {
    if (activeDashboardTab === 'loans') {
      fetchLoans();
    } else if (activeDashboardTab === 'reimbursements') {
      fetchClaims();
    }
  }, [activeDashboardTab]);

  const handleUpdateLoanStatus = async (loanId, newStatus) => {
    try {
      await api.put(`/loans/${loanId}/status`, { status: newStatus });
      toast.success(`Loan request ${newStatus === 'active' ? 'approved' : 'rejected'} successfully`);
      fetchLoans();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update loan status');
    }
  };

  const [claimToApprove, setClaimToApprove] = useState(null);
  const [claimApproverRemarks, setClaimApproverRemarks] = useState('');

  const handleApproveClaim = async () => {
    if (!claimToApprove) return;
    try {
      await api.put(`/reimbursements/${claimToApprove._id}/status`, {
        status: 'approved',
        approverRemarks: claimApproverRemarks
      });
      toast.success('Reimbursement claim approved successfully');
      setClaimToApprove(null);
      setClaimApproverRemarks('');
      fetchClaims();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to approve claim');
    }
  };

  const handleRejectClaim = async (claimId) => {
    try {
      await api.put(`/reimbursements/${claimId}/status`, { status: 'rejected' });
      toast.success('Reimbursement claim rejected');
      fetchClaims();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to reject claim');
    }
  };

  const loanStats = useMemo(() => ({
    pending: loans.filter(l => l.status === 'pending_approval').length,
    active: loans.filter(l => l.status === 'active').length,
    totalBalance: loans.filter(l => l.status === 'active').reduce((sum, l) => sum + (Number(l.remainingBalance) || 0), 0)
  }), [loans]);

  const claimStats = useMemo(() => ({
    pending: claims.filter(c => c.status === 'pending').length,
    approved: claims.filter(c => c.status === 'approved').length,
    totalApproved: claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  }), [claims]);

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

        const trendRes = await api.get(`/payroll/trend?endMonth=${month}&endYear=${year}&count=6`, { signal: controller.signal });
        setTrendData(trendRes.data.trend || []);
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
      const [slipRes, logRes] = await Promise.all([
        api.get(`/payroll/${payrollId}/generate-payslip`),
        api.get(`/payroll/${payrollId}/audit-log`),
      ]);
      setDrawerSlip({
        id: payrollId,
        ...slipRes.data.payslip,
        auditLog: logRes.data.auditLog || []
      });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to load payslip');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      let exportUrl = `/payroll/export?month=${month}&year=${year}`;
      if (statusFilter && statusFilter !== 'all') {
        exportUrl += `&statusFilter=${statusFilter}`;
      }
      if (search && search.trim() !== '') {
        exportUrl += `&search=${encodeURIComponent(search.trim())}`;
      }
      const response = await api.get(exportUrl, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payroll-sheet-${year}-${String(month).padStart(2, '0')}-${statusFilter}.xlsx`;
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
          paymentDate: confirmAction.paymentDate,
          paymentMethod: confirmAction.paymentMethod,
        })));
        toast.success('Selected payroll marked as paid');
      }
      if (confirmAction.type === 'markPaidSingle') {
        await api.post(`/payroll/${confirmAction.payrollId}/mark-paid`, {
          paymentDate: confirmAction.paymentDate,
          paymentMethod: confirmAction.paymentMethod,
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

  const handleApproveDrawerSlip = async () => {
    if (!drawerSlip) return;
    try {
      await api.put('/payroll/bulk-approve', { ids: [drawerSlip.id], month, year });
      toast.success('Payroll approved');
      await refreshCurrentMonth();
      setDrawerSlip(null);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to approve payroll');
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

      {/* Dynamic Approvals Hub Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-2 bg-white px-4 py-2.5 rounded-xl border shadow-sm">
        <button
          type="button"
          onClick={() => setActiveDashboardTab('runs')}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeDashboardTab === 'runs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FaMoneyBillWave className="w-3.5 h-3.5" /> Payroll Batches
        </button>
        <button
          type="button"
          onClick={() => setActiveDashboardTab('loans')}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 relative ${
            activeDashboardTab === 'loans'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FaMoneyBillWave className="w-3.5 h-3.5 text-indigo-500" /> Loans &amp; Advances
          {loanStats.pending > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
              {loanStats.pending}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveDashboardTab('reimbursements')}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 relative ${
            activeDashboardTab === 'reimbursements'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FaReceipt className="w-3.5 h-3.5 text-emerald-500" /> Reimbursement Claims
          {claimStats.pending > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
              {claimStats.pending}
            </span>
          )}
        </button>
      </div>

      {activeDashboardTab === 'runs' ? (
        <>
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
                  <button onClick={() => setConfirmAction({
                    type: 'markPaid',
                    paymentDate: new Date().toISOString().substring(0, 10),
                    paymentMethod: 'Bank Transfer'
                  })} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-semibold">Mark Paid (Bulk)</button>
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
                    const pfEnabled = payroll.employeeSnapshot?.pfEnabled !== undefined ? payroll.employeeSnapshot.pfEnabled : (payroll.employee?.pfEnabled !== false);
                    const esiEnabled = payroll.employeeSnapshot?.esiEnabled !== undefined ? payroll.employeeSnapshot.esiEnabled : (payroll.employee?.esiEnabled !== false);
                    const ptEnabled = payroll.employeeSnapshot?.ptEnabled !== undefined ? payroll.employeeSnapshot.ptEnabled : (payroll.employee?.ptEnabled !== false);
                    const lwfEnabled = payroll.employeeSnapshot?.lwfEnabled !== undefined ? payroll.employeeSnapshot.lwfEnabled : (payroll.employee?.lwfEnabled !== false);
                    const gratuityEnabled = payroll.employeeSnapshot?.gratuityEnabled !== undefined ? payroll.employeeSnapshot.gratuityEnabled : (payroll.employee?.gratuityEnabled !== false);
                    const basicPercent = payroll.employeeSnapshot?.basicPercent !== undefined ? payroll.employeeSnapshot.basicPercent : (payroll.employee?.basicPercent);
                    const hraPercent = payroll.employeeSnapshot?.hraPercent !== undefined ? payroll.employeeSnapshot.hraPercent : (payroll.employee?.hraPercent);

                    return (
                      <tr key={payroll._id} className="hover:bg-blue-50/40 cursor-pointer" onClick={() => openPayslipDrawer(payroll._id)}>
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={Boolean(selectedIds[payroll._id])} onChange={(e) => setSelectedIds((prev) => ({ ...prev, [payroll._id]: e.target.checked }))} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold">{payroll.employee?.firstName} {payroll.employee?.lastName}</div>
                          <div className="text-xs text-gray-500">{payroll.employee?.employeeId} · {payroll.employee?.department?.name || '-'}</div>
                          
                          {/* Statutory Settings Badges */}
                          <div className="flex flex-wrap gap-1 mt-1.5 font-mono">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${pfEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-500 border border-rose-100 line-through opacity-70'}`} title={pfEnabled !== false ? 'Provident Fund Enabled' : 'Provident Fund Disabled'}>PF</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${esiEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-500 border border-rose-100 line-through opacity-70'}`} title={esiEnabled !== false ? 'ESI Scheme Enabled' : 'ESI Scheme Disabled'}>ESI</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${ptEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-500 border border-rose-100 line-through opacity-70'}`} title={ptEnabled !== false ? 'Professional Tax Enabled' : 'Professional Tax Disabled'}>PT</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${lwfEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-500 border border-rose-100 line-through opacity-70'}`} title={lwfEnabled !== false ? 'Labour Welfare Fund Enabled' : 'Labour Welfare Fund Disabled'}>LWF</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${gratuityEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-500 border border-rose-100 line-through opacity-70'}`} title={gratuityEnabled !== false ? 'Gratuity Accrual Enabled' : 'Gratuity Accrual Disabled'}>Gratuity</span>
                            {basicPercent !== undefined && basicPercent !== null && Number(basicPercent) !== 50 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm" title="Basic Salary Overridden percentage">
                                B:{basicPercent}%
                              </span>
                            )}
                            {hraPercent !== undefined && hraPercent !== null && Number(hraPercent) !== 50 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm" title="HRA Overridden percentage">
                                H:{hraPercent}%
                              </span>
                            )}
                          </div>
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
                            {payroll.status !== 'paid' && <button onClick={() => setConfirmAction({
                              type: 'markPaidSingle',
                              payrollId: payroll._id,
                              paymentDate: new Date().toISOString().substring(0, 10),
                              paymentMethod: 'Bank Transfer'
                            })} className="text-gray-500 hover:text-green-600" title="Mark paid"><FaMoneyBillWave /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeDashboardTab === 'loans' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Pending Approval Requests" value={loanStats.pending} />
            <StatCard label="Active Loans / Advances" value={loanStats.active} />
            <StatCard label="Total Outstanding Balance" value={fmtMoney(loanStats.totalBalance)} />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50/60">
              <h2 className="font-bold text-gray-800">Loans &amp; Salary Advances Ledger</h2>
              <p className="text-xs text-gray-500 mt-1">Review active and pending employee loan disbursements and amortization schedules.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Principal (₹)</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Monthly EMI (₹)</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Interest Rate</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Outstanding Balance (₹)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Requested Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loansLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={`loan-skeleton-${index}`}>
                        <td colSpan="8" className="px-6 py-4"><Skeleton className="h-8 w-full" /></td>
                      </tr>
                    ))
                  ) : loans.length === 0 ? (
                    <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-500">No loan requests found.</td></tr>
                  ) : loans.map((loan) => {
                    const empName = `${loan.employee?.firstName || ''} ${loan.employee?.lastName || ''}`.trim() || 'Unknown';
                    return (
                      <tr key={loan._id} className="hover:bg-blue-50/40">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{empName}</div>
                          <div className="text-xs text-gray-500">{loan.employee?.employeeId} · {loan.employee?.designation}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-sm">{fmtMoney(loan.principalAmount)}</td>
                        <td className="px-6 py-4 text-right font-medium text-sm">{fmtMoney(loan.emiAmount)}</td>
                        <td className="px-6 py-4 text-right text-sm">{loan.interestRate}%</td>
                        <td className="px-6 py-4 text-right font-bold text-sm text-slate-800">{fmtMoney(loan.remainingBalance)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(loan.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            loan.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200 shadow-sm' :
                            loan.status === 'closed' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm' :
                            loan.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200 shadow-sm' :
                            'bg-amber-100 text-amber-800 border border-amber-200 shadow-sm'
                          }`}>
                            {loan.status === 'pending_approval' ? 'Pending Approval' : loan.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            {loan.status === 'pending_approval' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateLoanStatus(loan._id, 'active')}
                                  className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-all border border-green-200"
                                  title="Approve Loan Request"
                                >
                                  <FaCheck className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateLoanStatus(loan._id, 'rejected')}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all border border-red-200"
                                  title="Reject Loan Request"
                                >
                                  <FaTimes className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 font-medium">None</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Pending Claims" value={claimStats.pending} />
            <StatCard label="Approved Claims Count" value={claimStats.approved} />
            <StatCard label="Total Reimbursement Approved" value={fmtMoney(claimStats.totalApproved)} />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50/60">
              <h2 className="font-bold text-gray-800">Reimbursement Claims Ledger</h2>
              <p className="text-xs text-gray-500 mt-1">Review, audit and settle business expense reimbursement requests filed by employees.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount (₹)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Receipt Attachment</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Submitted Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Approver Remarks</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {claimsLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={`claim-skeleton-${index}`}>
                        <td colSpan="8" className="px-6 py-4"><Skeleton className="h-8 w-full" /></td>
                      </tr>
                    ))
                  ) : claims.length === 0 ? (
                    <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-500">No reimbursement claims found.</td></tr>
                  ) : claims.map((claim) => {
                    const empName = `${claim.employee?.firstName || ''} ${claim.employee?.lastName || ''}`.trim() || 'Unknown';
                    return (
                      <tr key={claim._id} className="hover:bg-blue-50/40">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{empName}</div>
                          <div className="text-xs text-gray-500">{claim.employee?.employeeId} · {claim.employee?.designation}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                            claim.category === 'petrol' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            claim.category === 'broadband' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            claim.category === 'lta' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            claim.category === 'medical' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {claim.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-sm text-slate-800">{fmtMoney(claim.amount)}</td>
                        <td className="px-6 py-4 text-sm">
                          {claim.billUrl ? (
                            <a
                              href={claim.billUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-semibold transition-all"
                            >
                              <FaPaperclip className="w-3.5 h-3.5" /> View Receipt
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs italic">No attachment</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(claim.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            claim.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200 shadow-sm' :
                            claim.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200 shadow-sm' :
                            'bg-amber-100 text-amber-800 border border-amber-200 shadow-sm'
                          }`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium max-w-[200px] truncate" title={claim.approverRemarks}>
                          {claim.approverRemarks || <span className="text-gray-400 text-xs italic">No remarks</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            {claim.status === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setClaimToApprove(claim)}
                                  className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-all border border-green-200"
                                  title="Approve Claim"
                                >
                                  <FaCheck className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectClaim(claim._id)}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all border border-red-200"
                                  title="Reject Claim"
                                >
                                  <FaTimes className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 font-medium">None</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {drawerSlip || drawerLoading ? (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl bg-white shadow-2xl border-l border-gray-200 overflow-y-auto">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Payslip Preview</h3>
              <p className="text-sm text-gray-500">{drawerSlip ? `${drawerSlip.employee?.firstName || ''} ${drawerSlip.employee?.lastName || ''}`.trim() : 'Loading...'}</p>
            </div>
            <div className="flex gap-3">
              {drawerSlip && drawerSlip.status === 'processed' ? (
                <button onClick={handleApproveDrawerSlip} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold">
                  Approve
                </button>
              ) : null}
              {drawerSlip && drawerSlip.status === 'approved' ? (
                <button 
                  onClick={() => setConfirmAction({
                    type: 'markPaidSingle',
                    payrollId: drawerSlip.id,
                    paymentDate: new Date().toISOString().substring(0, 10),
                    paymentMethod: 'Bank Transfer'
                  })}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-semibold"
                >
                  Mark Paid
                </button>
              ) : null}
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
                {drawerSlip.salarySplits && drawerSlip.salarySplits.length > 1 && (
                  <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                    <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                      Mid-Month Revision Calculation Split
                    </div>
                    <div className="p-4 space-y-4">
                      {drawerSlip.salarySplits.map((split, index) => (
                        <div key={index} className="space-y-2 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center text-sm font-semibold text-gray-900">
                            <span>{new Date(split.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(split.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            <span className="text-xs text-slate-500 font-normal">{split.daysCount} days</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                            <div className="flex justify-between">
                              <span>Monthly CTC:</span>
                              <span className="font-medium">{fmtMoney(split.monthlyCTC)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Period Earnings:</span>
                              <span className="font-semibold text-gray-900">{fmtMoney(split.totalEarnings)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Basic / HRA:</span>
                              <span className="font-medium">{fmtMoney(split.basic)} / {fmtMoney(split.hra)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>PF (EE/ER):</span>
                              <span className="font-medium">{fmtMoney(split.pfEmployee)} / {fmtMoney(split.pfEmployer)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>ESI (EE/ER):</span>
                              <span className="font-medium">{fmtMoney(split.esiEmployee)} / {fmtMoney(split.esiEmployer)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Gratuity:</span>
                              <span className="font-medium">{fmtMoney(split.gratuity)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">History</div>
                  <div className="p-4 bg-white space-y-3">
                    {(drawerSlip.auditLog || []).length === 0 ? (
                      <div className="text-sm text-gray-500 italic">No status transition history recorded.</div>
                    ) : (
                      <div className="space-y-3">
                        {(drawerSlip.auditLog || []).map((entry, i) => (
                          <div key={i} className="flex items-start gap-3 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${payrollStatusClass[entry.status] || payrollStatusClass.draft}`}>
                              {entry.status}
                            </span>
                            <div>
                              <div className="font-semibold text-gray-800">{entry.changedBy}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(entry.changedAt).toLocaleString('en-IN')} · Net: {fmtMoney(entry.netSalary)}
                              </div>
                              {entry.notes && <div className="text-xs text-gray-400 mt-0.5">{entry.notes}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
          {(confirmAction?.type === 'markPaid' || confirmAction?.type === 'markPaidSingle') && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 inline-block">Payment Date</label>
                <input
                  type="date"
                  value={confirmAction.paymentDate || ''}
                  onChange={(e) => setConfirmAction((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 inline-block">Payment Method</label>
                <select
                  value={confirmAction.paymentMethod || 'Bank Transfer'}
                  onChange={(e) => setConfirmAction((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                </select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold">Cancel</button>
            <button type="button" onClick={confirmAndRun} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Confirm</button>
          </div>
        </div>
      </Modal>

      {/* Reimbursement Claim Approval Modal */}
      <Modal isOpen={Boolean(claimToApprove)} onClose={() => setClaimToApprove(null)} title="Approve Reimbursement Claim">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to approve the reimbursement claim of <span className="font-bold text-gray-900">{claimToApprove ? `${claimToApprove.employee?.firstName || ''} ${claimToApprove.employee?.lastName || ''}`.trim() : ''}</span> for <span className="font-bold text-gray-900">{claimToApprove ? fmtMoney(claimToApprove.amount) : ''}</span>?
          </p>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Approver Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Approved against verified bill receipt"
              value={claimApproverRemarks}
              onChange={(e) => setClaimApproverRemarks(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setClaimToApprove(null)} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold">Cancel</button>
            <button type="button" onClick={handleApproveClaim} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold">Approve Claim</button>
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
