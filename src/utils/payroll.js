export const DEFAULT_PAYROLL_CONFIG = {
  basicPercent: 0.5,
  hraPercent: 0.5,
  pfRate: 0.12,
  pfCap: 15000,
  pfEmployerRate: 0.12,
  pfCalculationType: 'percent',
  pfAmountEmployee: 1800,
  pfAmountEmployer: 1800,
  esiEmployeeRate: 0.0075,
  esiEmployerRate: 0.0325,
  esiBasicThreshold: 21000,
  lwfEmployer: 35,
  lwfEmployee: 15,
  gratuityRate: 0.0481,
  defaultWorkingDays: 30,
  defaultInsurance: 0,
  ltaMaxPercent: 0.0833,
  standardMonthlyHours: 160,
  compensationTypeDefaults: {},
};

const moneyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const fmtMoney = (value) => moneyFormatter.format(Number(value) || 0);

export const payrollStatusClass = {
  draft: 'bg-gray-100 text-gray-700',
  processed: 'bg-blue-100 text-blue-700',
  approved: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};
const roundAmount = (value) => Math.round((Number(value) || 0) * 100) / 100;
const sumNamedAmounts = (items = []) => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

const PT_STATE_CONFIGS = {
  MH: {
    slabs: [
      { upTo: 7500,     monthly: 0   },
      { upTo: 10000,    monthly: 175 },
      { upTo: Infinity, monthly: 200 },
    ],
    februaryTopBracketAmount: 300,
    februaryTopBracketThreshold: 10000,
  },
  KA: {
    slabs: [
      { upTo: 14999,    monthly: 0   },
      { upTo: Infinity, monthly: 200 },
    ],
  },
  TN: {
    slabs: [
      { upTo: 21000,    monthly: 0    },
      { upTo: 30000,    monthly: 135  },
      { upTo: 45000,    monthly: 315  },
      { upTo: 60000,    monthly: 690  },
      { upTo: 75000,    monthly: 1025 },
      { upTo: Infinity, monthly: 1250 },
    ],
  },
  WB: {
    slabs: [
      { upTo: 10000,    monthly: 0   },
      { upTo: 15000,    monthly: 110 },
      { upTo: 25000,    monthly: 130 },
      { upTo: 40000,    monthly: 150 },
      { upTo: Infinity, monthly: 200 },
    ],
  },
  KL: {
    slabs: [
      { upTo: 1999,     monthly: 0   },
      { upTo: 2999,     monthly: 20  },
      { upTo: 4999,     monthly: 30  },
      { upTo: 7499,     monthly: 50  },
      { upTo: 9999,     monthly: 75  },
      { upTo: 12499,    monthly: 100 },
      { upTo: 16666,    monthly: 125 },
      { upTo: 20833,    monthly: 166 },
      { upTo: Infinity, monthly: 208 },
    ],
  },
  AP: {
    slabs: [
      { upTo: 15000,    monthly: 0   },
      { upTo: 20000,    monthly: 150 },
      { upTo: Infinity, monthly: 200 },
    ],
  },
  TG: {
    slabs: [
      { upTo: 15000,    monthly: 0   },
      { upTo: 20000,    monthly: 150 },
      { upTo: Infinity, monthly: 200 },
    ],
  },
  GJ: {
    slabs: [
      { upTo: 5999,     monthly: 0   },
      { upTo: 8999,     monthly: 80  },
      { upTo: 11999,    monthly: 150 },
      { upTo: Infinity, monthly: 200 },
    ],
  },
  OD: {
    slabs: [
      { upTo: 13304,    monthly: 0   },
      { upTo: 25000,    monthly: 125 },
      { upTo: Infinity, monthly: 200 },
    ],
  },
  AS: {
    slabs: [
      { upTo: 9999,     monthly: 0   },
      { upTo: 14999,    monthly: 150 },
      { upTo: 24999,    monthly: 180 },
      { upTo: Infinity, monthly: 208 },
    ],
  },
  MP: {
    slabs: [
      { upTo: 18750,    monthly: 0   },
      { upTo: 25000,    monthly: 125 },
      { upTo: 33333,    monthly: 167 },
      { upTo: Infinity, monthly: 208 },
    ],
  },
  JH: {
    slabs: [
      { upTo: 25000,    monthly: 0   },
      { upTo: 41666,    monthly: 100 },
      { upTo: Infinity, monthly: 150 },
    ],
  },
  PB: {
    slabs: [
      { upTo: 24999,    monthly: 0   },
      { upTo: Infinity, monthly: 200 },
    ],
  },
  GA: {
    slabs: [
      { upTo: 15000,    monthly: 0   },
      { upTo: 25000,    monthly: 150 },
      { upTo: Infinity, monthly: 200 },
    ],
  },
  SK: {
    slabs: [
      { upTo: 20000,    monthly: 0   },
      { upTo: 30000,    monthly: 125 },
      { upTo: 40000,    monthly: 150 },
      { upTo: Infinity, monthly: 200 },
    ],
  },
  TR: {
    slabs: [
      { upTo: 7500,     monthly: 0   },
      { upTo: 15000,    monthly: 120 },
      { upTo: Infinity, monthly: 208 },
    ],
  },
  HP: {
    slabs: [
      { upTo: 7500,     monthly: 0   },
      { upTo: 12500,    monthly: 125 },
      { upTo: 17500,    monthly: 175 },
      { upTo: Infinity, monthly: 208 },
    ],
  },
  ML: {
    slabs: [
      { upTo: 4166,     monthly: 0   },
      { upTo: 6250,     monthly: 16  },
      { upTo: 8333,     monthly: 25  },
      { upTo: 12500,    monthly: 41  },
      { upTo: 16666,    monthly: 62  },
      { upTo: 20833,    monthly: 83  },
      { upTo: 25000,    monthly: 150 },
      { upTo: Infinity, monthly: 208 },
    ],
  },
};

const getMonthlyPT = (stateCode, monthlyGross, month = 0, year = 0, targetDate = null) => {
  if (!stateCode) return 0;
  const cfg = PT_STATE_CONFIGS[stateCode.toUpperCase()];
  if (!cfg) return 0;

  const gross = Number(monthlyGross) || 0;
  if (gross <= 0) return 0;

  let effectiveDateObj = targetDate ? new Date(targetDate) : null;
  if (!effectiveDateObj && year > 0 && month > 0) {
    effectiveDateObj = new Date(year, month - 1, 1);
  }

  let activeConfig = cfg;
  if (Array.isArray(cfg.versions) && cfg.versions.length > 0) {
    const searchDate = effectiveDateObj || new Date();
    const matchedVersion = cfg.versions
      .filter(v => new Date(v.effectiveFrom) <= searchDate)
      .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0];
    if (matchedVersion) {
      activeConfig = matchedVersion;
    }
  }

  const slabs = activeConfig.slabs || cfg.slabs || [];
  if (slabs.length === 0) return 0;

  const matchedSlab = slabs.find(s => gross <= s.upTo);
  const slabAmount = matchedSlab ? matchedSlab.monthly : slabs[slabs.length - 1].monthly;

  if (
    stateCode.toUpperCase() === 'MH' &&
    Number(month) === 2 &&
    activeConfig.februaryTopBracketThreshold !== undefined &&
    gross > activeConfig.februaryTopBracketThreshold
  ) {
    return activeConfig.februaryTopBracketAmount;
  }

  return slabAmount;
};

const getSegmentLops = (totalLop, workingDays, totalDays, strategy = 'proportional', segments = [], customLops = []) => {
  const segmentLops = new Array(segments.length).fill(0);
  if (totalLop <= 0 || segments.length === 0) return segmentLops;

  if (strategy === 'custom') {
    let sum = 0;
    for (let i = 0; i < segments.length; i++) {
      segmentLops[i] = Number(customLops[i]) || 0;
      sum += segmentLops[i];
    }
    for (let i = 0; i < segments.length; i++) {
      const segWorkingDays = (segments[i].daysCount / totalDays) * workingDays;
      segmentLops[i] = Math.max(0, Math.min(segWorkingDays, segmentLops[i]));
    }
  } else if (strategy === 'older_first') {
    let remainingLop = totalLop;
    for (let i = 0; i < segments.length; i++) {
      const segWorkingDays = (segments[i].daysCount / totalDays) * workingDays;
      const segLop = Math.min(remainingLop, segWorkingDays);
      segmentLops[i] = roundAmount(segLop);
      remainingLop -= segLop;
    }
  } else if (strategy === 'newer_first') {
    let remainingLop = totalLop;
    for (let i = segments.length - 1; i >= 0; i--) {
      const segWorkingDays = (segments[i].daysCount / totalDays) * workingDays;
      const segLop = Math.min(remainingLop, segWorkingDays);
      segmentLops[i] = roundAmount(segLop);
      remainingLop -= segLop;
    }
  } else {
    // proportional
    for (let i = 0; i < segments.length; i++) {
      const segRatio = segments[i].daysCount / totalDays;
      segmentLops[i] = roundAmount(segRatio * totalLop);
    }
  }
  return segmentLops;
};

const getDayProrateArray = (totalDays, workingDays, paidDays, strategy = 'proportional', segmentLops = [], segments = []) => {
  const dayProrate = new Array(totalDays).fill(1);
  if (workingDays <= 0) return dayProrate;
  const ratio = Math.min(paidDays / workingDays, 1);
  if (ratio >= 1) return dayProrate;

  if (segments.length === 0) {
    dayProrate.fill(ratio);
    return dayProrate;
  }

  const computedLops = getSegmentLops(workingDays - paidDays, workingDays, totalDays, strategy, segments, segmentLops);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segLop = computedLops[i] || 0;
    const segRatio = seg.daysCount / totalDays;
    const segWorkingDays = segRatio * workingDays;
    const segProrate = segWorkingDays > 0 ? Math.max(0, Math.min(1, (segWorkingDays - segLop) / segWorkingDays)) : 1;
    for (let d = seg.startDay; d <= seg.endDay; d++) {
      dayProrate[d - 1] = segProrate;
    }
  }
  return dayProrate;
};

export const normalizePayrollConfig = (config = {}) => {
  const res = { ...DEFAULT_PAYROLL_CONFIG, ...config };
  Object.keys(DEFAULT_PAYROLL_CONFIG).forEach(k => {
    if (typeof DEFAULT_PAYROLL_CONFIG[k] === 'number') {
      const n = Number(config?.[k]);
      res[k] = Number.isFinite(n) ? n : DEFAULT_PAYROLL_CONFIG[k];
    }
  });
  return res;
};

