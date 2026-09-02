import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaCheck, FaSave, FaPlus, FaTrash, FaCalculator, FaTimes, FaDownload } from 'react-icons/fa';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';
import { DEFAULT_PAYROLL_CONFIG, fmtMoney, serializeRow, getSalarySplits } from '../utils/payroll';
import { usePayrollSnapshot } from '../hooks/usePayrollSnapshot';
import { getPeriodInputFields, isAttendanceLinked, resolveCompensationTypeClient } from '../utils/compensationTypeFields';

const monthName = (month) => new Date(0, month - 1).toLocaleString('en-US', { month: 'long' });
const sumNamedAmounts = (items = []) => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

const getDeptName = (dept) => {
  if (!dept) return '';
  if (typeof dept === 'string') return dept;
  if (typeof dept === 'object') return dept.name || dept.code || String(dept._id || '');
  return String(dept);
};

const getCompTypeStr = (type) => {
  if (!type) return 'monthly_salary';
  if (typeof type === 'string') return type;
  if (typeof type === 'object') return type.key || type.name || String(type);
  return String(type);
};

export function getCompensationBadgeInfo(employee = {}, snapshot = null) {
  const compType = resolveCompensationTypeClient(employee);

  if (compType === 'hourly') {
    return { label: `Rate: ${fmtMoney(employee.hourlyRate)}/hr`, isBadge: true };
  }
  if (compType === 'daily_wage') {
    return { label: `Daily: ${fmtMoney(employee.dailyRate)}/day`, isBadge: true };
  }
  if (compType === 'weekly_salary') {
    return { label: `Weekly: ${fmtMoney(employee.weeklyRate)}/wk`, isBadge: true };
  }
  if (compType === 'piece_rate') {
    const rateCardEntry = (employee.rateCard || []).find(r => r.paymentType === 'UNIT') || (employee.rateCard || [])[0];
    const rate = rateCardEntry ? rateCardEntry.rate : 0;
    return { label: rate > 0 ? `Piece Rate: ${fmtMoney(rate)}/unit` : 'Piece Rate', isBadge: true };
  }
  if (compType === 'project_based') {
    const rateCardEntry = (employee.rateCard || []).find(r => r.paymentType === 'PROJECT');
    const fee = rateCardEntry ? rateCardEntry.rate : (employee.projectFee || snapshot?.master?.monthlyCTC || employee.monthlyCTC || 0);
    return { label: fee > 0 ? `Project Fee: ${fmtMoney(fee)}` : 'Project Fee', isBadge: true };
  }
  if (compType === 'milestone_based') {
    const rateCardEntry = (employee.rateCard || []).find(r => r.paymentType === 'MILESTONE');
    const rate = rateCardEntry ? rateCardEntry.rate : (employee.milestoneAmount || 0);
    return { label: rate > 0 ? `Milestone: ${fmtMoney(rate)}/milestone` : 'Milestone-based', isBadge: true };
  }
  if (compType === 'commission_only') {
    return { label: 'Commission Only', isBadge: true };
  }
  if (compType === 'retainer') {
    const rateCardEntry = (employee.rateCard || []).find(r => r.paymentType === 'MONTHLY');
    const rate = rateCardEntry ? rateCardEntry.rate : (snapshot?.master?.monthlyCTC || employee.monthlyCTC || 0);
    return { label: rate > 0 ? `Retainer: ${fmtMoney(rate)}/mo` : 'Retainer', isBadge: true };
  }
  if (compType === 'timesheet_based') {
    return { label: `Timesheet: ${fmtMoney(employee.hourlyRate)}/hr`, isBadge: true };
  }

  // Everything else: monthly_salary, attendance_based, salary_plus_commission
  const ctc = snapshot?.master?.monthlyCTC || employee.monthlyCTC || 0;
  return { label: `CTC ${fmtMoney(ctc)}`, isBadge: false };
}

export const PRIMARY_EARNINGS_LABELS = {
  hourly:                 'Contract Wages (Hourly)',
  timesheet_based:        'Timesheet-Based Pay',
  daily_wage:             'Daily Wage Earnings',
  weekly_salary:          'Weekly Salary Earnings',
  piece_rate:             'Deliverable Output Pay (Piece Rate)',
  project_based:          'Project Fee Earnings',
  milestone_based:        'Milestone Output Pay',
  commission_only:        'Commission Earnings',
  retainer:               'Retainer Payment',
  salary_plus_commission: 'Base Salary + Commission',
};

export function getEarningsRowLabel(employee = {}, component = {}) {
  if (!component) return '';
  if (component.id === 'basic') {
    const compType = resolveCompensationTypeClient(employee);
    if (PRIMARY_EARNINGS_LABELS[compType]) {
      return PRIMARY_EARNINGS_LABELS[compType];
    }
  }
  return component.name || component.id;
}

const getEarningValue = (snapshot, componentId) => {
  if (!snapshot?.earnings) return 0;
  let val = snapshot.earnings[componentId];
  if (val === undefined) {
    if (componentId === 'flexi') val = snapshot.earnings.flexiAmount ?? snapshot.earnings.flexi;
    else if (componentId === 'medical') val = snapshot.earnings.medicalAllowance ?? snapshot.earnings.medical;
    else if (componentId === 'special') val = snapshot.earnings.specialAllowance;
    else if (componentId === 'basic') val = snapshot.earnings.basic;
    else if (componentId === 'hra') val = snapshot.earnings.hra;
  }
  return val ?? 0;
};

const getComponentBreakdown = (snapshot, component) => {
  const cId = component?.id;
  if (!snapshot || !cId) return { paid: 0, master: 0 };
  
  // Paid amount
  let paid = snapshot.earnings[cId];
  if (paid === undefined) {
    if (cId === 'basic') paid = snapshot.earnings.basic;
    else if (cId === 'hra') paid = snapshot.earnings.hra;
    else if (cId === 'flexi') paid = snapshot.earnings.flexiAmount ?? snapshot.earnings.flexi;
    else if (cId === 'medical') paid = snapshot.earnings.medicalAllowance ?? snapshot.earnings.medical;
    else if (cId === 'special') paid = snapshot.earnings.specialAllowance;
  }
  paid = Number(paid) || 0;
  
  // Master amount
  let master = 0;
  if (snapshot.master?.earningsMap && snapshot.master.earningsMap[cId] !== undefined) {
    master = snapshot.master.earningsMap[cId];
  } else {
    master = snapshot.master[cId];
    if (master === undefined) {
      if (cId === 'basic') master = snapshot.master.basicMaster;
      else if (cId === 'hra') master = snapshot.master.hraMaster;
      else if (cId === 'flexi') master = snapshot.master.flexi;
      else if (cId === 'medical') master = snapshot.master.medicalAllowance;
      else if (cId === 'special') master = snapshot.master.specialAllowance;
    }
  }
  master = Number(master) || 0;
  
  return { paid, master };
};

const BreakdownRow = ({ label, paid, master }) => (
  <div className="flex items-center justify-between px-4 py-2.5">
    <span className="text-gray-600 dark:text-slate-300 font-medium">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-semibold text-gray-900 dark:text-slate-100">{fmtMoney(paid)}</span>
      {paid !== master && (
        <span className="text-xs text-gray-400 dark:text-slate-500 font-normal line-through">
          {fmtMoney(master)}
        </span>
      )}
    </div>
  </div>
);

const DeductionRow = ({ label, amount, isContrib = false, isEditable = false, value, onChange }) => (
  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 dark:border-slate-800 last:border-0">
    <span className={isContrib ? "text-gray-500 dark:text-slate-400 font-normal text-xs" : "text-gray-600 dark:text-slate-300 font-medium"}>
      {label}
      {isContrib && <span className="text-[10px] text-gray-400 dark:text-slate-500 ml-1">(Employer Contribution)</span>}
    </span>
    {isEditable ? (
      <input
        type="number"
        min="0"
        placeholder={amount !== undefined ? String(amount) : "0"}
        value={value !== undefined && value !== null ? value : ''}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-24 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-1 text-sm text-right font-semibold focus:outline-none focus:border-blue-500"
      />
    ) : (
      <span className={`font-semibold ${isContrib ? "text-gray-700 dark:text-slate-300" : "text-red-600 dark:text-red-400"}`}>
        {isContrib ? '' : '-'}{fmtMoney(amount)}
      </span>
    )}
  </div>
);

const RenderPeriodInputField = ({ fieldKey, employee, row, snapshot, isExistingDisabled, updateRow, updatePeriodInput, monthWorkingDays }) => {
  switch (fieldKey) {
    case 'paidDays':
    case 'workingDays':
      return (
        <div key={fieldKey} className="flex gap-1.5">
          <input
            type="number" min="0"
            value={row?.paidDays ?? 0}
            disabled={isExistingDisabled}
            onChange={(e) => updateRow(employee._id, 'paidDays', e.target.value)}
            className="w-16 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-xs text-right disabled:bg-gray-100 dark:disabled:bg-slate-800/60 disabled:text-gray-400 dark:disabled:text-slate-500"
          />
          <span className="self-center text-gray-400 dark:text-slate-500 text-xs">/</span>
          <input
            type="number" min="1"
            value={row?.workingDays ?? monthWorkingDays}
            disabled={isExistingDisabled}
            onChange={(e) => updateRow(employee._id, 'workingDays', e.target.value)}
            className="w-16 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-xs text-right disabled:bg-gray-100 dark:disabled:bg-slate-800/60 disabled:text-gray-400 dark:disabled:text-slate-500"
          />
        </div>
      );

    case 'hoursWorked':
    case 'hoursLogged':
      return (
        <div key={fieldKey} className="flex items-center gap-1">
          <input
            type="number" min="0"
            value={row?.hoursWorked ?? row?.periodInput?.hoursWorked ?? 160}
            disabled={isExistingDisabled}
            onChange={(e) => {
              const hrs = Number(e.target.value) || 0;
              updateRow(employee._id, 'hoursWorked', hrs);
              updatePeriodInput('hoursWorked', hrs);
            }}
            className="w-20 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-xs text-right font-medium disabled:bg-gray-100 dark:disabled:bg-slate-800/60 disabled:text-gray-400 dark:disabled:text-slate-500"
          />
          <span className="text-gray-400 dark:text-slate-500 text-xs">hrs</span>
        </div>
      );

    case 'daysWorked':
      return (
        <div key={fieldKey} className="flex items-center gap-1">
          <input
            type="number" min="0"
            value={row?.periodInput?.daysWorked ?? row?.paidDays ?? 26}
            disabled={isExistingDisabled}
            onChange={(e) => {
              const days = Number(e.target.value) || 0;
              updateRow(employee._id, 'paidDays', days);
              updatePeriodInput('daysWorked', days);
            }}
            className="w-20 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-xs text-right font-medium disabled:bg-gray-100 dark:disabled:bg-slate-800/60 disabled:text-gray-400 dark:disabled:text-slate-500"
          />
          <span className="text-gray-400 dark:text-slate-500 text-xs">days</span>
        </div>
      );

    case 'unitsProduced':
      return (
        <div key={fieldKey} className="flex items-center gap-1">
          <input
            type="number" min="0"
            placeholder="1"
            value={row?.periodInput?.unitsProduced !== undefined ? row.periodInput.unitsProduced : ''}
            disabled={isExistingDisabled}
            onChange={(e) => updatePeriodInput('unitsProduced', e.target.value === '' ? undefined : Number(e.target.value))}
            className="w-20 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-xs text-right font-medium disabled:bg-gray-100 dark:disabled:bg-slate-800/60 disabled:text-gray-400 dark:disabled:text-slate-500"
          />
          <span className="text-gray-400 dark:text-slate-500 text-xs">units</span>
        </div>
      );

    case 'ratePerUnit':
      return (
        <div key={fieldKey} className="flex items-center gap-1">
          <input
            type="number" min="0"
            placeholder="Rate ₹"
            value={row?.periodInput?.ratePerUnit ?? ''}
            disabled={isExistingDisabled}
            onChange={(e) => updatePeriodInput('ratePerUnit', Number(e.target.value) || 0)}
            className="w-20 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-xs text-right font-medium disabled:bg-gray-100 dark:disabled:bg-slate-800/60 disabled:text-gray-400 dark:disabled:text-slate-500"
          />
          <span className="text-gray-400 dark:text-slate-500 text-xs">₹/u</span>
        </div>
      );

    case 'projectFee':
      return (
        <div key={fieldKey} className="flex items-center gap-1">
          <input
            type="number" min="0"
            placeholder="Project Fee"
            value={row?.periodInput?.projectFee ?? 0}
            disabled={isExistingDisabled}
            onChange={(e) => updatePeriodInput('projectFee', Number(e.target.value) || 0)}
            className="w-24 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-xs text-right font-medium disabled:bg-gray-100 dark:disabled:bg-slate-800/60 disabled:text-gray-400 dark:disabled:text-slate-500"
          />
        </div>
      );

    case 'milestoneAmount':
      return (
        <div key={fieldKey} className="flex items-center gap-1">
          <input
            type="number" min="0"
            placeholder="Amount ₹"
            value={row?.periodInput?.milestoneAmount ?? 0}
            disabled={isExistingDisabled}
            onChange={(e) => updatePeriodInput('milestoneAmount', Number(e.target.value) || 0)}
            className="w-24 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-xs text-right font-medium disabled:bg-gray-100 dark:disabled:bg-slate-800/60 disabled:text-gray-400 dark:disabled:text-slate-500"
          />
        </div>
      );

    case 'milestoneRef':
      return (
        <div key={fieldKey} className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Milestone ref"
            value={row?.periodInput?.milestoneRef ?? ''}
            disabled={isExistingDisabled}
            onChange={(e) => updatePeriodInput('milestoneRef', e.target.value)}
            className="w-24 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-[10px] disabled:bg-gray-100 dark:disabled:bg-slate-800/60 disabled:text-gray-400 dark:disabled:text-slate-500"
          />
        </div>
      );

    case 'variableTransactions':
    case 'commission':
      const commSum = (row?.variableTransactions || []).reduce((sum, t) => sum + (t.amount || 0), 0);
      return (
        <div key={fieldKey} className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-gray-800 dark:text-slate-100">{fmtMoney(commSum)}</span>
          <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">Commission</span>
        </div>
      );

    case 'retainer':
    case 'skipPeriod':
      const isSkipped = Boolean(row?._skipPeriod);
      const retainerVal = row?.snapshot?.master?.monthlyCTC ?? snapshot?.master?.monthlyCTC ?? employee.monthlyCTC ?? 0;
      return (
        <div key={fieldKey} className="flex flex-col gap-1">
          <span className={`text-xs font-semibold ${isSkipped ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-100'}`}>
            {fmtMoney(retainerVal)}
          </span>
          <label className="inline-flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isSkipped}
              disabled={isExistingDisabled}
              onChange={(e) => updateRow(employee._id, '_skipPeriod', e.target.checked)}
              className="w-3 h-3 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-[9px] text-gray-500 dark:text-slate-400 font-medium">Skip period</span>
          </label>
        </div>
      );

    default:
      return null;
  }
};

