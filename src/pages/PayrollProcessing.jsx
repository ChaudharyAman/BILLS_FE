import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaCheck, FaSave, FaPlus, FaTrash, FaCalculator, FaTimes } from 'react-icons/fa';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';
import { buildPayrollSnapshot, DEFAULT_PAYROLL_CONFIG, fmtMoney, serializeRow } from '../utils/payroll';
import { usePayrollSnapshot } from '../hooks/usePayrollSnapshot';

const monthName = (month) => new Date(0, month - 1).toLocaleString('en-US', { month: 'long' });
const sumNamedAmounts = (items = []) => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

const BreakdownRow = ({ label, paid, master }) => (
  <div className="flex items-center justify-between px-4 py-2.5">
    <span className="text-gray-600 font-medium">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-semibold text-gray-900">{fmtMoney(paid)}</span>
      {paid !== master && (
        <span className="text-xs text-gray-400 font-normal line-through">
          {fmtMoney(master)}
        </span>
      )}
    </div>
  </div>
);

const DeductionRow = ({ label, amount, isContrib = false, isEditable = false, value, onChange }) => (
  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
    <span className={isContrib ? "text-gray-500 font-normal text-xs" : "text-gray-600 font-medium"}>
      {label}
      {isContrib && <span className="text-[10px] text-gray-400 ml-1">(Employer Contribution)</span>}
    </span>
    {isEditable ? (
      <input
        type="number"
        min="0"
        value={value ?? 0}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right font-semibold"
      />
    ) : (
      <span className={`font-semibold ${isContrib ? "text-gray-700" : "text-red-600"}`}>
        {isContrib ? '' : '-'}{fmtMoney(amount)}
      </span>
    )}
  </div>
);