export const getMonthlyCTCValue = (source = {}) => {
  const monthlyCTC = Number(source.monthlyCTC);
  if (Number.isFinite(monthlyCTC) && monthlyCTC > 0) return monthlyCTC;

  const annualCTC = Number(source.annualCTC);
  if (Number.isFinite(annualCTC) && annualCTC > 0) return annualCTC / 12;

  const salaryCTC = Number(source.salaryStructure?.ctc);
  if (Number.isFinite(salaryCTC) && salaryCTC > 0) return salaryCTC;

  return 0;
};

export const calculateHRAExemption = (basicMaster, hraMaster, rentPaidMonthly, isMetroCity) => {
  const annualBasic = basicMaster * 12;
  const annualHRA = hraMaster * 12;
  const rentPaidAnnual = (Number(rentPaidMonthly) || 0) * 12;
  if (rentPaidAnnual <= 0) return 0;

  const pctOfBasic = annualBasic * 0.10;
  const capPercent = isMetroCity ? 0.50 : 0.40;
  const capAmount = annualBasic * capPercent;

  return Math.max(0, Math.min(
    annualHRA,
    rentPaidAnnual - pctOfBasic,
    capAmount
  ));
};

export const calculateTaxForRegime = (regime, annualTaxableIncome) => {
  const income = Math.max(0, annualTaxableIncome);
  let tax = 0;

  if (regime === 'new') {
    if (income <= 400000) return 0;
    if (income > 2400000) {
      tax += (income - 2400000) * 0.30;
      tax += 300000;
    } else if (income > 2000000) {
      tax += (income - 2000000) * 0.25;
      tax += 200000;
    } else if (income > 1600000) {
      tax += (income - 1600000) * 0.20;
      tax += 120000;
    } else if (income > 1200000) {
      tax += (income - 1200000) * 0.15;
      tax += 60000;
    } else if (income > 800000) {
      tax += (income - 800000) * 0.10;
      tax += 20000;
    } else if (income > 400000) {
      tax += (income - 400000) * 0.05;
    }

    if (income <= 1200000) {
      tax = 0;
    }
  } else {
    // Old Regime
    if (income <= 250000) return 0;
    if (income > 1000000) {
      tax += (income - 1000000) * 0.30;
      tax += 112500;
    } else if (income > 500000) {
      tax += (income - 500000) * 0.20;
      tax += 12500;
    } else if (income > 250000) {
      tax += (income - 250000) * 0.05;
    }

    if (income <= 500000) {
      tax = 0;
    }
  }

  return tax;
};

export const calculateTaxDetails = (employee, monthlyCTC, config, basicMaster, hraMaster, totalEarnings) => {
  const annualGrossEarnings = totalEarnings * 12;
  const dec = employee.declarations || {};
  const ptEnabled = employee.ptEnabled !== false;

  // 1. New Regime calculations
  const standardDeductionNew = 75000;
  const netTaxableIncomeNew = Math.max(0, annualGrossEarnings - standardDeductionNew);
  let annualTaxNewBase = calculateTaxForRegime('new', netTaxableIncomeNew);
  // Apply Marginal Relief under Section 87A for New Regime (Budget 2025 limit: ₹12 Lakhs)
  if (netTaxableIncomeNew > 1200000) {
    const excessIncome = netTaxableIncomeNew - 1200000;
    if (annualTaxNewBase > excessIncome) {
      annualTaxNewBase = excessIncome;
    }
  }
  const cessNew = roundAmount(annualTaxNewBase * 0.04);
  const annualTaxNew = roundAmount(annualTaxNewBase + cessNew);
  const monthlyTaxNew = roundAmount(annualTaxNew / 12);

  // 2. Old Regime calculations
  const standardDeductionOld = 50000;
  const hraExemption = calculateHRAExemption(basicMaster, hraMaster, dec.rentPaidMonthly || 0, dec.isMetroCity || false);
  const sec80C = Math.min(Number(dec.section80C) || 0, 150000);
  const sec80D = Math.min(Number(dec.section80D) || 0, 25000);
  const sec24b = Math.min(Number(dec.section24b) || 0, 200000);
  const sec80CCD1B = Math.min(Number(dec.section80CCD1B) || 0, 50000);
  const otherExemptions = Number(dec.otherExemptions) || 0;
  const professionalTaxOld = ptEnabled ? (Number(employee.deductions?.professionalTax) || 0) * 12 : 0;

  const totalDeductionsOld = standardDeductionOld + hraExemption + sec80C + sec80D + sec24b + sec80CCD1B + otherExemptions + professionalTaxOld;
  const netTaxableIncomeOld = Math.max(0, annualGrossEarnings - totalDeductionsOld);
  const annualTaxOldBase = calculateTaxForRegime('old', netTaxableIncomeOld);
  const cessOld = roundAmount(annualTaxOldBase * 0.04);
  const annualTaxOld = roundAmount(annualTaxOldBase + cessOld);
  const monthlyTaxOld = roundAmount(annualTaxOld / 12);

  return {
    newRegime: {
      standardDeduction: standardDeductionNew,
      netTaxableIncome: netTaxableIncomeNew,
      annualTaxBase: annualTaxNewBase,
      cess: cessNew,
      annualTax: annualTaxNew,
      monthlyTax: monthlyTaxNew,
    },
    oldRegime: {
      standardDeduction: standardDeductionOld,
      hraExemption,
      section80C: sec80C,
      section80D: sec80D,
      section24b: sec24b,
      section80CCD1B: sec80CCD1B,
      otherExemptions,
      professionalTax: professionalTaxOld,
      totalDeductions: totalDeductionsOld,
      netTaxableIncome: netTaxableIncomeOld,
      annualTaxBase: annualTaxOldBase,
      cess: cessOld,
      annualTax: annualTaxOld,
      monthlyTax: monthlyTaxOld,
    }
  };
};