const EmployeeRow = ({
  employee,
  config,
  row,
  selected,
  onToggleSelected,
  setBreakdownEmployee,
  setFnfEmployee,
  monthWorkingDays,
  updateRow,
  claimsMap,
  month,
  year,
  earningComponents,
  existingPayroll,
  onDeletePayroll,
  onSnapshotReady,
  compensationTypesMap = {},
}) => {
  const filteredReimbursements = useMemo(() => {
    return (claimsMap.get(employee._id) || []).filter(c => !(row?.excludedClaimIds || []).includes(c._id));
  }, [claimsMap, employee._id, row?.excludedClaimIds]);

  const rowWithReimbursements = useMemo(() => {
    return { ...row, reimbursements: filteredReimbursements, month, year };
  }, [row, filteredReimbursements, month, year]);

  const calculatedSnapshot = usePayrollSnapshot(employee, config, rowWithReimbursements, monthWorkingDays);

  // Bubble net/gross/flags up to parent for summary dashboard + filter
  useEffect(() => {
    if (calculatedSnapshot?.netSalary !== undefined && onSnapshotReady) {
      onSnapshotReady(employee._id, {
        net: Number(calculatedSnapshot.netSalary) || 0,
        gross: Number(calculatedSnapshot.earnings?.totalEarnings) || 0,
        flags: {
          clamped: Boolean(calculatedSnapshot.netPayClamped || calculatedSnapshot.payrollShortfall?.shortfallAmount > 0),
          belowMinWage: Boolean(calculatedSnapshot.belowMinimumWage || calculatedSnapshot.minimumWageCompliance?.flagged),
        },
      });
    }
  }, [calculatedSnapshot?.netSalary, calculatedSnapshot?.earnings?.totalEarnings, calculatedSnapshot?.netPayClamped, calculatedSnapshot?.belowMinimumWage, employee._id]);

  const snapshot = useMemo(() => {
    if (existingPayroll && existingPayroll.status !== 'draft') {
      return {
        ...existingPayroll,
        master: {
          ...existingPayroll.employeeSnapshot,
          monthlyCTC: existingPayroll.employeeSnapshot?.monthlyCTC,
          pfEnabled: existingPayroll.employeeSnapshot?.pfEnabled,
          tdsEnabled: existingPayroll.employeeSnapshot?.tdsEnabled,
          esiEnabled: existingPayroll.employeeSnapshot?.esiEnabled,
          ptEnabled: existingPayroll.employeeSnapshot?.ptEnabled,
          lwfEnabled: existingPayroll.employeeSnapshot?.lwfEnabled,
          gratuityEnabled: existingPayroll.employeeSnapshot?.gratuityEnabled,
          basicPercent: existingPayroll.employeeSnapshot?.basicPercent,
          hraPercent: existingPayroll.employeeSnapshot?.hraPercent,
        }
      };
    }
    return calculatedSnapshot;
  }, [existingPayroll, calculatedSnapshot]);

  const otherAllowancesTotal = useMemo(() => {
    if (!snapshot?.earnings?.otherEarnings) return 0;
    const filtered = snapshot.earnings.otherEarnings.filter(
      (item) => !earningComponents.some(c => c.name === item.name || c.id === item.name)
    );
    return sumNamedAmounts(filtered);
  }, [snapshot?.earnings?.otherEarnings, earningComponents]);

  const isExitingInPeriod = useMemo(() => {
    if (!employee.dateOfLeaving) return false;
    const dol = new Date(employee.dateOfLeaving);
    return dol.getUTCFullYear() === Number(year) && (dol.getUTCMonth() + 1) === Number(month);
  }, [employee.dateOfLeaving, month, year]);

  if (!snapshot) return null;

  const isHourly = employee.payType === 'hourly' || employee.compensationType === 'hourly';
  const paidTooHigh = !isHourly && Number(row?.paidDays) > Number(row?.workingDays || monthWorkingDays);
  const isExistingDisabled = existingPayroll && existingPayroll.status !== 'draft';

  const isPfEnabled = row?.pfEnabled !== undefined ? row.pfEnabled : snapshot?.master?.pfEnabled !== false;
  const isTdsEnabled = row?.tdsEnabled !== undefined ? row.tdsEnabled : snapshot?.master?.tdsEnabled !== false;
  const isEsiEnabled = row?.esiEnabled !== undefined ? row.esiEnabled : snapshot?.master?.esiEnabled !== false;
  const isPtEnabled = row?.ptEnabled !== undefined ? row.ptEnabled : snapshot?.master?.ptEnabled !== false;
  const isLwfEnabled = row?.lwfEnabled !== undefined ? row.lwfEnabled : snapshot?.master?.lwfEnabled !== false;
  const isGratuityEnabled = row?.gratuityEnabled !== undefined ? row.gratuityEnabled : snapshot?.master?.gratuityEnabled !== false;

  const basicPercentVal = row?.basicPercent !== undefined && row?.basicPercent !== null
    ? row.basicPercent
    : (snapshot?.master?.basicPercent !== undefined
        ? (snapshot.master.basicPercent > 1 ? snapshot.master.basicPercent : snapshot.master.basicPercent * 100)
        : 50);

  const hraPercentVal = row?.hraPercent !== undefined && row?.hraPercent !== null
    ? row.hraPercent
    : (snapshot?.master?.hraPercent !== undefined
        ? (snapshot.master.hraPercent > 1 ? snapshot.master.hraPercent : snapshot.master.hraPercent * 100)
        : 50);

  const isBlocking = snapshot?.netPayClamped || snapshot?.payrollShortfall?.shortfallAmount > 0 || snapshot?.belowMinimumWage || snapshot?.minimumWageCompliance?.flagged;
  const isProcessed = Boolean(existingPayroll && existingPayroll.status !== 'draft');

  const rowClass = isBlocking && !isProcessed
    ? 'bg-red-50/40 dark:bg-red-950/30 border-l-4 border-l-red-500 hover:bg-red-50/60 dark:hover:bg-red-950/50'
    : isExitingInPeriod && !isProcessed
      ? 'bg-amber-50/60 dark:bg-amber-950/40 border-l-4 border-l-amber-500 hover:bg-amber-100/60 dark:hover:bg-amber-900/40'
      : paidTooHigh && !isProcessed
        ? 'bg-amber-50/40 dark:bg-amber-950/30 border-l-4 border-l-amber-400 hover:bg-amber-100/40 dark:hover:bg-amber-900/30'
        : isProcessed
          ? 'bg-gray-50 dark:bg-slate-800/40 border-l-4 border-l-blue-400 text-gray-500 dark:text-slate-400 opacity-80 hover:bg-gray-100/50 dark:hover:bg-slate-800/60'
          : selected
            ? 'bg-blue-50/30 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-slate-800/70'
            : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/50';

  return (
    <tr key={employee._id} className={`${rowClass} align-top transition-colors`}>
      <td className="px-4 py-2.5">
        <input
          type="checkbox"
          checked={isExistingDisabled || isExitingInPeriod ? false : Boolean(selected)}
          disabled={Boolean(isExistingDisabled || isExitingInPeriod)}
          title={isExitingInPeriod ? 'Exiting employee in this period — process via Final Settlement' : ''}
          onChange={(e) => onToggleSelected(employee._id, e.target.checked)}
          className="w-3.5 h-3.5 disabled:opacity-50"
        />
      </td>
      <td className="px-4 py-2.5 min-w-[220px]">
        <div className={`font-semibold text-xs ${isExistingDisabled ? 'text-gray-600 dark:text-slate-400' : 'text-gray-900 dark:text-slate-100'}`}>{employee.firstName} {employee.lastName}</div>
        <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{employee.employeeId} · {employee.designation || '-'}</div>
        <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 flex flex-col gap-0.5">
          {(() => {
            const badgeInfo = getCompensationBadgeInfo(employee, snapshot);
            if (badgeInfo.isBadge) {
              return (
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800 rounded px-1.5 py-0.5 self-start">
                  💼 {badgeInfo.label}
                </span>
              );
            }
            return <span className="text-gray-600 dark:text-slate-300">{badgeInfo.label}</span>;
          })()}
          
          {existingPayroll ? (
            <div className="mt-1 flex flex-col gap-1">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                existingPayroll.status === 'paid' ? 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' :
                existingPayroll.status === 'approved' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                existingPayroll.status === 'draft' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700' :
                'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}>
                Payroll {existingPayroll.status}
              </span>
              {existingPayroll.status !== 'paid' && (
                <button
                  type="button"
                  aria-label={`Delete payroll for ${employee.firstName} ${employee.lastName}`}
                  onClick={() => onDeletePayroll(existingPayroll._id, `${employee.firstName} ${employee.lastName}`)}
                  className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:underline transition-colors text-left flex items-center gap-1 self-start mt-0.5"
                >
                  <FaTrash className="w-2.5 h-2.5" /> Delete Payroll
                </button>
              )}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {isExitingInPeriod ? (
              <button
                type="button"
                onClick={() => setFnfEmployee(employee)}
                className="text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded-md shadow-xs transition-colors flex items-center gap-1 self-start"
              >
                📜 Process Final Settlement
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFnfEmployee(employee)}
                className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:underline transition-colors text-left flex items-center gap-1 self-start"
              >
                📜 Full & Final (F&F)
              </button>
            )}

            <button
              type="button"
              aria-label={isExistingDisabled ? `View breakdown for ${employee.firstName} ${employee.lastName}` : `Open breakdown and adjust for ${employee.firstName} ${employee.lastName}`}
              onClick={() => setBreakdownEmployee(employee)}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors text-left flex items-center gap-1 self-start"
            >
              <FaCalculator className="w-2.5 h-2.5" /> {isExistingDisabled ? 'View Breakdown' : 'Breakdown & Adjust'}
            </button>

            {employee.dateOfLeaving && (
              <span className={`text-[9px] font-bold rounded px-1.5 py-0.5 ${isExitingInPeriod ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}`}>
                🚨 Exiting{isExitingInPeriod ? ' This Period' : ''}: {new Date(employee.dateOfLeaving).toLocaleDateString('en-IN')}
              </span>
            )}
          </div>
          {/* Edge Case Warning Badges: Net Pay Clamped & Below Minimum Wage */}
          {(snapshot?.netPayClamped || snapshot?.payrollShortfall?.shortfallAmount > 0) && (
            <div className="mt-1 text-[9px] font-bold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded px-1.5 py-0.5 self-start flex items-center gap-1 shadow-2xs" title="Net salary was clamped to ₹0 because deductions exceeded gross earnings">
              ⚠️ Net Pay Clamped (Shortfall: {fmtMoney(snapshot.payrollShortfall?.shortfallAmount || 0)})
            </div>
          )}
          {(snapshot?.belowMinimumWage || snapshot?.minimumWageCompliance?.flagged) && (
            <div className="mt-1 text-[9px] font-bold text-rose-900 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded px-1.5 py-0.5 self-start flex items-center gap-1 shadow-2xs" title={snapshot.minimumWageCompliance?.warningMessage || 'Gross earnings below minimum wage floor'}>
              ⚠️ Below Minimum Wage Floor ({snapshot.minimumWageCompliance?.state || 'State'})
            </div>
          )}
          
          {/* Statutory Settings Badges */}
          <div className="flex flex-wrap gap-1 mt-1 font-mono">
            <span className={`text-[8px] px-1 py-0.5 rounded font-bold transition-all ${isTdsEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 line-through opacity-70'}`} title={isTdsEnabled ? 'Income Tax TDS Enabled' : 'Income Tax TDS Disabled'}>TDS</span>
            {!isHourly && (!employee.compensationModel || employee.compensationModel === 'SALARIED') && (
              <>
                <span className={`text-[8px] px-1 py-0.5 rounded font-bold transition-all ${isPfEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 line-through opacity-70'}`} title={isPfEnabled ? 'Provident Fund Enabled' : 'Provident Fund Disabled'}>PF</span>
                <span className={`text-[8px] px-1 py-0.5 rounded font-bold transition-all ${isEsiEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 line-through opacity-70'}`} title={isEsiEnabled ? 'ESI Scheme Enabled' : 'ESI Scheme Disabled'}>ESI</span>
                <span className={`text-[8px] px-1 py-0.5 rounded font-bold transition-all ${isPtEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 line-through opacity-70'}`} title={isPtEnabled ? 'Professional Tax Enabled' : 'Professional Tax Disabled'}>PT</span>
                <span className={`text-[8px] px-1 py-0.5 rounded font-bold transition-all ${isLwfEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 line-through opacity-70'}`} title={isLwfEnabled ? 'Labour Welfare Fund Enabled' : 'Labour Welfare Fund Disabled'}>LWF</span>
                <span className={`text-[8px] px-1 py-0.5 rounded font-bold transition-all ${isGratuityEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 line-through opacity-70'}`} title={isGratuityEnabled ? 'Gratuity Accrual Enabled' : 'Gratuity Accrual Disabled'}>Gratuity</span>
                {Number(basicPercentVal) !== 50 && (
                  <span className="text-[8px] px-1 py-0.5 rounded font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm" title="Basic Salary Overridden percentage">
                    B:{Math.round(basicPercentVal)}%
                  </span>
                )}
                {Number(hraPercentVal) !== 50 && (
                  <span className="text-[8px] px-1 py-0.5 rounded font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-sm" title="HRA Overridden percentage">
                    H:{Math.round(hraPercentVal)}%
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 min-w-[180px]">
        {(() => {
          const compType = resolveCompensationTypeClient(employee);
          const allFields = getPeriodInputFields(compType, compensationTypesMap);

          const updatePeriodInput = (field, val) => {
            const existingPeriodInput = row?.periodInput || {};
            updateRow(employee._id, 'periodInput', { ...existingPeriodInput, [field]: val });
          };

          return (
            <div className="flex flex-col gap-1">
              {allFields.map(fKey => (
                <RenderPeriodInputField
                  key={fKey}
                  fieldKey={fKey}
                  employee={employee}
                  row={row}
                  snapshot={snapshot}
                  isExistingDisabled={isExistingDisabled}
                  updateRow={updateRow}
                  updatePeriodInput={updatePeriodInput}
                  monthWorkingDays={monthWorkingDays}
                />
              ))}
              {compType === 'salary_plus_commission' && (
                <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                  + Comm: {fmtMoney((row?.variableTransactions || []).reduce((sum, t) => sum + (t.amount || 0), 0))}
                </div>
              )}
            </div>
          );
        })()}
        {paidTooHigh ? <div className="mt-1 text-[10px] text-red-600 dark:text-red-400">Paid days cannot exceed working days.</div> : null}
      </td>
      <td className="px-4 py-2.5 text-xs whitespace-nowrap">
        {isHourly || !snapshot.workingDays ? (
          <span className="text-slate-400 dark:text-slate-400 font-medium italic">N/A</span>
        ) : (
          `${Math.round((snapshot.paidDays / Math.max(snapshot.workingDays, 1)) * 100)}%`
        )}
      </td>
      {earningComponents.map(c => {
        const val = getEarningValue(snapshot, c.id);
        const numVal = Number(val) || 0;
        return (
          <td key={c.id} className="px-4 py-2.5">
            {numVal > 0 ? (
              <div className="text-xs text-gray-700 dark:text-slate-300 whitespace-nowrap">{fmtMoney(numVal)}</div>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-400 font-medium italic">N/A</span>
            )}
          </td>
        );
      })}
      <td className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
        {otherAllowancesTotal > 0 ? fmtMoney(otherAllowancesTotal) : <span className="text-slate-400 dark:text-slate-400 font-medium italic">N/A</span>}
      </td>
      <EditableMoneyCell value={snapshot.employerContributions.gratuity} disabled notApplicable={!isGratuityEnabled || !Number(snapshot.employerContributions.gratuity)} />
      <EditableMoneyCell value={snapshot.employerContributions.lwfEmployer} disabled notApplicable={!isLwfEnabled || !Number(snapshot.employerContributions.lwfEmployer)} />
      <EditableMoneyCell value={row?.joiningBonus} disabled={isExistingDisabled} notApplicable={isExistingDisabled && !Number(row?.joiningBonus)} onChange={(value) => updateRow(employee._id, 'joiningBonus', value)} />
      <EditableMoneyCell value={row?.loyaltyBonus} disabled={isExistingDisabled} notApplicable={isExistingDisabled && !Number(row?.loyaltyBonus)} onChange={(value) => updateRow(employee._id, 'loyaltyBonus', value)} />
      <EditableMoneyCell value={row?.incentive} disabled={isExistingDisabled} notApplicable={isExistingDisabled && !Number(row?.incentive)} onChange={(value) => updateRow(employee._id, 'incentive', value)} />
      <EditableMoneyCell value={row?.specialBonus} disabled={isExistingDisabled} notApplicable={isExistingDisabled && !Number(row?.specialBonus)} onChange={(value) => updateRow(employee._id, 'specialBonus', value)} />
      <td className="px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
        {sumNamedAmounts(snapshot.deductions.otherDeductions) > 0 ? fmtMoney(sumNamedAmounts(snapshot.deductions.otherDeductions)) : <span className="text-slate-400 dark:text-slate-400 font-medium italic">N/A</span>}
      </td>
      <EditableMoneyCell
        value={row?.tds !== undefined ? row.tds : snapshot.deductions.tds}
        disabled={isExistingDisabled || !isTdsEnabled}
        notApplicable={!isTdsEnabled || (isExistingDisabled && !Number(row?.tds !== undefined ? row.tds : snapshot.deductions.tds))}
        onChange={(value) => updateRow(employee._id, 'tds', value)}
      />
      <td className="px-4 py-2.5 text-xs font-bold text-gray-900 dark:text-slate-100 whitespace-nowrap">{fmtMoney(snapshot.netSalary)}</td>
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
  const [monthWorkingDays, setMonthWorkingDays] = useState(() => new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
  const [claimsMap, setClaimsMap] = useState(new Map());
  const [existingPayrollsMap, setExistingPayrollsMap] = useState(new Map());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Stores the most-recent server-resolved netSalary per employee, for the total preview card
  const [snapshotsNetMap, setSnapshotsNetMap] = useState({});

  // Integration States
  const [syncingAttendance, setSyncingAttendance] = useState(false);
  const [isHrmsEnabled, setIsHrmsEnabled] = useState(false);

  // Modal Breakdown states
  const [breakdownEmployee, setBreakdownEmployee] = useState(null);
  const isReadOnly = useMemo(() => {
    if (!breakdownEmployee) return false;
    const existingP = existingPayrollsMap.get(String(breakdownEmployee._id));
    return existingP && existingP.status !== 'draft';
  }, [breakdownEmployee, existingPayrollsMap]);
  const [localEarnings, setLocalEarnings] = useState([]);
  const [localDeductions, setLocalDeductions] = useState([]);
  const [localExcludedClaimIds, setLocalExcludedClaimIds] = useState(new Set());
  const [localVariableTransactions, setLocalVariableTransactions] = useState([]);
  const [compensationTypesMap, setCompensationTypesMap] = useState({});
  const [skippedSummaryList, setSkippedSummaryList] = useState([]);
  const [fnfEmployee, setFnfEmployee] = useState(null);
  const [fnfForm, setFnfForm] = useState({ noticePeriodServedDays: 0, noticePeriodRequiredDays: 30, leaveEncashmentDays: 0, comments: '', hoursWorked: '', unitsProduced: '', ratePerUnit: '' });
  const [processingFnf, setProcessingFnf] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobProgress, setJobProgress] = useState(null);

  // Filter / sort state
  const [searchQuery, setSearchQuery]         = useState('');
  const [filterDept, setFilterDept]           = useState('');
  const [filterCompType, setFilterCompType]   = useState('');
  const [filterNeedsAttention, setFilterNeedsAttention] = useState(false);
  const [sortKey, setSortKey]                 = useState('name');
  const [sortDir, setSortDir]                 = useState('asc');

  // Per-employee snapshot data bubbled up from EmployeeRow
  const [snapshotFlagsMap, setSnapshotFlagsMap] = useState({});   // { empId: { clamped, belowMinWage } }
  const [snapshotGrossMap, setSnapshotGrossMap] = useState({});   // { empId: number }

  // Confirmation modal (Process Payroll only)
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const remainderId = useMemo(() => {
    return config?.salaryComponents?.find(c => c.linkedTo === 'remainder')?.id || 'special';
  }, [config?.salaryComponents]);

  const earningComponents = useMemo(() => {
    if (config?.salaryComponents && config.salaryComponents.length > 0) {
      return config.salaryComponents.filter(c => c.type === 'earning' && !['basic', 'hra', remainderId].includes(c.id));
    }
    return [
      { id: 'flexi', name: 'Flexi', type: 'earning' },
      { id: 'broadband', name: 'Broadband', type: 'earning' },
      { id: 'petrol', name: 'Petrol', type: 'earning' },
      { id: 'lta', name: 'LTA', type: 'earning' }
    ];
  }, [config?.salaryComponents, remainderId]);

  const allEarningComponents = useMemo(() => {
    if (config?.salaryComponents && config.salaryComponents.length > 0) {
      return config.salaryComponents.filter(c => c.type === 'earning');
    }
    return [
      { id: 'basic', name: 'Basic Salary' },
      { id: 'hra', name: 'House Rent Allowance (HRA)' },
      { id: 'special', name: 'Special Allowance' },
      { id: 'flexi', name: 'Flexi' },
      { id: 'broadband', name: 'Broadband' },
      { id: 'petrol', name: 'Petrol' },
      { id: 'lta', name: 'LTA' },
      { id: 'conveyance', name: 'Conveyance' },
      { id: 'medical', name: 'Medical Allowance' },
    ];
  }, [config?.salaryComponents]);

  // Dynamic deduction-type components (VPF, NPS, custom deductions) defined in payroll settings
  const deductionComponents = useMemo(() => {
    if (config?.salaryComponents && config.salaryComponents.length > 0) {
      return config.salaryComponents.filter(c => c.type === 'deduction');
    }
    return [];
  }, [config?.salaryComponents]);

  const getFreqSuffix = (frequency) => {
    if (!frequency || frequency === 'monthly') return '';
    if (frequency === 'quarterly') return ' (Quarterly)';
    if (frequency === 'semi_annually') return ' (Semi-Annually)';
    if (frequency === 'annually') return ' (Annually)';
    return '';
  };

  const headers = useMemo(() => {
    const baseHeadersBefore = ['Include', 'Employee', 'Paid/Working / Hours', 'Proration'];
    const dynamicHeaders = earningComponents.map(c => `${c.name}${getFreqSuffix(c.frequency)}`);
    const baseHeadersAfter = ['Other Allowances', 'Gratuity', 'LWF', 'Joining Bonus', 'Loyalty Bonus', 'Incentive', 'Special Bonus', 'Other Deductions', 'TDS', 'Net Preview'];
    return [...baseHeadersBefore, ...dynamicHeaders, ...baseHeadersAfter];
  }, [earningComponents]);

  useEffect(() => {
    if (breakdownEmployee) {
      const row = rows[breakdownEmployee._id] || {};
      setLocalEarnings(row.otherEarnings || []);
      setLocalDeductions(row.otherDeductions || []);
      setLocalExcludedClaimIds(new Set(row.excludedClaimIds || []));
      setLocalVariableTransactions(row.variableTransactions || []);
    }
  }, [breakdownEmployee, rows]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const [employeesRes, configRes, claimsRes, settingsRes, payrollsRes, transactionsRes, compTypesRes] = await Promise.all([
          api.get(`/employees/active?month=${month}&year=${year}`, { signal: controller.signal }),
          api.get('/payroll/config', { signal: controller.signal }),
          api.get(`/reimbursements?status=approved&month=${month}&year=${year}`, { signal: controller.signal }),
          api.get('/settings', { signal: controller.signal }),
          api.get(`/payroll?month=${month}&year=${year}&limit=1000`, { signal: controller.signal }),
          api.get(`/payroll-variable-transactions?month=${month}&year=${year}&status=approved`, { signal: controller.signal }),
          api.get('/payroll/compensation-types', { signal: controller.signal }).catch(() => ({ data: [] })),
        ]);

        if (compTypesRes.data && Array.isArray(compTypesRes.data)) {
          const map = {};
          compTypesRes.data.forEach(ct => { map[ct.key] = ct; });
          setCompensationTypesMap(map);
        }

        const nextConfig = { ...DEFAULT_PAYROLL_CONFIG, ...(configRes.data || {}) };
        const activeEmployees = employeesRes.data || [];
        
        // Map existing payrolls by employee ID
        const payrollMap = new Map();
        const existingList = payrollsRes?.data?.data || [];
        existingList.forEach(p => {
          const empId = p.employee?._id || p.employee;
          if (empId) {
            payrollMap.set(String(empId), p);
          }
        });
        setExistingPayrollsMap(payrollMap);

        const calendarDaysInMonth = new Date(year, month, 0).getDate();
        setConfig(nextConfig);
        setMonthWorkingDays(calendarDaysInMonth);
        setEmployees(activeEmployees);
        setSelected(Object.fromEntries(activeEmployees.map((emp) => {
          const payroll = payrollMap.get(String(emp._id));
          const shouldSelect = !payroll || payroll.status === 'draft';
          return [emp._id, shouldSelect];
        })));
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

        const transactionsByEmp = new Map();
        (transactionsRes.data || []).forEach(tx => {
          const empId = tx.employee?._id || tx.employee;
          if (empId) {
            if (!transactionsByEmp.has(empId)) transactionsByEmp.set(empId, []);
            transactionsByEmp.get(empId).push(tx);
          }
        });

        setRows(Object.fromEntries(activeEmployees.map((emp) => {
          const existingP = payrollMap.get(String(emp._id));
          if (existingP) {
            return [emp._id, {
              workingDays: existingP.workingDays,
              paidDays: existingP.paidDays,
              paidLeaves: existingP.paidLeaves || 0,
              unpaidLeaves: existingP.unpaidLeaves || 0,
              hoursWorked: existingP.hoursWorked || 0,
              overtime: existingP.variablePay?.overtime || 0,
              joiningBonus: existingP.variablePay?.joiningBonus || 0,
              loyaltyBonus: existingP.variablePay?.loyaltyBonus || 0,
              incentive: existingP.variablePay?.incentive || 0,
              specialBonus: existingP.variablePay?.specialBonus || 0,
              otherAllowanceArrear: existingP.variablePay?.otherAllowanceArrear || 0,
              loanDeduction: existingP.deductions?.loanDeduction || 0,
              advanceDeduction: existingP.deductions?.advanceDeduction || 0,
              tds: existingP.deductions?.tds,
              otherEarnings: existingP.earnings?.otherEarnings,
              otherDeductions: existingP.deductions?.otherDeductions,
               pfEnabled: existingP.overrides?.pfEnabled !== undefined ? existingP.overrides.pfEnabled : undefined,
              tdsEnabled: existingP.overrides?.tdsEnabled !== undefined ? existingP.overrides.tdsEnabled : undefined,
              esiEnabled: existingP.overrides?.esiEnabled !== undefined ? existingP.overrides.esiEnabled : undefined,
              ptEnabled: existingP.overrides?.ptEnabled !== undefined ? existingP.overrides.ptEnabled : undefined,
              lwfEnabled: existingP.overrides?.lwfEnabled !== undefined ? existingP.overrides.lwfEnabled : undefined,
              gratuityEnabled: existingP.overrides?.gratuityEnabled !== undefined ? existingP.overrides.gratuityEnabled : undefined,
              includePfInCTC: existingP.overrides?.includePfInCTC !== undefined ? existingP.overrides.includePfInCTC : undefined,
              includeGratuityInCTC: existingP.overrides?.includeGratuityInCTC !== undefined ? existingP.overrides.includeGratuityInCTC : undefined,
              basicPercent: existingP.overrides?.basicPercent !== undefined ? existingP.overrides.basicPercent : undefined,
              hraPercent: existingP.overrides?.hraPercent !== undefined ? existingP.overrides.hraPercent : undefined,
              ...(() => {
                const ovr = {};
                if (existingP.overrides) {
                  Object.keys(existingP.overrides).forEach(key => {
                    if (key.endsWith('Percent')) {
                      ovr[key] = existingP.overrides[key];
                    }
                  });
                }
                return ovr;
              })(),
              lopStrategy: existingP.lopStrategy || 'proportional',
              segmentLops: existingP.segmentLops || [],
              excludedClaimIds: (() => {
                const allClaims = claimsByEmp.get(emp._id) || [];
                const includedIds = new Set(existingP.reimbursements?.map(r => String(r._id)) || []);
                return allClaims.filter(c => !includedIds.has(String(c._id))).map(c => c._id);
              })(),
              attendanceSource: existingP.attendanceSource || 'default',
              variableTransactions: existingP.earnings?.variableCompensation || [],
            }];
          }

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

          const defaultDays = calendarDays;
          let proratedPaidDays = (activeDays > 0 && activeDays < calendarDays)
            ? Math.min(calendarDays, Math.max(0, activeDays))
            : calendarDays;

          const initialRow = {
            compensationType: resolveCompensationTypeClient(emp),
            workingDays: defaultDays,
            paidDays: proratedPaidDays,
            paidLeaves: 0,
            unpaidLeaves: 0,
            hoursWorked: (resolveCompensationTypeClient(emp) === 'hourly' || emp.payType === 'hourly') ? 160 : 0,
            overtime: 0,
            joiningBonus: autoJoiningBonus,
            loyaltyBonus: 0,
            incentive: 0,
            specialBonus: 0,
            otherAllowanceArrear: 0,
            loanDeduction: 0,
            advanceDeduction: 0,
            tds: Number(emp.deductions?.tds) > 0 ? Number(emp.deductions.tds) : undefined,
            otherEarnings: undefined,
            otherDeductions: undefined,
            pfEnabled: emp.pfEnabled !== undefined ? emp.pfEnabled : undefined,
            tdsEnabled: emp.tdsEnabled !== undefined ? emp.tdsEnabled : undefined,
            esiEnabled: emp.esiEnabled !== undefined ? emp.esiEnabled : undefined,
            ptEnabled: emp.ptEnabled !== undefined ? emp.ptEnabled : undefined,
            lwfEnabled: emp.lwfEnabled !== undefined ? emp.lwfEnabled : undefined,
            gratuityEnabled: emp.gratuityEnabled !== undefined ? emp.gratuityEnabled : undefined,
            includePfInCTC: emp.includePfInCTC !== undefined ? emp.includePfInCTC : undefined,
            includeGratuityInCTC: emp.includeGratuityInCTC !== undefined ? emp.includeGratuityInCTC : undefined,
            basicPercent: emp.basicPercent !== undefined ? emp.basicPercent : undefined,
            hraPercent: emp.hraPercent !== undefined ? emp.hraPercent : undefined,
            lopStrategy: 'proportional',
            excludedClaimIds: [],
            attendanceSource: 'default',
            variableTransactions: transactionsByEmp.get(emp._id) || [],
            periodInput: {},
          };

          Object.keys(emp).forEach(key => {
            if (key.endsWith('Percent') || (nextConfig.salaryComponents && nextConfig.salaryComponents.some(c => c.id === key))) {
              if (emp[key] !== undefined && emp[key] !== null) {
                initialRow[key] = emp[key];
              }
            }
          });

          return [emp._id, initialRow];
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
  }, [month, year, refreshTrigger]);

  useEffect(() => {
    setRows((prev) => Object.fromEntries(
      Object.entries(prev).map(([employeeId, row]) => [employeeId, { ...row, workingDays: Number(monthWorkingDays) || 26 }])
    ));
  }, [monthWorkingDays]);

  const selectedEmployees = useMemo(() => employees.filter((emp) => selected[emp._id]), [employees, selected]);

  // Sum netSalary from server-resolved previews (only for selected employees)
  const totalPreview = useMemo(
    () => selectedEmployees.reduce((sum, emp) => sum + (snapshotsNetMap[emp._id] || 0), 0),
    [selectedEmployees, snapshotsNetMap]
  );

  const totalGrossPreview = useMemo(
    () => selectedEmployees.reduce((sum, emp) => sum + (snapshotGrossMap[emp._id] || 0), 0),
    [selectedEmployees, snapshotGrossMap]
  );

  const needsAttentionCount = useMemo(
    () => employees.filter(emp => {
      const f = snapshotFlagsMap[emp._id];
      return f && (f.clamped || f.belowMinWage);
    }).length,
    [employees, snapshotFlagsMap]
  );

  // Derived dept / compType chip lists
  const deptOptions = useMemo(
    () => [...new Set(employees.map(e => getDeptName(e.department)).filter(Boolean))].sort(),
    [employees]
  );
  const compTypeOptions = useMemo(
    () => [...new Set(employees.map(e => getCompTypeStr(e.compensationType)).filter(Boolean))].sort(),
    [employees]
  );

  const filteredSortedEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = employees.filter(emp => {
      if (q && !`${emp.firstName} ${emp.lastName} ${emp.employeeId} ${getDeptName(emp.department)}`.toLowerCase().includes(q)) return false;
      if (filterDept && getDeptName(emp.department) !== filterDept) return false;
      if (filterCompType && getCompTypeStr(emp.compensationType) !== filterCompType) return false;
      if (filterNeedsAttention) {
        const f = snapshotFlagsMap[emp._id];
        if (!f || (!f.clamped && !f.belowMinWage)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      let va, vb;
      if (sortKey === 'net') {
        va = snapshotsNetMap[a._id] || 0;
        vb = snapshotsNetMap[b._id] || 0;
      } else if (sortKey === 'type') {
        va = getCompTypeStr(a.compensationType).toLowerCase();
        vb = getCompTypeStr(b.compensationType).toLowerCase();
      } else {
        va = `${a.firstName} ${a.lastName}`.toLowerCase();
        vb = `${b.firstName} ${b.lastName}`.toLowerCase();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [employees, searchQuery, filterDept, filterCompType, filterNeedsAttention, sortKey, sortDir, snapshotsNetMap, snapshotFlagsMap]);

  const activeFiltersCount = [searchQuery.trim(), filterDept, filterCompType, filterNeedsAttention ? '1' : ''].filter(Boolean).length;

  const updateRow = (employeeId, field, value) => {
    setRows((prev) => {
      const isAttendanceField = ['workingDays', 'paidDays', 'unpaidLeaves', 'paidLeaves', 'hoursWorked'].includes(field);
      return {
        ...prev,
        [employeeId]: {
          ...(prev[employeeId] || {}),
          [field]: value,
          ...(isAttendanceField ? { attendanceSource: 'manual' } : {}),
        },
      };
    });
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
          let matchedKey = null;
          if (next[record.employeeId]) {
            matchedKey = record.employeeId;
          } else {
            // Find key in next where the employee's employeeId (code) matches record.employeeNumber
            const emp = employees.find(e => 
              String(e.employeeId).trim() === String(record.employeeNumber).trim() ||
              String(e._id) === String(record.employeeId)
            );
            if (emp && next[emp._id]) {
              matchedKey = emp._id;
            }
          }

          if (matchedKey) {
            next[matchedKey] = {
              ...next[matchedKey],
              workingDays: record.workingDays,
              paidDays: record.paidDays,
              unpaidLeaves: record.unpaidLeaves,
              paidLeaves: record.paidLeaves,
              hoursWorked: record.hoursWorked || 0,
              attendanceSource: 'hrms',
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

  const handleSegmentLopChange = (index, valStr) => {
    if (!breakdownEmployee) return;
    const val = Math.max(0, Number(valStr) || 0);
    const totalLop = Math.max(0, (Number(rows[breakdownEmployee._id]?.workingDays) || monthWorkingDays) - (Number(rows[breakdownEmployee._id]?.paidDays) || 0));
    const totalDays = new Date(year, month, 0).getDate();

    const currentSegmentLops = [...(rows[breakdownEmployee._id]?.segmentLops || [])];
    while (currentSegmentLops.length < localSplits.length) {
      currentSegmentLops.push(0);
    }

    currentSegmentLops[index] = val;

    if (localSplits.length === 2) {
      const otherIndex = index === 0 ? 1 : 0;
      const otherMaxDays = (localSplits[otherIndex].daysCount / totalDays) * (Number(rows[breakdownEmployee._id]?.workingDays) || monthWorkingDays);
      const otherVal = Math.max(0, Math.min(otherMaxDays, totalLop - val));
      currentSegmentLops[otherIndex] = Math.round(otherVal * 100) / 100;

      const currentMaxDays = (localSplits[index].daysCount / totalDays) * (Number(rows[breakdownEmployee._id]?.workingDays) || monthWorkingDays);
      currentSegmentLops[index] = Math.round(Math.min(currentMaxDays, val) * 100) / 100;
    } else {
      const currentMaxDays = (localSplits[index].daysCount / totalDays) * (Number(rows[breakdownEmployee._id]?.workingDays) || monthWorkingDays);
      currentSegmentLops[index] = Math.round(Math.min(currentMaxDays, val) * 100) / 100;
    }

    updateRow(breakdownEmployee._id, 'segmentLops', currentSegmentLops);
  };

  const handleSaveAdjustments = () => {
    if (!breakdownEmployee) return;
    const row = rows[breakdownEmployee._id] || {};
    if (row.lopStrategy === 'custom') {
      const totalLop = Math.max(0, (Number(row.workingDays) || monthWorkingDays) - (Number(row.paidDays) || 0));
      const currentSegmentLops = row.segmentLops || [];
      const sum = currentSegmentLops.reduce((s, val) => s + (Number(val) || 0), 0);
      if (Math.abs(sum - totalLop) > 0.01) {
        toast.error(`The sum of segment LOP days (${Math.round(sum * 100)/100}) must equal the total LOP days (${totalLop})`);
        return;
      }
    }
    updateRow(breakdownEmployee._id, 'otherEarnings', localEarnings.filter(e => e.name.trim() !== ''));
    updateRow(breakdownEmployee._id, 'otherDeductions', localDeductions.filter(d => d.name.trim() !== ''));
    updateRow(breakdownEmployee._id, 'excludedClaimIds', Array.from(localExcludedClaimIds));
    updateRow(breakdownEmployee._id, 'variableTransactions', localVariableTransactions);
    toast.success(`Run adjustments saved for ${breakdownEmployee.firstName}`);
    setBreakdownEmployee(null);
  };

  const localSnapshotFilteredRow = useMemo(() => {
    if (!breakdownEmployee) return null;
    const row = rows[breakdownEmployee._id] || {};
    return {
      ...row,
      reimbursements: (claimsMap.get(breakdownEmployee._id) || []).filter(c => !localExcludedClaimIds.has(c._id)),
      variableTransactions: localVariableTransactions,
    };
  }, [breakdownEmployee, rows, claimsMap, localExcludedClaimIds, localVariableTransactions]);

  const localSnapshotComputed = usePayrollSnapshot(
    breakdownEmployee,
    config,
    { ...localSnapshotFilteredRow, month, year },
    monthWorkingDays,
    localEarnings,
    localDeductions
  );

  // For processed payrolls (read-only), show the saved backend data, not a re-computation
  const localSnapshot = useMemo(() => {
    if (!breakdownEmployee) return localSnapshotComputed;
    const existingP = existingPayrollsMap.get(String(breakdownEmployee._id));
    if (existingP && existingP.status !== 'draft') {
      // Build a snapshot-shaped object from the saved payroll record
      return {
        ...localSnapshotComputed,
        earnings: existingP.earnings || localSnapshotComputed?.earnings || {},
        deductions: existingP.deductions || localSnapshotComputed?.deductions || {},
        employerContributions: existingP.employerContributions || localSnapshotComputed?.employerContributions || {},
        netSalary: existingP.netSalary ?? localSnapshotComputed?.netSalary ?? 0,
        paidDays: existingP.paidDays ?? localSnapshotComputed?.paidDays ?? 0,
        workingDays: existingP.workingDays ?? localSnapshotComputed?.workingDays ?? 1,
        lop: existingP.lop ?? Math.max(0, (existingP.workingDays || 1) - (existingP.paidDays || 0)),
        master: localSnapshotComputed?.master || {},
      };
    }
    return localSnapshotComputed;
  }, [breakdownEmployee, existingPayrollsMap, localSnapshotComputed]);

  const localSplits = useMemo(() => {
    if (!breakdownEmployee) return [];
    const row = rows[breakdownEmployee._id] || {};
    const adjustments = {
      pfEnabled: row.pfEnabled,
      tdsEnabled: row.tdsEnabled,
      esiEnabled: row.esiEnabled,
      ptEnabled: row.ptEnabled,
      lwfEnabled: row.lwfEnabled,
      gratuityEnabled: row.gratuityEnabled,
      includePfInCTC: row.includePfInCTC,
      includeGratuityInCTC: row.includeGratuityInCTC,
      basicPercent: row.basicPercent,
      hraPercent: row.hraPercent,
      lopStrategy: row.lopStrategy,
      segmentLops: row.segmentLops,
    };
    return getSalarySplits(
      breakdownEmployee,
      config,
      month,
      year,
      row.paidDays,
      row.workingDays,
      adjustments
    );
  }, [breakdownEmployee, rows, config, month, year]);

  const handleProcessFnf = async (e) => {
    e.preventDefault();
    if (!fnfEmployee) return;
    try {
      setProcessingFnf(true);
      const exitDateVal = fnfEmployee.dateOfLeaving 
        ? new Date(fnfEmployee.dateOfLeaving) 
        : new Date(year, month - 1, new Date(year, month, 0).getDate());
      
      const payload = {
        employeeId: fnfEmployee._id,
        lastWorkingDay: exitDateVal.toISOString(),
        noticePeriodServedDays: Number(fnfForm.noticePeriodServedDays) || 0,
        noticePeriodRequiredDays: Number(fnfForm.noticePeriodRequiredDays) || 0,
        leaveEncashmentDays: Number(fnfForm.leaveEncashmentDays) || 0,
        comments: fnfForm.comments || '',
        // Period-specific inputs — only sent when the user has entered them.
        // Omitting (undefined) lets the backend strategy use its own default.
        ...(fnfForm.hoursWorked !== '' ? { hoursWorked: Number(fnfForm.hoursWorked) } : {}),
        ...(fnfForm.unitsProduced !== '' ? { unitsProduced: Number(fnfForm.unitsProduced) } : {}),
        ...(fnfForm.ratePerUnit !== '' ? { ratePerUnit: Number(fnfForm.ratePerUnit) } : {}),
      };
      const res = await api.post('/payroll/full-and-final', payload);
      toast.success(res.data?.message || 'Full & Final Settlement processed successfully!');
      setFnfEmployee(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to process Full & Final Settlement');
    } finally {
      setProcessingFnf(false);
    }
  };

  const submit = async (saveAsDraft) => {
    const invalid = selectedEmployees.find((employee) => {
      const row = rows[employee._id] || {};
      return (employee.payType !== 'hourly' && employee.compensationType !== 'hourly') && Number(row.paidDays) > Number(row.workingDays || monthWorkingDays);
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
          const row = rows[employee._id] || {};
          const isSkip = Boolean(row._skipPeriod);
          const rowData = serializeRow(row, monthWorkingDays);
          rowData.skip = isSkip;
          rowData.skipPeriod = isSkip;
          rowData._skipPeriod = isSkip;
          rowData.adjustments.skip = isSkip;
          rowData.adjustments.skipPeriod = isSkip;
          rowData.adjustments._skipPeriod = isSkip;
          rowData.adjustments.reimbursements = (claimsMap.get(employee._id) || [])
            .filter((r) => !(row.excludedClaimIds || []).includes(r._id))
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

      let jobData = res.data;

      // Only enter asynchronous polling loop if the job was queued in background
      if (res.data?.jobId && (res.data?.status === 'queued' || res.status === 202)) {
        const jobId = res.data.jobId;
        setActiveJobId(jobId);
        
        let completed = false;
        while (!completed) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const statusRes = await api.get(`/payroll/process/${jobId}/status`);
          jobData = statusRes.data;
          setJobProgress(jobData);
          if (jobData.status === 'completed' || jobData.status === 'failed') {
            completed = true;
          }
        }
        
        setActiveJobId(null);
        setJobProgress(null);
      }

      if (jobData?.status === 'failed') {
        toast.error(jobData.errorMessage || 'Background payroll processing failed');
        return;
      }

      const successCount = jobData?.success?.length || 0;
      const errorCount = jobData?.errors?.length || 0;
      const skippedList = jobData?.skippedNoActivity || [];
      const skippedCount = skippedList.length;

      let msgParts = [];
      if (successCount > 0) msgParts.push(`${successCount} processed`);
      if (skippedCount > 0) msgParts.push(`${skippedCount} skipped (no activity / marked skip)`);
      if (errorCount > 0) msgParts.push(`${errorCount} failed`);

      if (errorCount > 0) {
        toast.error(msgParts.join(', '));
      } else if (skippedCount > 0) {
        toast(msgParts.join(', '), { icon: 'ℹ️' });
      } else {
        toast.success(saveAsDraft ? 'Payroll saved as draft' : 'Payroll processed successfully');
      }

      setSkippedSummaryList(skippedList);

      if (!saveAsDraft && errorCount === 0) {
        navigate('/payroll');
      } else {
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to process payroll');
    } finally {
      setSaving(false);
    }
  };

  const hasProcessedPayrolls = Array.from(existingPayrollsMap.values()).some(p => p.status !== 'paid');

  const handleResetMonthPayroll = async () => {
    if (!window.confirm(`Are you sure you want to delete all draft, processed, and approved payrolls for ${monthName(month)} ${year}? This will allow you to process payroll again.`)) return;
    try {
      setSaving(true);
      await api.post('/payroll/bulk-delete', { month, year });
      toast.success(`All payrolls for ${monthName(month)} ${year} have been deleted.`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to delete payrolls');
    } finally {
      setSaving(false);
    }
  };

  const onDeletePayroll = async (payrollId, employeeName) => {
    if (!window.confirm(`Are you sure you want to delete the payroll for ${employeeName}?`)) return;
    try {
      await api.delete(`/payroll/${payrollId}`);
      toast.success(`Payroll for ${employeeName} deleted successfully`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to delete payroll');
    }
  };

  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadBulkZip = async () => {
    try {
      setDownloadingZip(true);
      toast.loading(`Generating ZIP archive for ${monthName(month)} ${year}...`, { id: 'zip-bulk' });
      const response = await api.post('/payroll/bulk-payslip-pdf', { month, year }, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslips_${monthName(month)}_${year}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Bulk payslips ZIP downloaded successfully!', { id: 'zip-bulk' });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to download bulk payslips ZIP', { id: 'zip-bulk' });
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleDownloadInputsOnly = async () => {
    try {
      toast.loading(`Downloading payroll inputs sheet for ${monthName(month)} ${year}...`, { id: 'inputs-sheet' });
      const response = await api.get(`/payroll/export-inputs?month=${month}&year=${year}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll-inputs-${year}-${String(month).padStart(2, '0')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Payroll inputs sheet downloaded successfully!', { id: 'inputs-sheet' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to download payroll inputs sheet', { id: 'inputs-sheet' });
    }
  };

  return (
    <div className="max-w-[98%] mx-auto p-6 font-sans text-gray-900 dark:text-slate-100 transition-colors">
      {activeJobId && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <span className="animate-spin text-blue-600 dark:text-blue-400">⏳</span> Processing Payroll Batch Asynchronously...
            </span>
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{jobProgress?.progressPercent || 0}%</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900/60 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${jobProgress?.progressPercent || 0}%` }}
            ></div>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
            Processed {jobProgress?.processed || 0} of {jobProgress?.total || 0} employees...
          </p>
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">Process Payroll</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Review proration, variable pay, and deduction inputs before generating payroll.</p>
        </div>
        <div className="flex items-center gap-2 flex-nowrap shrink-0 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={handleDownloadInputsOnly}
            className="bg-slate-700 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap border border-slate-600 dark:border-slate-700"
            title="Download working days, LOP, overtime, and variable inputs as Excel"
          >
            <FaDownload className="w-3 h-3" /> Download Inputs Only
          </button>
          {isHrmsEnabled && (
            <button
              type="button"
              onClick={handleSyncAttendance}
              disabled={syncingAttendance}
              className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 transition-colors shrink-0 whitespace-nowrap"
            >
              {syncingAttendance ? 'Syncing...' : 'Re-sync attendance from HRMS'}
            </button>
          )}
          {hasProcessedPayrolls && (
            <button
              type="button"
              onClick={handleResetMonthPayroll}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 transition-colors shrink-0 whitespace-nowrap"
            >
              Reset Month's Payroll
            </button>
          )}
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-medium shrink-0 whitespace-nowrap focus:outline-none focus:border-blue-500">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => <option key={value} value={value}>{monthName(value)}</option>)}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-18 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-medium shrink-0 focus:outline-none focus:border-blue-500" />
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 shrink-0 whitespace-nowrap">
            <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Days:</span>
            <input type="number" value={monthWorkingDays} min="1" onChange={(e) => setMonthWorkingDays(Number(e.target.value) || 1)} className="w-10 border-0 bg-transparent p-0 text-xs font-semibold text-gray-800 dark:text-slate-100 focus:ring-0 text-center" title="Working Days in Month" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <SummaryCard
          label="Total / Selected"
          value={`${employees.length} / ${selectedEmployees.length}`}
        />
        <SummaryCard label="Gross Payroll" value={fmtMoney(totalGrossPreview)} />
        <SummaryCard label="Net Payroll" value={fmtMoney(totalPreview)} />
        <div
          className={`rounded-xl p-4 border shadow-xs cursor-pointer transition-colors select-none ${
            filterNeedsAttention
              ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800'
              : needsAttentionCount > 0
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800'
          }`}
          onClick={() => needsAttentionCount > 0 && setFilterNeedsAttention(v => !v)}
          title={needsAttentionCount > 0 ? 'Click to filter to employees needing attention' : ''}
          role={needsAttentionCount > 0 ? 'button' : undefined}
          tabIndex={needsAttentionCount > 0 ? 0 : undefined}
          onKeyDown={e => e.key === 'Enter' && needsAttentionCount > 0 && setFilterNeedsAttention(v => !v)}
        >
          <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Needs Attention</div>
          <div className={`text-2xl font-bold ${
            needsAttentionCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-slate-600'
          }`}>
            {needsAttentionCount}
          </div>
        </div>
        <SummaryCard label="Working Days" value={monthWorkingDays} />
      </div>

      {skippedSummaryList.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-5 flex flex-col gap-2 text-xs text-amber-900 dark:text-amber-200 shadow-sm transition-colors">
          <div className="flex justify-between items-center border-b border-amber-200/60 dark:border-amber-800 pb-2">
            <span className="font-bold text-amber-900 dark:text-amber-100 text-sm flex items-center gap-1.5">
              ℹ️ {skippedSummaryList.length} Employee(s) Skipped (No Activity / Marked Skip)
            </span>
            <button
              type="button"
              onClick={() => setSkippedSummaryList([])}
              className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 font-bold underline"
            >
              Dismiss
            </button>
          </div>
          <p className="text-amber-800 dark:text-amber-300">
            The following employees were excluded from payslip creation for this cycle:
          </p>
          <div className="space-y-1 mt-1 bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-amber-200 dark:border-amber-800/80 max-h-40 overflow-y-auto">
            {skippedSummaryList.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs py-0.5 border-b border-amber-100 dark:border-amber-900/40 last:border-0">
                <span className="font-semibold text-amber-950 dark:text-amber-100">{item.employeeName || item.employeeId}</span>
                <span className="text-amber-700 dark:text-amber-400 font-medium">[{item.compensationType || 'strategy'}]: {item.message || 'No activity'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter / Sort bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="search"
          aria-label="Search employees by name or code"
          placeholder="Search name or code…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
        />
        {deptOptions.length > 0 && (
          <select
            aria-label="Filter by department"
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {compTypeOptions.length > 1 && (
          <select
            aria-label="Filter by compensation type"
            value={filterCompType}
            onChange={e => setFilterCompType(e.target.value)}
            className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {compTypeOptions.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        )}
        <button
          type="button"
          aria-pressed={filterNeedsAttention}
          onClick={() => setFilterNeedsAttention(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            filterNeedsAttention
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-700 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400'
          }`}
        >
          {filterNeedsAttention ? '🔴 Attention (active)' : '🔴 Needs Attention'}
          {needsAttentionCount > 0 && !filterNeedsAttention && (
            <span className="ml-1 bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 rounded-full px-1.5 text-[10px] font-bold">{needsAttentionCount}</span>
          )}
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <select
            aria-label="Sort employees by"
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
            className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="name">Sort: Name</option>
            <option value="type">Sort: Type</option>
            <option value="net">Sort: Net Pay</option>
          </select>
          <button
            type="button"
            aria-label={`Sort direction: ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
            onClick={() => setSortDir(v => v === 'asc' ? 'desc' : 'asc')}
            className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-lg px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setFilterDept(''); setFilterCompType(''); setFilterNeedsAttention(false); }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
          >
            Clear {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-gray-200 dark:border-slate-800">
              <tr>
                {headers.map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase whitespace-nowrap">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`payroll-process-skeleton-${index}`}>
                    <td colSpan={headers.length} className="px-4 py-4"><Skeleton className="h-10 w-full" /></td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr><td colSpan={headers.length} className="px-6 py-10 text-center text-gray-500 dark:text-slate-400">No active employees found.</td></tr>
              ) : filteredSortedEmployees.length === 0 ? (
                <tr><td colSpan={headers.length} className="px-6 py-10 text-center text-gray-400 dark:text-slate-500">
                  <div className="text-2xl mb-2">🔍</div>
                  <div className="font-semibold">No employees match your filters.</div>
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setFilterDept(''); setFilterCompType(''); setFilterNeedsAttention(false); }}
                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-800"
                  >
                    Clear all filters
                  </button>
                </td></tr>
              ) : filteredSortedEmployees.map((employee) => (
                <EmployeeRow
                  key={employee._id}
                  employee={employee}
                  config={config}
                  row={rows[employee._id]}
                  selected={selected[employee._id]}
                  onToggleSelected={(empId, val) => setSelected((prev) => ({ ...prev, [empId]: val }))}
                  setBreakdownEmployee={setBreakdownEmployee}
                  setFnfEmployee={setFnfEmployee}
                  monthWorkingDays={monthWorkingDays}
                  updateRow={updateRow}
                  claimsMap={claimsMap}
                  month={month}
                  year={year}
                  earningComponents={earningComponents}
                  existingPayroll={existingPayrollsMap.get(String(employee._id))}
                  onDeletePayroll={onDeletePayroll}
                  onSnapshotReady={(empId, data) => {
                    const net = data?.net ?? data ?? 0;
                    const gross = data?.gross ?? 0;
                    const flags = data?.flags ?? {};
                    setSnapshotsNetMap(prev => prev[empId] === net ? prev : { ...prev, [empId]: net });
                    setSnapshotGrossMap(prev => prev[empId] === gross ? prev : { ...prev, [empId]: gross });
                    setSnapshotFlagsMap(prev => {
                      const existing = prev[empId];
                      if (existing?.clamped === flags.clamped && existing?.belowMinWage === flags.belowMinWage) return prev;
                      return { ...prev, [empId]: flags };
                    });
                  }}
                  compensationTypesMap={compensationTypesMap}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-20 mt-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-xl shadow-lg px-4 py-3 flex items-center justify-between gap-2.5 transition-colors">
        <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">
          {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
          {selectedEmployees.length > 0 && (
            <span className="ml-2 text-gray-400 dark:text-slate-500">· Net: <span className="font-semibold text-gray-700 dark:text-slate-200">{fmtMoney(totalPreview)}</span></span>
          )}
          {needsAttentionCount > 0 && (
            <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">· ⚠️ {needsAttentionCount} need attention</span>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate('/payroll')} className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
          <button type="button" onClick={() => submit(true)} disabled={saving || selectedEmployees.length === 0} className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60 transition-colors">
            <FaSave aria-hidden="true" /> Save as Draft
          </button>
          <button type="button" onClick={() => setShowConfirmModal(true)} disabled={saving || selectedEmployees.length === 0} className="px-3.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60 transition-colors">
            <FaCheck aria-hidden="true" /> Process Payroll
          </button>
        </div>
      </div>

      {/* Process Payroll Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Confirm payroll processing">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <h2 className="font-bold text-base flex items-center gap-2">
                <FaCheck className="text-green-400" aria-hidden="true" /> Confirm Payroll Processing
              </h2>
              <button type="button" aria-label="Close confirmation dialog" onClick={() => setShowConfirmModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <FaTimes className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Employees</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedEmployees.length}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Total Net Payout</div>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{fmtMoney(totalPreview)}</div>
                </div>
              </div>
              {needsAttentionCount > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-start gap-2">
                  <span className="text-base">⚠️</span>
                  <span><strong>{needsAttentionCount}</strong> employee{needsAttentionCount !== 1 ? 's have' : ' has'} pay-clamping or minimum-wage flags. Review before processing.</span>
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This will process payroll for <strong>{monthName(month)} {year}</strong> for all {selectedEmployees.length} selected employees. Processed payrolls cannot be undone without a full month reset.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/80 px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex justify-end gap-3 transition-colors">
              <button type="button" onClick={() => setShowConfirmModal(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => { setShowConfirmModal(false); submit(false); }}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-60"
              >
                <FaCheck aria-hidden="true" /> {saving ? 'Processing…' : 'Confirm & Process'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over / Modal for Detailed Salary Breakdown & Adjustments */}
      {breakdownEmployee && (() => {
        const empId = breakdownEmployee._id;
        const isHourly = breakdownEmployee.payType === 'hourly' || breakdownEmployee.compensationType === 'hourly';
        const hasSalaryBreakup = breakdownEmployee.useSalaryComponents !== false && breakdownEmployee.employmentType !== 'intern' && !isHourly;
        const showStatutoryOverrides = hasSalaryBreakup;
        const showLopStrategy = localSplits && localSplits.length > 1 && !isHourly;
        const isFlatSalary = !hasSalaryBreakup;
        const isConsultantModel = ['commission_only', 'salary_plus_commission', 'project_based', 'milestone_based'].includes(breakdownEmployee.compensationType)
          || (breakdownEmployee.compensationModel && breakdownEmployee.compensationModel !== 'SALARIED' && !breakdownEmployee.compensationType);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-6xl w-full border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col my-8 animate-in fade-in duration-200 transition-colors">
              {/* Modal Header */}
              <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg">
                    {breakdownEmployee.firstName[0]}{breakdownEmployee.lastName?.[0] || ''}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{breakdownEmployee.firstName} {breakdownEmployee.lastName}</h2>
                    <p className="text-xs text-gray-400">
                      {breakdownEmployee.employeeId || 'EMP-001'} · {breakdownEmployee.designation || 'SDE'} · {
                        isHourly
                          ? `Hourly Rate: ${fmtMoney(breakdownEmployee.hourlyRate)}/hr`
                          : (breakdownEmployee.compensationType === 'piece_rate'
                              ? `Piece Rate: ${fmtMoney((breakdownEmployee.rateCard || []).find(r => r.paymentType === 'UNIT')?.rate ?? breakdownEmployee.rateCard?.[0]?.rate ?? 0)}/unit`
                              : `CTC ${fmtMoney(localSnapshot?.masterCTC || breakdownEmployee.monthlyCTC)}`)
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Close breakdown for ${breakdownEmployee.firstName} ${breakdownEmployee.lastName}`}
                  onClick={() => setBreakdownEmployee(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                {/* Edge Case Warning Banners: Net Pay Clamped & Below Minimum Wage */}
                {localSnapshot?.netPayClamped && (
                  <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl p-3 text-amber-900 dark:text-amber-200 text-xs font-medium space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-950 dark:text-amber-100">
                      ⚠️ Net Pay Clamped to ₹0 (Deductions Exceeded Gross Earnings)
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      Total deductions ({fmtMoney(localSnapshot.deductions?.totalDeductions)}) exceeded total earnings ({fmtMoney(localSnapshot.earnings?.totalEarnings)}).
                      Non-statutory deductions (loans/advances) were clamped by {fmtMoney(localSnapshot.payrollShortfall?.shortfallAmount || 0)} to prevent negative net salary.
                    </p>
                  </div>
                )}

                {localSnapshot?.belowMinimumWage && (
                  <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl p-3 text-rose-900 dark:text-rose-200 text-xs font-medium space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-950 dark:text-rose-100">
                      ⚠️ Statutory Minimum Wage Violation Flag
                    </div>
                    <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                      {localSnapshot.minimumWageCompliance?.warningMessage || 'Computed gross earnings are below the statutory minimum wage floor for this state.'}
                    </p>
                  </div>
                )}

                {/* Proration Summary Banner */}
                {localSnapshot && (
                  <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-blue-900 dark:text-blue-200 text-sm">
                    {isHourly ? (
                      <div>
                        <span className="font-semibold text-blue-900 dark:text-blue-100">Hours Worked:</span> {rows[empId]?.hoursWorked ?? 160} hrs
                        <span className="mx-2 text-blue-300 dark:text-blue-600">|</span>
                        <span className="font-semibold text-blue-900 dark:text-blue-100">Hourly Rate:</span> {fmtMoney(breakdownEmployee.hourlyRate)}/hr
                      </div>
                    ) : (
                      <div>
                        <span className="font-semibold text-blue-900 dark:text-blue-100">Paid / Working Days:</span> {localSnapshot.paidDays} / {localSnapshot.workingDays} days
                        <span className="mx-2 text-blue-300 dark:text-blue-600">|</span>
                        <span className="font-semibold text-blue-900 dark:text-blue-100">Proration Ratio:</span> {Math.round((localSnapshot.paidDays / localSnapshot.workingDays) * 100)}%
                      </div>
                    )}
                    <div className="bg-blue-600 dark:bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto">
                      {isHourly 
                        ? `${rows[empId]?.hoursWorked ?? 160} hrs logged` 
                        : (localSnapshot.lop > 0 ? `${localSnapshot.lop} LOP Days` : 'Full Attendance')
                      }
                    </div>
                  </div>
                )}

                {localSplits && localSplits.length > 1 && isAttendanceLinked(breakdownEmployee.compensationType, isHourly) && (
                  <div className="border border-blue-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    <div className="bg-blue-50 dark:bg-slate-800 px-4 py-3 border-b border-blue-100 dark:border-slate-700 font-bold text-blue-900 dark:text-blue-300 text-sm">
                      Mid-Month Revision Calculation Split
                    </div>
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <th className="p-2.5">Period</th>
                            {rows[empId]?.lopStrategy === 'custom' && (
                              <th className="p-2.5 text-right w-20">LOP Days</th>
                            )}
                            <th className="p-2.5 text-right">Monthly CTC</th>
                            {hasSalaryBreakup && (
                              <>
                                <th className="p-2.5 text-right">Basic</th>
                                <th className="p-2.5 text-right">HRA</th>
                                <th className="p-2.5 text-right">PF (EE / ER)</th>
                                <th className="p-2.5 text-right">ESI (EE / ER)</th>
                                <th className="p-2.5 text-right">Gratuity</th>
                              </>
                            )}
                            <th className="p-2.5 text-right">Period Earnings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {localSplits.map((split, index) => (
                            <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                              <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                                <div>{new Date(split.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(split.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">{split.daysCount} days in period</div>
                              </td>
                              {rows[empId]?.lopStrategy === 'custom' && (
                                <td className="p-2.5 text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={split.daysCount}
                                    disabled={isReadOnly}
                                    value={(rows[empId]?.segmentLops || [])[index] ?? 0}
                                    onChange={(e) => handleSegmentLopChange(index, e.target.value)}
                                    className="w-16 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-xs text-right font-semibold"
                                  />
                                </td>
                              )}
                              <td className="p-2.5 text-right font-medium text-slate-700 dark:text-slate-300">{fmtMoney(split.monthlyCTC)}</td>
                              {hasSalaryBreakup && (
                                <>
                                  <td className="p-2.5 text-right text-slate-700 dark:text-slate-300">{fmtMoney(split.basic)}</td>
                                  <td className="p-2.5 text-right text-slate-700 dark:text-slate-300">{fmtMoney(split.hra)}</td>
                                  <td className="p-2.5 text-right text-slate-700 dark:text-slate-300">
                                    <div>{fmtMoney(split.pfEmployee)} <span className="text-[9px] text-slate-400">EE</span></div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{fmtMoney(split.pfEmployer)} <span className="text-[9px] text-slate-400">ER</span></div>
                                  </td>
                                  <td className="p-2.5 text-right text-slate-700 dark:text-slate-300">
                                    <div>{fmtMoney(split.esiEmployee)} <span className="text-[9px] text-slate-400">EE</span></div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{fmtMoney(split.esiEmployer)} <span className="text-[9px] text-slate-400">ER</span></div>
                                  </td>
                                  <td className="p-2.5 text-right text-slate-700 dark:text-slate-300">{fmtMoney(split.gratuity)}</td>
                                </>
                              )}
                              <td className="p-2.5 text-right font-semibold text-slate-900 dark:text-slate-100">{fmtMoney(split.totalEarnings)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {rows[empId]?.lopStrategy === 'custom' && (() => {
                        const totalLop = Math.max(0, (Number(rows[empId]?.workingDays) || monthWorkingDays) - (Number(rows[empId]?.paidDays) || 0));
                        const currentSegmentLops = rows[empId]?.segmentLops || [];
                        const sum = currentSegmentLops.reduce((s, val) => s + (Number(val) || 0), 0);
                        const isMatching = Math.abs(sum - totalLop) < 0.01;
                        return (
                          <div className={`mt-3 text-[11px] font-semibold px-3 py-2 rounded-lg ${isMatching ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}`}>
                            {isMatching ? (
                              <span>✓ Total LOP Days allocated: {totalLop} days (matches overall LOP).</span>
                            ) : (
                              <span>⚠️ Allocated LOP Days sum ({Math.round(sum*100)/100}) must match the employee's total LOP days ({totalLop}).</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {localSnapshot && (() => {
                  
                  return (
                    <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-colors">
                      <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-gray-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center justify-between">
                        <span>Statutory Components & Ratio Overrides</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">Apply dynamically to this payroll run only</span>
                      </div>
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                        {showStatutoryOverrides && (
                          <>
                            {/* PF Toggle */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                              <div className="flex flex-col pr-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Provident Fund (PF)</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Matching contributions</span>
                              </div>
                              <input
                                type="checkbox"
                                disabled={isReadOnly}
                                checked={
                                  rows[empId]?.pfEnabled !== undefined
                                    ? rows[empId].pfEnabled
                                    : localSnapshot?.master?.pfEnabled !== false
                                }
                                onChange={(e) => updateRow(empId, 'pfEnabled', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>
                          </>
                        )}

                        {/* TDS Toggle */}
                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                          <div className="flex flex-col pr-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Income Tax (TDS)</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Monthly TDS withholding</span>
                          </div>
                          <input
                            type="checkbox"
                            disabled={isReadOnly}
                            checked={
                              rows[empId]?.tdsEnabled !== undefined
                                ? rows[empId].tdsEnabled
                                : localSnapshot?.master?.tdsEnabled !== false
                            }
                            onChange={(e) => updateRow(empId, 'tdsEnabled', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>

                        {showStatutoryOverrides && (
                          <>

                            {/* ESI Toggle */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                              <div className="flex flex-col pr-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">ESI Scheme</span>
                                {(() => {
                                  const isEsiOn = rows[empId]?.esiEnabled !== undefined ? rows[empId].esiEnabled : localSnapshot?.master?.esiEnabled !== false;
                                  const gross = localSnapshot?.master?.totalEarnings || 0;
                                  const threshold = config?.esiBasicThreshold ?? 21000;
                                  if (isEsiOn && gross > threshold) {
                                    return <span className="text-[10px] text-amber-500 font-semibold mt-0.5">Not applicable — gross &gt; ₹{threshold.toLocaleString('en-IN')}</span>;
                                  }
                                  return <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">State insurance contributions</span>;
                                })()}
                              </div>
                              <input
                                type="checkbox"
                                disabled={isReadOnly}
                                checked={
                                  rows[empId]?.esiEnabled !== undefined
                                    ? rows[empId].esiEnabled
                                    : localSnapshot?.master?.esiEnabled !== false
                                }
                                onChange={(e) => updateRow(empId, 'esiEnabled', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>

                            {/* PT Toggle */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                              <div className="flex flex-col pr-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Professional Tax (PT)</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">State professional tax</span>
                              </div>
                              <input
                                type="checkbox"
                                disabled={isReadOnly}
                                checked={
                                  rows[empId]?.ptEnabled !== undefined
                                    ? rows[empId].ptEnabled
                                    : localSnapshot?.master?.ptEnabled !== false
                                }
                                onChange={(e) => updateRow(empId, 'ptEnabled', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>

                            {/* LWF Toggle */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                              <div className="flex flex-col pr-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Labour Welfare Fund</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">State welfare fund (LWF)</span>
                              </div>
                              <input
                                type="checkbox"
                                disabled={isReadOnly}
                                checked={
                                  rows[empId]?.lwfEnabled !== undefined
                                    ? rows[empId].lwfEnabled
                                    : localSnapshot?.master?.lwfEnabled !== false
                                }
                                onChange={(e) => updateRow(empId, 'lwfEnabled', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>

                            {/* Gratuity Toggle */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                              <div className="flex flex-col pr-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Gratuity Provision</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">4.81% basic salary match</span>
                              </div>
                              <input
                                type="checkbox"
                                disabled={isReadOnly}
                                checked={
                                  rows[empId]?.gratuityEnabled !== undefined
                                    ? rows[empId].gratuityEnabled
                                    : localSnapshot?.master?.gratuityEnabled !== false
                                }
                                onChange={(e) => updateRow(empId, 'gratuityEnabled', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>

                            {/* Include PF in CTC */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                              <div className="flex flex-col pr-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Include PF in CTC</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Employer PF inside CTC limit</span>
                              </div>
                              <input
                                type="checkbox"
                                disabled={isReadOnly}
                                checked={
                                  rows[empId]?.includePfInCTC !== undefined
                                    ? rows[empId].includePfInCTC
                                    : localSnapshot?.master?.includePfInCTC === true
                                }
                                onChange={(e) => updateRow(empId, 'includePfInCTC', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>

                            {/* Include Gratuity in CTC */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                              <div className="flex flex-col pr-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Include Gratuity in CTC</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Gratuity inside CTC limit</span>
                              </div>
                              <input
                                type="checkbox"
                                disabled={isReadOnly}
                                checked={
                                  rows[empId]?.includeGratuityInCTC !== undefined
                                    ? rows[empId].includeGratuityInCTC
                                    : localSnapshot?.master?.includeGratuityInCTC !== false
                                }
                                onChange={(e) => updateRow(empId, 'includeGratuityInCTC', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>

                            {/* Basic Override */}
                            <div className="flex flex-col p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all gap-1">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Basic Salary Override</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">Default: 50%</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  disabled={isReadOnly}
                                  value={
                                    rows[empId]?.basicPercent !== undefined
                                      ? rows[empId].basicPercent
                                      : (localSnapshot?.master?.basicPercent !== undefined
                                          ? (localSnapshot.master.basicPercent > 1
                                              ? localSnapshot.master.basicPercent
                                              : Math.round(localSnapshot.master.basicPercent * 100))
                                          : 50)
                                  }
                                  onChange={(e) => updateRow(empId, 'basicPercent', Number(e.target.value) || 0)}
                                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-0.5 text-xs text-right font-medium"
                                />
                                <span className="text-slate-500 dark:text-slate-400 font-medium">%</span>
                              </div>
                            </div>

                            {/* HRA Override */}
                            <div className="flex flex-col p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all gap-1">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">HRA Override (% of Basic)</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">Default: 50%</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  disabled={isReadOnly}
                                  value={
                                    rows[empId]?.hraPercent !== undefined
                                      ? rows[empId].hraPercent
                                      : (localSnapshot?.master?.hraPercent !== undefined
                                          ? (localSnapshot.master.hraPercent > 1
                                              ? localSnapshot.master.hraPercent
                                              : Math.round(localSnapshot.master.hraPercent * 100))
                                          : 50)
                                  }
                                  onChange={(e) => updateRow(empId, 'hraPercent', Number(e.target.value) || 0)}
                                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-0.5 text-xs text-right font-medium"
                                />
                                <span className="text-slate-500 dark:text-slate-400 font-medium">%</span>
                              </div>
                            </div>

                            {/* Dynamic Components overrides (like VPF, custom percentage overrides) */}
                            {config?.salaryComponents?.filter(c => 
                              (c.linkedTo === 'ctc_percent' || c.linkedTo === 'basic_percent') && !['basic', 'hra'].includes(c.id)
                            ).map(c => {
                              const fieldKey = `${c.id}Percent`;
                              const defaultVal = Math.round((c.linkValue ?? 0) * 100);
                              const currentVal = rows[empId]?.[fieldKey] !== undefined
                                ? rows[empId][fieldKey]
                                : (localSnapshot?.master?.[fieldKey] !== undefined
                                    ? (localSnapshot.master[fieldKey] > 1
                                        ? localSnapshot.master[fieldKey]
                                        : Math.round(localSnapshot.master[fieldKey] * 100))
                                    : defaultVal);
                              return (
                                <div key={c.id} className="flex flex-col p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all gap-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name} Override ({c.linkedTo === 'basic_percent' ? '% of Basic' : '% of CTC'})</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Default: {defaultVal}%</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      disabled={isReadOnly}
                                      value={currentVal ?? ''}
                                      onChange={(e) => updateRow(empId, fieldKey, e.target.value === '' ? null : Number(e.target.value))}
                                      className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-0.5 text-xs text-right font-medium"
                                    />
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}

                        {/* Leave Deduction Strategy Preference Dropdown */}
                        {showLopStrategy && (
                          <div className="flex flex-col p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all gap-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">Leave Deduction Preference</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">For mid-month revisions</span>
                            </div>
                            <select
                              value={rows[empId]?.lopStrategy || 'proportional'}
                              disabled={isReadOnly}
                              onChange={(e) => {
                                const strategy = e.target.value;
                                updateRow(empId, 'lopStrategy', strategy);
                                if (strategy === 'custom') {
                                  const totalLop = Math.max(0, (Number(rows[empId]?.workingDays) || monthWorkingDays) - (Number(rows[empId]?.paidDays) || 0));
                                  const totalDays = new Date(year, month, 0).getDate();
                                  const initialLops = localSplits.map(split => {
                                    const segRatio = split.daysCount / totalDays;
                                    return Math.round(segRatio * totalLop * 100) / 100;
                                  });
                                  updateRow(empId, 'segmentLops', initialLops);
                                }
                              }}
                              className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-1 text-xs font-medium cursor-pointer"
                            >
                              <option value="proportional">Proportional (Default)</option>
                              <option value="older_first">Older Period first</option>
                              <option value="newer_first">Newer Period first</option>
                              <option value="custom">Custom Strategy</option>
                            </select>
                          </div>
                        )}
                        {/* Overtime Policy Structured Inputs */}
                        <div className="col-span-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900/60 shadow-xs space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1">
                              ⏱️ Overtime Hours & Flat Override
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">Policy Multipliers: Weekday {config?.overtimePolicy?.weekdayMultiplier || 1.5}x · Weekend {config?.overtimePolicy?.weekendMultiplier || 2.0}x · Holiday {config?.overtimePolicy?.holidayMultiplier || 2.0}x</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Weekday Hrs</label>
                              <input
                                type="number" min="0" step="0.5"
                                disabled={isReadOnly}
                                value={typeof rows[empId]?.overtime === 'object' ? (rows[empId]?.overtime?.weekdayHours ?? 0) : 0}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  const curr = (typeof rows[empId]?.overtime === 'object' && rows[empId]?.overtime) ? rows[empId].overtime : {};
                                  updateRow(empId, 'overtime', { ...curr, weekdayHours: val });
                                }}
                                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-1 text-right font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Weekend Hrs</label>
                              <input
                                type="number" min="0" step="0.5"
                                disabled={isReadOnly}
                                value={typeof rows[empId]?.overtime === 'object' ? (rows[empId]?.overtime?.weekendHours ?? 0) : 0}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  const curr = (typeof rows[empId]?.overtime === 'object' && rows[empId]?.overtime) ? rows[empId].overtime : {};
                                  updateRow(empId, 'overtime', { ...curr, weekendHours: val });
                                }}
                                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-1 text-right font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Holiday Hrs</label>
                              <input
                                type="number" min="0" step="0.5"
                                disabled={isReadOnly}
                                value={typeof rows[empId]?.overtime === 'object' ? (rows[empId]?.overtime?.holidayHours ?? 0) : 0}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  const curr = (typeof rows[empId]?.overtime === 'object' && rows[empId]?.overtime) ? rows[empId].overtime : {};
                                  updateRow(empId, 'overtime', { ...curr, holidayHours: val });
                                }}
                                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-1 text-right font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Flat Override (₹)</label>
                              <input
                                type="number" min="0" step="any"
                                placeholder="Flat ₹"
                                disabled={isReadOnly}
                                value={typeof rows[empId]?.overtime === 'object' ? (rows[empId]?.overtime?.customAmount ?? '') : (Number(rows[empId]?.overtime) || '')}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                                  const curr = (typeof rows[empId]?.overtime === 'object' && rows[empId]?.overtime) ? rows[empId].overtime : {};
                                  updateRow(empId, 'overtime', { ...curr, customAmount: val });
                                }}
                                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-1 text-right font-semibold"
                              />
                            </div>
                          </div>
                          {/* Computed Overtime Breakdown Display */}
                          {(() => {
                            const otBreakdown = localSnapshot?.earnings?.overtimeBreakdown;
                            const totalOtPay = localSnapshot?.earnings?.overtime || 0;
                            if (!otBreakdown && totalOtPay === 0) return null;
                            const hrRate = otBreakdown?.hourlyRate || (localSnapshot?.master?.hourlyRate || 0);
                            return (
                              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 mt-2">
                                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-700 pb-1">
                                  <span>Computed OT Pay: {fmtMoney(totalOtPay)}</span>
                                  <span>Base Rate: ₹{Math.round(hrRate * 100) / 100}/hr</span>
                                </div>
                                <div className="space-y-1 text-[10px] text-slate-600 dark:text-slate-400">
                                  {otBreakdown?.weekday?.hours > 0 && (
                                    <div className="flex justify-between">
                                      <span>Weekday: {otBreakdown.weekday.hours} hrs × ₹{Math.round(otBreakdown.weekday.rate * 100)/100} × {otBreakdown.weekday.multiplier}x</span>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">={fmtMoney(otBreakdown.weekday.amount)}</span>
                                    </div>
                                  )}
                                  {otBreakdown?.weekend?.hours > 0 && (
                                    <div className="flex justify-between">
                                      <span>Weekend: {otBreakdown.weekend.hours} hrs × ₹{Math.round(otBreakdown.weekend.rate * 100)/100} × {otBreakdown.weekend.multiplier}x</span>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">={fmtMoney(otBreakdown.weekend.amount)}</span>
                                    </div>
                                  )}
                                  {otBreakdown?.holiday?.hours > 0 && (
                                    <div className="flex justify-between">
                                      <span>Holiday: {otBreakdown.holiday.hours} hrs × ₹{Math.round(otBreakdown.holiday.rate * 100)/100} × {otBreakdown.holiday.multiplier}x</span>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">={fmtMoney(otBreakdown.holiday.amount)}</span>
                                    </div>
                                  )}
                                  {otBreakdown?.customAmount > 0 && (
                                    <div className="flex justify-between">
                                      <span>Flat Override:</span>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">={fmtMoney(otBreakdown.customAmount)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          {localSnapshot?.earnings?.overtimeCapWarning?.flagged && (
                            <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/60 p-1.5 rounded border border-amber-200 dark:border-amber-800 mt-1">
                              ⚠️ {localSnapshot.earnings.overtimeCapWarning.warningMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {localSnapshot && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column: Earnings Breakdown */}
                      <div className="space-y-4">
                        <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-colors">
                          <div className="bg-gray-50 dark:bg-slate-800/80 px-4 py-3 border-b border-gray-200 dark:border-slate-800 font-bold text-gray-700 dark:text-slate-200 text-sm flex items-center justify-between">
                            <span>Earnings Breakdown</span>
                            <span className="text-xs text-gray-500 dark:text-slate-400 font-normal">{isConsultantModel ? 'Retainer Fee' : 'Attendance Prorated'}</span>
                          </div>
                          <div className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                            {isConsultantModel ? (
                              (localSnapshot.earnings?.basic > 0 || (breakdownEmployee.monthlyCTC || 0) > 0) && (
                                <BreakdownRow
                                  label="Consultancy Fee (Retainer)"
                                  paid={localSnapshot.earnings?.basic || 0}
                                  master={breakdownEmployee.monthlyCTC || 0}
                                />
                              )
                            ) : (
                              allEarningComponents.map((c) => {
                                const { paid, master } = getComponentBreakdown(localSnapshot, c);
                                const shouldShow = isHourly
                                  ? (paid > 0 || master > 0)
                                  : (isFlatSalary 
                                    ? c.id === 'basic'
                                    : (['basic', 'hra', remainderId].includes(c.id) || paid > 0 || master > 0));
                                if (!shouldShow) return null;
                                return (
                                  <BreakdownRow
                                    key={c.id}
                                    label={getEarningsRowLabel(breakdownEmployee, c)}
                                    paid={paid}
                                    master={master}
                                  />
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Custom Allowances or Variable Compensation Editor */}
                        {isConsultantModel ? (
                          <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-colors">
                            <div className="bg-amber-50/60 dark:bg-amber-950/40 px-4 py-3 border-b border-gray-200 dark:border-slate-800 font-bold text-gray-700 dark:text-slate-200 text-sm flex items-center justify-between">
                              <span>Variable Compensation Items</span>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const compTypeToPaymentType = {
                                      project_based:   'PROJECT',
                                      milestone_based: 'MILESTONE',
                                      commission_only: 'COMMISSION',
                                      salary_plus_commission: 'COMMISSION',
                                    };
                                    const defaultPaymentType = compTypeToPaymentType[breakdownEmployee.compensationType] || 'PROJECT';
                                    const rateCard = breakdownEmployee.rateCard || [];
                                    const defaultRateItem = rateCard.find(rc => rc.paymentType === defaultPaymentType) || rateCard[0];
                                    const defaultRate = defaultRateItem ? defaultRateItem.rate : 0;
                                    setLocalVariableTransactions([
                                      ...localVariableTransactions,
                                      { paymentType: defaultPaymentType, reference: '', client: '', quantity: 1, rate: defaultRate, amount: defaultRate, remarks: '' }
                                    ]);
                                  }}
                                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2.5 py-1 rounded transition-colors"
                                >
                                  <FaPlus className="w-2.5 h-2.5" /> Add Variable Item
                                </button>
                              )}
                            </div>
                            <div className="p-4 space-y-3">
                              {localVariableTransactions.length === 0 ? (
                                <div className="text-xs text-gray-500 dark:text-slate-400 text-center py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">No variable compensation items defined for this run.</div>
                              ) : (
                                <div className="space-y-4">
                                  {localVariableTransactions.map((item, idx) => (
                                    <div key={`local-tx-${idx}`} className="border border-slate-100 dark:border-slate-800 p-3 rounded-xl bg-slate-50/30 dark:bg-slate-800/40 space-y-2.5 relative">
                                      {!isReadOnly && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = localVariableTransactions.filter((_, i) => i !== idx);
                                            setLocalVariableTransactions(updated);
                                          }}
                                          className="absolute top-2.5 right-2.5 text-red-500 hover:text-red-700 p-1 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/50 border border-slate-100 dark:border-slate-700 rounded shadow-sm transition-colors"
                                          title="Remove item"
                                        >
                                          <FaTrash className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                      
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <div>
                                          <label className="block text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Type</label>
                                          <select
                                            disabled={isReadOnly}
                                            value={item.paymentType}
                                            onChange={(e) => {
                                              const updated = [...localVariableTransactions];
                                              const type = e.target.value;
                                              updated[idx].paymentType = type;
                                              const matchingRate = breakdownEmployee.rateCard?.find(rc => rc.paymentType === type);
                                              if (matchingRate) {
                                                updated[idx].rate = matchingRate.rate;
                                                updated[idx].amount = (updated[idx].quantity || 1) * matchingRate.rate;
                                              }
                                              setLocalVariableTransactions(updated);
                                            }}
                                            className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-medium bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                                          >
                                            <option value="POSITION">Position</option>
                                            <option value="PROJECT">Project</option>
                                            <option value="INTERVIEW">Interview</option>
                                            <option value="MILESTONE">Milestone</option>
                                            <option value="COMMISSION">Commission</option>
                                            <option value="OTHER">Other</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Reference</label>
                                          <input
                                            type="text"
                                            placeholder="e.g. React Dev"
                                            disabled={isReadOnly}
                                            value={item.reference || ''}
                                            onChange={(e) => {
                                              const updated = [...localVariableTransactions];
                                              updated[idx].reference = e.target.value;
                                              setLocalVariableTransactions(updated);
                                            }}
                                            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:border-blue-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Client</label>
                                          <input
                                            type="text"
                                            placeholder="Client Name"
                                            disabled={isReadOnly}
                                            value={item.client || ''}
                                            onChange={(e) => {
                                              const updated = [...localVariableTransactions];
                                              updated[idx].client = e.target.value;
                                              setLocalVariableTransactions(updated);
                                            }}
                                            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:border-blue-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Qty</label>
                                          <input
                                            type="number"
                                            min="1"
                                            disabled={isReadOnly}
                                            value={item.quantity || 1}
                                            onChange={(e) => {
                                              const updated = [...localVariableTransactions];
                                              const q = Number(e.target.value) || 1;
                                              updated[idx].quantity = q;
                                              updated[idx].amount = q * (updated[idx].rate || 0);
                                              setLocalVariableTransactions(updated);
                                            }}
                                            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-2 py-1 text-xs font-semibold text-right focus:outline-none focus:border-blue-500"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <label className="block text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Rate (₹)</label>
                                          <input
                                            type="number"
                                            min="0"
                                            disabled={isReadOnly}
                                            value={item.rate || 0}
                                            onChange={(e) => {
                                              const updated = [...localVariableTransactions];
                                              const r = Number(e.target.value) || 0;
                                              updated[idx].rate = r;
                                              updated[idx].amount = (updated[idx].quantity || 1) * r;
                                              setLocalVariableTransactions(updated);
                                            }}
                                            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-2 py-1 text-xs font-semibold text-right focus:outline-none focus:border-blue-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Amount (₹)</label>
                                          <input
                                            type="number"
                                            min="0"
                                            disabled={isReadOnly}
                                            value={item.amount || 0}
                                            onChange={(e) => {
                                              const updated = [...localVariableTransactions];
                                              updated[idx].amount = Number(e.target.value) || 0;
                                              setLocalVariableTransactions(updated);
                                            }}
                                            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-2 py-1 text-xs font-semibold text-right focus:outline-none focus:border-blue-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Remarks</label>
                                          <input
                                            type="text"
                                            placeholder="Notes..."
                                            disabled={isReadOnly}
                                            value={item.remarks || ''}
                                            onChange={(e) => {
                                              const updated = [...localVariableTransactions];
                                              updated[idx].remarks = e.target.value;
                                              setLocalVariableTransactions(updated);
                                            }}
                                            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:border-blue-500"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                  {/* TDS Estimation Summary Panel */}
                                  {(() => {
                                    const totalVar = localVariableTransactions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                                    const isDrawerTdsEnabled = rows[breakdownEmployee._id]?.tdsEnabled !== undefined 
                                      ? rows[breakdownEmployee._id].tdsEnabled 
                                      : localSnapshot?.master?.tdsEnabled !== false;
                                    const estimatedTds = isDrawerTdsEnabled ? (totalVar * 0.1) : 0;
                                    const netTakeHome = totalVar - estimatedTds;
                                    return (
                                      <div className="bg-amber-50/50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800 rounded-xl p-3.5 space-y-2 text-amber-900 dark:text-amber-200 text-xs font-medium">
                                        <div className="flex justify-between">
                                          <span>Total Variable Earnings:</span>
                                          <span className="font-bold">{fmtMoney(totalVar)}</span>
                                        </div>
                                        {isDrawerTdsEnabled && (
                                          <>
                                            <div className="flex justify-between">
                                              <span>Estimated TDS (10% Sec 194J):</span>
                                              <span className="font-semibold text-red-600 dark:text-red-400">-{fmtMoney(estimatedTds)}</span>
                                            </div>
                                            <div className="flex justify-between border-t border-amber-200 dark:border-amber-800 pt-1.5 font-bold">
                                              <span>Net Take-Home (Est. Variable):</span>
                                              <span className="text-emerald-700 dark:text-emerald-400">{fmtMoney(netTakeHome)}</span>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-colors">
                            <div className="bg-gray-50 dark:bg-slate-800/80 px-4 py-3 border-b border-gray-200 dark:border-slate-800 font-bold text-gray-700 dark:text-slate-200 text-sm flex items-center justify-between">
                              <span>Custom Run Allowances (Other Earnings)</span>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => setLocalEarnings([...localEarnings, { name: '', amount: 0 }])}
                                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-1 rounded transition-colors"
                                >
                                  <FaPlus className="w-2.5 h-2.5" /> Add
                                </button>
                              )}
                            </div>
                            <div className="p-4 space-y-3">
                              {localEarnings.length === 0 ? (
                                <div className="text-xs text-gray-500 dark:text-slate-400 text-center py-2">No custom allowances defined for this run.</div>
                              ) : (
                                localEarnings.map((item, idx) => (
                                  <div key={`local-earn-${idx}`} className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      placeholder="Allowance Name"
                                      disabled={isReadOnly}
                                      value={item.name}
                                      onChange={(e) => {
                                        const updated = [...localEarnings];
                                        updated[idx].name = e.target.value;
                                        setLocalEarnings(updated);
                                      }}
                                      className="flex-1 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-1 text-sm disabled:bg-slate-50 dark:disabled:bg-slate-800/60 disabled:text-slate-500 font-medium focus:outline-none focus:border-blue-500"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Amount"
                                      disabled={isReadOnly}
                                      value={item.amount}
                                      onChange={(e) => {
                                        const updated = [...localEarnings];
                                        updated[idx].amount = Number(e.target.value) || 0;
                                        setLocalEarnings(updated);
                                      }}
                                      className="w-24 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-1 text-sm text-right font-medium disabled:bg-slate-50 dark:disabled:bg-slate-800/60 disabled:text-slate-500 focus:outline-none focus:border-blue-500"
                                    />
                                    {!isReadOnly && (
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
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* Variable Transactions List */}
                        {localSnapshot.earnings.variableCompensation && localSnapshot.earnings.variableCompensation.length > 0 && (
                          <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-colors">
                            <div className="bg-amber-50 dark:bg-amber-950/60 px-4 py-3 border-b border-amber-200 dark:border-amber-800 font-bold text-amber-900 dark:text-amber-200 text-sm">
                              💼 Variable Compensation (Transactions)
                            </div>
                            <div className="p-4 space-y-2">
                              {localSnapshot.earnings.variableCompensation.map((tx, idx) => (
                                <div key={`tx-${idx}`} className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2 rounded border border-slate-100 dark:border-slate-700">
                                  <div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{tx.paymentType}</div>
                                    {tx.reference && <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Ref: {tx.reference} {tx.client && `· Client: ${tx.client}`}</div>}
                                    {tx.remarks && <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Note: {tx.remarks}</div>}
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-slate-800 dark:text-slate-200">{fmtMoney(tx.amount)}</div>
                                    {tx.quantity > 1 && <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{tx.quantity} x {fmtMoney(tx.rate)}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Total Earnings Summary */}
                        <div className="bg-slate-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 transition-colors">
                          <span>Total Earnings (Gross Salary)</span>
                          <span className="text-lg">{fmtMoney(localSnapshot.earnings.totalEarnings)}</span>
                        </div>
                      </div>

                      {/* Right Column: Deductions, Contributions & Net Pay */}
                      <div className="space-y-4">
                        {/* Deductions Card */}
                        {(() => {
                          const dynamicDeductionsTotal = deductionComponents.reduce((s, c) => s + (localSnapshot?.deductions?.deductionsMap?.[c.id] || 0), 0);
                          const staticTotal = (localSnapshot.deductions.pfEmployee || 0) + (localSnapshot.deductions.esiEmployee || 0) + (localSnapshot.deductions.lwfEmployee || 0) + (localSnapshot.deductions.professionalTax || 0) + (localSnapshot.deductions.tds || 0);
                          if (isHourly && staticTotal + dynamicDeductionsTotal === 0) return null;
                          return (
                            <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-colors">
                              <div className="bg-gray-50 dark:bg-slate-800/80 px-4 py-3 border-b border-gray-200 dark:border-slate-800 font-bold text-gray-700 dark:text-slate-200 text-sm">
                                Statutory & Voluntary Deductions
                              </div>
                              <div className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                                {hasSalaryBreakup && localSnapshot.deductions.pfEmployee > 0 && (
                                  <DeductionRow label="Provident Fund (Employee PF)" amount={localSnapshot.deductions.pfEmployee} />
                                )}
                                {localSnapshot.deductions.esiEmployee > 0 && <DeductionRow label="ESI (Employee Contribution)" amount={localSnapshot.deductions.esiEmployee} />}
                                {localSnapshot.deductions.lwfEmployee > 0 && <DeductionRow label="LWF (Employee Contribution)" amount={localSnapshot.deductions.lwfEmployee} />}
                                {localSnapshot.deductions.professionalTax > 0 && <DeductionRow label="Professional Tax (PT)" amount={localSnapshot.deductions.professionalTax} />}
                                {/* Dynamic salary component deductions (VPF, NPS, etc.) from payroll settings */}
                                 {deductionComponents.map(c => {
                                  const amount = localSnapshot?.deductions?.deductionsMap?.[c.id] || 0;
                                  if (!amount) return null;
                                  const pctVal = rows[empId]?.[`${c.id}Percent`] !== undefined
                                    ? rows[empId][`${c.id}Percent`]
                                    : (localSnapshot?.master?.[`${c.id}Percent`] !== undefined
                                        ? (localSnapshot.master[`${c.id}Percent`] > 1 ? localSnapshot.master[`${c.id}Percent`] : localSnapshot.master[`${c.id}Percent`] * 100)
                                        : (c.linkValue ? c.linkValue * 100 : 0));
                                  const suffix = c.linkedTo === 'basic_percent'
                                    ? ` (${pctVal}% of Basic)`
                                    : c.linkedTo === 'ctc_percent'
                                      ? ` (${pctVal}% of CTC)`
                                      : c.linkedTo === 'fixed' ? ' (Fixed)' : '';
                                  return <DeductionRow key={c.id} label={`${c.name}${suffix}`} amount={amount} />;
                                })}
                                {(!isHourly || localSnapshot.deductions.tds > 0) && (
                                  <DeductionRow label="Income Tax (TDS)" amount={localSnapshot.deductions.tds} isEditable={!isReadOnly} value={rows[empId]?.tds} onChange={(val) => updateRow(empId, 'tds', val === '' ? undefined : Number(val))} />
                                )}
                                {localSnapshot.deductions.loanDeduction > 0 && (
                                  <DeductionRow label="Loan EMI Recovery" amount={localSnapshot.deductions.loanDeduction} />
                                )}
                                {localSnapshot?.deductions?.loanRepayments?.length > 0 && (
                                  <div className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 p-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                                    <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-700 pb-1.5 text-[11px]">
                                      <span>💳 Multi-Loan Repayment Allocation</span>
                                      <span>Total: {fmtMoney(localSnapshot.deductions.loanDeduction)}</span>
                                    </div>
                                    <div className="space-y-1.5 text-[10px]">
                                      {localSnapshot.deductions.loanRepayments.map((lr, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                                          <div className="font-semibold text-slate-900 dark:text-slate-100">{lr.loanReference || `Loan #${idx + 1}`}</div>
                                          <div className="text-right">
                                            <div className="font-bold text-emerald-700 dark:text-emerald-400">Applied: {fmtMoney(lr.amountApplied)}</div>
                                            <div className="text-slate-500 dark:text-slate-400">Remaining: {fmtMoney(lr.remainingBalance)}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Custom Deductions Editor */}
                        <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-colors">
                          <div className="bg-gray-50 dark:bg-slate-800/80 px-4 py-3 border-b border-gray-200 dark:border-slate-800 font-bold text-gray-700 dark:text-slate-200 text-sm flex items-center justify-between">
                            <span>Custom Run Deductions (Other Deductions)</span>
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => setLocalDeductions([...localDeductions, { name: '', amount: 0 }])}
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-1 rounded transition-colors"
                              >
                                <FaPlus className="w-2.5 h-2.5" /> Add
                              </button>
                            )}
                          </div>
                          <div className="p-4 space-y-3">
                            {localDeductions.length === 0 ? (
                              <div className="text-xs text-gray-500 dark:text-slate-400 text-center py-2">No custom deductions defined for this run.</div>
                            ) : (
                              localDeductions.map((item, idx) => (
                                <div key={`local-ded-${idx}`} className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    placeholder="Deduction Name"
                                    disabled={isReadOnly}
                                    value={item.name}
                                    onChange={(e) => {
                                      const updated = [...localDeductions];
                                      updated[idx].name = e.target.value;
                                      setLocalDeductions(updated);
                                    }}
                                    className="flex-1 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-1 text-sm disabled:bg-slate-50 dark:disabled:bg-slate-800/60 disabled:text-slate-500 font-medium focus:outline-none focus:border-blue-500"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Amount"
                                    disabled={isReadOnly}
                                    value={item.amount}
                                    onChange={(e) => {
                                      const updated = [...localDeductions];
                                      updated[idx].amount = Number(e.target.value) || 0;
                                      setLocalDeductions(updated);
                                    }}
                                    className="w-24 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-1 text-sm text-right font-medium disabled:bg-slate-50 dark:disabled:bg-slate-800/60 disabled:text-slate-500 focus:outline-none focus:border-blue-500"
                                  />
                                  {!isReadOnly && (
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
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Employer Contributions Card */}
                        {hasSalaryBreakup && (
                          <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-colors">
                            <div className="bg-gray-50 dark:bg-slate-800/80 px-4 py-3 border-b border-gray-200 dark:border-slate-800 font-bold text-gray-700 dark:text-slate-200 text-sm">
                              Employer Contributions (Non-Takehome CTC Components)
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                              <DeductionRow label="Provident Fund (Employer PF Contribution)" amount={localSnapshot.employerContributions.pfEmployer} isContrib />
                              {localSnapshot.employerContributions.esiEmployer > 0 && <DeductionRow label="ESI (Employer Contribution)" amount={localSnapshot.employerContributions.esiEmployer} isContrib />}
                              {localSnapshot.employerContributions.gratuity > 0 && <DeductionRow label="Gratuity Provision" amount={localSnapshot.employerContributions.gratuity} isContrib />}
                              {localSnapshot.employerContributions.lwfEmployer > 0 && <DeductionRow label="LWF (Employer Contribution)" amount={localSnapshot.employerContributions.lwfEmployer} isContrib />}
                              {localSnapshot.employerContributions.insuranceEmployer > 0 && <DeductionRow label="Insurance" amount={localSnapshot.employerContributions.insuranceEmployer} isContrib />}
                              {localSnapshot.employerContributions.nps > 0 && <DeductionRow label="Employer NPS" amount={localSnapshot.employerContributions.nps} isContrib />}
                            </div>
                          </div>
                        )}

                        {/* Total Deductions Summary */}
                        {(() => {
                          const dynamicDed = deductionComponents.reduce((s, c) => s + (localSnapshot?.deductions?.deductionsMap?.[c.id] || 0), 0);
                          const totalDed = (localSnapshot.deductions.pfEmployee || 0)
                            + (localSnapshot.deductions.esiEmployee || 0)
                            + (localSnapshot.deductions.lwfEmployee || 0)
                            + (localSnapshot.deductions.professionalTax || 0)
                            + (localSnapshot.deductions.tds || 0)
                            + dynamicDed
                            + (localSnapshot.deductions.otherDeductions?.reduce((s, d) => s + (d.amount || 0), 0) || 0);
                          if (!totalDed) return null;
                          return (
                            <div className="bg-red-50 dark:bg-red-950/60 border border-red-100 dark:border-red-900/60 rounded-xl p-3 flex justify-between items-center text-red-900 dark:text-red-300 text-sm font-semibold">
                              <span>Total Deductions</span>
                              <span className="text-red-700 dark:text-red-400">-{fmtMoney(totalDed)}</span>
                            </div>
                          );
                        })()}

                        {/* Net Take-Home Salary Callout */}
                        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex justify-between items-center font-bold text-emerald-900 dark:text-emerald-300 shadow-sm transition-colors">
                          <div className="flex flex-col">
                            <span className="text-emerald-900 dark:text-emerald-200">Net Take-Home Salary</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Gross Earnings − Total Deductions</span>
                          </div>
                          <span className="text-2xl text-emerald-800 dark:text-emerald-300">{fmtMoney(localSnapshot.netSalary)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pre-approved reimbursements section */}
                    {claimsMap.get(empId)?.length > 0 && (
                      <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm mt-6 transition-colors">
                        <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-gray-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 text-sm">
                          Pre-approved reimbursements
                        </div>
                        <div className="p-4 space-y-3">
                          {claimsMap.get(empId).map((claim) => {
                            const isExcluded = localExcludedClaimIds.has(claim._id);
                            return (
                              <div key={claim._id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={!isExcluded}
                                    disabled={isReadOnly}
                                    onChange={() => {}}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                                    claim.category === 'petrol' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800' :
                                    claim.category === 'broadband' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800' :
                                    claim.category === 'lta' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800' :
                                    claim.category === 'medical' ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800' :
                                    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                  }`}>
                                    {claim.category}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Approved on {new Date(claim.createdAt).toLocaleDateString('en-IN')}</span>
                                </div>
                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{fmtMoney(claim.amount)}</span>
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
              <div className="bg-gray-50 dark:bg-slate-800/80 px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex justify-end gap-3 transition-colors">
                <button
                  type="button"
                  onClick={() => setBreakdownEmployee(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleSaveAdjustments}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
                  >
                    Save Run Adjustments
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Full & Final Settlement (F&F) Modal */}
      {fnfEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 transition-colors">
            <div className="bg-amber-600 dark:bg-amber-700 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  📜 Full & Final (F&F) Settlement
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  {fnfEmployee.firstName} {fnfEmployee.lastName} ({fnfEmployee.employeeId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFnfEmployee(null)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleProcessFnf} className="p-6 space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                Processing F&F settlement will calculate gratuity (if tenure &ge; 5 yrs), notice period recovery/shortfall, leave encashment, outstanding loan balance recovery, and mark the employee status as terminated.
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Last Working Day</label>
                <input
                  type="date"
                  required
                  value={fnfEmployee.dateOfLeaving ? new Date(fnfEmployee.dateOfLeaving).toISOString().split('T')[0] : new Date(year, month - 1, new Date(year, month, 0).getDate()).toISOString().split('T')[0]}
                  onChange={(e) => {
                    const d = e.target.value;
                    setFnfEmployee({ ...fnfEmployee, dateOfLeaving: d });
                  }}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Period-specific earnings inputs — shown only when relevant to the employee's comp type */}
              {(() => {
                const compType = resolveCompensationTypeClient(fnfEmployee);
                const isHourlyType = compType === 'hourly' || compType === 'timesheet_based';
                const isPieceRate = compType === 'piece_rate';
                if (!isHourlyType && !isPieceRate) return null;
                return (
                  <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl p-3 space-y-3">
                    <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300">Final Period Work Input</p>
                    {isHourlyType && (
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hours Worked in Final Period</label>
                        <input
                          type="number" min="0" step="0.5"
                          placeholder="0"
                          value={fnfForm.hoursWorked}
                          onChange={(e) => setFnfForm({ ...fnfForm, hoursWorked: e.target.value })}
                          className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-semibold text-right focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Leave blank to use the stored default from the employee record.</p>
                      </div>
                    )}
                    {isPieceRate && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Units Produced</label>
                          <input
                            type="number" min="0"
                            placeholder="1"
                            value={fnfForm.unitsProduced}
                            onChange={(e) => setFnfForm({ ...fnfForm, unitsProduced: e.target.value })}
                            className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-semibold text-right focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rate Per Unit (override)</label>
                          <input
                            type="number" min="0"
                            placeholder="From rate card"
                            value={fnfForm.ratePerUnit}
                            onChange={(e) => setFnfForm({ ...fnfForm, ratePerUnit: e.target.value })}
                            className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-semibold text-right focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notice Required (Days)</label>
                  <input
                    type="number" min="0"
                    value={fnfForm.noticePeriodRequiredDays}
                    onChange={(e) => setFnfForm({ ...fnfForm, noticePeriodRequiredDays: Number(e.target.value) || 0 })}
                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-semibold text-right focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notice Served (Days)</label>
                  <input
                    type="number" min="0"
                    value={fnfForm.noticePeriodServedDays}
                    onChange={(e) => setFnfForm({ ...fnfForm, noticePeriodServedDays: Number(e.target.value) || 0 })}
                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-semibold text-right focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Leave Encashment Days</label>
                <input
                  type="number" min="0" step="0.5"
                  value={fnfForm.leaveEncashmentDays}
                  onChange={(e) => setFnfForm({ ...fnfForm, leaveEncashmentDays: Number(e.target.value) || 0 })}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-semibold text-right focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Settlement Comments / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Optional exit notes..."
                  value={fnfForm.comments}
                  onChange={(e) => setFnfForm({ ...fnfForm, comments: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setFnfEmployee(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingFnf}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  {processingFnf ? 'Processing F&F...' : 'Finalize & Process F&F'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm p-4 transition-colors">
    <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">{label}</div>
    <div className="text-xl font-bold mt-1 text-gray-900 dark:text-slate-100">{value}</div>
  </div>
);

const EditableMoneyCell = ({ value, onChange, disabled = false, notApplicable = false }) => {
  const numVal = Number(value) || 0;
  const showNA = notApplicable || (disabled && numVal === 0);

  return (
    <td className="px-4 py-2.5">
      {showNA ? (
        <span className="text-xs text-slate-400 dark:text-slate-400 font-medium italic">N/A</span>
      ) : disabled ? (
        <div className="text-xs text-gray-700 dark:text-slate-300 whitespace-nowrap">{fmtMoney(numVal)}</div>
      ) : (
        <input
          type="number"
          min="0"
          placeholder="N/A"
          value={value !== undefined && value !== null && value !== '' ? value : ''}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-20 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-xs text-right font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      )}
    </td>
  );
};

export default PayrollProcessing;
