import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaCheck, FaSave } from 'react-icons/fa';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';
import { buildPayrollSnapshot, DEFAULT_PAYROLL_CONFIG, fmtMoney } from '../utils/payroll';

const monthName = (month) => new Date(0, month - 1).toLocaleString('en-US', { month: 'long' });

const PayrollProcessing = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [config, setConfig] = useState(DEFAULT_PAYROLL_CONFIG);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState({});
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monthWorkingDays, setMonthWorkingDays] = useState(DEFAULT_PAYROLL_CONFIG.defaultWorkingDays);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const [employeesRes, configRes] = await Promise.all([
          api.get('/employees/active', { signal: controller.signal }),
          api.get('/payroll/config', { signal: controller.signal }),
        ]);

        const nextConfig = { ...DEFAULT_PAYROLL_CONFIG, ...(configRes.data || {}) };
        const activeEmployees = employeesRes.data || [];
        setConfig(nextConfig);
        setMonthWorkingDays(nextConfig.defaultWorkingDays || 26);
        setEmployees(activeEmployees);
        setSelected(Object.fromEntries(activeEmployees.map((emp) => [emp._id, true])));
        setRows(Object.fromEntries(activeEmployees.map((emp) => {
          const joiningDate = emp.joiningDate ? new Date(emp.joiningDate) : null;
          const autoJoiningBonus = joiningDate && joiningDate.getMonth() + 1 === month && joiningDate.getFullYear() === year
            ? Number(emp.joiningBonus) || 0
            : 0;

          return [emp._id, {
            workingDays: nextConfig.defaultWorkingDays || 26,
            paidDays: nextConfig.defaultWorkingDays || 26,
            paidLeaves: 0,
            unpaidLeaves: 0,
            overtime: 0,
            joiningBonus: autoJoiningBonus,
            loyaltyBonus: 0,
            incentive: 0,
            specialBonus: 0,
            otherAllowanceArrear: 0,
            loanDeduction: 0,
            advanceDeduction: 0,
            tds: Number(emp.deductions?.tds) || 0,
          }];
        })));
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error(error);
        toast.error('Failed to load active employees');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [month, year]);

  useEffect(() => {
    setRows((prev) => Object.fromEntries(
      Object.entries(prev).map(([employeeId, row]) => [employeeId, { ...row, workingDays: Number(monthWorkingDays) || 26 }])
    ));
  }, [monthWorkingDays]);

  const selectedEmployees = useMemo(() => employees.filter((emp) => selected[emp._id]), [employees, selected]);

  const getSnapshot = (employee) => {
    const row = rows[employee._id] || {};
    return buildPayrollSnapshot(employee, config, {
      workingDays: Number(row.workingDays) || Number(monthWorkingDays) || 26,
      paidDays: Number(row.paidDays) || 0,
      paidLeaves: Number(row.paidLeaves) || 0,
      unpaidLeaves: Number(row.unpaidLeaves) || 0,
    }, {
      overtime: Number(row.overtime) || 0,
      joiningBonus: Number(row.joiningBonus) || 0,
      loyaltyBonus: Number(row.loyaltyBonus) || 0,
      incentive: Number(row.incentive) || 0,
      specialBonus: Number(row.specialBonus) || 0,
      otherAllowanceArrear: Number(row.otherAllowanceArrear) || 0,
      loanDeduction: Number(row.loanDeduction) || 0,
      advanceDeduction: Number(row.advanceDeduction) || 0,
      tds: Number(row.tds) || 0,
    });
  };

  const totalPreview = useMemo(() => selectedEmployees.reduce((sum, employee) => {
    const snapshot = getSnapshot(employee);
    return sum + (Number(snapshot.netSalary) || 0);
  }, 0), [selectedEmployees, rows, config, monthWorkingDays]);

  const updateRow = (employeeId, field, value) => {
    setRows((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [field]: value,
      },
    }));
  };

  const submit = async (saveAsDraft) => {
    const invalid = selectedEmployees.find((employee) => {
      const row = rows[employee._id] || {};
      return Number(row.paidDays) > Number(row.workingDays || monthWorkingDays);
    });

    if (invalid) {
      toast.error(`Paid days cannot exceed working days for ${invalid.firstName} ${invalid.lastName}`);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        month,
        year,
        saveAsDraft,
        employees: selectedEmployees.map((employee) => ({
          employeeId: employee._id,
          workingDays: Number(rows[employee._id]?.workingDays) || Number(monthWorkingDays) || 26,
          paidDays: Number(rows[employee._id]?.paidDays) || 0,
          paidLeaves: Number(rows[employee._id]?.paidLeaves) || 0,
          unpaidLeaves: Number(rows[employee._id]?.unpaidLeaves) || 0,
          adjustments: {
            overtime: Number(rows[employee._id]?.overtime) || 0,
            joiningBonus: Number(rows[employee._id]?.joiningBonus) || 0,
            loyaltyBonus: Number(rows[employee._id]?.loyaltyBonus) || 0,
            incentive: Number(rows[employee._id]?.incentive) || 0,
            specialBonus: Number(rows[employee._id]?.specialBonus) || 0,
            otherAllowanceArrear: Number(rows[employee._id]?.otherAllowanceArrear) || 0,
            loanDeduction: Number(rows[employee._id]?.loanDeduction) || 0,
            advanceDeduction: Number(rows[employee._id]?.advanceDeduction) || 0,
            tds: Number(rows[employee._id]?.tds) || 0,
          },
        })),
      };

      const res = await api.post('/payroll/process', payload);
      if (res.data.errors?.length) {
        toast.error(`${res.data.success.length} processed, ${res.data.errors.length} skipped`);
      } else {
        toast.success(saveAsDraft ? 'Payroll saved as draft' : 'Payroll processed successfully');
      }
      navigate('/payroll');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to process payroll');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Process Payroll</h1>
          <p className="text-gray-500 mt-1">Review proration, variable pay, and deduction inputs before generating payroll.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => <option key={value} value={value}>{monthName(value)}</option>)}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input type="number" value={monthWorkingDays} min="1" onChange={(e) => setMonthWorkingDays(Number(e.target.value) || 1)} className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Working Days" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Selected Employees" value={selectedEmployees.length} />
        <SummaryCard label="Estimated Net Payroll" value={fmtMoney(totalPreview)} />
        <SummaryCard label="Default Working Days" value={monthWorkingDays} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Include', 'Employee', 'Paid / Working', 'Proration', 'Flexi', 'Broadband', 'Petrol', 'LTA', 'Gratuity', 'LWF', 'Joining Bonus', 'Loyalty Bonus', 'Incentive', 'Special Bonus', 'TDS', 'Net Preview'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`payroll-process-skeleton-${index}`}>
                    <td colSpan="16" className="px-4 py-4"><Skeleton className="h-10 w-full" /></td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr><td colSpan="16" className="px-6 py-10 text-center text-gray-500">No active employees found.</td></tr>
              ) : employees.map((employee) => {
                const row = rows[employee._id] || {};
                const snapshot = getSnapshot(employee);
                const paidTooHigh = Number(row.paidDays) > Number(row.workingDays || monthWorkingDays);

                return (
                  <tr key={employee._id} className="hover:bg-blue-50/40 align-top">
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={Boolean(selected[employee._id])} onChange={(e) => setSelected((prev) => ({ ...prev, [employee._id]: e.target.checked }))} className="w-4 h-4" />
                    </td>
                    <td className="px-4 py-4 min-w-[220px]">
                      <div className="font-semibold">{employee.firstName} {employee.lastName}</div>
                      <div className="text-xs text-gray-500">{employee.employeeId} · {employee.designation || '-'}</div>
                      <div className="text-xs text-gray-400">CTC {fmtMoney(employee.monthlyCTC)}</div>
                    </td>
                    <td className="px-4 py-4 min-w-[180px]">
                      <div className="flex gap-2">
                        <input type="number" min="0" value={row.paidDays ?? 0} onChange={(e) => updateRow(employee._id, 'paidDays', e.target.value)} className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                        <span className="self-center text-gray-400">/</span>
                        <input type="number" min="1" value={row.workingDays ?? monthWorkingDays} onChange={(e) => updateRow(employee._id, 'workingDays', e.target.value)} className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                      </div>
                      {paidTooHigh ? <div className="mt-2 text-xs text-red-600">Paid days cannot exceed working days.</div> : null}
                    </td>
                    <td className="px-4 py-4 text-sm whitespace-nowrap">{Math.round((snapshot.paidDays / Math.max(snapshot.workingDays, 1)) * 100)}%</td>
                    <EditableMoneyCell value={employee.flexiAmount} disabled />
                    <EditableMoneyCell value={employee.broadband} disabled />
                    <EditableMoneyCell value={employee.petrol} disabled />
                    <EditableMoneyCell value={employee.lta} disabled />
                    <EditableMoneyCell value={snapshot.employerContributions.gratuity} disabled />
                    <EditableMoneyCell value={snapshot.employerContributions.lwfEmployer} disabled />
                    <EditableMoneyCell value={row.joiningBonus} onChange={(value) => updateRow(employee._id, 'joiningBonus', value)} />
                    <EditableMoneyCell value={row.loyaltyBonus} onChange={(value) => updateRow(employee._id, 'loyaltyBonus', value)} />
                    <EditableMoneyCell value={row.incentive} onChange={(value) => updateRow(employee._id, 'incentive', value)} />
                    <EditableMoneyCell value={row.specialBonus} onChange={(value) => updateRow(employee._id, 'specialBonus', value)} />
                    <EditableMoneyCell value={row.tds} onChange={(value) => updateRow(employee._id, 'tds', value)} />
                    <td className="px-4 py-4 text-sm font-bold whitespace-nowrap">{fmtMoney(snapshot.netSalary)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/payroll')} className="px-4 py-2 rounded-lg bg-white border text-sm font-semibold">Cancel</button>
          <button type="button" onClick={() => submit(true)} disabled={saving || selectedEmployees.length === 0} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
            <FaSave /> Save as Draft
          </button>
          <button type="button" onClick={() => submit(false)} disabled={saving || selectedEmployees.length === 0} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
            <FaCheck /> Process Payroll
          </button>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-2xl font-bold mt-2">{value}</div>
  </div>
);

const EditableMoneyCell = ({ value, onChange, disabled = false }) => (
  <td className="px-4 py-4">
    {disabled ? (
      <div className="text-sm whitespace-nowrap">{fmtMoney(value)}</div>
    ) : (
      <input
        type="number"
        min="0"
        value={value ?? 0}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right"
      />
    )}
  </td>
);

export default PayrollProcessing;