export const buildMasterSalaryStructure = (source = {}, configInput = {}) => {
  const config = normalizePayrollConfig(configInput);
  
  // Flatten salaryBreakup overrides onto source copy
  const src = { ...source };
  if (source.salaryBreakup) {
    const breakupObj = source.salaryBreakup instanceof Map 
      ? Object.fromEntries(source.salaryBreakup) 
      : source.salaryBreakup;
    Object.assign(src, breakupObj);
  } else if (source.compensation?.salaryBreakup) {
    const breakupObj = source.compensation.salaryBreakup instanceof Map
      ? Object.fromEntries(source.compensation.salaryBreakup)
      : source.compensation.salaryBreakup;
    Object.assign(src, breakupObj);
  }

  const compType = src.compensationType || (src.payType === 'hourly' ? 'hourly' : 'monthly_salary');
  const NON_COMPONENT_STRATEGIES = ['hourly', 'daily_wage', 'piece_rate', 'project_based', 'milestone_based', 'timesheet_based', 'commission_only', 'retainer'];

  let monthlyCTC = roundAmount(Number(src.monthlyCTC) || 0);

  if (compType === 'hourly' || compType === 'timesheet_based') {
    const hours = src.hoursWorked !== undefined ? Number(src.hoursWorked) : (src.periodInput?.hoursWorked ?? 160);
    monthlyCTC = roundAmount((Number(src.hourlyRate) || 0) * hours);
  } else if (compType === 'daily_wage') {
    const days = src.paidDays !== undefined ? Number(src.paidDays) : (src.periodInput?.daysWorked ?? 26);
    monthlyCTC = roundAmount((Number(src.dailyRate) || 0) * days);
  } else if (compType === 'piece_rate') {
    const units = src.periodInput?.unitsProduced !== undefined ? Number(src.periodInput.unitsProduced) : 1;
    const rateCardEntry = (src.rateCard || []).find(r => r.paymentType === 'UNIT') || (src.rateCard || [])[0];
    const rate = Number(src.periodInput?.ratePerUnit) || (rateCardEntry ? Number(rateCardEntry.rate) : 0);
    monthlyCTC = roundAmount(units * rate);
  } else if (compType === 'project_based') {
    monthlyCTC = roundAmount(Number(src.periodInput?.projectFee) || Number(src.projectFee) || 0);
  } else if (compType === 'milestone_based') {
    monthlyCTC = roundAmount(Number(src.periodInput?.milestoneAmount) || Number(src.milestoneAmount) || 0);
  }

  const isIntern = src.employmentType === 'intern';
  const isNonComponentStrategy = NON_COMPONENT_STRATEGIES.includes(compType);
  const useComponents = src.useSalaryComponents !== false && !isIntern && !isNonComponentStrategy;

  const pfEnabled = !isIntern && !isNonComponentStrategy && src.pfEnabled !== false;
  const esiEnabled = !isIntern && !isNonComponentStrategy && src.esiEnabled !== false;
  const ptEnabled = !isIntern && !isNonComponentStrategy && src.ptEnabled !== false;
  const lwfEnabled = !isIntern && !isNonComponentStrategy && src.lwfEnabled !== false;
  const tdsEnabled = src.tdsEnabled !== false;
  const gratuityEnabled = !isIntern && !isNonComponentStrategy && src.gratuityEnabled !== false;
  const includePfInCTC = !isIntern && !isNonComponentStrategy && src.includePfInCTC === true;
  const includeGratuityInCTC = !isIntern && !isNonComponentStrategy && src.includeGratuityInCTC !== false;

  let basicPercent = !useComponents ? 1.0 : config.basicPercent;
  if (useComponents && src.basicPercent !== undefined && src.basicPercent !== null && Number(src.basicPercent) > 0) {
    basicPercent = Number(src.basicPercent) > 1 ? Number(src.basicPercent) / 100 : Number(src.basicPercent);
  }

  let hraPercent = !useComponents ? 0 : config.hraPercent;
  if (useComponents && src.hraPercent !== undefined && src.hraPercent !== null && Number(src.hraPercent) > 0) {
    hraPercent = Number(src.hraPercent) > 1 ? Number(src.hraPercent) / 100 : Number(src.hraPercent);
  }

  const hasDynamicComponents = config.salaryComponents && config.salaryComponents.length > 0;

  let basicMaster = roundAmount(monthlyCTC * basicPercent);
  const sourceBasic = src.basic !== undefined ? src.basic : src.salaryStructure?.basic;
  if (useComponents && sourceBasic !== undefined && sourceBasic !== null && Number(sourceBasic) > 0) {
    basicMaster = roundAmount(sourceBasic);
  }

  let hraMaster = roundAmount(basicMaster * hraPercent);
  const sourceHra = src.hra !== undefined ? src.hra : src.salaryStructure?.hra;
  if (useComponents && sourceHra !== undefined && sourceHra !== null && Number(sourceHra) > 0) {
    hraMaster = roundAmount(sourceHra);
  }

  if (hasDynamicComponents) {
    const basicComp = config.salaryComponents.find(c => c.id === 'basic');
    if (basicComp) {
      const sourceBasic = src.basic !== undefined ? src.basic : src.salaryStructure?.basic;
      if (!useComponents) {
        basicMaster = monthlyCTC;
      } else if (useComponents && basicComp.linkedTo === 'fixed' && sourceBasic !== undefined && sourceBasic !== null && Number(sourceBasic) > 0) {
        basicMaster = roundAmount(sourceBasic);
      } else {
        let bVal = basicComp.linkValue;
        if (src.basicPercent !== undefined && src.basicPercent !== null && Number(src.basicPercent) > 0) {
          bVal = Number(src.basicPercent) > 1 ? Number(src.basicPercent) / 100 : Number(src.basicPercent);
        }
        if (basicComp.linkedTo === 'ctc_percent') {
          basicMaster = roundAmount(monthlyCTC * bVal);
        } else if (basicComp.linkedTo === 'fixed') {
          const val = src['basic'] !== undefined ? src['basic'] : (src.salaryStructure?.['basic'] !== undefined ? src.salaryStructure['basic'] : 0);
          basicMaster = roundAmount(val);
        }
      }
    }
    const hraComp = config.salaryComponents.find(c => c.id === 'hra');
    if (hraComp) {
      const sourceHra = src.hra !== undefined ? src.hra : src.salaryStructure?.hra;
      if (!useComponents) {
        hraMaster = 0;
      } else if (useComponents && hraComp.linkedTo === 'fixed' && sourceHra !== undefined && sourceHra !== null && Number(sourceHra) > 0) {
        hraMaster = roundAmount(sourceHra);
      } else {
        let hVal = hraComp.linkValue;
        if (src.hraPercent !== undefined && src.hraPercent !== null && Number(src.hraPercent) > 0) {
          hVal = Number(src.hraPercent) > 1 ? Number(src.hraPercent) / 100 : Number(src.hraPercent);
        }
        if (hraComp.linkedTo === 'basic_percent') {
          hraMaster = roundAmount(basicMaster * hVal);
        } else if (hraComp.linkedTo === 'ctc_percent') {
          hraMaster = roundAmount(monthlyCTC * hVal);
        } else if (hraComp.linkedTo === 'fixed') {
          const val = src['hra'] !== undefined ? src['hra'] : (src.salaryStructure?.['hra'] !== undefined ? src.salaryStructure['hra'] : 0);
          hraMaster = roundAmount(val);
        }
      }
    }
  }

  // PF Calculation
  let pfEmployer = 0;
  let pfEmployee = 0;
  let pfBase = 0;
  if (pfEnabled) {
    if (config.pfCalculationType === 'fixed') {
      pfEmployer = roundAmount(config.pfAmountEmployer);
      pfEmployee = roundAmount(config.pfAmountEmployee);
      pfBase = pfEmployee;
    } else {
      pfBase = roundAmount(Math.min(basicMaster, config.pfCap));
      pfEmployer = roundAmount(pfBase * config.pfEmployerRate);
      pfEmployee = roundAmount(pfBase * config.pfRate);
    }
  }

  // Gratuity Calculation
  const gratuity = gratuityEnabled ? roundAmount(basicMaster * config.gratuityRate) : 0;

  // LWF Calculation
  const lwfEmployer = (lwfEnabled && monthlyCTC > 0) ? roundAmount(config.lwfEmployer) : 0;
  const lwfEmployee = (lwfEnabled && monthlyCTC > 0) ? roundAmount(config.lwfEmployee) : 0;

  const insurance = monthlyCTC > 0 ? roundAmount(src.insuranceAmount ?? config.defaultInsurance) : 0;
  const employerNPS = roundAmount(src.employerNPS);

  // ESI Calculation — Two-pass to avoid circular dependency:
  // Pass 1: compute earnings with ESI=0 to get actual gross wages
  // Pass 2: check gross wages vs threshold, then apply ESI
  const pfEmployerInCTC = (pfEnabled && includePfInCTC) ? pfEmployer : 0;
  const gratuityInCTC = (gratuityEnabled && includeGratuityInCTC) ? gratuity : 0;

  const otherAllowances = src.salaryStructure?.otherAllowances || src.otherAllowances || [];
  const otherAllowancesSum = roundAmount(otherAllowances.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));

  let flexi = 0, broadband = 0, petrol = 0, lta = 0, ltaCap = 0, conveyance = 0, medicalAllowance = 0, specialAllowance = 0;

  // Helper: compute component earnings for a given ESI employer cost placeholder
  const computeEarnings = (esiEmployerPlaceholder) => {
    const em = {};
    if (hasDynamicComponents) {
      ltaCap = roundAmount(basicMaster * config.ltaMaxPercent);
      let sumOfAllNonRemainder = 0;
      config.salaryComponents.forEach(c => {
        if (c.type === 'earning' && c.linkedTo !== 'remainder') {
          let amount = 0;
          if (c.id === 'basic') {
            amount = basicMaster;
          } else if (c.id === 'hra') {
            amount = hraMaster;
          } else if (c.linkedTo === 'ctc_percent') {
            let pct = c.linkValue;
            const overrideVal = src[c.id + 'Percent'];
            if (overrideVal !== undefined && overrideVal !== null && Number(overrideVal) > 0) {
              pct = Number(overrideVal) > 1 ? Number(overrideVal) / 100 : Number(overrideVal);
            }
            amount = roundAmount(monthlyCTC * pct);
          } else if (c.linkedTo === 'basic_percent') {
            let pct = c.linkValue;
            const overrideVal = src[c.id + 'Percent'];
            if (overrideVal !== undefined && overrideVal !== null && Number(overrideVal) > 0) {
              pct = Number(overrideVal) > 1 ? Number(overrideVal) / 100 : Number(overrideVal);
            }
            amount = roundAmount(basicMaster * pct);
          } else if (c.linkedTo === 'fixed') {
            let val = src[c.id] !== undefined ? src[c.id] : (src.salaryStructure?.[c.id] !== undefined ? src.salaryStructure[c.id] : 0);
            if (c.id === 'medical' && val === 0) {
              val = src.medicalAllowance !== undefined ? src.medicalAllowance : (src.salaryStructure?.medicalAllowance !== undefined ? src.salaryStructure.medicalAllowance : 0);
            }
            if (c.id === 'flexi' && val === 0) {
              val = src.flexiAmount !== undefined ? src.flexiAmount : (src.salaryStructure?.flexiAmount !== undefined ? src.salaryStructure.flexiAmount : 0);
            }
            amount = roundAmount(val);
          }
          if (c.id === 'lta') amount = roundAmount(Math.min(amount, ltaCap || amount));
          em[c.id] = amount;
          sumOfAllNonRemainder += amount;
        }
      });
      config.salaryComponents.forEach(c => {
        if (c.type === 'earning' && c.linkedTo === 'remainder') {
          em[c.id] = roundAmount(Math.max(
            monthlyCTC - sumOfAllNonRemainder - pfEmployerInCTC - gratuityInCTC - lwfEmployer - insurance - esiEmployerPlaceholder - employerNPS - otherAllowancesSum,
            0
          ));
        }
      });
    }
    return em;
  };

  // Pass 1 — compute earnings with esi=0
  let earningsMap = computeEarnings(0);

  if (hasDynamicComponents) {
    flexi = earningsMap['flexi'] || 0;
    broadband = earningsMap['broadband'] || 0;
    petrol = earningsMap['petrol'] || 0;
    lta = earningsMap['lta'] || 0;
    conveyance = earningsMap['conveyance'] || 0;
    medicalAllowance = earningsMap['medical'] || 0;
    specialAllowance = earningsMap['special'] || 0;
  } else {
    flexi = roundAmount(src.flexiAmount);
    broadband = roundAmount(src.broadband);
    petrol = roundAmount(src.petrol);
    const ltaRequested = roundAmount(src.lta);
    ltaCap = roundAmount(basicMaster * config.ltaMaxPercent);
    lta = roundAmount(Math.min(ltaRequested, ltaCap || ltaRequested));
    conveyance = roundAmount(src.salaryStructure?.conveyance);
    medicalAllowance = roundAmount(src.salaryStructure?.medicalAllowance);
    // Pass 1: specialAllowance without ESI deduction (ESI not yet known)
    specialAllowance = roundAmount(Math.max(
      monthlyCTC - basicMaster - hraMaster - flexi - broadband - petrol - lta - pfEmployerInCTC - gratuityInCTC - lwfEmployer - insurance - employerNPS - conveyance - medicalAllowance - otherAllowancesSum,
      0
    ));
  }
  if (!useComponents) {
    basicMaster = monthlyCTC;
    hraMaster = 0;
    flexi = 0; broadband = 0; petrol = 0; lta = 0; conveyance = 0; medicalAllowance = 0; specialAllowance = 0;
    if (hasDynamicComponents) {
      Object.keys(earningsMap).forEach(k => { earningsMap[k] = k === 'basic' ? monthlyCTC : 0; });
    }
  }

  // Pass 1 totalEarnings — to determine ESI eligibility
  const pass1TotalEarnings = hasDynamicComponents
    ? roundAmount(Object.values(earningsMap).reduce((sum, v) => sum + v, 0) + otherAllowancesSum)
    : roundAmount(basicMaster + hraMaster + flexi + broadband + petrol + lta + specialAllowance + conveyance + medicalAllowance + otherAllowancesSum);

  // Pass 2 — determine ESI from actual gross wages
  const esiApplicable = esiEnabled && (pass1TotalEarnings <= config.esiBasicThreshold);
  const esiEmployer = roundAmount(esiApplicable ? basicMaster * config.esiEmployerRate : 0);
  const esiEmployee = roundAmount(esiApplicable ? basicMaster * config.esiEmployeeRate : 0);

  // Re-compute earnings with correct ESI cost for dynamic-component remainder or special allowance
  if (esiApplicable) {
    if (hasDynamicComponents) {
      earningsMap = computeEarnings(esiEmployer);
      flexi = earningsMap['flexi'] || 0;
      broadband = earningsMap['broadband'] || 0;
      petrol = earningsMap['petrol'] || 0;
      lta = earningsMap['lta'] || 0;
      conveyance = earningsMap['conveyance'] || 0;
      medicalAllowance = earningsMap['medical'] || 0;
      specialAllowance = earningsMap['special'] || 0;
      if (!useComponents) {
        basicMaster = monthlyCTC;
        hraMaster = 0;
        Object.keys(earningsMap).forEach(k => { earningsMap[k] = k === 'basic' ? monthlyCTC : 0; });
      }
    } else {
      specialAllowance = roundAmount(Math.max(
        monthlyCTC - basicMaster - hraMaster - flexi - broadband - petrol - lta - pfEmployerInCTC - gratuityInCTC - lwfEmployer - insurance - esiEmployer - employerNPS - conveyance - medicalAllowance - otherAllowancesSum,
        0
      ));
    }
  }

  const totalEarnings = hasDynamicComponents
    ? roundAmount(Object.values(earningsMap).reduce((sum, v) => sum + v, 0) + otherAllowancesSum)
    : roundAmount(basicMaster + hraMaster + flexi + broadband + petrol + lta + specialAllowance + conveyance + medicalAllowance + otherAllowancesSum);

  // Gross Salary = all earnings paid to employee (Basic + HRA + Flexi + all allowances)
  // Standard CTC formula: CTC = Gross + Employer PF + Employer ESI + LWF + Gratuity + Employer NPS
  const grossSalary = totalEarnings;

  const totalEmployerContributions = roundAmount(
    pfEmployer + esiEmployer + gratuity + lwfEmployer + insurance + employerNPS
  );

  // Dynamic Tax Engine Calculations
  const taxRegime = src.taxRegime || 'new';
  const declarations = src.declarations || {};

  const taxDetails = calculateTaxDetails({
    ...src,
    ptEnabled,
    taxRegime,
    declarations
  }, monthlyCTC, config, basicMaster, hraMaster, totalEarnings);

  const calculatedTdsMonthly = taxDetails[taxRegime === 'old' ? 'oldRegime' : 'newRegime'].monthlyTax;
  const tds = tdsEnabled
    ? (Number(src.deductions?.tds) > 0 ? Number(src.deductions?.tds) : roundAmount(calculatedTdsMonthly))
    : 0;

  const manualPT = Number(src.deductions?.professionalTax) || 0;
  const computedPT = (ptEnabled && src.ptState)
    ? getMonthlyPT(src.ptState, totalEarnings, src._month)
    : 0;
  const professionalTax = ptEnabled
    ? (manualPT > 0 ? manualPT : computedPT)
    : 0;
  const otherDeductions = source.deductions?.otherDeductions || source.otherDeductions || [];
  const otherDeductionsSum = roundAmount(otherDeductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));

  const deductionsMap = {};
  if (hasDynamicComponents) {
    config.salaryComponents.forEach(c => {
      if (c.type === 'deduction') {
        let amount = 0;
        if (c.linkedTo === 'ctc_percent') {
          let pct = c.linkValue;
          const overrideVal = src[c.id + 'Percent'];
          if (overrideVal !== undefined && overrideVal !== null && Number(overrideVal) > 0) {
            pct = Number(overrideVal) > 1 ? Number(overrideVal) / 100 : Number(overrideVal);
          }
          amount = roundAmount(monthlyCTC * pct);
        } else if (c.linkedTo === 'basic_percent') {
          let pct = c.linkValue;
          const overrideVal = src[c.id + 'Percent'];
          if (overrideVal !== undefined && overrideVal !== null && Number(overrideVal) > 0) {
            pct = Number(overrideVal) > 1 ? Number(overrideVal) / 100 : Number(overrideVal);
          }
          amount = roundAmount(basicMaster * pct);
        } else if (c.linkedTo === 'fixed') {
          let val = src[c.id] !== undefined ? src[c.id] : (src.deductions?.[c.id] !== undefined ? src.deductions[c.id] : 0);
          amount = roundAmount(val);
        }
        deductionsMap[c.id] = amount;
      }
    });
  }
  const dynamicDeductionsSum = roundAmount(Object.values(deductionsMap).reduce((sum, v) => sum + v, 0));

  const totalDeductions = roundAmount(
    pfEmployee +
    esiEmployee +
    professionalTax +
    tds +
    lwfEmployee +
    otherDeductionsSum +
    dynamicDeductionsSum
  );

  return {
    config,
    monthlyCTC,
    annualCTC: roundAmount(monthlyCTC * 12),
    basicMaster,
    hraMaster,
    pfBase,
    pfEmployer,
    pfEmployee,
    gratuity,
    lwfEmployer,
    lwfEmployee,
    insurance,
    flexi,
    broadband,
    petrol,
    lta,
    ltaCap,
    employerNPS,
    conveyance,
    medicalAllowance,
    specialAllowance,
    esiApplicable,
    esiEmployer,
    esiEmployee,
    grossSalary,
    totalEarnings,
    totalEmployerContributions,
    grossTotalSalary: roundAmount(totalEarnings + totalEmployerContributions),
    totalDeductions,
    netTakeHome: roundAmount(Math.max(0, totalEarnings - totalDeductions)),
    diff: roundAmount(monthlyCTC - (basicMaster + hraMaster + flexi + broadband + petrol + lta + pfEmployerInCTC + gratuityInCTC + lwfEmployer + insurance + esiEmployer + employerNPS + conveyance + medicalAllowance + specialAllowance)),
    taxRegime,
    declarations,
    taxDetails,
    tds,
    professionalTax,
    pfEnabled,
    esiEnabled,
    ptEnabled,
    lwfEnabled,
    gratuityEnabled,
    includePfInCTC,
    includeGratuityInCTC,
    useSalaryComponents: source.useSalaryComponents !== false,
    earningsMap,
    deductionsMap,
  };
};

