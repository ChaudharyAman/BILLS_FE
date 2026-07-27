import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

/**
 * usePayrollSnapshot
 *
 * Calls POST /payroll/preview to compute the authoritative payroll snapshot
 * server-side. Eliminates the 71 KB client-side payroll.js duplicate for
 * the per-employee breakdown view.
 *
 * Returns null while loading, then the snapshot object (same shape as before).
 *
 * ponytail: abort controller cancels in-flight requests on re-render, no debounce
 * package needed — AbortController is stdlib.
 */
export const usePayrollSnapshot = (employee, config, row, monthWorkingDays) => {
  const [snapshot, setSnapshot] = useState(null);
  // Use a ref to track the AbortController so we can cancel stale requests
  const abortRef = useRef(null);

  useEffect(() => {
    if (!employee?._id || !row?.month || !row?.year) {
      setSnapshot(null);
      return;
    }

    // Cancel any in-flight request from the previous render
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const attendance = {
      workingDays: Number(row.workingDays) || Number(monthWorkingDays) || 26,
      paidDays:    Number(row.paidDays)    || 0,
      paidLeaves:  Number(row.paidLeaves)  || 0,
      unpaidLeaves:Number(row.unpaidLeaves)|| 0,
      hoursWorked: Number(row.hoursWorked) || 0,
    };

    const adjustments = {
      overtime: typeof row.overtime === 'object' && row.overtime !== null
        ? {
            weekdayHours: Number(row.overtime.weekdayHours) || 0,
            weekendHours: Number(row.overtime.weekendHours) || 0,
            holidayHours: Number(row.overtime.holidayHours) || 0,
            customAmount: Number(row.overtime.customAmount) || 0,
          }
        : (Number(row.overtime) || 0),
      joiningBonus:         Number(row.joiningBonus)         || 0,
      loyaltyBonus:         Number(row.loyaltyBonus)         || 0,
      incentive:            Number(row.incentive)            || 0,
      specialBonus:         Number(row.specialBonus)         || 0,
      otherAllowanceArrear: Number(row.otherAllowanceArrear) || 0,
      loanDeduction:        Number(row.loanDeduction)        || 0,
      advanceDeduction:     Number(row.advanceDeduction)     || 0,
      tds:    (row.tds !== undefined && row.tds !== null && row.tds !== '') ? Number(row.tds) : undefined,
      hoursWorked:          Number(row.hoursWorked)          || 0,
      otherEarnings:        row.otherEarnings     || [],
      otherDeductions:      row.otherDeductions   || [],
      pfEnabled:            row.pfEnabled,
      tdsEnabled:           row.tdsEnabled,
      esiEnabled:           row.esiEnabled,
      ptEnabled:            row.ptEnabled,
      lwfEnabled:           row.lwfEnabled,
      gratuityEnabled:      row.gratuityEnabled,
      includePfInCTC:       row.includePfInCTC,
      includeGratuityInCTC: row.includeGratuityInCTC,
      basicPercent:         row.basicPercent,
      hraPercent:           row.hraPercent,
      lopStrategy:          row.lopStrategy,
      segmentLops:          row.segmentLops,
      reimbursements:       row.reimbursements       || [],
      variableTransactions: row.variableTransactions || [],
      compensationType:     row.compensationType,
      // periodInput for new compensation types
      periodInput:          row.periodInput          || {},
    };

    // Forward any dynamic component percent overrides (e.g. broadbandPercent)
    if (row) {
      Object.keys(row).forEach(key => {
        if (
          key.endsWith('Percent') ||
          (config?.salaryComponents &&
            config.salaryComponents.some(c => c.id === key || `${c.id}Percent` === key))
        ) {
          if (row[key] !== undefined && row[key] !== null) {
            adjustments[key] = row[key];
          }
        }
      });
    }

    api.post(
      '/payroll/preview',
      {
        employeeId:  employee._id,
        month:       row.month,
        year:        row.year,
        attendance,
        adjustments,
      },
      { signal: controller.signal }
    )
      .then(res => {
        setSnapshot(res.data);
      })
      .catch(err => {
        // Ignore cancellation errors — they happen on every keystroke
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error('[usePayrollSnapshot]', err);
          setSnapshot(null);
        }
      });

    return () => { controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    employee?._id,
    row?.month,
    row?.year,
    row?.workingDays,
    row?.paidDays,
    row?.paidLeaves,
    row?.unpaidLeaves,
    row?.hoursWorked,
    JSON.stringify(row?.overtime),
    row?.joiningBonus,
    row?.loyaltyBonus,
    row?.incentive,
    row?.specialBonus,
    row?.otherAllowanceArrear,
    row?.loanDeduction,
    row?.advanceDeduction,
    row?.tds,
    // Stringify arrays/objects to avoid referential inequality on every render
    JSON.stringify(row?.otherEarnings),
    JSON.stringify(row?.otherDeductions),
    JSON.stringify(row?.reimbursements),
    JSON.stringify(row?.variableTransactions),
    JSON.stringify(row?.periodInput),
    row?.compensationType,
    row?.pfEnabled,
    row?.tdsEnabled,
    row?.esiEnabled,
    row?.ptEnabled,
    row?.lwfEnabled,
    row?.gratuityEnabled,
    row?.includePfInCTC,
    row?.includeGratuityInCTC,
    row?.basicPercent,
    row?.hraPercent,
    row?.lopStrategy,
    JSON.stringify(row?.segmentLops),
    monthWorkingDays,
  ]);

  return snapshot;
};
