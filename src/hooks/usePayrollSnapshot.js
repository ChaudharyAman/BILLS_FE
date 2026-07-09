import { useMemo } from 'react';
import { buildPayrollSnapshot } from '../utils/payroll';

export const usePayrollSnapshot = (employee, config, row, monthWorkingDays, overrideEarnings, overrideDeductions) => {
  return useMemo(() => {
    if (!employee) return null;

    const adjustments = {
      overtime: Number(row?.overtime) || 0,
      joiningBonus: Number(row?.joiningBonus) || 0,
      loyaltyBonus: Number(row?.loyaltyBonus) || 0,
      incentive: Number(row?.incentive) || 0,
      specialBonus: Number(row?.specialBonus) || 0,
      otherAllowanceArrear: Number(row?.otherAllowanceArrear) || 0,
      loanDeduction: Number(row?.loanDeduction) || 0,
      advanceDeduction: Number(row?.advanceDeduction) || 0,
      tds: (row?.tds !== undefined && row?.tds !== null && row?.tds !== '') ? Number(row.tds) : undefined,
      hoursWorked: Number(row?.hoursWorked) || 0,
      otherEarnings: overrideEarnings ?? (row?.otherEarnings || []),
      otherDeductions: overrideDeductions ?? (row?.otherDeductions || []),
      pfEnabled: row?.pfEnabled,
      esiEnabled: row?.esiEnabled,
      ptEnabled: row?.ptEnabled,
      lwfEnabled: row?.lwfEnabled,
      gratuityEnabled: row?.gratuityEnabled,
      includePfInCTC: row?.includePfInCTC,
      includeGratuityInCTC: row?.includeGratuityInCTC,
      basicPercent: row?.basicPercent,
      hraPercent: row?.hraPercent,
      lopStrategy: row?.lopStrategy,
      segmentLops: row?.segmentLops,
      reimbursements: row?.reimbursements || [],
      variableTransactions: row?.variableTransactions || [],
    };

    if (row) {
      Object.keys(row).forEach(key => {
        if (key.endsWith('Percent') || (config?.salaryComponents && config.salaryComponents.some(c => c.id === key || `${c.id}Percent` === key))) {
          if (row[key] !== undefined && row[key] !== null) {
            adjustments[key] = row[key];
          }
        }
      });
    }

    return buildPayrollSnapshot(
      employee,
      config,
      {
        workingDays: Number(row?.workingDays) || Number(monthWorkingDays) || 26,
        paidDays: Number(row?.paidDays) || 0,
        paidLeaves: Number(row?.paidLeaves) || 0,
        unpaidLeaves: Number(row?.unpaidLeaves) || 0,
        hoursWorked: Number(row?.hoursWorked) || 0,
      },
      adjustments,
      row?.month,
      row?.year
    );
  }, [employee, config, row, monthWorkingDays, overrideEarnings, overrideDeductions]);
};
