/**
 * compensationTypeFields.js
 *
 * Shared helper to resolve visible onboarding fields and period input fields for any strategy.
 * Uses backend registry metadata (compensationTypesMap) as steady-state source of truth.
 */

export const DEFAULT_ONBOARDING_FIELD_MAP = {
  monthly_salary:        ['monthlyCTC', 'salaryComponentsEditor'],
  hourly:                ['hourlyRate'],
  daily_wage:            ['dailyRate'],
  weekly_salary:         ['weeklyRate'],
  piece_rate:            ['rateCardEditor'],
  project_based:         ['projectFee', 'rateCardEditor'],
  milestone_based:       ['milestoneAmount', 'rateCardEditor'],
  attendance_based:      ['monthlyCTC', 'salaryComponentsEditor'],
  timesheet_based:       ['hourlyRate', 'monthlyCTC'],
  commission_only:       ['commissionNotes'],
  salary_plus_commission:['monthlyCTC', 'salaryComponentsEditor', 'commissionNotes'],
  retainer:              ['monthlyCTC'],
};

export const DEFAULT_PERIOD_INPUT_FIELD_MAP = {
  monthly_salary:        ['paidDays', 'workingDays'],
  weekly_salary:         ['paidDays', 'workingDays'],
  attendance_based:      ['paidDays', 'workingDays'],
  salary_plus_commission:['paidDays', 'workingDays'],
  hourly:                ['hoursWorked'],
  timesheet_based:       ['hoursLogged'],
  daily_wage:            ['daysWorked'],
  piece_rate:            ['unitsProduced', 'ratePerUnit'],
  project_based:         ['projectFee'],
  milestone_based:       ['milestoneAmount', 'milestoneRef'],
  commission_only:       ['variableTransactions'],
  retainer:              ['retainer', 'skipPeriod'],
};

export const ATTENDANCE_LINKED_TYPES = ['monthly_salary', 'attendance_based', 'salary_plus_commission', 'weekly_salary'];

export function isAttendanceLinked(compType, isHourly = false) {
  if (!compType) return !isHourly;
  const key = typeof compType === 'string' ? compType : (compType.key || compType.name || String(compType));
  return ATTENDANCE_LINKED_TYPES.includes(key);
}

/**
 * Resolves onboarding fields for EmployeeForm.jsx
 */
export function getOnboardingFields(compType, compensationTypesMap = {}) {
  const key = compType || 'monthly_salary';
  const meta = compensationTypesMap[key];
  if (meta && Array.isArray(meta.inputFieldsAtOnboarding) && meta.inputFieldsAtOnboarding.length > 0) {
    return meta.inputFieldsAtOnboarding;
  }
  return DEFAULT_ONBOARDING_FIELD_MAP[key] || DEFAULT_ONBOARDING_FIELD_MAP.monthly_salary;
}

/**
 * Resolves period input fields for PayrollProcessing.jsx
 */
export function getPeriodInputFields(compType, compensationTypesMap = {}) {
  const key = compType || 'monthly_salary';
  const meta = compensationTypesMap[key];
  const hasRegistryLoaded = Object.keys(compensationTypesMap).length > 0;

  if (meta) {
    const reqList = meta.requiredPeriodInputFields || [];
    const optList = meta.optionalPeriodInputFields || [];
    const combined = [...reqList, ...optList];
    if (combined.length > 0) return combined;
    return meta.usesSalaryComponents !== false ? ['paidDays', 'workingDays'] : ['retainer'];
  }

  if (!hasRegistryLoaded) {
    return DEFAULT_PERIOD_INPUT_FIELD_MAP[key] || ['paidDays', 'workingDays'];
  }

  return ['paidDays', 'workingDays'];
}

/**
 * Resolves standard line item labels for PayslipGeneration.jsx
 */
export function getPayslipLineItemLabels(compType, compensationTypesMap = {}) {
  const key = compType || 'monthly_salary';
  const meta = compensationTypesMap[key];

  if (meta && meta.displayName) {
    return {
      title: meta.displayName,
      isComponentBased: meta.usesSalaryComponents !== false
    };
  }

  const isComponentBased = ['monthly_salary', 'attendance_based', 'salary_plus_commission', 'weekly_salary'].includes(key);
  return {
    title: key.replace(/_/g, ' ').toUpperCase(),
    isComponentBased
  };
}