export const buildPayrollSnapshot = (employee, configInput, attendance, adjustments = {}, monthNum, yearNum) => {
  const config = normalizePayrollConfig(configInput);

  const year = Number(yearNum) || Number(attendance?.year) || Number(adjustments?.year) || new Date().getFullYear();
  const month = Number(monthNum) || Number(attendance?.month) || Number(adjustments?.month) || (new Date().getMonth() + 1);

  const getYYYYMMDD = (dateVal) => {
    const dateObj = new Date(dateVal);
    if (isNaN(dateObj.getTime())) return '';
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getEmployeeParamsForDate = (dateStr) => {
    const revisions = [...(employee.salaryRevisions || [])].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));
    if (revisions.length === 0) {
      return employee;
    }
    const latestRevision = revisions[revisions.length - 1];
    const latestRevDateStr = getYYYYMMDD(latestRevision.effectiveDate);
    if (dateStr >= latestRevDateStr) {
      return employee;
    }
    let activeRevision = null;
    for (let i = revisions.length - 1; i >= 0; i--) {
      const revDateStr = getYYYYMMDD(revisions[i].effectiveDate);
      if (revDateStr && revDateStr <= dateStr) {
        activeRevision = revisions[i];
        break;
      }
    }
    if (!activeRevision) {
      activeRevision = revisions[0];
    }

    const getVal = (field, def) => {
      if (activeRevision && activeRevision[field] !== undefined && activeRevision[field] !== null) {
        return activeRevision[field];
      }
      if (employee[field] !== undefined && employee[field] !== null) {
        return employee[field];
      }
      return def;
    };

    const getDeductionVal = (field, def) => {
      if (activeRevision && activeRevision.deductions && activeRevision.deductions[field] !== undefined && activeRevision.deductions[field] !== null) {
        return activeRevision.deductions[field];
      }
      if (employee.deductions && employee.deductions[field] !== undefined && employee.deductions[field] !== null) {
        return employee.deductions[field];
      }
      return def;
    };

    const getStructureVal = (field, def) => {
      if (activeRevision && activeRevision.salaryStructure && activeRevision.salaryStructure[field] !== undefined && activeRevision.salaryStructure[field] !== null) {
        return activeRevision.salaryStructure[field];
      }
      if (employee.salaryStructure && employee.salaryStructure[field] !== undefined && employee.salaryStructure[field] !== null) {
        return employee.salaryStructure[field];
      }
      return def;
    };

    let monthlyCTC = Number(activeRevision.newCTC) || Number(activeRevision.monthlyCTC) || 0;
    if (!monthlyCTC && activeRevision === revisions[0]) {
      monthlyCTC = Number(revisions[0].previousCTC) || Number(employee.monthlyCTC) || 0;
    }

    const resObj = {
      monthlyCTC,
      employmentType: getVal('employmentType', 'full-time'),
      compensationModel: getVal('compensationModel', 'SALARIED'),
      paymentBasis: getVal('paymentBasis', 'MONTHLY'),
      payType: getVal('payType', 'salaried'),
      hourlyRate: getVal('hourlyRate', 0),
      pfEnabled: getVal('pfEnabled', true),
      esiEnabled: getVal('esiEnabled', true),
      ptEnabled: getVal('ptEnabled', true),
      ptState: getVal('ptState', ''),
      lwfEnabled: getVal('lwfEnabled', true),
      gratuityEnabled: getVal('gratuityEnabled', true),
      includePfInCTC: getVal('includePfInCTC', false),
      includeGratuityInCTC: getVal('includeGratuityInCTC', true),
      basicPercent: getVal('basicPercent', null),
      hraPercent: getVal('hraPercent', null),
      useSalaryComponents: getVal('useSalaryComponents', true),
      joiningBonus: getVal('joiningBonus', 0),
      flexiAmount: getVal('flexiAmount', 0),
      broadband: getVal('broadband', 0),
      petrol: getVal('petrol', 0),
      lta: getVal('lta', 0),
      employerNPS: getVal('employerNPS', 0),
      insuranceAmount: getVal('insuranceAmount', 0),
      deductions: {
        tds: getDeductionVal('tds', 0),
        professionalTax: getDeductionVal('professionalTax', 0),
        otherDeductions: getDeductionVal('otherDeductions', []),
      },
      salaryStructure: {
        conveyance: getStructureVal('conveyance', 0),
        medicalAllowance: getStructureVal('medicalAllowance', 0),
        otherAllowances: getStructureVal('otherAllowances', []),
      },
    };

    if (config?.salaryComponents) {
      config.salaryComponents.forEach(c => {
        const pctKey = `${c.id}Percent`;
        resObj[pctKey] = getVal(pctKey, null);
        resObj[c.id] = getVal(c.id, null);
        if (c.type === 'deduction') {
          resObj.deductions[c.id] = getDeductionVal(c.id, null);
        } else {
          resObj.salaryStructure[c.id] = getStructureVal(c.id, null);
        }
      });
    }

    return resObj;
  };

  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const dailyStructures = [];
  const dailyOtherAllowances = [];
  const dailyOtherDeductions = [];

  const isHourly = employee.payType === 'hourly';
  const hoursWorked = isHourly ? (Number(attendance?.hoursWorked) || Number(adjustments?.hoursWorked) || Number(employee.hoursWorked) || 0) : 0;

  const periodInput = {
    daysWorked:      Number(adjustments.daysWorked ?? adjustments.periodInput?.daysWorked ?? attendance?.paidDays ?? 0),
    unitsProduced:   Number(adjustments.unitsProduced ?? adjustments.periodInput?.unitsProduced ?? 0),
    hoursLogged:     Number(adjustments.hoursLogged ?? adjustments.periodInput?.hoursLogged ?? adjustments.timesheetHours ?? 0),
    hoursWorked:     Number(attendance?.hoursWorked ?? adjustments.hoursWorked ?? adjustments.periodInput?.hoursWorked ?? employee.hoursWorked ?? 0),
    projectFee:      adjustments.projectFee !== undefined ? Number(adjustments.projectFee) : (adjustments.periodInput?.projectFee !== undefined ? Number(adjustments.periodInput.projectFee) : undefined),
    milestoneAmount: adjustments.milestoneAmount !== undefined ? Number(adjustments.milestoneAmount) : (adjustments.periodInput?.milestoneAmount !== undefined ? Number(adjustments.periodInput.milestoneAmount) : undefined),
    ratePerUnit:     adjustments.ratePerUnit !== undefined ? Number(adjustments.ratePerUnit) : (adjustments.periodInput?.ratePerUnit !== undefined ? Number(adjustments.periodInput.ratePerUnit) : undefined),
    variableTransactions: Array.isArray(adjustments.variableTransactions) ? adjustments.variableTransactions : (Array.isArray(adjustments.periodInput?.variableTransactions) ? adjustments.periodInput.variableTransactions : []),
  };

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const currentStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const activeParams = getEmployeeParamsForDate(currentStr);
    
    const daySource = {
      ...activeParams,
      periodInput,
      hoursWorked: isHourly ? hoursWorked : undefined,
      pfEnabled: adjustments.pfEnabled !== undefined ? adjustments.pfEnabled : activeParams.pfEnabled,
      tdsEnabled: adjustments.tdsEnabled !== undefined ? adjustments.tdsEnabled : activeParams.tdsEnabled,
      esiEnabled: adjustments.esiEnabled !== undefined ? adjustments.esiEnabled : activeParams.esiEnabled,
      ptEnabled: adjustments.ptEnabled !== undefined ? adjustments.ptEnabled : activeParams.ptEnabled,
      ptState: adjustments.ptState !== undefined ? adjustments.ptState : activeParams.ptState,
      lwfEnabled: adjustments.lwfEnabled !== undefined ? adjustments.lwfEnabled : activeParams.lwfEnabled,
      gratuityEnabled: adjustments.gratuityEnabled !== undefined ? adjustments.gratuityEnabled : activeParams.gratuityEnabled,
      includePfInCTC: adjustments.includePfInCTC !== undefined ? adjustments.includePfInCTC : activeParams.includePfInCTC,
      includeGratuityInCTC: adjustments.includeGratuityInCTC !== undefined ? adjustments.includeGratuityInCTC : activeParams.includeGratuityInCTC,
      basicPercent: adjustments.basicPercent !== undefined && adjustments.basicPercent !== null ? adjustments.basicPercent : activeParams.basicPercent,
      hraPercent: adjustments.hraPercent !== undefined && adjustments.hraPercent !== null ? adjustments.hraPercent : activeParams.hraPercent,
      _month: month,
      _year: year,
    };

    // Copy custom percentage overrides and component overrides from activeParams and adjustments to daySource
    Object.keys(activeParams).forEach(key => {
      if (key.endsWith('Percent') || (config.salaryComponents && config.salaryComponents.some(c => c.id === key || `${c.id}Percent` === key))) {
        daySource[key] = activeParams[key];
      }
    });
    Object.keys(adjustments).forEach(key => {
      if ((key.endsWith('Percent') || (config.salaryComponents && config.salaryComponents.some(c => c.id === key || `${c.id}Percent` === key))) && adjustments[key] !== undefined && adjustments[key] !== null) {
        daySource[key] = adjustments[key];
      }
    });

    const dayMaster = buildMasterSalaryStructure(daySource, config);
    dailyStructures.push(dayMaster);
    dailyOtherAllowances.push(daySource.salaryStructure?.otherAllowances || []);
    dailyOtherDeductions.push(daySource.deductions?.otherDeductions || []);
  }

  const master = {};
  const sample = dailyStructures[0] || {};
  for (const [key, val] of Object.entries(sample)) {
    if (typeof val === 'number') {
      let sum = 0;
      for (const ds of dailyStructures) {
        sum += ds[key] || 0;
      }
      master[key] = roundAmount(sum / totalDaysInMonth);
    } else if (typeof val === 'boolean') {
      master[key] = dailyStructures[dailyStructures.length - 1][key];
    } else {
      master[key] = val;
    }
  }

  const averagedEarningsMap = {};
  for (const ds of dailyStructures) {
    if (ds.earningsMap) {
      for (const [key, val] of Object.entries(ds.earningsMap)) {
        averagedEarningsMap[key] = (averagedEarningsMap[key] || 0) + val;
      }
    }
  }
  for (const key of Object.keys(averagedEarningsMap)) {
    averagedEarningsMap[key] = roundAmount(averagedEarningsMap[key] / totalDaysInMonth);
  }
  master.earningsMap = averagedEarningsMap;

  const allowanceMap = {};
  for (let i = 0; i < totalDaysInMonth; i++) {
    const list = dailyOtherAllowances[i] || [];
    for (const item of list) {
      if (item.name) {
        allowanceMap[item.name] = (allowanceMap[item.name] || 0) + (Number(item.amount) || 0) / totalDaysInMonth;
      }
    }
  }
  const averagedOtherAllowances = Object.entries(allowanceMap).map(([name, amount]) => ({
    name,
    amount: roundAmount(amount)
  }));

  const deductionMap = {};
  for (let i = 0; i < totalDaysInMonth; i++) {
    const list = dailyOtherDeductions[i] || [];
    for (const item of list) {
      if (item.name) {
        deductionMap[item.name] = (deductionMap[item.name] || 0) + (Number(item.amount) || 0) / totalDaysInMonth;
      }
    }
  }
  const averagedOtherDeductions = Object.entries(deductionMap).map(([name, amount]) => ({
    name,
    amount: roundAmount(amount)
  }));

  const workingDays = Math.max(Number(attendance?.workingDays) || config.defaultWorkingDays, 1);
  const rawPaidDays = isHourly
    ? workingDays
    : (attendance?.paidDays !== undefined && attendance?.paidDays !== null
        ? Number(attendance.paidDays)
        : (attendance?.presentDays !== undefined && attendance?.presentDays !== null
            ? Number(attendance.presentDays)
            : workingDays));
  const paidDays = isHourly ? workingDays : Math.max(Math.min(rawPaidDays, workingDays), 0);
  const prorate = isHourly ? 1.0 : Math.min(paidDays / workingDays, 1);

  const segments = [];
  let currentSegment = null;

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const currentStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const activeParams = getEmployeeParamsForDate(currentStr);
    const key = `${activeParams.monthlyCTC}-${activeParams.pfEnabled}-${activeParams.esiEnabled}-${activeParams.tdsEnabled}-${activeParams.gratuityEnabled}`;

    if (!currentSegment || currentSegment.key !== key) {
      if (currentSegment) {
        segments.push(currentSegment);
      }
      currentSegment = {
        key,
        startDay: d,
        endDay: d,
        activeParams,
        daysCount: 1
      };
    } else {
      currentSegment.endDay = d;
      currentSegment.daysCount += 1;
    }
  }
  if (currentSegment) {
    segments.push(currentSegment);
  }

  const lopStrategy = adjustments.lopStrategy || 'proportional';
  const customSegmentLops = adjustments.segmentLops || [];
  const segmentLops = isHourly
    ? new Array(segments.length).fill(0)
    : getSegmentLops(workingDays - paidDays, workingDays, totalDaysInMonth, lopStrategy, segments, customSegmentLops);
  const dayProrate = isHourly
    ? new Array(totalDaysInMonth).fill(1.0)
    : getDayProrateArray(totalDaysInMonth, workingDays, paidDays, lopStrategy, customSegmentLops, segments);

  let otherEarnings = [];
  if (Array.isArray(adjustments.otherEarnings) && adjustments.otherEarnings.length > 0) {
    otherEarnings = adjustments.otherEarnings.map(item => ({
      name: item.name,
      amount: roundAmount(item.amount)
    }));
  } else {
    const otherEarningsMap = {};
    for (let d = 0; d < totalDaysInMonth; d++) {
      const list = dailyOtherAllowances[d] || [];
      for (const item of list) {
        if (item.name) {
          otherEarningsMap[item.name] = (otherEarningsMap[item.name] || 0) + (Number(item.amount) || 0) * dayProrate[d] / totalDaysInMonth;
        }
      }
    }
    otherEarnings = Object.entries(otherEarningsMap).map(([name, amount]) => ({
      name,
      amount: roundAmount(amount)
    }));
  }

  let otherDeductions = [];
  if (Array.isArray(adjustments.otherDeductions) && adjustments.otherDeductions.length > 0) {
    otherDeductions = adjustments.otherDeductions.map(item => ({
      name: item.name,
      amount: roundAmount(item.amount)
    }));
  } else {
    otherDeductions = averagedOtherDeductions.map(item => ({
      name: item.name,
      amount: roundAmount(Number(item.amount) || 0)
    }));
  }

  const isMatchingFrequency = (freq, mNum) => {
    if (!freq || freq === 'monthly') return true;
    const m = Number(mNum) || Number(attendance?.month) || Number(adjustments?.month) || (new Date().getMonth() + 1);
    if (freq === 'quarterly') return m % 3 === 0;
    if (freq === 'semi_annually') return m % 6 === 0;
    if (freq === 'annually') return m % 12 === 0;
    return true;
  };

  const variableTransactions = Array.isArray(adjustments.variableTransactions)
    ? adjustments.variableTransactions
    : [];

  let variableEarningsTotal = 0;
  const variableEarningsDetails = [];

  for (const tx of variableTransactions) {
    const txAmount = Number(tx.amount) || 0;
    variableEarningsTotal += txAmount;
    variableEarningsDetails.push({
      paymentType: tx.paymentType,
      reference: tx.reference || '',
      client: tx.client || '',
      quantity: Number(tx.quantity) || 1,
      rate: Number(tx.rate) || 0,
      amount: txAmount,
      remarks: tx.remarks || '',
    });
  }

  const hasDynamicComponents = config.salaryComponents && config.salaryComponents.length > 0;
  let earnings = {};
  let dynamicDeductionsMap = {};

  if (hasDynamicComponents) {
    earnings = {
      otherEarnings: [...otherEarnings],
      overtime: roundAmount(adjustments.overtime),
    };
    config.salaryComponents.forEach(c => {
      if (c.type === 'earning') {
        let sumEarningVal = 0;
        for (let d = 0; d < totalDaysInMonth; d++) {
          const ds = dailyStructures[d];
          const dailyVal = ds.earningsMap?.[c.id] ?? ds[c.id] ?? 0;
          sumEarningVal += (dailyVal / totalDaysInMonth) * dayProrate[d];
        }
        let proratedVal = roundAmount(sumEarningVal);
        if (!isMatchingFrequency(c.frequency, monthNum)) {
          proratedVal = 0;
        }
        earnings[c.id] = proratedVal;
        
        if (c.id === 'basic') earnings.basic = proratedVal;
        else if (c.id === 'hra') earnings.hra = proratedVal;
        else if (c.id === 'flexi') earnings.flexiAmount = proratedVal;
        else if (c.id === 'broadband') earnings.broadband = proratedVal;
        else if (c.id === 'petrol') earnings.petrol = proratedVal;
        else if (c.id === 'lta') earnings.lta = proratedVal;
        else if (c.id === 'special') earnings.specialAllowance = proratedVal;
        else if (c.id === 'conveyance') earnings.conveyance = proratedVal;
        else if (c.id === 'medical') earnings.medicalAllowance = proratedVal;
        else {
          const name = c.name || c.id;
          const adjustedIndex = earnings.otherEarnings.findIndex(x => x.name === name);
          if (adjustedIndex === -1) {
            earnings.otherEarnings.push({ name, amount: proratedVal });
          }
        }
      }
    });

    earnings.totalEarnings = roundAmount(
      config.salaryComponents
        .filter(c => c.type === 'earning')
        .reduce((sum, c) => {
          const standardEarningIds = ['basic', 'hra', 'flexi', 'broadband', 'petrol', 'lta', 'special', 'conveyance', 'medical'];
          if (!standardEarningIds.includes(c.id)) return sum;
          return sum + (earnings[c.id] || 0);
        }, 0) +
      earnings.overtime +
      sumNamedAmounts(earnings.otherEarnings) +
      variableEarningsTotal
    );
    earnings.variableCompensation = variableEarningsDetails;

    // Compute dynamic custom deductions in buildPayrollSnapshot.
    // Store prorated values in dynamicDeductionsMap ONLY — do NOT push into otherDeductions,
    // which is reserved for user-entered custom run deductions. Mixing the two causes
    // double-counting in totalDeductions.
    config.salaryComponents.forEach(c => {
      if (c.type === 'deduction') {
        let sumDeductionVal = 0;
        for (let d = 0; d < totalDaysInMonth; d++) {
          const ds = dailyStructures[d];
          const dailyVal = ds.deductionsMap?.[c.id] ?? ds[c.id] ?? 0;
          sumDeductionVal += (dailyVal / totalDaysInMonth) * dayProrate[d];
        }
        let proratedVal = roundAmount(sumDeductionVal);
        if (!isMatchingFrequency(c.frequency, monthNum)) {
          proratedVal = 0;
        }
        dynamicDeductionsMap[c.id] = proratedVal;
      }
    });
  } else {
    const sumDailyComponent = (compField) => {
      let sum = 0;
      for (let d = 0; d < totalDaysInMonth; d++) {
        sum += (dailyStructures[d][compField] / totalDaysInMonth) * dayProrate[d];
      }
      return roundAmount(sum);
    };

    earnings = {
      basic: sumDailyComponent('basicMaster'),
      hra: sumDailyComponent('hraMaster'),
      flexiAmount: sumDailyComponent('flexi'),
      broadband: sumDailyComponent('broadband'),
      petrol: sumDailyComponent('petrol'),
      lta: sumDailyComponent('lta'),
      specialAllowance: sumDailyComponent('specialAllowance'),
      overtime: roundAmount(adjustments.overtime),
      conveyance: sumDailyComponent('conveyance'),
      medicalAllowance: sumDailyComponent('medicalAllowance'),
      otherEarnings,
    };
    earnings.totalEarnings = roundAmount(
      Object.values(earnings).filter((value) => typeof value === 'number').reduce((sum, value) => sum + value, 0) +
      sumNamedAmounts(earnings.otherEarnings) +
      variableEarningsTotal
    );
    earnings.variableCompensation = variableEarningsDetails;
  }

  let sumPfEmployee = 0;
  let sumPfEmployer = 0;
  let sumEsiEmployee = 0;
  let sumEsiEmployer = 0;
  let sumGratuity = 0;
  for (let d = 0; d < totalDaysInMonth; d++) {
    const ds = dailyStructures[d];
    const dP = dayProrate[d];

    // 1. PF daily proration
    sumPfEmployee += (ds.pfEmployee / totalDaysInMonth) * dP;
    sumPfEmployer += (ds.pfEmployer / totalDaysInMonth) * dP;

    // 2. Gratuity daily proration
    sumGratuity += (ds.gratuity / totalDaysInMonth) * dP;

    // 3. ESI daily calculation on daily gross wages (excluding overtime)
    let dailyGrossForEsi = 0;
    if (hasDynamicComponents) {
      config.salaryComponents.forEach(c => {
        if (c.type === 'earning') {
          const dailyVal = ds.earningsMap?.[c.id] ?? ds[c.id] ?? 0;
          dailyGrossForEsi += (dailyVal / totalDaysInMonth) * dP;
        }
      });
    } else {
      const dailyBasic = (ds.basicMaster / totalDaysInMonth) * dP;
      const dailyHra = (ds.hraMaster / totalDaysInMonth) * dP;
      const dailyFlexi = (ds.flexi / totalDaysInMonth) * dP;
      const dailyBroadband = (ds.broadband / totalDaysInMonth) * dP;
      const dailyPetrol = (ds.petrol / totalDaysInMonth) * dP;
      const dailyLta = (ds.lta / totalDaysInMonth) * dP;
      const dailySpecial = (ds.specialAllowance / totalDaysInMonth) * dP;
      const dailyConveyance = (ds.conveyance / totalDaysInMonth) * dP;
      const dailyMedical = (ds.medicalAllowance / totalDaysInMonth) * dP;

      dailyGrossForEsi = dailyBasic + dailyHra + dailyFlexi + dailyBroadband + dailyPetrol + dailyLta + dailySpecial + dailyConveyance + dailyMedical;
    }
    dailyGrossForEsi += sumNamedAmounts(otherEarnings) / totalDaysInMonth;

    const dailyEsiEmployee = ds.esiApplicable ? dailyGrossForEsi * config.esiEmployeeRate : 0;
    const dailyEsiEmployer = ds.esiApplicable ? dailyGrossForEsi * config.esiEmployerRate : 0;
    sumEsiEmployee += dailyEsiEmployee;
    sumEsiEmployer += dailyEsiEmployer;
  }
  const pfEmployee = roundAmount(sumPfEmployee);
  const pfEmployer = roundAmount(sumPfEmployer);
  const gratuity = roundAmount(sumGratuity);
  const esiEmployee = roundAmount(sumEsiEmployee);
  const esiEmployer = roundAmount(sumEsiEmployer);

  const employerContributions = {
    pfEmployer,
    esiEmployer,
    gratuity,
    lwfEmployer: master.lwfEmployer,
    insuranceEmployer: master.insurance,
    nps: master.employerNPS,
    grossTotalSalary: roundAmount(
      earnings.totalEarnings +
      pfEmployer +
      gratuity +
      master.lwfEmployer +
      master.insurance +
      esiEmployer +
      master.employerNPS
    ),
  };

  const variablePay = {
    joiningBonus: roundAmount(adjustments.joiningBonus),
    loyaltyBonus: roundAmount(adjustments.loyaltyBonus),
    incentive: roundAmount(adjustments.incentive),
    specialBonus: roundAmount(adjustments.specialBonus),
    otherAllowanceArrear: roundAmount(adjustments.otherAllowanceArrear),
    performanceBonus: roundAmount(adjustments.performanceBonus),
    retentionBonus: roundAmount(adjustments.retentionBonus),
    arrear: roundAmount(adjustments.arrear),
    referralBonus: roundAmount(adjustments.referralBonus),
  };
  variablePay.totalVariablePay = roundAmount(Object.values(variablePay).reduce((sum, value) => sum + value, 0));

  const dynamicDeductionsSum = hasDynamicComponents
    ? roundAmount(Object.values(dynamicDeductionsMap).reduce((sum, v) => sum + v, 0))
    : 0;

  const isTdsEnabled = adjustments.tdsEnabled !== undefined 
    ? adjustments.tdsEnabled 
    : (employee.tdsEnabled !== false);

  const deductions = {
    pfEmployee,
    esiEmployee,
    professionalTax: master.ptEnabled ? roundAmount(master.professionalTax) : 0,
    tds: !isTdsEnabled ? 0 : roundAmount(
      adjustments.tds !== undefined && adjustments.tds !== null
        ? adjustments.tds
        : (Number(employee.deductions?.tds) > 0
            ? employee.deductions.tds
            : (employee.compensationModel && employee.compensationModel !== 'SALARIED'
                ? roundAmount(earnings.totalEarnings * 0.10)
                : master.tds))
    ),
    insuranceEmployee: roundAmount(adjustments.insuranceEmployee),
    lwfEmployee: master.lwfEmployee,
    gratuityDeduction: roundAmount(adjustments.gratuityDeduction),
    loanDeduction: roundAmount(adjustments.loanDeduction),
    advanceDeduction: roundAmount(adjustments.advanceDeduction),
    otherDeductions,
    // Prorated dynamic salary component deductions (VPF, NPS, etc.) — separate from
    // otherDeductions to avoid double-counting.
    deductionsMap: hasDynamicComponents ? dynamicDeductionsMap : {},
  };
  deductions.totalDeductions = roundAmount(
    Object.entries(deductions)
      .filter(([key, value]) => key !== 'otherDeductions' && key !== 'deductionsMap' && typeof value === 'number')
      .reduce((sum, [, value]) => sum + value, 0) +
    sumNamedAmounts(deductions.otherDeductions) +
    dynamicDeductionsSum
  );

  const totalPayable = roundAmount(employerContributions.grossTotalSalary + variablePay.totalVariablePay);

  const reimbursements = Array.isArray(adjustments.reimbursements) ? adjustments.reimbursements : [];
  const totalReimbursementApproved = roundAmount(reimbursements.reduce((sum, r) => sum + (Number(r.approved) || 0), 0));

  const unroundedNet = earnings.totalEarnings + variablePay.totalVariablePay + totalReimbursementApproved - deductions.totalDeductions;
  const netPayClamped = unroundedNet < 0;
  const netSalary = roundAmount(Math.max(0, unroundedNet));

  const compType = employee.compensationType || (employee.payType === 'hourly' ? 'hourly' : 'monthly_salary');
  let belowMinimumWage = false;
  let minimumWageCompliance = null;

  if (['hourly', 'daily_wage', 'piece_rate', 'timesheet_based'].includes(compType)) {
    const minSlabs = {
      KA: { daily: 450, hourly: 56.25 },
      MH: { daily: 480, hourly: 60.00 },
      DL: { daily: 650, hourly: 81.25 },
      TN: { daily: 420, hourly: 52.50 },
      GJ: { daily: 440, hourly: 55.00 },
      DEFAULT: { daily: 400, hourly: 50.00 },
    };
    const stateKey = (employee.ptState || adjustments.ptState || 'DEFAULT').toUpperCase();
    const slabs = minSlabs[stateKey] || minSlabs.DEFAULT;
    let reqMin = 0;
    if (compType === 'hourly') {
      const hours = Number(attendance?.hoursWorked) || Number(adjustments?.hoursWorked) || 0;
      reqMin = hours * slabs.hourly;
    } else {
      reqMin = Number(paidDays || 0) * slabs.daily;
    }
    if (reqMin > 0 && earnings.totalEarnings < reqMin) {
      belowMinimumWage = true;
      minimumWageCompliance = {
        flagged: true,
        state: stateKey,
        computedGross: earnings.totalEarnings,
        requiredMinimum: reqMin,
        shortfall: roundAmount(reqMin - earnings.totalEarnings),
        warningMessage: `[Minimum Wage Flag] Computed gross (₹${earnings.totalEarnings}) is below statutory minimum wage floor (₹${reqMin}) for state ${stateKey}`
      };
    }
  }

  const payrollShortfall = netPayClamped ? {
    shortfallAmount: roundAmount(Math.abs(unroundedNet)),
    notes: 'Non-statutory deductions adjusted to prevent negative net salary'
  } : null;

  return {
    earnings,
    employerContributions,
    variablePay,
    deductions,
    totalPayable,
    reimbursements,
    totalReimbursementApproved,
    netSalary,
    netPayClamped,
    belowMinimumWage,
    payrollShortfall,
    minimumWageCompliance,
    workingDays,
    paidDays,
    lop: roundAmount(Math.max(workingDays - paidDays, 0)),
    master,
    lopStrategy,
    segmentLops,
  };
};

