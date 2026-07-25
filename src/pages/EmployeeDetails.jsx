import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaEdit, FaHistory, FaTrash, FaDownload, FaPlus } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import { buildMasterSalaryStructure, DEFAULT_PAYROLL_CONFIG, fmtMoney, payrollStatusClass, calculateGratuityEntitlement } from '../utils/payroll';
import { getOnboardingFields } from '../utils/compensationTypeFields';
import { getDefaultRateCardType, getRateCardOptionsForCompType } from '../constants/rateCardTypes';

export const STRATEGY_FIELD_MAP = {
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

export const STRATEGY_USES_COMPONENTS = {
  monthly_salary: true,
  attendance_based: true,
  salary_plus_commission: true,
  hourly: false,
  daily_wage: false,
  weekly_salary: false,
  piece_rate: false,
  project_based: false,
  milestone_based: false,
  timesheet_based: false,
  commission_only: false,
  retainer: false,
};

export const DEFAULT_ATTENDANCE_MODE = {
  monthly_salary:        'attendance',
  attendance_based:      'attendance',
  salary_plus_commission:'attendance',
  hourly:                'timesheet',
  timesheet_based:       'timesheet',
  daily_wage:            'attendance',
  weekly_salary:         'attendance',
  piece_rate:            'unit_count',
  project_based:         'none',
  milestone_based:       'none',
  commission_only:       'none',
  retainer:              'none',
};

export const COMPENSATION_SNAPSHOT_CONFIG = {
  monthly_salary: {
    title: 'CTC Snapshot',
    showComponents: true,
    showStatutory: true,
    headlineRows: (emp, preview) => [
      { label: 'Monthly CTC', value: fmtMoney(preview.monthlyCTC), strong: true },
      { label: 'Gross Salary', value: fmtMoney(preview.grossSalary) },
    ],
  },
  attendance_based: {
    title: 'CTC Snapshot (Attendance-Linked)',
    showComponents: true,
    showStatutory: true,
    headlineRows: (emp, preview) => [
      { label: 'Monthly CTC', value: fmtMoney(preview.monthlyCTC), strong: true },
      { label: 'Gross Salary', value: fmtMoney(preview.grossSalary) },
    ],
  },
  salary_plus_commission: {
    title: 'CTC + Commission Snapshot',
    showComponents: true,
    showStatutory: true,
    headlineRows: (emp, preview) => [
      { label: 'Base Monthly CTC', value: fmtMoney(preview.monthlyCTC), strong: true },
      { label: 'Gross Salary', value: fmtMoney(preview.grossSalary) },
      { label: 'Commission Terms', value: emp.commissionNotes || 'Commission earned per period in addition to base CTC.' },
    ],
  },
  hourly: {
    title: 'Hourly Rate Snapshot',
    showComponents: false,
    showStatutory: false,
    headlineRows: (emp, preview) => [
      { label: 'Hourly Rate', value: `${fmtMoney(emp.hourlyRate)}/hr`, strong: true },
      { label: 'Estimated Monthly Hours', value: '160 hours' },
      { label: 'Est. Monthly Gross', value: fmtMoney(preview.monthlyCTC) },
      { label: 'Est. Net Take-Home', value: fmtMoney(preview.netTakeHome), strong: true },
    ],
  },
  timesheet_based: {
    title: 'Timesheet-Based Snapshot',
    showComponents: false,
    showStatutory: false,
    headlineRows: (emp, preview) => [
      { label: 'Hourly Rate', value: `${fmtMoney(emp.hourlyRate)}/hr`, strong: true },
      { label: 'Est. Monthly Hours', value: '160 hours' },
      { label: 'Est. Monthly Gross', value: fmtMoney(preview.monthlyCTC) },
      { label: 'Est. Net Take-Home', value: fmtMoney(preview.netTakeHome), strong: true },
    ],
  },
  daily_wage: {
    title: 'Daily Wage Snapshot',
    showComponents: false,
    showStatutory: false,
    headlineRows: (emp, preview) => [
      { label: 'Daily Rate', value: `${fmtMoney(emp.dailyRate)}/day`, strong: true },
      { label: 'Assumed Working Days', value: '26 days / month' },
      { label: 'Est. Monthly Gross', value: fmtMoney(preview.monthlyCTC) },
      { label: 'Est. Net Take-Home', value: fmtMoney(preview.netTakeHome), strong: true },
    ],
  },
  weekly_salary: {
    title: 'Weekly Salary Snapshot',
    showComponents: false,
    showStatutory: false,
    headlineRows: (emp, preview) => [
      { label: 'Weekly Rate', value: `${fmtMoney(emp.weeklyRate)}/week`, strong: true },
      { label: 'Est. Monthly Gross (52/12 wks)', value: fmtMoney(preview.monthlyCTC) },
      { label: 'Est. Net Take-Home', value: fmtMoney(preview.netTakeHome), strong: true },
    ],
  },
  piece_rate: {
    title: 'Piece Rate Snapshot',
    showComponents: false,
    showStatutory: false,
    headlineRows: (emp, preview) => {
      const rateCardEntry = (emp.rateCard || []).find(r => r.paymentType === 'UNIT') || (emp.rateCard || [])[0];
      const unitRate = rateCardEntry ? rateCardEntry.rate : 0;
      return [
        { label: 'Rate per Deliverable', value: `${fmtMoney(unitRate)}/unit`, strong: true },
        { label: 'Pay Terms', value: 'Pay varies directly with output produced each period.' },
      ];
    },
  },
  project_based: {
    title: 'Project Fee Snapshot',
    showComponents: false,
    showStatutory: false,
    noAnnualize: true,
    headlineRows: (emp, preview) => {
      const rateCardEntry = (emp.rateCard || []).find(r => r.paymentType === 'PROJECT');
      const fee = rateCardEntry ? rateCardEntry.rate : (emp.projectFee || preview.monthlyCTC || 0);
      return [
        { label: 'Agreed Project Fee (Flat)', value: fmtMoney(fee), strong: true },
        { label: 'Payout Structure', value: 'Flat fee per project deliverable. Not annualized.' },
      ];
    },
  },
  milestone_based: {
    title: 'Milestone Pay Snapshot',
    showComponents: false,
    showStatutory: false,
    noAnnualize: true,
    headlineRows: (emp, preview) => {
      const rateCardEntry = (emp.rateCard || []).find(r => r.paymentType === 'MILESTONE');
      const amt = rateCardEntry ? rateCardEntry.rate : (emp.milestoneAmount || preview.monthlyCTC || 0);
      return [
        { label: 'Configured Milestone Rate', value: fmtMoney(amt), strong: true },
        { label: 'Payout Structure', value: 'Paid on milestone completion. Not annualized.' },
      ];
    },
  },
  commission_only: {
    title: 'Commission Snapshot',
    showComponents: false,
    showStatutory: false,
    noAnnualize: true,
    headlineRows: (emp, preview) => [
      { label: 'Base Monthly Salary', value: 'Variable (Commission Only)', strong: true },
      { label: 'Payout Structure', value: 'Pay determined by approved commission transactions each period.' },
      ...(emp.commissionNotes ? [{ label: 'Commission Terms', value: emp.commissionNotes }] : []),
    ],
  },
  retainer: {
    title: 'Retainer Snapshot',
    showComponents: false,
    showStatutory: false,
    headlineRows: (emp, preview) => [
      { label: 'Monthly Retainer Fee', value: fmtMoney(preview.monthlyCTC), strong: true },
      { label: 'Payout Structure', value: 'Fixed monthly fee regardless of attendance.' },
    ],
  },
};

const fmtDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-IN') : '-';
};