const EmployeeRow = ({
  employee,
  config,
  row,
  selected,
  onToggleSelected,
  setBreakdownEmployee,
  monthWorkingDays,
  updateRow,
  claimsMap,
  month,
}) => {
  const filteredReimbursements = useMemo(() => {
    return (claimsMap.get(employee._id) || []).filter(c => !(row?.excludedClaimIds || []).includes(c._id));
  }, [claimsMap, employee._id, row?.excludedClaimIds]);

  const rowWithReimbursements = useMemo(() => {
    return { ...row, reimbursements: filteredReimbursements, month };
  }, [row, filteredReimbursements, month]);

  const snapshot = usePayrollSnapshot(employee, config, rowWithReimbursements, monthWorkingDays);
  if (!snapshot) return null;

  const paidTooHigh = Number(row?.paidDays) > Number(row?.workingDays || monthWorkingDays);

  return (
    <tr key={employee._id} className="hover:bg-blue-50/40 align-top">
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={Boolean(selected)}
          onChange={(e) => onToggleSelected(employee._id, e.target.checked)}
          className="w-4 h-4"
        />
      </td>
      <td className="px-4 py-4 min-w-[220px]">
        <div className="font-semibold">{employee.firstName} {employee.lastName}</div>
        <div className="text-xs text-gray-500">{employee.employeeId} · {employee.designation || '-'}</div>
        <div className="text-xs text-gray-400 mt-1 flex flex-col gap-1">
          <span>CTC {fmtMoney(employee.monthlyCTC)}</span>
          <button
            type="button"
            onClick={() => setBreakdownEmployee(employee)}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left flex items-center gap-1 self-start"
          >
            <FaCalculator className="w-2.5 h-2.5" /> Breakdown & Adjust
          </button>
          
          {/* Statutory Settings Badges */}
          <div className="flex flex-wrap gap-1 mt-1 font-mono">
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${row?.pfEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-500 border border-rose-100 line-through opacity-70'}`} title={row?.pfEnabled !== false ? 'Provident Fund Enabled' : 'Provident Fund Disabled'}>PF</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${row?.esiEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-500 border border-rose-100 line-through opacity-70'}`} title={row?.esiEnabled !== false ? 'ESI Scheme Enabled' : 'ESI Scheme Disabled'}>ESI</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${row?.ptEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-500 border border-rose-100 line-through opacity-70'}`} title={row?.ptEnabled !== false ? 'Professional Tax Enabled' : 'Professional Tax Disabled'}>PT</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${row?.lwfEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-500 border border-rose-100 line-through opacity-70'}`} title={row?.lwfEnabled !== false ? 'Labour Welfare Fund Enabled' : 'Labour Welfare Fund Disabled'}>LWF</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${row?.gratuityEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-500 border border-rose-100 line-through opacity-70'}`} title={row?.gratuityEnabled !== false ? 'Gratuity Accrual Enabled' : 'Gratuity Accrual Disabled'}>Gratuity</span>
            {row?.basicPercent !== undefined && row?.basicPercent !== null && Number(row?.basicPercent) !== 50 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm" title="Basic Salary Overridden percentage">
                B:{row?.basicPercent}%
              </span>
            )}
            {row?.hraPercent !== undefined && row?.hraPercent !== null && Number(row?.hraPercent) !== 50 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm" title="HRA Overridden percentage">
                H:{row?.hraPercent}%
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 min-w-[180px]">
        <div className="flex gap-2">
          <input type="number" min="0" value={row?.paidDays ?? 0} onChange={(e) => updateRow(employee._id, 'paidDays', e.target.value)} className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
          <span className="self-center text-gray-400">/</span>
          <input type="number" min="1" value={row?.workingDays ?? monthWorkingDays} onChange={(e) => updateRow(employee._id, 'workingDays', e.target.value)} className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
        </div>
        {paidTooHigh ? <div className="mt-2 text-xs text-red-600">Paid days cannot exceed working days.</div> : null}
      </td>
      <td className="px-4 py-4 text-sm whitespace-nowrap">{Math.round((snapshot.paidDays / Math.max(snapshot.workingDays, 1)) * 100)}%</td>
      <EditableMoneyCell value={snapshot.earnings.flexiAmount} disabled />
      <EditableMoneyCell value={snapshot.earnings.broadband} disabled />
      <EditableMoneyCell value={snapshot.earnings.petrol} disabled />
      <EditableMoneyCell value={snapshot.earnings.lta} disabled />
      <td className="px-4 py-4 text-sm font-semibold text-slate-700 whitespace-nowrap">
        {fmtMoney(sumNamedAmounts(snapshot.earnings.otherEarnings))}
      </td>
      <EditableMoneyCell value={snapshot.employerContributions.gratuity} disabled />
      <EditableMoneyCell value={snapshot.employerContributions.lwfEmployer} disabled />
      <EditableMoneyCell value={row?.joiningBonus} onChange={(value) => updateRow(employee._id, 'joiningBonus', value)} />
      <EditableMoneyCell value={row?.loyaltyBonus} onChange={(value) => updateRow(employee._id, 'loyaltyBonus', value)} />
      <EditableMoneyCell value={row?.incentive} onChange={(value) => updateRow(employee._id, 'incentive', value)} />
      <EditableMoneyCell value={row?.specialBonus} onChange={(value) => updateRow(employee._id, 'specialBonus', value)} />
      <td className="px-4 py-4 text-sm font-semibold text-red-600 whitespace-nowrap">
        {fmtMoney(sumNamedAmounts(snapshot.deductions.otherDeductions))}
      </td>
      <EditableMoneyCell value={row?.tds} onChange={(value) => updateRow(employee._id, 'tds', value)} />
      <td className="px-4 py-4 text-sm font-bold whitespace-nowrap">{fmtMoney(snapshot.netSalary)}</td>
    </tr>
  );
};

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
  const [claimsMap, setClaimsMap] = useState(new Map());

  // Integration States
  const [syncingAttendance, setSyncingAttendance] = useState(false);
  const [isHrmsEnabled, setIsHrmsEnabled] = useState(false);

  // Modal Breakdown states
  const [breakdownEmployee, setBreakdownEmployee] = useState(null);
  const [localEarnings, setLocalEarnings] = useState([]);
  const [localDeductions, setLocalDeductions] = useState([]);
  const [localExcludedClaimIds, setLocalExcludedClaimIds] = useState(new Set());

  useEffect(() => {
    if (breakdownEmployee) {
      const row = rows[breakdownEmployee._id] || {};
      setLocalEarnings(row.otherEarnings || []);
      setLocalDeductions(row.otherDeductions || []);
      setLocalExcludedClaimIds(new Set(row.excludedClaimIds || []));
    }
  }, [breakdownEmployee]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const [employeesRes, configRes, claimsRes, settingsRes] = await Promise.all([
          api.get(`/employees/active?month=${month}&year=${year}`, { signal: controller.signal }),
          api.get('/payroll/config', { signal: controller.signal }),
          api.get(`/reimbursements?status=approved&month=${month}&year=${year}`, { signal: controller.signal }),
          api.get('/settings', { signal: controller.signal }),
        ]);

        const nextConfig = { ...DEFAULT_PAYROLL_CONFIG, ...(configRes.data || {}) };
        const activeEmployees = employeesRes.data || [];
        setConfig(nextConfig);
        setMonthWorkingDays(nextConfig.defaultWorkingDays || 26);
        setEmployees(activeEmployees);
        setSelected(Object.fromEntries(activeEmployees.map((emp) => [emp._id, true])));
        setIsHrmsEnabled(!!settingsRes.data?.integration?.enabled);

        const claimsByEmp = new Map();
        (claimsRes.data || []).forEach(r => {
          const empId = r.employee?._id || r.employee;
          if (empId) {
            if (!claimsByEmp.has(empId)) claimsByEmp.set(empId, []);
            claimsByEmp.get(empId).push(r);
          }
        });
        setClaimsMap(claimsByEmp);

        setRows(Object.fromEntries(activeEmployees.map((emp) => {
          const joiningDate = emp.joiningDate ? new Date(emp.joiningDate) : null;
          const dateOfLeaving = emp.dateOfLeaving ? new Date(emp.dateOfLeaving) : null;
          const autoJoiningBonus = joiningDate && joiningDate.getMonth() + 1 === month && joiningDate.getFullYear() === year
            ? Number(emp.joiningBonus) || 0
            : 0;

          // Proration Calculation for mid-month joining and leaving
          const startOfMonth = new Date(year, month - 1, 1);
          const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
          const calendarDays = new Date(year, month, 0).getDate();

          const activeStartDate = joiningDate && joiningDate > startOfMonth ? joiningDate : startOfMonth;
          const activeEndDate = dateOfLeaving && dateOfLeaving < endOfMonth ? dateOfLeaving : endOfMonth;

          let activeDays = 0;
          if (activeStartDate <= activeEndDate) {
            const diffTime = Math.max(0, activeEndDate.getTime() - activeStartDate.getTime());
            activeDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          }

          const defaultDays = nextConfig.defaultWorkingDays || 26;
          let proratedPaidDays = defaultDays;
          if (activeDays < calendarDays) {
            proratedPaidDays = Math.max(0, Math.min(defaultDays, Math.round(defaultDays * (activeDays / calendarDays))));
          }

          return [emp._id, {
            workingDays: defaultDays,
            paidDays: proratedPaidDays,
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
            otherEarnings: emp.salaryStructure?.otherAllowances?.map(x => ({ name: x.name, amount: Number(x.amount) || 0 })) || [],
            otherDeductions: emp.deductions?.otherDeductions?.map(x => ({ name: x.name, amount: Number(x.amount) || 0 })) || [],
            pfEnabled: emp.pfEnabled !== false,
            esiEnabled: emp.esiEnabled !== false,
            ptEnabled: emp.ptEnabled !== false,
            lwfEnabled: emp.lwfEnabled !== false,
            gratuityEnabled: emp.gratuityEnabled !== false,
            includePfInCTC: emp.includePfInCTC !== false,
            includeGratuityInCTC: emp.includeGratuityInCTC !== false,
            basicPercent: emp.basicPercent !== undefined && emp.basicPercent !== null ? emp.basicPercent : 50,
            hraPercent: emp.hraPercent !== undefined && emp.hraPercent !== null ? emp.hraPercent : 50,
            excludedClaimIds: [],
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
    return usePayrollSnapshot(employee, config, { ...rows[employee._id], month }, monthWorkingDays);
  };

  const totalPreview = useMemo(() => selectedEmployees.reduce((sum, employee) => {
    const row = rows[employee._id] || {};
    const snapshot = buildPayrollSnapshot(employee, config, {
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
      otherEarnings: row.otherEarnings || [],
      otherDeductions: row.otherDeductions || [],
      pfEnabled: row.pfEnabled,
      esiEnabled: row.esiEnabled,
      ptEnabled: row.ptEnabled,
      lwfEnabled: row.lwfEnabled,
      gratuityEnabled: row.gratuityEnabled,
      includePfInCTC: row.includePfInCTC,
      includeGratuityInCTC: row.includeGratuityInCTC,
      basicPercent: row.basicPercent,
      hraPercent: row.hraPercent,
      reimbursements: (claimsMap.get(employee._id) || []).filter(c => !(row.excludedClaimIds || []).includes(c._id)),
    }, month);
    return sum + (Number(snapshot.netSalary) || 0);
  }, 0), [selectedEmployees, rows, claimsMap, config, monthWorkingDays, month]);

  const updateRow = (employeeId, field, value) => {
    setRows((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSyncAttendance = async () => {
    try {
      setSyncingAttendance(true);
      const res = await api.get(`/payroll/integration/attendance-sync?month=${month}&year=${year}`);
      const syncedAttendanceList = res.data.attendance || [];
      
      if (!syncedAttendanceList.length) {
        toast.error('No attendance records found in external HRMS payload for this period.');
        return;
      }

      setRows((prev) => {
        const next = { ...prev };
        syncedAttendanceList.forEach(record => {
          if (next[record.employeeId]) {
            next[record.employeeId] = {
              ...next[record.employeeId],
              workingDays: record.workingDays,
              paidDays: record.paidDays,
              unpaidLeaves: record.unpaidLeaves,
              paidLeaves: record.paidLeaves
            };
          }
        });
        return next;
      });

      toast.success(`Successfully synced attendance logs for ${syncedAttendanceList.length} employees!`);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to sync attendance logs');
    } finally {
      setSyncingAttendance(false);
    }
  };

  const handleSaveAdjustments = () => {
    if (!breakdownEmployee) return;
    updateRow(breakdownEmployee._id, 'otherEarnings', localEarnings.filter(e => e.name.trim() !== ''));
    updateRow(breakdownEmployee._id, 'otherDeductions', localDeductions.filter(d => d.name.trim() !== ''));
    updateRow(breakdownEmployee._id, 'excludedClaimIds', Array.from(localExcludedClaimIds));
    toast.success(`Run adjustments saved for ${breakdownEmployee.firstName}`);
    setBreakdownEmployee(null);
  };

  const localSnapshotFilteredRow = useMemo(() => {
    if (!breakdownEmployee) return null;
    const row = rows[breakdownEmployee._id] || {};
    return {
      ...row,
      reimbursements: (claimsMap.get(breakdownEmployee._id) || []).filter(c => !localExcludedClaimIds.has(c._id)),
    };
  }, [breakdownEmployee, rows, claimsMap, localExcludedClaimIds]);

  const localSnapshot = usePayrollSnapshot(
    breakdownEmployee,
    config,
    { ...localSnapshotFilteredRow, month },
    monthWorkingDays,
    localEarnings,
    localDeductions
  );

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
        employees: selectedEmployees.map((employee) => {
          const rowData = serializeRow(rows[employee._id], monthWorkingDays);
          rowData.adjustments.reimbursements = (claimsMap.get(employee._id) || [])
            .filter((r) => !(rows[employee._id]?.excludedClaimIds || []).includes(r._id))
            .map((r) => ({
              _id: r._id,
              amount: r.amount,
              category: r.category,
            }));
          return {
            employeeId: employee._id,
            ...rowData,
          };
        }),
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Process Payroll</h1>
          <p className="text-gray-500 mt-1">Review proration, variable pay, and deduction inputs before generating payroll.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {isHrmsEnabled && (
            <button
              type="button"
              onClick={handleSyncAttendance}
              disabled={syncingAttendance}
              className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              {syncingAttendance ? 'Syncing...' : 'Sync Attendance'}
            </button>
          )}
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
                {['Include', 'Employee', 'Paid / Working', 'Proration', 'Flexi', 'Broadband', 'Petrol', 'LTA', 'Other Allowances', 'Gratuity', 'LWF', 'Joining Bonus', 'Loyalty Bonus', 'Incentive', 'Special Bonus', 'Other Deductions', 'TDS', 'Net Preview'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`payroll-process-skeleton-${index}`}>
                    <td colSpan="18" className="px-4 py-4"><Skeleton className="h-10 w-full" /></td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr><td colSpan="18" className="px-6 py-10 text-center text-gray-500">No active employees found.</td></tr>
              ) : employees.map((employee) => (
                <EmployeeRow
                  key={employee._id}
                  employee={employee}
                  config={config}
                  row={rows[employee._id]}
                  selected={selected[employee._id]}
                  onToggleSelected={(empId, val) => setSelected((prev) => ({ ...prev, [empId]: val }))}
                  setBreakdownEmployee={setBreakdownEmployee}
                  monthWorkingDays={monthWorkingDays}
                  updateRow={updateRow}
                  claimsMap={claimsMap}
                  month={month}
                />
              ))}
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

      {/* Slide-over / Modal for Detailed Salary Breakdown & Adjustments */}
      {breakdownEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-100 overflow-hidden flex flex-col my-8 animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg">
                  {breakdownEmployee.firstName[0]}{breakdownEmployee.lastName?.[0] || ''}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{breakdownEmployee.firstName} {breakdownEmployee.lastName}</h2>
                  <p className="text-xs text-gray-400">{breakdownEmployee.employeeId || 'EMP-001'} · {breakdownEmployee.designation || 'SDE'} · CTC {fmtMoney(breakdownEmployee.monthlyCTC)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBreakdownEmployee(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {/* Proration Summary Banner */}
              {localSnapshot && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-blue-900 text-sm">
                  <div>
                    <span className="font-semibold text-blue-900">Paid / Working Days:</span> {localSnapshot.paidDays} / {localSnapshot.workingDays} days
                    <span className="mx-2 text-blue-300">|</span>
                    <span className="font-semibold text-blue-900">Proration Ratio:</span> {Math.round((localSnapshot.paidDays / localSnapshot.workingDays) * 100)}%
                  </div>
                  <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto">
                    {localSnapshot.lop > 0 ? `${localSnapshot.lop} LOP Days` : 'Full Attendance'}
                  </div>
                </div>
              )}

              {localSnapshot && (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="bg-slate-50 px-4 py-3 border-b border-gray-200 font-bold text-slate-700 text-sm flex items-center justify-between">
                    <span>Statutory Components & Ratio Overrides</span>
                    <span className="text-[11px] text-slate-400 font-normal">Apply dynamically to this payroll run only</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    {/* PF Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all">
                      <div className="flex flex-col pr-2">
                        <span className="font-semibold text-slate-800">Provident Fund (PF)</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Matching contributions</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={rows[breakdownEmployee._id]?.pfEnabled !== false}
                        onChange={(e) => updateRow(breakdownEmployee._id, 'pfEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* ESI Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all">
                      <div className="flex flex-col pr-2">
                        <span className="font-semibold text-slate-800">ESI Scheme</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">State insurance matches</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={rows[breakdownEmployee._id]?.esiEnabled !== false}
                        onChange={(e) => updateRow(breakdownEmployee._id, 'esiEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* PT Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all">
                      <div className="flex flex-col pr-2">
                        <span className="font-semibold text-slate-800">Professional Tax (PT)</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">State professional tax</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={rows[breakdownEmployee._id]?.ptEnabled !== false}
                        onChange={(e) => updateRow(breakdownEmployee._id, 'ptEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* LWF Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all">
                      <div className="flex flex-col pr-2">
                        <span className="font-semibold text-slate-800">Labour Welfare Fund</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">State welfare fund (LWF)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={rows[breakdownEmployee._id]?.lwfEnabled !== false}
                        onChange={(e) => updateRow(breakdownEmployee._id, 'lwfEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Gratuity Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all">
                      <div className="flex flex-col pr-2">
                        <span className="font-semibold text-slate-800">Gratuity Provision</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">4.81% basic salary match</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={rows[breakdownEmployee._id]?.gratuityEnabled !== false}
                        onChange={(e) => updateRow(breakdownEmployee._id, 'gratuityEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Include PF in CTC */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all">
                      <div className="flex flex-col pr-2">
                        <span className="font-semibold text-slate-800">Include PF in CTC</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Employer PF inside CTC limit</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={rows[breakdownEmployee._id]?.includePfInCTC !== false}
                        onChange={(e) => updateRow(breakdownEmployee._id, 'includePfInCTC', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Include Gratuity in CTC */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all">
                      <div className="flex flex-col pr-2">
                        <span className="font-semibold text-slate-800">Include Gratuity in CTC</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Gratuity inside CTC limit</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={rows[breakdownEmployee._id]?.includeGratuityInCTC !== false}
                        onChange={(e) => updateRow(breakdownEmployee._id, 'includeGratuityInCTC', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Basic Override */}
                    <div className="flex flex-col p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-800">Basic Salary Override</span>
                        <span className="text-[10px] text-slate-500">Default: 50%</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={rows[breakdownEmployee._id]?.basicPercent ?? 50}
                          onChange={(e) => updateRow(breakdownEmployee._id, 'basicPercent', Number(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs text-right font-medium"
                        />
                        <span className="text-slate-500 font-medium">%</span>
                      </div>
                    </div>

                    {/* HRA Override */}
                    <div className="flex flex-col p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-800">HRA Override (% of Basic)</span>
                        <span className="text-[10px] text-slate-500">Default: 50%</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={rows[breakdownEmployee._id]?.hraPercent ?? 50}
                          onChange={(e) => updateRow(breakdownEmployee._id, 'hraPercent', Number(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs text-right font-medium"
                        />
                        <span className="text-slate-500 font-medium">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {localSnapshot && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Earnings Breakdown */}
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-700 text-sm flex items-center justify-between">
                        <span>Earnings (Paid vs Master)</span>
                        <span className="text-xs text-gray-500 font-normal">Attendance Prorated</span>
                      </div>
                      <div className="divide-y divide-gray-100 text-sm">
                        <BreakdownRow label="Basic Salary" paid={localSnapshot.earnings.basic} master={localSnapshot.master.basicMaster} />
                        <BreakdownRow label="House Rent Allowance (HRA)" paid={localSnapshot.earnings.hra} master={localSnapshot.master.hraMaster} />
                        <BreakdownRow label="Special Allowance" paid={localSnapshot.earnings.specialAllowance} master={localSnapshot.master.specialAllowance} />
                        {localSnapshot.earnings.flexiAmount > 0 && <BreakdownRow label="Flexi Amount" paid={localSnapshot.earnings.flexiAmount} master={localSnapshot.master.flexi} />}
                        {localSnapshot.earnings.broadband > 0 && <BreakdownRow label="Broadband" paid={localSnapshot.earnings.broadband} master={localSnapshot.master.broadband} />}
                        {localSnapshot.earnings.petrol > 0 && <BreakdownRow label="Petrol" paid={localSnapshot.earnings.petrol} master={localSnapshot.master.petrol} />}
                        {localSnapshot.earnings.lta > 0 && <BreakdownRow label="LTA" paid={localSnapshot.earnings.lta} master={localSnapshot.master.lta} />}
                        {localSnapshot.earnings.conveyance > 0 && <BreakdownRow label="Conveyance" paid={localSnapshot.earnings.conveyance} master={localSnapshot.master.conveyance} />}
                        {localSnapshot.earnings.medicalAllowance > 0 && <BreakdownRow label="Medical Allowance" paid={localSnapshot.earnings.medicalAllowance} master={localSnapshot.master.medicalAllowance} />}
                      </div>
                    </div>

                    {/* Custom Allowances Editor */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-700 text-sm flex items-center justify-between">
                        <span>Custom Run Allowances (Other Earnings)</span>
                        <button
                          type="button"
                          onClick={() => setLocalEarnings([...localEarnings, { name: '', amount: 0 }])}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                        >
                          <FaPlus className="w-2.5 h-2.5" /> Add
                        </button>
                      </div>
                      <div className="p-4 space-y-3">
                        {localEarnings.length === 0 ? (
                          <div className="text-xs text-gray-500 text-center py-2">No custom allowances defined for this run.</div>
                        ) : (
                          localEarnings.map((item, idx) => (
                            <div key={`local-earn-${idx}`} className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Allowance Name"
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...localEarnings];
                                  updated[idx].name = e.target.value;
                                  setLocalEarnings(updated);
                                }}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                              <input
                                type="number"
                                placeholder="Amount"
                                value={item.amount}
                                onChange={(e) => {
                                  const updated = [...localEarnings];
                                  updated[idx].amount = Number(e.target.value) || 0;
                                  setLocalEarnings(updated);
                                }}
                                className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = localEarnings.filter((_, i) => i !== idx);
                                  setLocalEarnings(updated);
                                }}
                                className="text-red-500 hover:text-red-700 p-1 transition-colors"
                              >
                                <FaTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Total Earnings Summary */}
                    <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 flex justify-between items-center font-bold text-slate-800">
                      <span>Total Earnings (Gross Salary)</span>
                      <span className="text-lg">{fmtMoney(localSnapshot.earnings.totalEarnings)}</span>
                    </div>
                  </div>

                  {/* Right Column: Deductions, Contributions & Net Pay */}
                  <div className="space-y-4">
                    {/* Deductions Card */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-700 text-sm">
                        Statutory & Voluntary Deductions
                      </div>
                      <div className="divide-y divide-gray-100 text-sm">
                        <DeductionRow label="Provident Fund (Employee PF Contribution)" amount={localSnapshot.deductions.pfEmployee} />
                        {localSnapshot.deductions.esiEmployee > 0 && <DeductionRow label="ESI (Employee Contribution)" amount={localSnapshot.deductions.esiEmployee} />}
                        {localSnapshot.deductions.lwfEmployee > 0 && <DeductionRow label="LWF (Employee Contribution)" amount={localSnapshot.deductions.lwfEmployee} />}
                        {localSnapshot.deductions.professionalTax > 0 && <DeductionRow label="Professional Tax (PT)" amount={localSnapshot.deductions.professionalTax} />}
                        <DeductionRow label="Income Tax (TDS)" amount={localSnapshot.deductions.tds} isEditable value={rows[breakdownEmployee._id]?.tds ?? 0} onChange={(val) => updateRow(breakdownEmployee._id, 'tds', Number(val) || 0)} />
                      </div>
                    </div>

                    {/* Custom Deductions Editor */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-700 text-sm flex items-center justify-between">
                        <span>Custom Run Deductions (Other Deductions)</span>
                        <button
                          type="button"
                          onClick={() => setLocalDeductions([...localDeductions, { name: '', amount: 0 }])}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                        >
                          <FaPlus className="w-2.5 h-2.5" /> Add
                        </button>
                      </div>
                      <div className="p-4 space-y-3">
                        {localDeductions.length === 0 ? (
                          <div className="text-xs text-gray-500 text-center py-2">No custom deductions defined for this run.</div>
                        ) : (
                          localDeductions.map((item, idx) => (
                            <div key={`local-ded-${idx}`} className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Deduction Name"
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...localDeductions];
                                  updated[idx].name = e.target.value;
                                  setLocalDeductions(updated);
                                }}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                              <input
                                type="number"
                                placeholder="Amount"
                                value={item.amount}
                                onChange={(e) => {
                                  const updated = [...localDeductions];
                                  updated[idx].amount = Number(e.target.value) || 0;
                                  setLocalDeductions(updated);
                                }}
                                className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = localDeductions.filter((_, i) => i !== idx);
                                  setLocalDeductions(updated);
                                }}
                                className="text-red-500 hover:text-red-700 p-1 transition-colors"
                              >
                                <FaTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Employer Contributions Card */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-700 text-sm">
                        Employer Contributions (Non-Takehome CTC Components)
                      </div>
                      <div className="divide-y divide-gray-100 text-sm">
                        <DeductionRow label="Provident Fund (Employer PF Contribution)" amount={localSnapshot.employerContributions.pfEmployer} isContrib />
                        {localSnapshot.employerContributions.esiEmployer > 0 && <DeductionRow label="ESI (Employer Contribution)" amount={localSnapshot.employerContributions.esiEmployer} isContrib />}
                        {localSnapshot.employerContributions.gratuity > 0 && <DeductionRow label="Gratuity Provision" amount={localSnapshot.employerContributions.gratuity} isContrib />}
                        {localSnapshot.employerContributions.lwfEmployer > 0 && <DeductionRow label="LWF (Employer Contribution)" amount={localSnapshot.employerContributions.lwfEmployer} isContrib />}
                        {localSnapshot.employerContributions.insuranceEmployer > 0 && <DeductionRow label="Insurance" amount={localSnapshot.employerContributions.insuranceEmployer} isContrib />}
                        {localSnapshot.employerContributions.nps > 0 && <DeductionRow label="Employer NPS" amount={localSnapshot.employerContributions.nps} isContrib />}
                      </div>
                    </div>

                    {/* Net Take-Home Salary Callout */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center font-bold text-emerald-900 shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-emerald-900">Net Take-Home Salary</span>
                        <span className="text-[10px] text-emerald-600 font-normal">Gross - Total Deductions</span>
                      </div>
                      <span className="text-2xl text-emerald-800">{fmtMoney(localSnapshot.netSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* Pre-approved reimbursements section */}
                {claimsMap.get(breakdownEmployee._id)?.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm mt-6">
                    <div className="bg-slate-50 px-4 py-3 border-b border-gray-200 font-bold text-slate-700 text-sm">
                      Pre-approved reimbursements
                    </div>
                    <div className="p-4 space-y-3">
                      {claimsMap.get(breakdownEmployee._id).map((claim) => {
                        const isExcluded = localExcludedClaimIds.has(claim._id);
                        return (
                          <div key={claim._id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={!isExcluded}
                                onChange={(e) => {
                                  setLocalExcludedClaimIds((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) {
                                      next.delete(claim._id);
                                    } else {
                                      next.add(claim._id);
                                    }
                                    return next;
                                  });
                                }}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                                claim.category === 'petrol' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                claim.category === 'broadband' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                claim.category === 'lta' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                claim.category === 'medical' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {claim.category}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">Approved on {new Date(claim.createdAt).toLocaleDateString('en-IN')}</span>
                            </div>
                            <span className="font-bold text-sm text-slate-800">{fmtMoney(claim.amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBreakdownEmployee(null)}
                className="px-4 py-2 border rounded-lg bg-white text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustments}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Save Run Adjustments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-2xl font-bold mt-2 text-gray-900">{value}</div>
  </div>
);

const EditableMoneyCell = ({ value, onChange, disabled = false }) => (
  <td className="px-4 py-4">
    {disabled ? (
      <div className="text-sm text-gray-700 whitespace-nowrap">{fmtMoney(value)}</div>
    ) : (
      <input
        type="number"
        min="0"
        value={value ?? 0}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right font-medium"
      />
    )}
  </td>
);

export default PayrollProcessing;