export const serializeRow = (row, monthWorkingDays) => {
  const adjustments = {
    overtime: Number(row?.overtime) || 0,
    joiningBonus: Number(row?.joiningBonus) || 0,
    loyaltyBonus: Number(row?.loyaltyBonus) || 0,
    incentive: Number(row?.incentive) || 0,
    specialBonus: Number(row?.specialBonus) || 0,
    otherAllowanceArrear: Number(row?.otherAllowanceArrear) || 0,
    loanDeduction: Number(row?.loanDeduction) || 0,
    advanceDeduction: Number(row?.advanceDeduction) || 0,
    tds: row?.tds !== undefined && row?.tds !== null ? Number(row.tds) : undefined,
    hoursWorked: Number(row?.hoursWorked) || Number(row?.periodInput?.hoursWorked) || 0,
    daysWorked: row?.daysWorked !== undefined ? Number(row.daysWorked) : (row?.periodInput?.daysWorked !== undefined ? Number(row.periodInput.daysWorked) : (row?.adjustments?.daysWorked !== undefined ? Number(row.adjustments.daysWorked) : undefined)),
    unitsProduced: row?.unitsProduced !== undefined ? Number(row.unitsProduced) : (row?.periodInput?.unitsProduced !== undefined ? Number(row.periodInput.unitsProduced) : (row?.adjustments?.unitsProduced !== undefined ? Number(row.adjustments.unitsProduced) : undefined)),
    hoursLogged: row?.hoursLogged !== undefined ? Number(row.hoursLogged) : (row?.periodInput?.hoursLogged !== undefined ? Number(row.periodInput.hoursLogged) : (row?.adjustments?.hoursLogged !== undefined ? Number(row.adjustments.hoursLogged) : undefined)),
    projectFee: row?.projectFee !== undefined ? Number(row.projectFee) : (row?.periodInput?.projectFee !== undefined ? Number(row.periodInput.projectFee) : (row?.adjustments?.projectFee !== undefined ? Number(row.adjustments.projectFee) : undefined)),
    milestoneAmount: row?.milestoneAmount !== undefined ? Number(row.milestoneAmount) : (row?.periodInput?.milestoneAmount !== undefined ? Number(row.periodInput.milestoneAmount) : (row?.adjustments?.milestoneAmount !== undefined ? Number(row.adjustments.milestoneAmount) : undefined)),
    ratePerUnit: row?.ratePerUnit !== undefined ? Number(row.ratePerUnit) : (row?.periodInput?.ratePerUnit !== undefined ? Number(row.periodInput.ratePerUnit) : (row?.adjustments?.ratePerUnit !== undefined ? Number(row.adjustments.ratePerUnit) : undefined)),
    periodInput: row?.periodInput || row?.adjustments?.periodInput || {},
    otherEarnings: row?.otherEarnings || [],
    otherDeductions: row?.otherDeductions || [],
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
  };

  if (row) {
    Object.keys(row).forEach(key => {
      if (key.endsWith('Percent')) {
        if (row[key] !== undefined && row[key] !== null) {
          adjustments[key] = row[key];
        }
      }
    });
  }

  return {
    workingDays: Number(row?.workingDays) || Number(monthWorkingDays) || 26,
    paidDays: Number(row?.paidDays) || 0,
    paidLeaves: Number(row?.paidLeaves) || 0,
    unpaidLeaves: Number(row?.unpaidLeaves) || 0,
    hoursWorked: Number(row?.hoursWorked) || 0,
    overtime: typeof row?.overtime === 'object' && row?.overtime !== null
      ? {
          weekdayHours: Number(row.overtime.weekdayHours) || 0,
          weekendHours: Number(row.overtime.weekendHours) || 0,
          holidayHours: Number(row.overtime.holidayHours) || 0,
          customAmount: Number(row.overtime.customAmount) || 0,
        }
      : (Number(row?.overtime) || 0),
    attendanceSource: row?.attendanceSource || 'default',
    skip: Boolean(row?._skipPeriod),
    skipPeriod: Boolean(row?._skipPeriod),
    _skipPeriod: Boolean(row?._skipPeriod),
    adjustments: {
      ...adjustments,
      skip: Boolean(row?._skipPeriod),
      skipPeriod: Boolean(row?._skipPeriod),
      _skipPeriod: Boolean(row?._skipPeriod),
    }
  };
};