const formatDateForInput = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [config, setConfig] = useState(DEFAULT_PAYROLL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingRevision, setEditingRevision] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [savingRevision, setSavingRevision] = useState(false);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [compensationTypes, setCompensationTypes] = useState([]);
  const [ctcPeriod, setCtcPeriod] = useState('monthly');
  const [revisionDraft, setRevisionDraft] = useState({
    role: '',
    newCTC: '',
    newAnnualCTC: '',
    newHourlyRate: '',
    dailyRate: 0,
    weeklyRate: 0,
    projectFee: 0,
    milestoneAmount: 0,
    commissionNotes: '',
    rateCard: [],
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: '',
    pfEnabled: true,
    esiEnabled: true,
    ptEnabled: true,
    lwfEnabled: true,
    gratuityEnabled: true,
    includePfInCTC: false,
    includeGratuityInCTC: true,
    basicPercent: null,
    hraPercent: null,
    useSalaryComponents: true,
    employmentType: 'permanent',
    workingPattern: 'full_time',
    compensationModel: 'SALARIED',
    paymentBasis: 'MONTHLY',
    compensationType: 'monthly_salary',
    payFrequency: 'monthly',
    attendanceMode: 'attendance',
    designation: '',
    department: '',
    joiningDate: '',
    dateOfLeaving: '',
    status: 'active',
    flexiAmount: 0,
    broadband: 0,
    petrol: 0,
    lta: 0,
    insuranceAmount: 0,
    employerNPS: 0,
    joiningBonus: 0,
    salaryStructure: {
      basic: 0,
      hra: 0,
      conveyance: 0,
      medicalAllowance: 0,
      specialAllowance: 0,
      otherAllowances: [],
    },
    deductions: {
      pf: 0,
      esi: 0,
      professionalTax: 0,
      tds: 0,
      otherDeductions: [],
    }
  });

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'text-xs font-semibold text-gray-600 mb-1.5 inline-block';

  useEffect(() => {
    const controller = new AbortController();

    const fetchPageData = async () => {
      try {
        setLoading(true);
        const [employeeRes, payrollRes, configRes, rolesRes, deptRes, compTypesRes] = await Promise.all([
          api.get(`/employees/${id}`, { signal: controller.signal }),
          api.get(`/payroll?employeeId=${id}&limit=12`, { signal: controller.signal }),
          api.get('/payroll/config', { signal: controller.signal }),
          api.get('/roles', { signal: controller.signal }),
          api.get('/departments', { signal: controller.signal }).catch(() => ({ data: [] })),
          api.get('/payroll/compensation-types', { signal: controller.signal }).catch(() => ({ data: [] })),
        ]);
        setEmployee(employeeRes.data);
        setPayrolls(payrollRes.data.data || []);
        setConfig({ ...DEFAULT_PAYROLL_CONFIG, ...(configRes.data || {}) });
        setRoles(rolesRes.data || []);
        setDepartments(deptRes.data || []);
        if (compTypesRes.data && Array.isArray(compTypesRes.data) && compTypesRes.data.length > 0) {
          setCompensationTypes(compTypesRes.data);
        }
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error(error);
        toast.error('Failed to load employee details');
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
    return () => controller.abort();
  }, [id]);

  const compTypeOptions = useMemo(() => {
    if (compensationTypes.length > 0) {
      return compensationTypes.map(ct => ({ key: ct.key, label: ct.label }));
    }
    return Object.keys(STRATEGY_FIELD_MAP).map(key => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    }));
  }, [compensationTypes]);

  const compensationTypesMap = useMemo(() => {
    const map = {};
    compensationTypes.forEach(ct => { map[ct.key] = ct; });
    return map;
  }, [compensationTypes]);

  const dynamicUsesComponents = useMemo(() => {
    const map = { ...STRATEGY_USES_COMPONENTS };
    compensationTypes.forEach(ct => {
      if (ct.usesSalaryComponents !== undefined) map[ct.key] = ct.usesSalaryComponents;
    });
    return map;
  }, [compensationTypes]);

  const dynamicDefaultAttModes = useMemo(() => {
    const map = { ...DEFAULT_ATTENDANCE_MODE };
    compensationTypes.forEach(ct => {
      if (ct.defaultAttendanceMode) map[ct.key] = ct.defaultAttendanceMode;
    });
    return map;
  }, [compensationTypes]);

  const compTypeKey = revisionDraft.compensationType || 'monthly_salary';
  const visibleFields = getOnboardingFields(compTypeKey, compensationTypesMap);
  const strategyUsesComponents = dynamicUsesComponents[compTypeKey] ?? true;

  const salaryPreview = useMemo(() => buildMasterSalaryStructure(employee || {}, config), [employee, config]);

  // Statutory gratuity eligibility — computed client-side, no extra API call.
  // Uses dateOfLeaving if set (terminated/inactive employee), otherwise today
  // (active employee, shows current entitlement estimate).
  const gratuityInfo = useMemo(() => {
    if (!employee || !strategyUsesComponents || !employee.gratuityEnabled) return null;
    if (!employee.joiningDate) return null;
    const separationDate = employee.dateOfLeaving ? new Date(employee.dateOfLeaving) : new Date();
    const basicPlusDa = salaryPreview.basicMaster || 0;
    return calculateGratuityEntitlement(employee.joiningDate, separationDate, basicPlusDa);
  }, [employee, strategyUsesComponents, salaryPreview]);

  const draftSalaryPreview = useMemo(() => {
    if (!revisionDraft.newCTC || isNaN(Number(revisionDraft.newCTC)) || Number(revisionDraft.newCTC) <= 0) return null;
    const dummyEmployee = {
      ...employee,
      monthlyCTC: Number(revisionDraft.newCTC),
      pfEnabled: revisionDraft.pfEnabled !== false,
      esiEnabled: revisionDraft.esiEnabled !== false,
      ptEnabled: revisionDraft.ptEnabled !== false,
      lwfEnabled: revisionDraft.lwfEnabled !== false,
      gratuityEnabled: revisionDraft.gratuityEnabled !== false,
      includePfInCTC: revisionDraft.includePfInCTC === true,
      includeGratuityInCTC: revisionDraft.includeGratuityInCTC !== false,
      basicPercent: revisionDraft.basicPercent,
      hraPercent: revisionDraft.hraPercent,
      useSalaryComponents: revisionDraft.useSalaryComponents !== false,
      flexiAmount: Number(revisionDraft.flexiAmount) || 0,
      broadband: Number(revisionDraft.broadband) || 0,
      petrol: Number(revisionDraft.petrol) || 0,
    };

    // Copy custom percentage overrides from revisionDraft to dummyEmployee
    Object.keys(revisionDraft).forEach(key => {
      if (key.endsWith('Percent') && !['basicPercent', 'hraPercent'].includes(key)) {
        dummyEmployee[key] = revisionDraft[key];
      }
    });

    Object.assign(dummyEmployee, {
      lta: Number(revisionDraft.lta) || 0,
      insuranceAmount: Number(revisionDraft.insuranceAmount) || 0,
      employerNPS: Number(revisionDraft.employerNPS) || 0,
      joiningBonus: Number(revisionDraft.joiningBonus) || 0,
      salaryStructure: {
        ...(employee?.salaryStructure || {}),
        basic: config.salaryComponents?.find(c => c.id === 'basic')?.linkedTo === 'fixed' ? (employee?.salaryStructure?.basic) : undefined,
        hra: config.salaryComponents?.find(c => c.id === 'hra')?.linkedTo === 'fixed' ? (employee?.salaryStructure?.hra) : undefined,
        specialAllowance: config.salaryComponents?.find(c => c.id === 'special')?.linkedTo === 'fixed' ? (employee?.salaryStructure?.specialAllowance) : undefined,
        conveyance: Number(revisionDraft.salaryStructure?.conveyance) || 0,
        medicalAllowance: Number(revisionDraft.salaryStructure?.medicalAllowance) || 0,
        otherAllowances: (revisionDraft.salaryStructure?.otherAllowances || []).map(a => ({
          name: a.name,
          amount: Number(a.amount) || 0
        })),
      },
      deductions: {
        ...(employee?.deductions || {}),
        professionalTax: Number(revisionDraft.deductions?.professionalTax) || 0,
        tds: Number(revisionDraft.deductions?.tds) || 0,
        otherDeductions: (revisionDraft.deductions?.otherDeductions || []).map(d => ({
          name: d.name,
          amount: Number(d.amount) || 0
        })),
      }
    });
    return buildMasterSalaryStructure(dummyEmployee, config);
  }, [employee, revisionDraft, config]);

  const revisionComparisonRows = useMemo(() => {
    if (!draftSalaryPreview || !salaryPreview) return [];

    const getEarningValue = (preview, cId) => {
      if (preview.earningsMap && preview.earningsMap[cId] !== undefined) {
        return preview.earningsMap[cId];
      }
      if (cId === 'basic') return preview.basicMaster;
      if (cId === 'hra') return preview.hraMaster;
      if (cId === 'special') return preview.specialAllowance;
      if (cId === 'flexi') return preview.flexi;
      if (cId === 'broadband') return preview.broadband;
      if (cId === 'petrol') return preview.petrol;
      if (cId === 'lta') return preview.lta;
      if (cId === 'conveyance') return preview.conveyance;
      if (cId === 'medical') return preview.medicalAllowance;
      return 0;
    };

    const comps = config?.salaryComponents && config.salaryComponents.length > 0
      ? config.salaryComponents.filter(c => c.type === 'earning')
      : [
          { id: 'basic', name: 'Basic Salary' },
          { id: 'hra', name: 'House Rent Allowance (HRA)' },
          { id: 'special', name: 'Special Allowance' },
          { id: 'flexi', name: 'Flexi Wallet' },
          { id: 'broadband', name: 'Broadband Allowance' },
          { id: 'petrol', name: 'Petrol Reimbursement' },
          { id: 'lta', name: 'Leave Travel Allowance (LTA)' },
          { id: 'conveyance', name: 'Conveyance' },
          { id: 'medical', name: 'Medical Allowance' }
        ];

    const rowsList = [];
    
    // Add CTC row
    rowsList.push({
      name: 'Total Monthly CTC',
      current: salaryPreview.monthlyCTC,
      revised: draftSalaryPreview.monthlyCTC,
      isHeader: true
    });

    // Add Earning Components
    comps.forEach(c => {
      const currentVal = getEarningValue(salaryPreview, c.id);
      const revisedVal = getEarningValue(draftSalaryPreview, c.id);
      if (currentVal > 0 || revisedVal > 0 || c.id === 'basic' || c.id === 'hra') {
        rowsList.push({
          name: c.name || c.id,
          current: currentVal,
          revised: revisedVal
        });
      }
    });

    // Add Gross / Total Earnings
    rowsList.push({
      name: 'Gross Earnings (Total)',
      current: salaryPreview.totalEarnings || salaryPreview.grossSalary,
      revised: draftSalaryPreview.totalEarnings || draftSalaryPreview.grossSalary,
      isHeader: true
    });

    // Add Employer Contributions
    const currentPF = salaryPreview.pfEmployer || 0;
    const revisedPF = draftSalaryPreview.pfEmployer || 0;
    if (currentPF > 0 || revisedPF > 0) {
      rowsList.push({ name: 'Employer PF Match', current: currentPF, revised: revisedPF });
    }

    const currentGratuity = salaryPreview.gratuity || 0;
    const revisedGratuity = draftSalaryPreview.gratuity || 0;
    if (currentGratuity > 0 || revisedGratuity > 0) {
      rowsList.push({ name: 'Gratuity Provision', current: currentGratuity, revised: revisedGratuity });
    }

    const currentOtherEmployer = (salaryPreview.esiEmployer || 0) + (salaryPreview.lwfEmployer || 0) + (salaryPreview.insurance || 0) + (salaryPreview.employerNPS || 0);
    const revisedOtherEmployer = (draftSalaryPreview.esiEmployer || 0) + (draftSalaryPreview.lwfEmployer || 0) + (draftSalaryPreview.insurance || 0) + (draftSalaryPreview.employerNPS || 0);
    if (currentOtherEmployer > 0 || revisedOtherEmployer > 0) {
      rowsList.push({ name: 'Other Employer Cost (ESI, LWF, etc.)', current: currentOtherEmployer, revised: revisedOtherEmployer });
    }

    // Add Net Take-Home
    rowsList.push({
      name: 'Est. Net Take-Home Pay',
      current: salaryPreview.netTakeHome,
      revised: draftSalaryPreview.netTakeHome,
      isHeader: true
    });

    return rowsList;
  }, [salaryPreview, draftSalaryPreview, config]);

  const earningsList = useMemo(() => {
    const comps = config?.salaryComponents && config.salaryComponents.length > 0
      ? config.salaryComponents
      : [
          { id: 'basic', name: 'Basic Salary', type: 'earning' },
          { id: 'hra', name: 'HRA', type: 'earning' },
          { id: 'special', name: 'Special Allowance', type: 'earning' },
          { id: 'flexi', name: 'Flexi Allowance', type: 'earning' },
          { id: 'broadband', name: 'Broadband', type: 'earning' },
          { id: 'petrol', name: 'Petrol', type: 'earning' },
          { id: 'lta', name: 'LTA', type: 'earning' },
          { id: 'conveyance', name: 'Conveyance', type: 'earning' },
          { id: 'medical', name: 'Medical Allowance', type: 'earning' }
        ];
    return comps.filter(c => c.type === 'earning');
  }, [config]);

  const getEarningValue = (cId) => {
    if (salaryPreview.earningsMap && salaryPreview.earningsMap[cId] !== undefined) {
      return salaryPreview.earningsMap[cId];
    }
    if (salaryPreview.deductionsMap && salaryPreview.deductionsMap[cId] !== undefined) {
      return salaryPreview.deductionsMap[cId];
    }
    if (cId === 'basic') return salaryPreview.basicMaster;
    if (cId === 'hra') return salaryPreview.hraMaster;
    if (cId === 'special') return salaryPreview.specialAllowance;
    if (cId === 'flexi') return salaryPreview.flexi;
    if (cId === 'broadband') return salaryPreview.broadband;
    if (cId === 'petrol') return salaryPreview.petrol;
    if (cId === 'lta') return salaryPreview.lta;
    if (cId === 'conveyance') return salaryPreview.conveyance;
    if (cId === 'medical') return salaryPreview.medicalAllowance;
    return employee?.salaryStructure?.[cId] || employee?.[cId] || 0;
  };


  const setDraftField = (name, value) => {
    if (!name.includes('.')) {
      setRevisionDraft((prev) => ({ ...prev, [name]: value }));
      return;
    }
    const [parent, child] = name.split('.');
    setRevisionDraft((prev) => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
  };

  const handleRoleChange = (roleId) => {
    const selectedRole = roles.find((r) => r._id === roleId);
    if (!selectedRole) {
      setRevisionDraft((prev) => ({
        ...prev,
        role: '',
      }));
      return;
    }

    const ctc = selectedRole.payType === 'salaried' ? selectedRole.monthlyCTC : 0;
    const hourly = selectedRole.payType === 'hourly' ? selectedRole.hourlyRate : 0;

    setRevisionDraft((prev) => {
      const updated = {
        ...prev,
        role: selectedRole._id,
        newCTC: ctc,
        newAnnualCTC: ctc ? Math.round(ctc * 12 * 100) / 100 : '',
        newHourlyRate: hourly,
        pfEnabled: selectedRole.pfEnabled,
        esiEnabled: selectedRole.esiEnabled,
        ptEnabled: selectedRole.ptEnabled,
        lwfEnabled: selectedRole.lwfEnabled,
        gratuityEnabled: selectedRole.gratuityEnabled,
        includePfInCTC: selectedRole.includePfInCTC,
        includeGratuityInCTC: selectedRole.includeGratuityInCTC,
        basicPercent: selectedRole.basicPercent !== null ? selectedRole.basicPercent : null,
        hraPercent: selectedRole.hraPercent !== null ? selectedRole.hraPercent : null,
        useSalaryComponents: selectedRole.useSalaryComponents !== false,
        employmentType: selectedRole.employmentType || 'full-time',
        compensationModel: selectedRole.compensationModel || 'SALARIED',
        paymentBasis: selectedRole.paymentBasis || 'MONTHLY',
      };

      // Trigger recalculation if salaried
      if (selectedRole.payType === 'salaried') {
        setTimeout(() => {
          refreshDraftSalaryFromCTC(updated);
        }, 0);
      }

      return updated;
    });

    toast.success(`Applied template settings for Job Role: ${selectedRole.name}`);
  };

  const filteredRoles = useMemo(() => {
    return roles.filter(r => r.payType === (employee?.payType || 'salaried'));
  }, [roles, employee]);

  const openRevisionModal = (revision = null) => {
    if (!employee) return;
    let revisionDraftObj;
    const isEvent = revision && (revision.nativeEvent || revision.target);
    if (revision && !isEvent) {
      setEditingRevision(revision);
      const effDateStr = revision.effectiveDate ? formatDateForInput(revision.effectiveDate) : new Date().toISOString().slice(0, 10);
      const ctcVal = revision.newCTC !== undefined ? revision.newCTC : (revision.monthlyCTC || '');
      const hourlyVal = revision.newHourlyRate !== undefined ? revision.newHourlyRate : (revision.hourlyRate || '');
      revisionDraftObj = {
        role: revision.role?._id || revision.role || '',
        employmentType: revision.employmentType || employee.employmentType || 'permanent',
        workingPattern: revision.workingPattern || employee.workingPattern || 'full_time',
        compensationModel: revision.compensationModel || employee.compensationModel || 'SALARIED',
        paymentBasis: revision.paymentBasis || employee.paymentBasis || 'MONTHLY',
        compensationType: revision.compensationType || employee.compensationType || 'monthly_salary',
        payFrequency: revision.payFrequency || employee.payFrequency || 'monthly',
        attendanceMode: revision.attendanceMode || employee.attendanceMode || 'attendance',
        designation: revision.designation || employee.designation || '',
        department: revision.department?._id || revision.department || employee.department?._id || employee.department || '',
        joiningDate: formatDateForInput(revision.joiningDate || employee.joiningDate),
        dateOfLeaving: formatDateForInput(revision.dateOfLeaving || employee.dateOfLeaving),
        status: revision.status || employee.status || 'active',
        effectiveDate: effDateStr,
        reason: revision.reason || '',
        newCTC: ctcVal,
        newAnnualCTC: ctcVal ? Math.round(ctcVal * 12 * 100) / 100 : '',
        newHourlyRate: hourlyVal,
        dailyRate: revision.dailyRate ?? employee.dailyRate ?? 0,
        weeklyRate: revision.weeklyRate ?? employee.weeklyRate ?? 0,
        projectFee: revision.projectFee ?? employee.projectFee ?? 0,
        milestoneAmount: revision.milestoneAmount ?? employee.milestoneAmount ?? 0,
        commissionNotes: revision.commissionNotes ?? employee.commissionNotes ?? '',
        rateCard: revision.rateCard ? JSON.parse(JSON.stringify(revision.rateCard)) : JSON.parse(JSON.stringify(employee.rateCard || [])),
        pfEnabled: revision.pfEnabled !== false,
        esiEnabled: revision.esiEnabled !== false,
        ptEnabled: revision.ptEnabled !== false,
        lwfEnabled: revision.lwfEnabled !== false,
        gratuityEnabled: revision.gratuityEnabled !== false,
        includePfInCTC: revision.includePfInCTC === true,
        includeGratuityInCTC: revision.includeGratuityInCTC !== false,
        basicPercent: revision.basicPercent ?? null,
        hraPercent: revision.hraPercent ?? null,
        useSalaryComponents: revision.useSalaryComponents !== false,
        flexiAmount: revision.flexiAmount || 0,
        broadband: revision.broadband || 0,
        petrol: revision.petrol || 0,
        lta: revision.lta || 0,
        insuranceAmount: revision.insuranceAmount || 0,
        employerNPS: revision.employerNPS || 0,
        joiningBonus: revision.joiningBonus || 0,
        salaryStructure: {
          basic: revision.salaryStructure?.basic || 0,
          hra: revision.salaryStructure?.hra || 0,
          conveyance: revision.salaryStructure?.conveyance || 0,
          medicalAllowance: revision.salaryStructure?.medicalAllowance || 0,
          specialAllowance: revision.salaryStructure?.specialAllowance || 0,
          otherAllowances: revision.salaryStructure?.otherAllowances ? JSON.parse(JSON.stringify(revision.salaryStructure.otherAllowances)) : [],
        },
        deductions: {
          pf: revision.deductions?.pf || 0,
          esi: revision.deductions?.esi || 0,
          professionalTax: revision.deductions?.professionalTax || 0,
          tds: revision.deductions?.tds || 0,
          otherDeductions: revision.deductions?.otherDeductions ? JSON.parse(JSON.stringify(revision.deductions.otherDeductions)) : [],
        }
      };

      Object.keys(revision).forEach(key => {
        if (key.endsWith('Percent') && !['basicPercent', 'hraPercent'].includes(key)) {
          revisionDraftObj[key] = revision[key];
        }
      });
    } else {
      setEditingRevision(null);
      revisionDraftObj = {
        role: employee.role?._id || employee.role || '',
        employmentType: employee.employmentType || 'permanent',
        workingPattern: employee.workingPattern || 'full_time',
        compensationModel: employee.compensationModel || 'SALARIED',
        paymentBasis: employee.paymentBasis || 'MONTHLY',
        compensationType: employee.compensationType || 'monthly_salary',
        payFrequency: employee.payFrequency || 'monthly',
        attendanceMode: employee.attendanceMode || 'attendance',
        designation: employee.designation || '',
        department: employee.department?._id || employee.department || '',
        joiningDate: formatDateForInput(employee.joiningDate),
        dateOfLeaving: formatDateForInput(employee.dateOfLeaving),
        status: employee.status || 'active',
        effectiveDate: new Date().toISOString().slice(0, 10),
        reason: '',
        newCTC: employee.monthlyCTC || '',
        newAnnualCTC: employee.monthlyCTC ? Math.round(employee.monthlyCTC * 12 * 100) / 100 : '',
        newHourlyRate: employee.hourlyRate || '',
        dailyRate: employee.dailyRate || 0,
        weeklyRate: employee.weeklyRate || 0,
        projectFee: employee.projectFee || 0,
        milestoneAmount: employee.milestoneAmount || 0,
        commissionNotes: employee.commissionNotes || '',
        rateCard: employee.rateCard ? JSON.parse(JSON.stringify(employee.rateCard)) : [],
        pfEnabled: employee.pfEnabled !== false,
        esiEnabled: employee.esiEnabled !== false,
        ptEnabled: employee.ptEnabled !== false,
        lwfEnabled: employee.lwfEnabled !== false,
        gratuityEnabled: employee.gratuityEnabled !== false,
        includePfInCTC: employee.includePfInCTC === true,
        includeGratuityInCTC: employee.includeGratuityInCTC !== false,
        basicPercent: employee.basicPercent ?? null,
        hraPercent: employee.hraPercent ?? null,
        useSalaryComponents: employee.useSalaryComponents !== false,
        flexiAmount: employee.flexiAmount || 0,
        broadband: employee.broadband || 0,
        petrol: employee.petrol || 0,
        lta: employee.lta || 0,
        insuranceAmount: employee.insuranceAmount || 0,
        employerNPS: employee.employerNPS || 0,
        joiningBonus: employee.joiningBonus || 0,
        salaryStructure: {
          basic: employee.salaryStructure?.basic || 0,
          hra: employee.salaryStructure?.hra || 0,
          conveyance: employee.salaryStructure?.conveyance || 0,
          medicalAllowance: employee.salaryStructure?.medicalAllowance || 0,
          specialAllowance: employee.salaryStructure?.specialAllowance || 0,
          otherAllowances: employee.salaryStructure?.otherAllowances ? JSON.parse(JSON.stringify(employee.salaryStructure.otherAllowances)) : [],
        },
        deductions: {
          pf: employee.deductions?.pf || 0,
          esi: employee.deductions?.esi || 0,
          professionalTax: employee.deductions?.professionalTax || 0,
          tds: employee.deductions?.tds || 0,
          otherDeductions: employee.deductions?.otherDeductions ? JSON.parse(JSON.stringify(employee.deductions.otherDeductions)) : [],
        }
      };

      Object.keys(employee).forEach(key => {
        if (key.endsWith('Percent') && !['basicPercent', 'hraPercent'].includes(key)) {
          revisionDraftObj[key] = employee[key];
        }
      });
    }

    setRevisionDraft(revisionDraftObj);

    if (revisionDraftObj.newCTC) {
      setTimeout(() => {
        refreshDraftSalaryFromCTC(revisionDraftObj);
      }, 0);
    }
    setShowRevisionModal(true);
  };

  const refreshDraftSalaryFromCTC = async (overrideFields) => {
    const overrides = (overrideFields && typeof overrideFields === 'object' && !('nativeEvent' in overrideFields)) ? overrideFields : {};
    const merged = { ...revisionDraft, ...overrides };
    const monthlyCTC = Number(merged.newCTC) || 0;
    if (!monthlyCTC) return;

    try {
      setCalculating(true);
      const payload = {
        monthlyCTC,
        employmentType: merged.employmentType,
        basicPercent: merged.basicPercent === null || merged.basicPercent === '' ? null : Number(merged.basicPercent),
        hraPercent: merged.hraPercent === null || merged.hraPercent === '' ? null : Number(merged.hraPercent),
        basic: config.salaryComponents?.find(c => c.id === 'basic')?.linkedTo === 'fixed' ? Number(merged.salaryStructure?.basic) : undefined,
        hra: config.salaryComponents?.find(c => c.id === 'hra')?.linkedTo === 'fixed' ? Number(merged.salaryStructure?.hra) : undefined,
        specialAllowance: config.salaryComponents?.find(c => c.id === 'special')?.linkedTo === 'fixed' ? Number(merged.salaryStructure?.specialAllowance) : undefined,
        useSalaryComponents: merged.useSalaryComponents !== false,
        flexiAmount: Number(merged.flexiAmount) || 0,
        broadband: Number(merged.broadband) || 0,
        petrol: Number(merged.petrol) || 0,
        lta: Number(merged.lta) || 0,
        insuranceAmount: Number(merged.insuranceAmount) || 0,
        employerNPS: Number(merged.employerNPS) || 0,
        professionalTax: Number(merged.deductions?.professionalTax) || 0,
        tds: Number(merged.deductions?.tds) || 0,
        otherDeductions: (merged.deductions?.otherDeductions || []).map((d) => ({
          name: d.name,
          amount: Number(d.amount) || 0,
        })),
        conveyance: Number(merged.salaryStructure?.conveyance) || 0,
        medicalAllowance: Number(merged.salaryStructure?.medicalAllowance) || 0,
        otherAllowances: (merged.salaryStructure?.otherAllowances || []).map((allowance) => ({
          name: allowance.name,
          amount: Number(allowance.amount) || 0,
        })),
        pfEnabled: merged.pfEnabled !== false,
        esiEnabled: merged.esiEnabled !== false,
        ptEnabled: merged.ptEnabled !== false,
        lwfEnabled: merged.lwfEnabled !== false,
        gratuityEnabled: merged.gratuityEnabled !== false,
        includePfInCTC: merged.includePfInCTC !== false,
        includeGratuityInCTC: merged.includeGratuityInCTC !== false,
      };

      Object.keys(merged).forEach(key => {
        if (key.endsWith('Percent') && !['basicPercent', 'hraPercent'].includes(key)) {
          payload[key] = merged[key] === null || merged[key] === '' ? null : Number(merged[key]);
        }
      });

      const res = await api.post('/payroll/calculate-salary', payload);
      const master = res.data.master;
      setRevisionDraft((prev) => ({
        ...prev,
        flexiAmount: master.flexi,
        broadband: master.broadband,
        petrol: master.petrol,
        lta: master.lta,
        salaryStructure: {
          ...prev.salaryStructure,
          basic: master.basicMaster,
          hra: master.hraMaster,
          specialAllowance: master.specialAllowance,
          grossSalary: master.grossSalary,
          ctc: master.monthlyCTC,
        },
      }));
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to calculate salary structure');
    } finally {
      setCalculating(false);
    }
  };

  const handleSalaryRevision = async () => {
    if (visibleFields.includes('rateCardEditor') && Array.isArray(revisionDraft.rateCard) && revisionDraft.rateCard.length > 0) {
      const validTypes = new Set(getRateCardOptionsForCompType(revisionDraft.compensationType).map(o => o.value));
      const invalidItem = revisionDraft.rateCard.find(item => !item.paymentType || !validTypes.has(item.paymentType));
      if (invalidItem) {
        toast.error('Please select a valid Payment Type for all rate card items.');
        return;
      }
    }
    try {
      setSavingRevision(true);
      const compType = revisionDraft.compensationType || 'monthly_salary';
      const payload = {
        effectiveDate: revisionDraft.effectiveDate,
        reason: revisionDraft.reason,
        role: revisionDraft.role || '',
        employmentType: revisionDraft.employmentType || 'permanent',
        workingPattern: revisionDraft.workingPattern || 'full_time',
        compensationModel: revisionDraft.compensationModel || 'SALARIED',
        paymentBasis: revisionDraft.paymentBasis || 'MONTHLY',
        compensationType: compType,
        payFrequency: revisionDraft.payFrequency || 'monthly',
        attendanceMode: revisionDraft.attendanceMode || 'attendance',
        designation: revisionDraft.designation || '',
        department: revisionDraft.department || null,
        joiningDate: revisionDraft.joiningDate || undefined,
        dateOfLeaving: revisionDraft.dateOfLeaving || null,
        status: revisionDraft.status || 'active',
        newCTC: Number(revisionDraft.newCTC) || 0,
        monthlyCTC: Number(revisionDraft.newCTC) || 0,
        newHourlyRate: Number(revisionDraft.newHourlyRate) || 0,
        hourlyRate: Number(revisionDraft.newHourlyRate) || 0,
        dailyRate: Number(revisionDraft.dailyRate) || 0,
        weeklyRate: Number(revisionDraft.weeklyRate) || 0,
        projectFee: Number(revisionDraft.projectFee) || 0,
        milestoneAmount: Number(revisionDraft.milestoneAmount) || 0,
        commissionNotes: revisionDraft.commissionNotes || '',
        rateCard: revisionDraft.rateCard || [],
        useSalaryComponents: revisionDraft.useSalaryComponents !== false,
        pfEnabled: revisionDraft.pfEnabled !== false,
        esiEnabled: revisionDraft.esiEnabled !== false,
        ptEnabled: revisionDraft.ptEnabled !== false,
        lwfEnabled: revisionDraft.lwfEnabled !== false,
        gratuityEnabled: revisionDraft.gratuityEnabled !== false,
        includePfInCTC: revisionDraft.includePfInCTC === true,
        includeGratuityInCTC: revisionDraft.includeGratuityInCTC !== false,
        basicPercent: revisionDraft.basicPercent === null || revisionDraft.basicPercent === '' ? null : Number(revisionDraft.basicPercent),
        hraPercent: revisionDraft.hraPercent === null || revisionDraft.hraPercent === '' ? null : Number(revisionDraft.hraPercent),
        joiningBonus: Number(revisionDraft.joiningBonus) || 0,
        flexiAmount: Number(revisionDraft.flexiAmount) || 0,
        broadband: Number(revisionDraft.broadband) || 0,
        petrol: Number(revisionDraft.petrol) || 0,
        lta: Number(revisionDraft.lta) || 0,
        insuranceAmount: Number(revisionDraft.insuranceAmount) || 0,
        employerNPS: Number(revisionDraft.employerNPS) || 0,
        tds: Number(revisionDraft.deductions?.tds) || 0,
        professionalTax: Number(revisionDraft.deductions?.professionalTax) || 0,
        conveyance: Number(revisionDraft.salaryStructure?.conveyance) || 0,
        medicalAllowance: Number(revisionDraft.salaryStructure?.medicalAllowance) || 0,
        otherAllowances: (revisionDraft.salaryStructure?.otherAllowances || []).map(a => ({
          name: a.name,
          amount: Number(a.amount) || 0
        })),
        otherDeductions: (revisionDraft.deductions?.otherDeductions || []).map(d => ({
          name: d.name,
          amount: Number(d.amount) || 0
        })),
      };

      Object.keys(revisionDraft).forEach(key => {
        if (key.endsWith('Percent') && !['basicPercent', 'hraPercent'].includes(key)) {
          payload[key] = revisionDraft[key] === null || revisionDraft[key] === '' ? null : Number(revisionDraft[key]);
        }
      });

      if (editingRevision) {
        await api.put(`/employees/${id}/salary-revision/${editingRevision._id}`, payload);
      } else {
        await api.post(`/employees/${id}/salary-revision`, payload);
      }
      const res = await api.get(`/employees/${id}`);
      setEmployee(res.data);
      setEditingRevision(null);
      setShowRevisionModal(false);
      toast.success(editingRevision ? 'Salary revision updated successfully' : 'Salary & compensation profile revised successfully');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to save salary revision');
    } finally {
      setSavingRevision(false);
    }
  };

  const handleDeleteSalaryRevision = async (revisionId) => {
    if (!window.confirm('Are you sure you want to delete this salary revision?')) return;
    try {
      await api.delete(`/employees/${id}/salary-revision/${revisionId}`);
      const res = await api.get(`/employees/${id}`);
      setEmployee(res.data);
      toast.success('Salary revision deleted successfully');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to delete salary revision');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/employees/${id}`);
      toast.success('Employee deleted successfully');
      navigate('/employees');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to delete employee');
    }
  };

  const handleDownloadBreakup = () => {
    if (!employee || !salaryPreview) return;

    const compType = employee.compensationType || (employee.payType === 'hourly' ? 'hourly' : 'monthly_salary');
    const cfg = COMPENSATION_SNAPSHOT_CONFIG[compType] || COMPENSATION_SNAPSHOT_CONFIG.monthly_salary;
    const isNoAnnualize = ['project_based', 'milestone_based', 'commission_only', 'piece_rate'].includes(compType);
    const toAnnual = (val) => isNoAnnualize ? 'N/A' : (Number(val) || 0) * 12;

    const data = [
      [cfg.title.toUpperCase(), ''],
      ['', ''],
      ['EMPLOYEE DETAILS', ''],
      ['Employee ID', employee.employeeId],
      ['Name', `${employee.firstName} ${employee.lastName}`.trim()],
      ['Designation', employee.designation || '-'],
      ['Department', employee.department?.name || '-'],
      ['Date of Joining', fmtDate(employee.joiningDate)],
      ['Location', employee.location || '-'],
      ['Employment Type', employee.employmentType || '-'],
      ['Tax Regime', employee.taxRegime === 'old' ? 'Old Regime' : 'New Regime'],
      ['Compensation Type', cfg.title],
      ['', ''],
    ];

    if (cfg.showComponents) {
      data.push(['SALARY COMPONENTS', 'Monthly (INR)', 'Annual (INR)']);
      data.push(['Basic Salary', salaryPreview.basicMaster, toAnnual(salaryPreview.basicMaster)]);
      data.push(['House Rent Allowance (HRA)', salaryPreview.hraMaster, toAnnual(salaryPreview.hraMaster)]);
      earningsList.forEach(c => {
        if (c.id !== 'basic' && c.id !== 'hra') {
          const val = getEarningValue(c.id);
          if (val > 0) {
            data.push([c.name || c.id, val, toAnnual(val)]);
          }
        }
      });
      data.push(['Gross Salary', salaryPreview.grossSalary, toAnnual(salaryPreview.grossSalary)]);
      data.push(['', '', '']);
    } else {
      data.push(['COMPENSATION DETAILS', 'Value / Rate']);
      const headlineRows = cfg.headlineRows(employee, salaryPreview);
      headlineRows.forEach(r => {
        data.push([r.label, r.value]);
      });
      data.push(['', '']);
    }

    if (cfg.showStatutory) {
      data.push(['EMPLOYER CONTRIBUTIONS', 'Monthly (INR)', 'Annual (INR)']);
      if (salaryPreview.pfEmployer > 0) data.push(['Provident Fund (PF) Employer', salaryPreview.pfEmployer, toAnnual(salaryPreview.pfEmployer)]);
      if (salaryPreview.gratuity > 0) data.push(['Gratuity Provision', salaryPreview.gratuity, toAnnual(salaryPreview.gratuity)]);
      if (salaryPreview.insurance > 0) data.push(['Health Insurance', salaryPreview.insurance, toAnnual(salaryPreview.insurance)]);
      if (salaryPreview.employerNPS > 0) data.push(['Employer NPS Contribution', salaryPreview.employerNPS, toAnnual(salaryPreview.employerNPS)]);
      if (salaryPreview.lwfEmployer > 0) data.push(['LWF Employer', salaryPreview.lwfEmployer, toAnnual(salaryPreview.lwfEmployer)]);
      if (salaryPreview.esiEmployer > 0) data.push(['ESI Employer', salaryPreview.esiEmployer, toAnnual(salaryPreview.esiEmployer)]);
      data.push(['Total Employer Cost', salaryPreview.totalEmployerContributions, toAnnual(salaryPreview.totalEmployerContributions)]);
      data.push(['', '', '']);

      data.push([cfg.title.toUpperCase(), salaryPreview.monthlyCTC, isNoAnnualize ? 'N/A' : salaryPreview.annualCTC]);
      data.push(['', '', '']);

      data.push(['STATUTORY DEDUCTIONS (EMPLOYEE)', 'Monthly (INR)', 'Annual (INR)']);
      if (salaryPreview.pfEmployee > 0) data.push(['PF Employee Deduction', salaryPreview.pfEmployee, toAnnual(salaryPreview.pfEmployee)]);
      if (salaryPreview.esiEmployee > 0) data.push(['ESI Employee Deduction', salaryPreview.esiEmployee, toAnnual(salaryPreview.esiEmployee)]);
      if (salaryPreview.professionalTax > 0) data.push(['Professional Tax (PT)', salaryPreview.professionalTax, toAnnual(salaryPreview.professionalTax)]);
      if (salaryPreview.tds > 0) data.push(['Income Tax (TDS) Projection', salaryPreview.tds, toAnnual(salaryPreview.tds)]);
      if (salaryPreview.lwfEmployee > 0) data.push(['LWF Employee Deduction', salaryPreview.lwfEmployee, toAnnual(salaryPreview.lwfEmployee)]);
      if (salaryPreview.deductionsMap) {
        Object.entries(salaryPreview.deductionsMap).forEach(([cId, val]) => {
          if (val > 0) {
            const comp = config.salaryComponents?.find(c => c.id === cId);
            data.push([comp?.name || cId, val, toAnnual(val)]);
          }
        });
      }
      data.push(['Total Deductions', salaryPreview.totalDeductions, toAnnual(salaryPreview.totalDeductions)]);
      data.push(['', '', '']);
      data.push(['ESTIMATED TAKE-HOME PAY', salaryPreview.netTakeHome, isNoAnnualize ? 'N/A' : toAnnual(salaryPreview.netTakeHome)]);
    } else {
      data.push(['STATUTORY BENEFITS & DEDUCTIONS', 'N/A']);
      data.push(['Note', 'Non-Salaried Compensation Type: subject to TDS on total earnings, no statutory benefits (PF, ESI, PT, LWF, Gratuity).']);
      data.push(['', '']);
      data.push(['ESTIMATED NET TAKE-HOME', salaryPreview.netTakeHome > 0 ? salaryPreview.netTakeHome : 'Pay varies by period']);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 25 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Breakup');
    XLSX.writeFile(workbook, `Salary_Breakup_${employee.employeeId || 'Emp'}.xlsx`);
    toast.success('Salary breakup downloaded successfully');
  };

  const getInitials = (firstName = '', lastName = '') => {
    const f = (firstName || '').trim()[0] || '';
    const l = (lastName || '').trim()[0] || '';
    return (f + l).toUpperCase() || 'E';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 font-sans text-gray-900 space-y-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!employee) {
    return <div className="container mx-auto p-6 text-red-600">Employee not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl font-sans text-slate-900 space-y-5">
      {/* Keka Profile Hero Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md flex-shrink-0">
            {getInitials(employee.firstName, employee.lastName)}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{employee.firstName} {employee.lastName}</h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${
                  employee.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : employee.status === 'inactive'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${employee.status === 'active' ? 'bg-emerald-500' : employee.status === 'inactive' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                {employee.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              ID: <strong className="text-slate-800">{employee.employeeId}</strong> · {employee.designation || 'No designation'} · {employee.department?.name || 'No department'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          <button onClick={() => openRevisionModal()} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold shadow-2xs transition-colors cursor-pointer">
            <FaHistory size={12} className="text-indigo-600" /> Revise Salary
          </button>
          <button onClick={handleDownloadBreakup} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold shadow-2xs transition-colors cursor-pointer">
            <FaDownload size={12} className="text-emerald-600" /> Download Breakup
          </button>
          <Link to={`/employees/${employee._id}/edit`} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xs transition-all">
            <FaEdit size={12} /> Edit Profile
          </Link>
          <button onClick={() => setShowDeleteModal(true)} className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer">
            <FaTrash size={12} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-sm text-gray-700 mb-4">Employee Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <Info label="Email" value={employee.email} />
            <Info label="Phone" value={employee.phone || '-'} />
            <Info label="Department" value={employee.department?.name || '-'} />
            <Info label="Joining Date" value={fmtDate(employee.joiningDate)} />
            <Info label="Date of Leaving" value={fmtDate(employee.dateOfLeaving)} />
            <Info label="Location" value={employee.location || '-'} />
            <Info label="Employment Type" value={employee.employmentType} />
            <Info label="Compensation Model" value={employee.compensationModel || 'SALARIED'} />
            <Info label="Payment Basis" value={employee.paymentBasis || 'MONTHLY'} />
            <Info label="Status" value={employee.status} />
            <Info label="PAN" value={employee.panNumber || '-'} />
            <Info label="UAN" value={employee.uanNumber || '-'} />
            <Info label="ESI Number" value={employee.esiNumber || '-'} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4 border-b border-gray-150 pb-2">
            <h2 className="font-semibold text-sm text-gray-700">
              {(COMPENSATION_SNAPSHOT_CONFIG[employee.compensationType || (employee.payType === 'hourly' ? 'hourly' : 'monthly_salary')] || COMPENSATION_SNAPSHOT_CONFIG.monthly_salary).title}
            </h2>
            <button
              onClick={handleDownloadBreakup}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1.5"
            >
              <FaDownload size={10} />
              Download Breakup
            </button>
          </div>
          {(() => {
            const compType = employee.compensationType || (employee.payType === 'hourly' ? 'hourly' : 'monthly_salary');
            const cfg = COMPENSATION_SNAPSHOT_CONFIG[compType] || COMPENSATION_SNAPSHOT_CONFIG.monthly_salary;
            const rows = cfg.headlineRows(employee, salaryPreview);

            return (
              <div className="space-y-2 text-xs">
                {rows.map((r, i) => (
                  <Info key={i} label={r.label} value={r.value} strong={r.strong} />
                ))}

                {cfg.showComponents && earningsList.map(c => {
                  const val = getEarningValue(c.id);
                  if (c.id === 'basic' || c.id === 'hra' || val > 0) {
                    return <Info key={c.id} label={c.name || c.id} value={fmtMoney(val)} />;
                  }
                  return null;
                })}

                {cfg.showStatutory ? (
                  <>
                    <Info label="PF Employer" value={fmtMoney(salaryPreview.pfEmployer)} />
                    <Info label="Gratuity" value={fmtMoney(salaryPreview.gratuity)} />
                    <Info label="Insurance" value={fmtMoney(salaryPreview.insurance)} />
                    {salaryPreview.employerNPS > 0 && (
                      <Info label="Employer NPS" value={fmtMoney(salaryPreview.employerNPS)} />
                    )}
                    <Info label="Net Take-Home" value={fmtMoney(salaryPreview.netTakeHome)} strong />
                  </>
                ) : (
                  <div className="border-t border-dashed border-gray-200 my-2 pt-2 text-[10px] text-amber-700 leading-normal font-medium bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                    💼 Non-Salaried Compensation Type: subject to TDS on total earnings, no statutory benefits (PF, ESI, PT, LWF, Gratuity).
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Statutory Gratuity Eligibility Card ─────────────────────────────── */}
      {gratuityInfo && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-6 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-sm text-gray-700">Statutory Gratuity Eligibility</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Payment of Gratuity Act, 1972 — formula: (Basic + DA) × 15/26 × years of service
              </p>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
              gratuityInfo.eligible
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {gratuityInfo.eligible ? '✓ Eligible' : '⏳ Not Yet Eligible'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide mb-0.5">Service (yrs)</p>
              <p className="text-gray-800 font-bold text-base">
                {gratuityInfo.completedYears}
                <span className="text-xs font-normal text-gray-500 ml-1">
                  yr{gratuityInfo.completedYears !== 1 ? 's' : ''}
                  {gratuityInfo.completedYears > 0 || gratuityInfo.completedMonths % 12 > 0
                    ? ` ${gratuityInfo.completedMonths % 12} mo`
                    : ''}
                </span>
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide mb-0.5">Years Used</p>
              <p className="text-gray-800 font-bold text-base">
                {gratuityInfo.eligible ? gratuityInfo.roundedYears : '—'}
                {gratuityInfo.eligible && gratuityInfo.roundedYears > gratuityInfo.completedYears && (
                  <span className="ml-1 text-[9px] text-blue-500 font-semibold">↑ rounded up</span>
                )}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide mb-0.5">Est. Entitlement</p>
              <p className={`font-bold text-base ${
                gratuityInfo.eligible ? 'text-gray-800' : 'text-gray-400'
              }`}>
                {gratuityInfo.eligible ? fmtMoney(gratuityInfo.cappedEntitlement) : '—'}
              </p>
              {gratuityInfo.isCapped && (
                <p className="text-[9px] text-amber-600 font-semibold mt-0.5">Capped at ₹20L (statutory max)</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide mb-0.5">Basic (current)</p>
              <p className="text-gray-800 font-bold text-base">{fmtMoney(salaryPreview.basicMaster || 0)}/mo</p>
              <p className="text-[9px] text-gray-400 mt-0.5">DA treated as ₹0</p>
            </div>
          </div>

          <p className="mt-3 text-[9px] text-gray-400 leading-relaxed">
            ℹ️ {gratuityInfo.note}
            &nbsp;Estimate only — actual amount is confirmed at Full &amp; Final Settlement.
            6-month partial-year rounding per Section 2A &amp; Mettur Beardsell (1998 ILLJ 180 Mad).
          </p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-6 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 font-bold">Salary Revision History</div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Effective Date</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                {employee.payType === 'hourly' ? 'Previous Rate' : 'Previous CTC'}
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                {employee.payType === 'hourly' ? 'New Rate' : 'New CTC'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employee.salaryRevisions?.length ? employee.salaryRevisions.map((revision, index) => (
              <tr key={`revision-${index}`}>
                <td className="px-6 py-4 text-sm">{fmtDate(revision.effectiveDate)}</td>
                <td className="px-6 py-4 text-sm text-right text-slate-800">
                  {employee.payType === 'hourly'
                    ? `${fmtMoney(revision.previousHourlyRate || revision.hourlyRate || 0)}/hr`
                    : fmtMoney(revision.previousCTC)}
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold">
                  {employee.payType === 'hourly'
                    ? `${fmtMoney(revision.newHourlyRate || revision.hourlyRate || 0)}/hr`
                    : fmtMoney(revision.newCTC)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{revision.reason || '-'}</td>
                <td className="px-6 py-4 text-sm text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openRevisionModal(revision)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Revision"
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteSalaryRevision(revision._id)}
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Revision"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No salary revisions recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-6 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 font-bold">Payroll History</div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Net Salary</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Payslip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payrolls.length === 0 ? (
              <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No payroll records yet.</td></tr>
            ) : payrolls.map((payroll) => (
              <tr key={payroll._id}>
                <td className="px-6 py-4">
                  {new Date(0, payroll.month - 1).toLocaleString('en-US', { month: 'long' })} {payroll.year}
                </td>
                <td className="px-6 py-4 text-right font-semibold">{fmtMoney(payroll.netSalary)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${payrollStatusClass[payroll.status] || payrollStatusClass.draft}`}>
                    {payroll.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <Link to={`/payroll/${payroll._id}/payslip`} className="text-blue-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={showRevisionModal} 
        onClose={() => setShowRevisionModal(false)} 
        title={editingRevision ? 'Edit Salary Revision' : 'Revise Salary & Compensation Profile'}
      >
        <div className="space-y-6">
          {/* Section 1: Employment & Role Classification */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
              Employment &amp; Role Classification
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Employment Type</label>
                <select
                  value={revisionDraft.employmentType || 'permanent'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraftField('employmentType', val);
                    refreshDraftSalaryFromCTC({ employmentType: val });
                  }}
                  className={inputCls}
                >
                  <option value="permanent">Permanent</option>
                  <option value="probation">Probationary</option>
                  <option value="contract">Contract</option>
                  <option value="temporary">Temporary</option>
                  <option value="intern">Intern / Trainee</option>
                  <option value="consultant">Consultant</option>
                  <option value="freelancer">Freelancer</option>
                  <option value="part_time">Part-Time</option>
                  <option value="casual">Casual</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="full-time">Full-Time (Legacy)</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Pay Frequency</label>
                <select
                  value={revisionDraft.payFrequency || 'monthly'}
                  onChange={(e) => setDraftField('payFrequency', e.target.value)}
                  className={inputCls}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-Weekly</option>
                  <option value="semi_monthly">Semi-Monthly</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Working Pattern</label>
                <select
                  value={revisionDraft.workingPattern || 'full_time'}
                  onChange={(e) => setDraftField('workingPattern', e.target.value)}
                  className={inputCls}
                >
                  <option value="full_time">Full-Time (On-site)</option>
                  <option value="part_time">Part-Time</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="shift">Shift Based</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Job Role Template</label>
                <select
                  value={revisionDraft.role || ''}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className={inputCls}
                >
                  <option value="">No Role (Custom Salary Components)</option>
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.payType === 'hourly' ? 'Hourly' : 'Salaried'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Designation</label>
                <input
                  type="text"
                  value={revisionDraft.designation || ''}
                  onChange={(e) => setDraftField('designation', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Department</label>
                <select
                  value={revisionDraft.department || ''}
                  onChange={(e) => setDraftField('department', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Joining Date *</label>
                <input
                  type="date"
                  required
                  value={revisionDraft.joiningDate || ''}
                  onChange={(e) => setDraftField('joiningDate', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Date of Leaving</label>
                <input
                  type="date"
                  value={revisionDraft.dateOfLeaving || ''}
                  onChange={(e) => setDraftField('dateOfLeaving', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Status</label>
                <select
                  value={revisionDraft.status || 'active'}
                  onChange={(e) => setDraftField('status', e.target.value)}
                  className={inputCls}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Compensation Configuration / Strategy Engine */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center justify-between">
              <span>Compensation Configuration</span>
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold">Strategy Engine</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Compensation Type *</label>
                <select
                  value={revisionDraft.compensationType || 'monthly_salary'}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const currentType = revisionDraft.compensationType || 'monthly_salary';
                    const currentUses = dynamicUsesComponents[currentType] ?? true;
                    const newUses = dynamicUsesComponents[newType] ?? false;

                    if (currentUses && !newUses && revisionDraft.useSalaryComponents !== false) {
                      const currentLabel = compTypeOptions.find(o => o.key === currentType)?.label || currentType;
                      const newLabel = compTypeOptions.find(o => o.key === newType)?.label || newType;
                      const confirmed = window.confirm(
                        `Switching to ${newLabel} will ignore fixed salary components and statutory benefits. Do you want to continue?`
                      );
                      if (!confirmed) return;
                    }

                    const defaultAtt = dynamicDefaultAttModes[newType] || 'attendance';
                    setRevisionDraft((prev) => {
                      const updated = {
                        ...prev,
                        compensationType: newType,
                        useSalaryComponents: newUses,
                        attendanceMode: defaultAtt,
                      };
                      if (newUses && updated.newCTC) {
                        refreshDraftSalaryFromCTC(updated);
                      }
                      return updated;
                    });
                  }}
                  className={inputCls}
                >
                  {compTypeOptions.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Attendance Mode *</label>
                <select
                  value={revisionDraft.attendanceMode || 'attendance'}
                  onChange={(e) => setDraftField('attendanceMode', e.target.value)}
                  className={inputCls}
                >
                  <option value="attendance">Attendance Based (paidDays / workingDays)</option>
                  <option value="timesheet">Timesheet (hours logged)</option>
                  <option value="shift">Shift Based (shifts worked)</option>
                  <option value="unit_count">Unit Count (piece rate / deliverables)</option>
                  <option value="fixed">Fixed (always full month / no proration)</option>
                  <option value="none">None (milestone / project / commission)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Dynamic Compensation Inputs */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
              Compensation Parameters ({revisionDraft.compensationType || 'monthly_salary'})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleFields.includes('monthlyCTC') && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-gray-600 inline-block m-0">
                      {ctcPeriod === 'monthly' ? 'Monthly CTC *' : 'Annual CTC *'}
                    </label>
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setCtcPeriod('monthly')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${ctcPeriod === 'monthly' ? 'bg-white text-slate-800 shadow-sm border border-gray-100 font-extrabold' : 'text-gray-500 hover:text-slate-800'}`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setCtcPeriod('annual')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${ctcPeriod === 'annual' ? 'bg-white text-slate-800 shadow-sm border border-gray-100 font-extrabold' : 'text-gray-500 hover:text-slate-800'}`}
                      >
                        Annually
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={
                      ctcPeriod === 'monthly'
                        ? (revisionDraft.newCTC || '')
                        : (revisionDraft.newCTC ? Math.round(revisionDraft.newCTC * 12) : '')
                    }
                    onChange={(e) => {
                      const inputVal = e.target.value === '' ? '' : Number(e.target.value);
                      const computedMonthly = ctcPeriod === 'annual' ? (inputVal === '' ? '' : Math.round((inputVal / 12) * 100) / 100) : inputVal;
                      setRevisionDraft((prev) => ({
                        ...prev,
                        newCTC: computedMonthly,
                        newAnnualCTC: computedMonthly === '' ? '' : Math.round(computedMonthly * 12 * 100) / 100,
                      }));
                    }}
                    onBlur={refreshDraftSalaryFromCTC}
                    className={inputCls}
                  />
                </div>
              )}

              {visibleFields.includes('hourlyRate') && (
                <div>
                  <label className={labelCls}>Hourly Rate (₹/hr) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={revisionDraft.newHourlyRate}
                    onChange={(e) => setDraftField('newHourlyRate', e.target.value === '' ? '' : Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              )}

              {visibleFields.includes('dailyRate') && (
                <div>
                  <label className={labelCls}>Daily Wage Rate (₹/day) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={revisionDraft.dailyRate || 0}
                    onChange={(e) => setDraftField('dailyRate', e.target.value === '' ? '' : Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              )}

              {visibleFields.includes('weeklyRate') && (
                <div>
                  <label className={labelCls}>Weekly Salary (₹/week) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={revisionDraft.weeklyRate || 0}
                    onChange={(e) => setDraftField('weeklyRate', e.target.value === '' ? '' : Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              )}

              {visibleFields.includes('projectFee') && (
                <div>
                  <label className={labelCls}>Flat Project Fee (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={revisionDraft.projectFee || 0}
                    onChange={(e) => setDraftField('projectFee', e.target.value === '' ? '' : Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              )}

              {visibleFields.includes('milestoneAmount') && (
                <div>
                  <label className={labelCls}>Default Milestone Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={revisionDraft.milestoneAmount || 0}
                    onChange={(e) => setDraftField('milestoneAmount', e.target.value === '' ? '' : Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              )}

              {visibleFields.includes('commissionNotes') && (
                <div className="col-span-2">
                  <label className={labelCls}>Commission Structure Notes</label>
                  <textarea
                    rows={2}
                    value={revisionDraft.commissionNotes || ''}
                    onChange={(e) => setDraftField('commissionNotes', e.target.value)}
                    placeholder="Describe commission terms, target thresholds, percentage tiers..."
                    className={inputCls}
                  />
                </div>
              )}
            </div>

            {/* Rate Card Editor for Piece Rate / Deliverable Strategies */}
            {visibleFields.includes('rateCardEditor') && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 mt-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Rate Card Items</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultType = getDefaultRateCardType(revisionDraft.compensationType);
                      setRevisionDraft(prev => ({
                        ...prev,
                        rateCard: [...(prev.rateCard || []), { paymentType: defaultType, rate: 0, unit: 'unit' }]
                      }));
                    }}
                    className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center gap-1"
                  >
                    <FaPlus size={10} /> Add Item
                  </button>
                </div>

                {(!revisionDraft.rateCard || revisionDraft.rateCard.length === 0) ? (
                  <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-medium">
                    No rate card items added. Click "+ Add Item" above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {revisionDraft.rateCard.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-500 mb-1 block">Payment Type</label>
                          <select
                            value={item.paymentType || getDefaultRateCardType(revisionDraft.compensationType)}
                            onChange={(e) => {
                              const list = [...(revisionDraft.rateCard || [])];
                              list[idx] = { ...list[idx], paymentType: e.target.value };
                              setDraftField('rateCard', list);
                            }}
                            className={inputCls}
                          >
                            {getRateCardOptionsForCompType(revisionDraft.compensationType).map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-1/4">
                          <label className="text-[10px] font-bold text-slate-500 mb-1 block">Rate (₹)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Rate"
                            value={item.rate || 0}
                            onChange={(e) => {
                              const list = [...(revisionDraft.rateCard || [])];
                              list[idx] = { ...list[idx], rate: e.target.value === '' ? '' : Number(e.target.value) };
                              setDraftField('rateCard', list);
                            }}
                            className={inputCls}
                          />
                        </div>
                        <div className="w-1/4">
                          <label className="text-[10px] font-bold text-slate-500 mb-1 block">Unit</label>
                          <input
                            type="text"
                            placeholder="unit / article / hr"
                            value={item.unit || ''}
                            onChange={(e) => {
                              const list = [...(revisionDraft.rateCard || [])];
                              list[idx] = { ...list[idx], unit: e.target.value };
                              setDraftField('rateCard', list);
                            }}
                            className={inputCls}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const list = (revisionDraft.rateCard || []).filter((_, i) => i !== idx);
                            setDraftField('rateCard', list);
                          }}
                          className="mt-4 p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Revision Effective Date & Reason */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div>
              <label className={labelCls}>Effective Date *</label>
              <input
                type="date"
                required
                value={revisionDraft.effectiveDate}
                onChange={(e) => setDraftField('effectiveDate', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Reason for Revision</label>
              <input
                type="text"
                placeholder="e.g. Annual Appraisal, Promotion, Strategy Adjustment"
                value={revisionDraft.reason}
                onChange={(e) => setDraftField('reason', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Section 5: Component Preview & Statutory Toggles (for CTC & component based strategies) */}
          {strategyUsesComponents && (
            <>
              {/* CTC Components Summary */}
              {(() => {
                const activePreview = draftSalaryPreview || salaryPreview || {};
                return (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold">CTC Components</h2>
                      <span className="text-xs text-gray-500">Synced with payroll settings</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <SummaryCard label="PF Employer" value={fmtMoney(activePreview.pfEmployer || 0)} />
                      <SummaryCard label="Gratuity" value={fmtMoney(activePreview.gratuity || 0)} />
                      <SummaryCard label="LWF Employer" value={fmtMoney(activePreview.lwfEmployer || 0)} />
                      <SummaryCard label="Annual CTC" value={fmtMoney(activePreview.annualCTC || 0)} />
                      <SummaryCard label="Gross Salary" value={fmtMoney(activePreview.grossSalary || 0)} />
                      <SummaryCard label="Net Take-Home Estimate" value={fmtMoney(activePreview.netTakeHome || 0)} />
                    </div>
                  </div>
                );
              })()}

          {/* Custom Overrides Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-blue-900 mb-1 flex items-center gap-2">
              <span>Employee Salary Ratios (Overrides)</span>
              <span className="text-[10px] bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Optional</span>
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              By default, this employee's Basic and HRA are computed using the global company payroll settings. You can set employee-specific overrides below.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Basic Salary % Override</label>
                <div className="relative rounded-lg shadow-sm">
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max="100"
                    placeholder={`Company Default: ${Math.round((config?.basicPercent ?? 0.5) * 100)}%`}
                    value={revisionDraft.basicPercent ?? ''}
                    onChange={(e) => setDraftField('basicPercent', e.target.value === '' ? null : Number(e.target.value))}
                    onBlur={refreshDraftSalaryFromCTC}
                    className={inputCls}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">%</span>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>HRA % Override (of Basic)</label>
                <div className="relative rounded-lg shadow-sm">
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max="100"
                    placeholder={`Company Default: ${Math.round((config?.hraPercent ?? 0.5) * 100)}%`}
                    value={revisionDraft.hraPercent ?? ''}
                    onChange={(e) => setDraftField('hraPercent', e.target.value === '' ? null : Number(e.target.value))}
                    onBlur={refreshDraftSalaryFromCTC}
                    className={inputCls}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">%</span>
                  </div>
                </div>
              </div>
              {config?.salaryComponents?.filter(c => 
                (c.linkedTo === 'ctc_percent' || c.linkedTo === 'basic_percent') && !['basic', 'hra'].includes(c.id)
              ).map(c => (
                <div key={c.id}>
                  <label className={labelCls}>{c.name} % Override ({c.linkedTo === 'basic_percent' ? 'of Basic' : 'of CTC'})</label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      max="100"
                      placeholder={`Company Default: ${Math.round((c.linkValue ?? 0) * 100)}%`}
                      value={revisionDraft[c.id + 'Percent'] ?? ''}
                      onChange={(e) => setDraftField(c.id + 'Percent', e.target.value === '' ? null : Number(e.target.value))}
                      onBlur={refreshDraftSalaryFromCTC}
                      className={inputCls}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Salary Component Inputs */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Salary Component Inputs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const activePreview = draftSalaryPreview || salaryPreview || {};
                const getFieldMapping = (componentId) => {
                  switch (componentId) {
                    case 'basic': return 'salaryStructure.basic';
                    case 'hra': return 'salaryStructure.hra';
                    case 'special': return 'salaryStructure.specialAllowance';
                    case 'conveyance': return 'salaryStructure.conveyance';
                    case 'medical': return 'salaryStructure.medicalAllowance';
                    case 'flexi': return 'flexiAmount';
                    case 'broadband': return 'broadband';
                    case 'petrol': return 'petrol';
                    case 'lta': return 'lta';
                    case 'default_insurance_amount': return 'insuranceAmount';
                    case 'employerNPS': return 'employerNPS';
                    default: return `salaryStructure.${componentId}`;
                  }
                };

                const getPreviewValue = (cId) => {
                  if (!activePreview) return 0;
                  if (activePreview.earningsMap && activePreview.earningsMap[cId] !== undefined) {
                    return activePreview.earningsMap[cId];
                  }
                  if (activePreview.deductionsMap && activePreview.deductionsMap[cId] !== undefined) {
                    return activePreview.deductionsMap[cId];
                  }
                  if (cId === 'basic') return activePreview.basicMaster;
                  if (cId === 'hra') return activePreview.hraMaster;
                  if (cId === 'special') return activePreview.specialAllowance;
                  if (cId === 'conveyance') return activePreview.conveyance;
                  if (cId === 'medical') return activePreview.medicalAllowance;
                  if (cId === 'flexi') return activePreview.flexi;
                  if (cId === 'broadband') return activePreview.broadband;
                  if (cId === 'petrol') return activePreview.petrol;
                  if (cId === 'lta') return activePreview.lta;
                  if (cId === 'default_insurance_amount') return activePreview.insurance;
                  if (cId === 'employerNPS') return activePreview.employerNPS;
                  if (cId === 'deductions.tds') return activePreview.tds;
                  return 0;
                };

                const comps = config?.salaryComponents || [];
                const filtered = comps.filter(c => ![
                  'pf_rate_employee',
                  'pf_rate_employer',
                  'pf_salary_ceiling',
                  'esi_rate_employee',
                  'esi_rate_employer',
                  'esi_threshold',
                  'lwf_employer',
                  'lwf_employee',
                  'gratuity_rate',
                  'default_working_days',
                  'lta_max_percent'
                ].includes(c.id));

                const list = filtered.map(c => {
                  const isCalculated = c.linkedTo !== 'fixed';
                  let suffix = '';
                  let freqSuffix = '';
                  const effectiveFreq = revisionDraft.componentFrequencies?.[c.id] || c.frequency || 'monthly';
                  if (effectiveFreq === 'quarterly') freqSuffix = ' — Quarterly';
                  else if (effectiveFreq === 'semi_annually') freqSuffix = ' — Semi-Annually';
                  else if (effectiveFreq === 'annually') freqSuffix = ' — Annually';

                  if (c.id === 'basic') {
                    const pct = revisionDraft.basicPercent !== null && revisionDraft.basicPercent !== undefined ? revisionDraft.basicPercent : Math.round(c.linkValue * 100);
                    suffix = ` (${pct}% of CTC${freqSuffix})`;
                  } else if (c.id === 'hra') {
                    const pct = revisionDraft.hraPercent !== null && revisionDraft.hraPercent !== undefined ? revisionDraft.hraPercent : Math.round(c.linkValue * 100);
                    suffix = ` (${pct}% of Basic${freqSuffix})`;
                  } else if (c.linkedTo === 'ctc_percent') {
                    const override = revisionDraft[c.id + 'Percent'];
                    const pct = override !== undefined && override !== null && override !== '' ? Number(override) : Math.round(c.linkValue * 100);
                    suffix = ` (${pct}% of CTC${freqSuffix})`;
                  } else if (c.linkedTo === 'basic_percent') {
                    const override = revisionDraft[c.id + 'Percent'];
                    const pct = override !== undefined && override !== null && override !== '' ? Number(override) : Math.round(c.linkValue * 100);
                    suffix = ` (${pct}% of Basic${freqSuffix})`;
                  } else if (c.linkedTo === 'remainder') {
                    suffix = ` (Calculated Remainder${freqSuffix})`;
                  } else if (freqSuffix) {
                    suffix = ` (${freqSuffix.replace(' — ', '')})`;
                  }
                  
                  return {
                    id: c.id,
                    name: getFieldMapping(c.id),
                    label: `${c.name}${suffix}`,
                    isCalculated,
                    cItem: c,
                    frequency: effectiveFreq,
                  };
                });

                if (!list.some(item => item.id === 'default_insurance_amount')) {
                  list.push({ id: 'default_insurance_amount', name: 'insuranceAmount', label: 'Insurance Amount', isCalculated: false });
                }
                if (!list.some(item => item.id === 'employerNPS')) {
                  list.push({ id: 'employerNPS', name: 'employerNPS', label: 'Employer NPS', isCalculated: false });
                }
                if (!list.some(item => item.id === 'deductions.tds')) {
                  list.push({ id: 'deductions.tds', name: 'deductions.tds', label: 'Income Tax (TDS) / Tax Amount', isCalculated: false });
                }

                if (revisionDraft.pfEnabled !== false && activePreview) {
                  if (config?.pfCalculationType === 'fixed') {
                    list.push({ id: 'pf_employee', name: 'pf_employee', label: 'Employee PF contribution (Fixed)', isCalculated: true, customValue: activePreview.pfEmployee });
                    list.push({ id: 'pf_employer', name: 'pf_employer', label: 'Employer PF contribution (Fixed)', isCalculated: true, customValue: activePreview.pfEmployer });
                  } else {
                    const pfEEPct = Math.round((config?.pfRate ?? 0.12) * 100);
                    const pfERPct = Math.round((config?.pfEmployerRate ?? 0.12) * 100);
                    list.push({ id: 'pf_employee', name: 'pf_employee', label: `Employee PF contribution (${pfEEPct}%)`, isCalculated: true, customValue: activePreview.pfEmployee });
                    list.push({ id: 'pf_employer', name: 'pf_employer', label: `Employer PF contribution (${pfERPct}%)`, isCalculated: true, customValue: activePreview.pfEmployer });
                  }
                }
                if (revisionDraft.esiEnabled !== false && activePreview && ((activePreview.esiEmployee || 0) + (activePreview.esiEmployer || 0)) > 0) {
                  const esiEEPct = (config?.esiEmployeeRate ?? 0.0075) * 100;
                  const esiERPct = (config?.esiEmployerRate ?? 0.0325) * 100;
                  list.push({ id: 'esi_employee', name: 'esi_employee', label: `Employee ESI deduction (${esiEEPct}%)`, isCalculated: true, customValue: activePreview.esiEmployee });
                  list.push({ id: 'esi_employer', name: 'esi_employer', label: `Employer ESI contribution (${esiERPct}%)`, isCalculated: true, customValue: activePreview.esiEmployer });
                }
                if (revisionDraft.ptEnabled !== false && activePreview && (activePreview.professionalTax || 0) > 0) {
                  list.push({ id: 'pt_amount', name: 'deductions.professionalTax', label: 'Professional Tax (PT)', isCalculated: true, customValue: activePreview.professionalTax });
                }
                if (revisionDraft.lwfEnabled !== false && activePreview && ((activePreview.lwfEmployee || 0) + (activePreview.lwfEmployer || 0)) > 0) {
                  list.push({ id: 'lwf_employee', name: 'lwf_employee', label: 'Employee LWF contribution', isCalculated: true, customValue: activePreview.lwfEmployee });
                  list.push({ id: 'lwf_employer', name: 'lwf_employer', label: 'Employer LWF contribution', isCalculated: true, customValue: activePreview.lwfEmployer });
                }
                if (revisionDraft.gratuityEnabled !== false && activePreview && (activePreview.gratuity || 0) > 0) {
                  const gratPct = Math.round((config?.gratuityRate ?? 0.0481) * 10000) / 100;
                  list.push({ id: 'gratuity_amount', name: 'gratuity_amount', label: `Gratuity Provision (${gratPct}%)`, isCalculated: true, customValue: activePreview.gratuity });
                }

                return list.map((item) => {
                  const value = item.customValue !== undefined
                    ? item.customValue
                    : (item.isCalculated
                        ? getPreviewValue(item.id)
                        : (item.name === 'salaryStructure.basic' ? (revisionDraft.salaryStructure?.basic ?? activePreview.basicMaster ?? 0) :
                           item.name === 'salaryStructure.hra' ? (revisionDraft.salaryStructure?.hra ?? activePreview.hraMaster ?? 0) :
                           item.name === 'salaryStructure.specialAllowance' ? (revisionDraft.salaryStructure?.specialAllowance ?? activePreview.specialAllowance ?? 0) :
                           item.name === 'deductions.tds' ? (revisionDraft.deductions?.tds ?? '') :
                           (item.name.includes('.') 
                             ? (item.name.split('.').reduce((obj, key) => obj?.[key], revisionDraft) ?? getPreviewValue(item.id) ?? 0)
                             : (revisionDraft[item.name] ?? getPreviewValue(item.id) ?? 0)
                           )
                          )
                      );
                  
                  return (
                    <div key={item.id}>
                      <div className="flex items-center justify-between mb-1">
                        <label className={labelCls}>
                          {item.label}
                        </label>
                        {strategyUsesComponents && item.cItem && (
                          <select
                            value={revisionDraft.componentFrequencies?.[item.id] || item.cItem.frequency || 'monthly'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRevisionDraft(prev => ({
                                ...prev,
                                componentFrequencies: { ...(prev.componentFrequencies || {}), [item.id]: val }
                              }));
                            }}
                            className="text-[11px] bg-white border border-gray-300 rounded px-1.5 py-0.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="semi_annually">Semi-Annually</option>
                            <option value="annually">Annually</option>
                          </select>
                        )}
                      </div>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        disabled={item.isCalculated}
                        placeholder={item.customValue !== undefined ? `Live Est: ₹${item.customValue}` : (item.id === 'deductions.tds' ? `Live Est: ₹${activePreview.tds || 0}` : `Live Est: ₹${getPreviewValue(item.id)}`)}
                        value={value}
                        onChange={(e) => setDraftField(item.name, e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={refreshDraftSalaryFromCTC}
                        className={`${inputCls} ${item.isCalculated ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed font-medium' : ''}`}
                      />
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Custom Allowances Section */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>Custom Allowances</span>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full font-semibold">Other Earnings</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  const currentAllowances = revisionDraft.salaryStructure?.otherAllowances || [];
                  setDraftField('salaryStructure.otherAllowances', [...currentAllowances, { name: '', amount: 0 }]);
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
              >
                <FaPlus size={10} /> Add Custom Allowance
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Define additional custom allowance types for this employee (e.g. Children Education, Uniform Allowance). These will increase Gross Salary and be balanced under Special Allowance.
            </p>

            {(!revisionDraft.salaryStructure?.otherAllowances || revisionDraft.salaryStructure.otherAllowances.length === 0) ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-medium bg-gray-50/20">
                No custom allowances defined. Click "+ Add Custom Allowance" above to add one.
              </div>
            ) : (
              <div className="space-y-3">
                {revisionDraft.salaryStructure.otherAllowances.map((allowance, index) => (
                  <div key={index} className="flex gap-3 items-end bg-gray-50/50 p-3 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">Allowance Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Children Education"
                        value={allowance.name || ''}
                        onChange={(e) => {
                          const updated = [...(revisionDraft.salaryStructure?.otherAllowances || [])];
                          updated[index] = { ...updated[index], name: e.target.value };
                          setDraftField('salaryStructure.otherAllowances', updated);
                        }}
                        className={inputCls}
                      />
                    </div>
                    <div className="w-1/3">
                      <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">Monthly Amount (₹)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        placeholder="Amount"
                        value={allowance.amount || ''}
                        onChange={(e) => {
                          const updated = [...(revisionDraft.salaryStructure?.otherAllowances || [])];
                          updated[index] = { ...updated[index], amount: e.target.value === '' ? '' : Number(e.target.value) };
                          setDraftField('salaryStructure.otherAllowances', updated);
                        }}
                        onBlur={refreshDraftSalaryFromCTC}
                        className={inputCls}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (revisionDraft.salaryStructure?.otherAllowances || []).filter((_, idx) => idx !== index);
                        setDraftField('salaryStructure.otherAllowances', updated);
                        refreshDraftSalaryFromCTC({ salaryStructure: { ...revisionDraft.salaryStructure, otherAllowances: updated } });
                      }}
                      className="px-3.5 py-2 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Deductions Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <span>Custom Deductions</span>
                <span className="text-[10px] bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full font-semibold">Other Deductions</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  const currentDeductions = revisionDraft.deductions?.otherDeductions || [];
                  setDraftField('deductions.otherDeductions', [...currentDeductions, { name: '', amount: 0 }]);
                }}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5"
              >
                <FaPlus size={10} /> Add Custom Deduction
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Define additional custom monthly deductions for this employee (e.g. Car Lease, Corporate Accommodation). These will automatically reduce the Net Take-Home Salary estimate.
            </p>

            {(!revisionDraft.deductions?.otherDeductions || revisionDraft.deductions.otherDeductions.length === 0) ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-medium bg-gray-50/20">
                No custom deductions defined. Click "+ Add Custom Deduction" above to add one.
              </div>
            ) : (
              <div className="space-y-3">
                {revisionDraft.deductions.otherDeductions.map((deduction, index) => (
                  <div key={index} className="flex gap-3 items-end bg-gray-50/50 p-3 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">Deduction Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Car Lease Deduction"
                        value={deduction.name || ''}
                        onChange={(e) => {
                          const updated = [...(revisionDraft.deductions?.otherDeductions || [])];
                          updated[index] = { ...updated[index], name: e.target.value };
                          setDraftField('deductions.otherDeductions', updated);
                        }}
                        className={inputCls}
                      />
                    </div>
                    <div className="w-1/3">
                      <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">Monthly Amount (₹)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        placeholder="Amount"
                        value={deduction.amount || ''}
                        onChange={(e) => {
                          const updated = [...(revisionDraft.deductions?.otherDeductions || [])];
                          updated[index] = { ...updated[index], amount: e.target.value === '' ? '' : Number(e.target.value) };
                          setDraftField('deductions.otherDeductions', updated);
                        }}
                        onBlur={refreshDraftSalaryFromCTC}
                        className={inputCls}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (revisionDraft.deductions?.otherDeductions || []).filter((_, idx) => idx !== index);
                        setDraftField('deductions.otherDeductions', updated);
                        refreshDraftSalaryFromCTC({ deductions: { ...revisionDraft.deductions, otherDeductions: updated } });
                      }}
                      className="px-3.5 py-2 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* One-Time Pay */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-bold mb-4">One-Time Pay</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Joining Bonus</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={revisionDraft.joiningBonus || 0}
                  onChange={(e) => setDraftField('joiningBonus', e.target.value === '' ? '' : Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Comparison Preview Table */}
          {revisionComparisonRows.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-4 bg-slate-50/50">
              <div className="bg-slate-100/80 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-700 text-xs uppercase tracking-wider">
                Salary Structure Preview & Comparison
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/60 text-[10px] uppercase font-bold text-slate-500">
                      <th className="px-3.5 py-2">Component</th>
                      <th className="px-3 py-2 text-right">Current</th>
                      <th className="px-3 py-2 text-right">Revised</th>
                      <th className="px-3.5 py-2 text-right">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {revisionComparisonRows.map((row, idx) => {
                      const diff = (row.revised || 0) - (row.current || 0);
                      const isBold = row.isHeader;
                      return (
                        <tr key={`comp-${idx}`} className={`${isBold ? 'bg-slate-200/50 font-bold text-slate-900' : 'text-slate-600 hover:bg-slate-50/80'} transition-all`}>
                          <td className="px-3.5 py-2">{row.name}</td>
                          <td className="px-3 py-2 text-right">{fmtMoney(row.current)}</td>
                          <td className="px-3 py-2 text-right">{fmtMoney(row.revised)}</td>
                          <td className="px-3.5 py-2 text-right font-semibold">
                            {diff > 0 ? (
                              <span className="text-emerald-600 font-bold">+{fmtMoney(diff)}</span>
                            ) : diff < 0 ? (
                              <span className="text-rose-600 font-bold">-{fmtMoney(Math.abs(diff))}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
            </>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" disabled={savingRevision} onClick={() => setShowRevisionModal(false)} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
            <button 
              type="button" 
              disabled={savingRevision} 
              onClick={handleSalaryRevision} 
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingRevision ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Revision'
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Employee">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete <span className="font-semibold text-gray-900">{employee.firstName} {employee.lastName}</span>?
          </p>
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            This will also remove all associated payroll records, expenses, loans, reimbursement claims, and project team references. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold">Cancel</button>
            <button type="button" onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Delete Permanently</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const Info = ({ label, value, strong }) => (
  <div className="flex justify-between gap-4 border-b border-gray-100 pb-2">
    <span className="text-gray-500">{label}</span>
    <span className={strong ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}>{value}</span>
  </div>
);

const SummaryCard = ({ label, value }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
    <div className="mt-2 text-lg font-bold text-gray-900">{value}</div>
  </div>
);

export default EmployeeDetails;