export const getSalarySplits = (employeeInput, configInput, monthNum, yearNum, paidDaysCount, workingDaysCount, adjustments = {}) => {
  const employee = (employeeInput && typeof employeeInput.toObject === 'function')
    ? employeeInput.toObject()
    : employeeInput;
  const config = normalizePayrollConfig(configInput);
  
  const year = Number(yearNum) || new Date().getFullYear();
  const month = Number(monthNum) || (new Date().getMonth() + 1);
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  
  const getYYYYMMDD = (dateVal) => {
    const dateObj = new Date(dateVal);
    if (isNaN(dateObj.getTime())) return '';
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getEmployeeParamsForDate = (dateStr) => {
    const revisions = [...(employee.salaryRevisions || [])].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));
    if (revisions.length === 0) {
      return employee;
    }
    const latestRevision = revisions[revisions.length - 1];
    const latestRevDateStr = getYYYYMMDD(latestRevision.effectiveDate);
    if (dateStr >= latestRevDateStr) {
      return employee;
    }
    let activeRevision = null;
    for (let i = revisions.length - 1; i >= 0; i--) {
      const revDateStr = getYYYYMMDD(revisions[i].effectiveDate);
      if (revDateStr && revDateStr <= dateStr) {
        activeRevision = revisions[i];
        break;
      }
    }
    if (!activeRevision) {
      activeRevision = revisions[0];
    }

    const getVal = (field, def) => {
      if (activeRevision && activeRevision[field] !== undefined && activeRevision[field] !== null) {
        return activeRevision[field];
      }
      if (employee[field] !== undefined && employee[field] !== null) {
        return employee[field];
      }
      return def;
    };

    const getDeductionVal = (field, def) => {
      if (activeRevision && activeRevision.deductions && activeRevision.deductions[field] !== undefined && activeRevision.deductions[field] !== null) {
        return activeRevision.deductions[field];
      }
      if (employee.deductions && employee.deductions[field] !== undefined && employee.deductions[field] !== null) {
        return employee.deductions[field];
      }
      return def;
    };

    const getStructureVal = (field, def) => {
      if (activeRevision && activeRevision.salaryStructure && activeRevision.salaryStructure[field] !== undefined && activeRevision.salaryStructure[field] !== null) {
        return activeRevision.salaryStructure[field];
      }
      if (employee.salaryStructure && employee.salaryStructure[field] !== undefined && employee.salaryStructure[field] !== null) {
        return employee.salaryStructure[field];
      }
      return def;
    };

    let monthlyCTC = Number(activeRevision.newCTC) || Number(activeRevision.monthlyCTC) || 0;
    if (!monthlyCTC && activeRevision === revisions[0]) {
      monthlyCTC = Number(revisions[0].previousCTC) || Number(employee.monthlyCTC) || 0;
    }

    return {
      monthlyCTC,
      employmentType: getVal('employmentType', 'full-time'),
      compensationModel: getVal('compensationModel', 'SALARIED'),
      paymentBasis: getVal('paymentBasis', 'MONTHLY'),
      payType: getVal('payType', 'salaried'),
      hourlyRate: getVal('hourlyRate', 0),
      pfEnabled: getVal('pfEnabled', true),
      esiEnabled: getVal('esiEnabled', true),
      ptEnabled: getVal('ptEnabled', true),
      lwfEnabled: getVal('lwfEnabled', true),
      gratuityEnabled: getVal('gratuityEnabled', true),
      includePfInCTC: getVal('includePfInCTC', false),
      includeGratuityInCTC: getVal('includeGratuityInCTC', true),
      basicPercent: getVal('basicPercent', null),
      hraPercent: getVal('hraPercent', null),
      useSalaryComponents: getVal('useSalaryComponents', true),
      flexiAmount: getVal('flexiAmount', 0),
      broadband: getVal('broadband', 0),
      petrol: getVal('petrol', 0),
      lta: getVal('lta', 0),
      employerNPS: getVal('employerNPS', 0),
      insuranceAmount: getVal('insuranceAmount', 0),
      deductions: {
        tds: getDeductionVal('tds', 0),
        professionalTax: getDeductionVal('professionalTax', 0),
        otherDeductions: getDeductionVal('otherDeductions', []),
      },
      salaryStructure: {
        conveyance: getStructureVal('conveyance', 0),
        medicalAllowance: getStructureVal('medicalAllowance', 0),
        otherAllowances: getStructureVal('otherAllowances', []),
      },
    };
  };

  const segments = [];
  let currentSegment = null;

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const currentStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const activeParams = getEmployeeParamsForDate(currentStr);
    const key = `${activeParams.monthlyCTC}-${activeParams.pfEnabled}-${activeParams.esiEnabled}-${activeParams.tdsEnabled}-${activeParams.gratuityEnabled}`;

    if (!currentSegment || currentSegment.key !== key) {
      if (currentSegment) {
        segments.push(currentSegment);
      }
      currentSegment = {
        key,
        startDay: d,
        endDay: d,
        activeParams,
        daysCount: 1
      };
    } else {
      currentSegment.endDay = d;
      currentSegment.daysCount += 1;
    }
  }
  if (currentSegment) {
    segments.push(currentSegment);
  }

  const isHourly = employee.payType === 'hourly';
  const hoursWorked = isHourly ? (Number(adjustments?.hoursWorked) || Number(employee.hoursWorked) || 0) : 0;

  const workingDays = isHourly ? totalDaysInMonth : Math.max(Number(workingDaysCount) || config.defaultWorkingDays, 1);
  const paidDays = isHourly ? workingDays : Math.max(Math.min(Number(paidDaysCount) ?? workingDays, workingDays), 0);
  const prorate = isHourly ? 1.0 : (workingDays > 0 ? paidDays / workingDays : 1);

  const lopStrategy = adjustments.lopStrategy || 'proportional';
  const customSegmentLops = adjustments.segmentLops || [];
  const dayProrate = isHourly
    ? new Array(totalDaysInMonth).fill(1.0)
    : getDayProrateArray(totalDaysInMonth, workingDays, paidDays, lopStrategy, customSegmentLops, segments);

  return segments.map((seg) => {
    const daySource = {
      ...seg.activeParams,
      hoursWorked: isHourly ? hoursWorked : undefined,
      pfEnabled: adjustments.pfEnabled !== undefined ? adjustments.pfEnabled : seg.activeParams.pfEnabled,
      tdsEnabled: adjustments.tdsEnabled !== undefined ? adjustments.tdsEnabled : seg.activeParams.tdsEnabled,
      esiEnabled: adjustments.esiEnabled !== undefined ? adjustments.esiEnabled : seg.activeParams.esiEnabled,
      ptEnabled: adjustments.ptEnabled !== undefined ? adjustments.ptEnabled : seg.activeParams.ptEnabled,
      lwfEnabled: adjustments.lwfEnabled !== undefined ? adjustments.lwfEnabled : seg.activeParams.lwfEnabled,
      gratuityEnabled: adjustments.gratuityEnabled !== undefined ? adjustments.gratuityEnabled : seg.activeParams.gratuityEnabled,
      includePfInCTC: adjustments.includePfInCTC !== undefined ? adjustments.includePfInCTC : seg.activeParams.includePfInCTC,
      includeGratuityInCTC: adjustments.includeGratuityInCTC !== undefined ? adjustments.includeGratuityInCTC : seg.activeParams.includeGratuityInCTC,
      basicPercent: adjustments.basicPercent !== undefined && adjustments.basicPercent !== null ? adjustments.basicPercent : seg.activeParams.basicPercent,
      hraPercent: adjustments.hraPercent !== undefined && adjustments.hraPercent !== null ? adjustments.hraPercent : seg.activeParams.hraPercent,
    };
    
    const dayMaster = buildMasterSalaryStructure(daySource, config);
    const segmentRatio = seg.daysCount / totalDaysInMonth;

    let segmentBasicSum = 0;
    let segmentPfEmployeeSum = 0;
    let segmentPfEmployerSum = 0;
    let segmentEsiEmployeeSum = 0;
    let segmentEsiEmployerSum = 0;
    let segmentGratuitySum = 0;
    let segmentProrateSum = 0;

    for (let day = seg.startDay; day <= seg.endDay; day++) {
      const dP = dayProrate[day - 1];
      segmentProrateSum += dP;
      
      const dailyBasic = (dayMaster.basicMaster / totalDaysInMonth) * dP;
      segmentBasicSum += dailyBasic;

      const dailyPfEmployee = (dayMaster.pfEmployee / totalDaysInMonth) * dP;
      const dailyPfEmployer = (dayMaster.pfEmployer / totalDaysInMonth) * dP;
      segmentPfEmployeeSum += dailyPfEmployee;
      segmentPfEmployerSum += dailyPfEmployer;

      const dailyGratuity = (dayMaster.gratuity / totalDaysInMonth) * dP;
      segmentGratuitySum += dailyGratuity;

      const dailyGrossForEsi = (dayMaster.totalEarnings / totalDaysInMonth) * dP;
      const dailyEsiEmployee = dayMaster.esiApplicable ? dailyGrossForEsi * config.esiEmployeeRate : 0;
      const dailyEsiEmployer = dayMaster.esiApplicable ? dailyGrossForEsi * config.esiEmployerRate : 0;
      segmentEsiEmployeeSum += dailyEsiEmployee;
      segmentEsiEmployerSum += dailyEsiEmployer;
    }

    const segmentProrateRatio = segmentProrateSum / totalDaysInMonth;

    const basic = roundAmount(segmentBasicSum);
    const hra = roundAmount(dayMaster.hraMaster * segmentProrateRatio);
    const flexi = roundAmount(dayMaster.flexi * segmentProrateRatio);
    const broadband = roundAmount(dayMaster.broadband * segmentProrateRatio);
    const petrol = roundAmount(dayMaster.petrol * segmentProrateRatio);
    const lta = roundAmount(dayMaster.lta * segmentProrateRatio);
    const specialAllowance = roundAmount(dayMaster.specialAllowance * segmentProrateRatio);
    const conveyance = roundAmount(dayMaster.conveyance * segmentProrateRatio);
    const medicalAllowance = roundAmount(dayMaster.medicalAllowance * segmentProrateRatio);

    const pfEmployee = roundAmount(segmentPfEmployeeSum);
    const pfEmployer = roundAmount(segmentPfEmployerSum);
    
    const esiEmployee = roundAmount(segmentEsiEmployeeSum);
    const esiEmployer = roundAmount(segmentEsiEmployerSum);

    const gratuity = roundAmount(segmentGratuitySum);
    const lwfEmployee = roundAmount(dayMaster.lwfEmployee * segmentRatio);
    const lwfEmployer = roundAmount(dayMaster.lwfEmployer * segmentRatio);
    const insurance = roundAmount(dayMaster.insurance * segmentRatio);
    const nps = roundAmount(dayMaster.employerNPS * segmentRatio);
    
    const totalEarnings = roundAmount(basic + hra + flexi + broadband + petrol + lta + specialAllowance + conveyance + medicalAllowance);

    return {
      startDate: new Date(Date.UTC(year, month - 1, seg.startDay)),
      endDate: new Date(Date.UTC(year, month - 1, seg.endDay)),
      daysCount: seg.daysCount,
      monthlyCTC: dayMaster.monthlyCTC,
      basic,
      hra,
      flexi,
      broadband,
      petrol,
      lta,
      specialAllowance,
      conveyance,
      medicalAllowance,
      pfEmployee,
      pfEmployer,
      esiEmployee,
      esiEmployer,
      gratuity,
      lwfEmployee,
      lwfEmployer,
      insurance,
      nps,
      totalEarnings,
    };
  });
};

// =============================================================================
// STATUTORY GRATUITY ENTITLEMENT — frontend mirror of payrollMath.js
// Payment of Gratuity Act, 1972, Section 4
// See MBB/utils/payrollMath.js for full legal citations and comments.
// =============================================================================
export const calculateGratuityEntitlement = (joiningDate, separationDate, basicPlusDa) => {
  const GRATUITY_CAP = 2000000;
  const MIN_SERVICE_YEARS = 5;

  const joining    = new Date(joiningDate);
  const separation = new Date(separationDate || Date.now());

  if (isNaN(joining.getTime()) || isNaN(separation.getTime()) || separation <= joining) {
    return { eligible: false, completedYears: 0, completedMonths: 0, roundedYears: 0, entitlement: 0, cappedEntitlement: 0, isCapped: false, note: 'Invalid dates.' };
  }

  let years  = separation.getFullYear() - joining.getFullYear();
  let months = separation.getMonth()   - joining.getMonth();
  let days   = separation.getDate()    - joining.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(separation.getFullYear(), separation.getMonth(), 0).getDate();
  }
  if (months < 0) { years -= 1; months += 12; }

  const totalMonths  = years * 12 + months;
  const roundedYears = years + (months >= 6 ? 1 : 0);

  if (years < MIN_SERVICE_YEARS) {
    const yearsRemaining  = MIN_SERVICE_YEARS - years;
    const monthsRemaining = months > 0 ? (12 - months) : 0;
    const note = monthsRemaining > 0
      ? `Ineligible. Requires ${yearsRemaining} yr(s) and ${monthsRemaining} more month(s).`
      : `Ineligible. Requires ${yearsRemaining} more year(s) of continuous service.`;
    return { eligible: false, completedYears: years, completedMonths: totalMonths, roundedYears: 0, entitlement: 0, cappedEntitlement: 0, isCapped: false, note };
  }

  const gross       = Number(basicPlusDa) || 0;
  const entitlement = Math.round(gross * 15 / 26 * roundedYears * 100) / 100;
  const capped      = Math.min(entitlement, GRATUITY_CAP);
  const isCapped    = entitlement > GRATUITY_CAP;

  const roundingNote = months >= 6
    ? `${months} months in final year ≥ 6 → counted as full year.`
    : months > 0 ? `${months} months in final year < 6 → discarded.` : '';

  const note = [
    `Eligible. ${years} yr(s), ${months} month(s) of service.`,
    roundingNote,
    isCapped ? `Capped at ₹20,00,000 (statutory maximum).` : '',
  ].filter(Boolean).join(' ');

  return { eligible: true, completedYears: years, completedMonths: totalMonths, roundedYears, entitlement, cappedEntitlement: capped, isCapped, note };
};
