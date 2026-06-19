import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaEdit, FaHistory, FaTrash, FaDownload, FaPlus } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import { buildMasterSalaryStructure, DEFAULT_PAYROLL_CONFIG, fmtMoney, payrollStatusClass } from '../utils/payroll';

const fmtDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-IN') : '-';
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
  const [revisionDraft, setRevisionDraft] = useState({
    role: '',
    newCTC: '',
    newAnnualCTC: '',
    newHourlyRate: '',
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
    employmentType: 'full-time',
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
        const [employeeRes, payrollRes, configRes, rolesRes] = await Promise.all([
          api.get(`/employees/${id}`, { signal: controller.signal }),
          api.get(`/payroll?employeeId=${id}&limit=12`, { signal: controller.signal }),
          api.get('/payroll/config', { signal: controller.signal }),
          api.get('/roles', { signal: controller.signal }),
        ]);
        setEmployee(employeeRes.data);
        setPayrolls(payrollRes.data.data || []);
        setConfig({ ...DEFAULT_PAYROLL_CONFIG, ...(configRes.data || {}) });
        setRoles(rolesRes.data || []);
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

  const salaryPreview = useMemo(() => buildMasterSalaryStructure(employee || {}, config), [employee, config]);

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
    };
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
      const effDateStr = revision.effectiveDate ? new Date(revision.effectiveDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const ctcVal = revision.newCTC !== undefined ? revision.newCTC : (revision.monthlyCTC || '');
      const hourlyVal = revision.newHourlyRate !== undefined ? revision.newHourlyRate : (revision.hourlyRate || '');
      revisionDraftObj = {
        role: revision.role?._id || revision.role || '',
        newCTC: ctcVal,
        newAnnualCTC: ctcVal ? Math.round(ctcVal * 12 * 100) / 100 : '',
        newHourlyRate: hourlyVal,
        effectiveDate: effDateStr,
        reason: revision.reason || '',
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
        employmentType: revision.employmentType || 'full-time',
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
    } else {
      setEditingRevision(null);
      revisionDraftObj = {
        role: employee.role?._id || employee.role || '',
        newCTC: employee.monthlyCTC || '',
        newAnnualCTC: employee.monthlyCTC ? Math.round(employee.monthlyCTC * 12 * 100) / 100 : '',
        newHourlyRate: employee.hourlyRate || '',
        effectiveDate: new Date().toISOString().slice(0, 10),
        reason: '',
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
        employmentType: employee.employmentType || 'full-time',
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
    }

    setRevisionDraft(revisionDraftObj);

    if (employee.payType === 'salaried' && revisionDraftObj.newCTC) {
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
      const res = await api.post('/payroll/calculate-salary', {
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
      });
      const master = res.data.master;
      setRevisionDraft((prev) => ({
        ...prev,
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
    try {
      setSavingRevision(true);
      const isHourly = employee.payType === 'hourly';
      const payload = {
        effectiveDate: revisionDraft.effectiveDate,
        reason: revisionDraft.reason,
        role: revisionDraft.role || '',
      };

      if (isHourly) {
        payload.newHourlyRate = Number(revisionDraft.newHourlyRate) || 0;
        payload.newCTC = 0;
      } else {
        payload.newCTC = Number(revisionDraft.newCTC);
        payload.employmentType = revisionDraft.employmentType || 'full-time';
        payload.useSalaryComponents = revisionDraft.useSalaryComponents !== false;
        payload.pfEnabled = revisionDraft.pfEnabled !== false;
        payload.esiEnabled = revisionDraft.esiEnabled !== false;
        payload.ptEnabled = revisionDraft.ptEnabled !== false;
        payload.lwfEnabled = revisionDraft.lwfEnabled !== false;
        payload.gratuityEnabled = revisionDraft.gratuityEnabled !== false;
        payload.includePfInCTC = revisionDraft.includePfInCTC !== false;
        payload.includeGratuityInCTC = revisionDraft.includeGratuityInCTC !== false;
        payload.basicPercent = revisionDraft.basicPercent === null || revisionDraft.basicPercent === '' ? null : Number(revisionDraft.basicPercent);
        payload.hraPercent = revisionDraft.hraPercent === null || revisionDraft.hraPercent === '' ? null : Number(revisionDraft.hraPercent);
        payload.joiningBonus = Number(revisionDraft.joiningBonus) || 0;
        payload.flexiAmount = Number(revisionDraft.flexiAmount) || 0;
        payload.broadband = Number(revisionDraft.broadband) || 0;
        payload.petrol = Number(revisionDraft.petrol) || 0;
        payload.lta = Number(revisionDraft.lta) || 0;
        payload.insuranceAmount = Number(revisionDraft.insuranceAmount) || 0;
        payload.employerNPS = Number(revisionDraft.employerNPS) || 0;
        payload.tds = Number(revisionDraft.deductions?.tds) || 0;
        payload.professionalTax = Number(revisionDraft.deductions?.professionalTax) || 0;
        payload.conveyance = Number(revisionDraft.salaryStructure?.conveyance) || 0;
        payload.medicalAllowance = Number(revisionDraft.salaryStructure?.medicalAllowance) || 0;
        payload.otherAllowances = (revisionDraft.salaryStructure?.otherAllowances || []).map(a => ({
          name: a.name,
          amount: Number(a.amount) || 0
        }));
        payload.otherDeductions = (revisionDraft.deductions?.otherDeductions || []).map(d => ({
          name: d.name,
          amount: Number(d.amount) || 0
        }));
      }

      if (editingRevision) {
        await api.put(`/employees/${id}/salary-revision/${editingRevision._id}`, payload);
      } else {
        await api.post(`/employees/${id}/salary-revision`, payload);
      }
      const res = await api.get(`/employees/${id}`);
      setEmployee(res.data);
      setRevisionDraft({
        role: '',
        newCTC: '',
        newAnnualCTC: '',
        newHourlyRate: '',
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
        employmentType: 'full-time',
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
      setEditingRevision(null);
      setShowRevisionModal(false);
      toast.success(editingRevision ? 'Salary revision updated successfully' : (isHourly ? 'Hourly rate revised successfully' : 'Salary revised successfully'));
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

    const toAnnual = (val) => (Number(val) || 0) * 12;

    const data = [
      ['SALARY BREAKUP / CTC STRUCTURE', ''],
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
      ['', ''],
      ['SALARY COMPONENTS', 'Monthly (INR)', 'Annual (INR)'],
      ['Basic Salary', salaryPreview.basicMaster, toAnnual(salaryPreview.basicMaster)],
      ['House Rent Allowance (HRA)', salaryPreview.hraMaster, toAnnual(salaryPreview.hraMaster)],
    ];

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
    data.push(['EMPLOYER CONTRIBUTIONS', 'Monthly (INR)', 'Annual (INR)']);
    
    if (salaryPreview.pfEmployer > 0) {
      data.push(['Provident Fund (PF) Employer', salaryPreview.pfEmployer, toAnnual(salaryPreview.pfEmployer)]);
    }
    if (salaryPreview.gratuity > 0) {
      data.push(['Gratuity Provision', salaryPreview.gratuity, toAnnual(salaryPreview.gratuity)]);
    }
    if (salaryPreview.insurance > 0) {
      data.push(['Health Insurance', salaryPreview.insurance, toAnnual(salaryPreview.insurance)]);
    }
    if (salaryPreview.employerNPS > 0) {
      data.push(['Employer NPS Contribution', salaryPreview.employerNPS, toAnnual(salaryPreview.employerNPS)]);
    }
    if (salaryPreview.lwfEmployer > 0) {
      data.push(['LWF Employer', salaryPreview.lwfEmployer, toAnnual(salaryPreview.lwfEmployer)]);
    }
    if (salaryPreview.esiEmployer > 0) {
      data.push(['ESI Employer', salaryPreview.esiEmployer, toAnnual(salaryPreview.esiEmployer)]);
    }

    data.push(['Total Employer Cost', salaryPreview.totalEmployerContributions, toAnnual(salaryPreview.totalEmployerContributions)]);
    data.push(['', '', '']);
    data.push(['COST TO COMPANY (CTC)', salaryPreview.monthlyCTC, salaryPreview.annualCTC]);
    data.push(['', '', '']);
    data.push(['STATUTORY DEDUCTIONS (EMPLOYEE)', 'Monthly (INR)', 'Annual (INR)']);
    
    if (salaryPreview.pfEmployee > 0) {
      data.push(['PF Employee Deduction', salaryPreview.pfEmployee, toAnnual(salaryPreview.pfEmployee)]);
    }
    if (salaryPreview.esiEmployee > 0) {
      data.push(['ESI Employee Deduction', salaryPreview.esiEmployee, toAnnual(salaryPreview.esiEmployee)]);
    }
    if (salaryPreview.professionalTax > 0) {
      data.push(['Professional Tax (PT)', salaryPreview.professionalTax, toAnnual(salaryPreview.professionalTax)]);
    }
    if (salaryPreview.tds > 0) {
      data.push(['Income Tax (TDS) Projection', salaryPreview.tds, toAnnual(salaryPreview.tds)]);
    }
    if (salaryPreview.lwfEmployee > 0) {
      data.push(['LWF Employee Deduction', salaryPreview.lwfEmployee, toAnnual(salaryPreview.lwfEmployee)]);
    }
    
    data.push(['Total Deductions', salaryPreview.totalDeductions, toAnnual(salaryPreview.totalDeductions)]);
    data.push(['', '', '']);
    data.push(['ESTIMATED TAKE-HOME PAY', salaryPreview.netTakeHome, toAnnual(salaryPreview.netTakeHome)]);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    worksheet['!cols'] = [
      { wch: 35 },
      { wch: 15 },
      { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Breakup');
    
    XLSX.writeFile(workbook, `${employee.firstName}_${employee.lastName}_Salary_Breakup.xlsx`);
    toast.success('Salary breakup downloaded successfully');
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
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">{employee.firstName} {employee.lastName}</h1>
          <p className="text-xs text-gray-500 mt-1">{employee.employeeId} · {employee.designation || 'No designation'}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowDeleteModal(true)} className="bg-white border border-red-300 hover:bg-red-50 text-red-600 px-3.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold">
            <FaTrash /> Delete
          </button>
          <button onClick={() => openRevisionModal()} className="bg-white border border-gray-300 hover:bg-gray-50 px-3.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold">
            <FaHistory /> Revise Salary
          </button>
          <Link to={`/employees/${employee._id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold">
            <FaEdit /> Edit
          </Link>
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
            <Info label="Status" value={employee.status} />
            <Info label="PAN" value={employee.panNumber || '-'} />
            <Info label="UAN" value={employee.uanNumber || '-'} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4 border-b border-gray-150 pb-2">
            <h2 className="font-semibold text-sm text-gray-700">
              {employee.payType === 'hourly' ? 'Hourly Rate Snapshot' : 'CTC Snapshot'}
            </h2>
            <button
              onClick={handleDownloadBreakup}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1.5"
            >
              <FaDownload size={10} />
              Download Breakup
            </button>
          </div>
          {employee.payType === 'hourly' ? (
            <div className="space-y-2 text-xs">
              <Info label="Pay Contract Type" value="Hourly Contractor" strong />
              <Info label="Hourly Rate" value={`${fmtMoney(employee.hourlyRate)}/hr`} strong />
              <Info label="Estimated Monthly Hours" value="160 hours" />
              <Info label="Est. Monthly Gross" value={fmtMoney((employee.hourlyRate || 0) * 160)} />
              <div className="border-t border-dashed border-gray-100 my-2 pt-2 text-[10px] text-amber-700 leading-normal">
                Statutory deductions (PF, ESI, PT, LWF, Gratuity) are not applicable for hourly contractors.
              </div>
              <Info label="Est. Net Take-Home" value={fmtMoney((employee.hourlyRate || 0) * 160)} strong />
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <Info label="Monthly CTC" value={fmtMoney(employee.monthlyCTC)} strong />
              <Info label="Gross Salary" value={fmtMoney(salaryPreview.grossSalary)} />
              
              {earningsList.map(c => {
                const val = getEarningValue(c.id);
                // Always show basic and HRA, show others if they are non-zero
                if (c.id === 'basic' || c.id === 'hra' || val > 0) {
                  return (
                    <Info key={c.id} label={c.name || c.id} value={fmtMoney(val)} />
                  );
                }
                return null;
              })}

              <Info label="PF Employer" value={fmtMoney(salaryPreview.pfEmployer)} />
              <Info label="Gratuity" value={fmtMoney(salaryPreview.gratuity)} />
              <Info label="Insurance" value={fmtMoney(salaryPreview.insurance)} />
              {salaryPreview.employerNPS > 0 && (
                <Info label="Employer NPS" value={fmtMoney(salaryPreview.employerNPS)} />
              )}
              <Info label="Net Take-Home" value={fmtMoney(salaryPreview.netTakeHome)} strong />
            </div>
          )}
        </div>
      </div>

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
        title={
          editingRevision
            ? (employee.payType === 'hourly' ? 'Edit Hourly Rate Revision' : 'Edit Salary Revision')
            : (employee.payType === 'hourly' ? 'Revise Hourly Rate' : 'Revise Salary')
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Job Role Template</label>
              <select
                value={revisionDraft.role || ''}
                onChange={(e) => handleRoleChange(e.target.value)}
                className={inputCls}
              >
                <option value="">No Role (Custom Salary Components)</option>
                {filteredRoles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.payType === 'hourly' ? 'Hourly' : 'Salaried'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Employment Type</label>
              <select
                value={revisionDraft.employmentType || 'full-time'}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraftField('employmentType', val);
                  refreshDraftSalaryFromCTC({ employmentType: val });
                }}
                className={inputCls}
              >
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern / Trainee</option>
              </select>
            </div>
          </div>

          {employee.payType === 'hourly' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Current Hourly Rate</label>
                <div className="w-full bg-gray-50 border border-gray-200 text-gray-500 rounded-lg px-3 py-2 text-sm font-semibold select-none">
                  {fmtMoney(employee.hourlyRate)}/hr
                </div>
              </div>
              <div>
                <label className={labelCls}>New Hourly Rate *</label>
                <div className="relative rounded-lg shadow-sm">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-400 text-sm font-semibold">₹</span>
                  <input
                    type="number"
                    required
                    min="0"
                    value={revisionDraft.newHourlyRate}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setRevisionDraft((prev) => ({
                        ...prev,
                        newHourlyRate: val
                      }));
                    }}
                    className={inputCls + ' pl-7'}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>New Annual CTC</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={revisionDraft.newAnnualCTC}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : (Number(e.target.value) || 0);
                    setRevisionDraft((prev) => ({
                      ...prev,
                      newAnnualCTC: val,
                      newCTC: val === '' ? '' : Math.round((val / 12) * 100) / 100
                    }));
                  }}
                  onBlur={refreshDraftSalaryFromCTC}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>New Monthly CTC</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={revisionDraft.newCTC}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : (Number(e.target.value) || 0);
                    setRevisionDraft((prev) => ({
                      ...prev,
                      newCTC: val,
                      newAnnualCTC: val === '' ? '' : Math.round(val * 12 * 100) / 100
                    }));
                  }}
                  onBlur={refreshDraftSalaryFromCTC}
                  className={inputCls}
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Effective Date</label>
              <input
                type="date"
                value={revisionDraft.effectiveDate}
                onChange={(e) => setDraftField('effectiveDate', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Reason</label>
              <input
                type="text"
                value={revisionDraft.reason}
                onChange={(e) => setDraftField('reason', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {employee.payType !== 'hourly' && (
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

          {/* Statutory & Contribution Toggles */}
          {(() => {
            const activePreview = draftSalaryPreview || salaryPreview || {};
            return (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>Statutory Components & Contribution Toggles</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-semibold">Statutory Toggles</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Enable or disable specific statutory contributions for this employee. Disabling a component will zero out its values in salary calculations immediately.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Use Salary Components Toggle */}
                  <div className="flex flex-col border border-blue-100 rounded-xl p-3 bg-blue-50/20">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-blue-900">Use Salary Components</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={revisionDraft.useSalaryComponents ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setDraftField('useSalaryComponents', val);
                          refreshDraftSalaryFromCTC({ useSalaryComponents: val });
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400 mt-1">
                      Distribute CTC into Basic, HRA, and Special Allowance components.
                    </span>
                  </div>

                  {/* PF Toggle */}
                  <div className="flex flex-col border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">Provident Fund (PF)</span>
                        {revisionDraft.pfEnabled !== false && activePreview && (
                          <span className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-1.5 py-0.5">
                            {fmtMoney((activePreview.pfEmployee || 0) + (activePreview.pfEmployer || 0))}
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={revisionDraft.pfEnabled ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setDraftField('pfEnabled', val);
                          refreshDraftSalaryFromCTC({ pfEnabled: val });
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400 mt-1">
                      Both Employee & Employer PF contributions {revisionDraft.pfEnabled !== false && activePreview && `(EE: ${fmtMoney(activePreview.pfEmployee || 0)}, ER: ${fmtMoney(activePreview.pfEmployer || 0)})`}
                    </span>
                  </div>

                  {/* ESI Toggle */}
                  <div className="flex flex-col border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">State Insurance (ESI)</span>
                        {revisionDraft.esiEnabled !== false && activePreview && ((activePreview.esiEmployee || 0) + (activePreview.esiEmployer || 0)) > 0 && (
                          <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-1.5 py-0.5">
                            {fmtMoney((activePreview.esiEmployee || 0) + (activePreview.esiEmployer || 0))}
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={revisionDraft.esiEnabled ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setDraftField('esiEnabled', val);
                          refreshDraftSalaryFromCTC({ esiEnabled: val });
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400 mt-1">
                      Employee State Insurance (ESI) deductions {revisionDraft.esiEnabled !== false && activePreview && ((activePreview.esiEmployee || 0) + (activePreview.esiEmployer || 0)) > 0 && `(EE: ${fmtMoney(activePreview.esiEmployee || 0)}, ER: ${fmtMoney(activePreview.esiEmployer || 0)})`}
                    </span>
                  </div>

                  {/* Professional Tax Toggle */}
                  <div className="flex flex-col border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">Professional Tax (PT)</span>
                        {revisionDraft.ptEnabled !== false && activePreview && (activePreview.professionalTax || 0) > 0 && (
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-1.5 py-0.5">
                            {fmtMoney(activePreview.professionalTax || 0)}
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={revisionDraft.ptEnabled ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setDraftField('ptEnabled', val);
                          refreshDraftSalaryFromCTC({ ptEnabled: val });
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400 mt-1">
                      State Professional Tax deduction {revisionDraft.ptEnabled !== false && activePreview && (activePreview.professionalTax || 0) > 0 && `(${fmtMoney(activePreview.professionalTax || 0)})`}
                    </span>
                  </div>

                  {/* LWF Toggle */}
                  <div className="flex flex-col border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">Welfare Fund (LWF)</span>
                        {revisionDraft.lwfEnabled !== false && activePreview && ((activePreview.lwfEmployee || 0) + (activePreview.lwfEmployer || 0)) > 0 && (
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-1.5 py-0.5">
                            {fmtMoney((activePreview.lwfEmployee || 0) + (activePreview.lwfEmployer || 0))}
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={revisionDraft.lwfEnabled ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setDraftField('lwfEnabled', val);
                          refreshDraftSalaryFromCTC({ lwfEnabled: val });
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400 mt-1">
                      Labour Welfare Fund contributions {revisionDraft.lwfEnabled !== false && activePreview && ((activePreview.lwfEmployee || 0) + (activePreview.lwfEmployer || 0)) > 0 && `(EE: ${fmtMoney(activePreview.lwfEmployee || 0)}, ER: ${fmtMoney(activePreview.lwfEmployer || 0)})`}
                    </span>
                  </div>

                  {/* Gratuity Toggle */}
                  <div className="flex flex-col border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">Gratuity Provision</span>
                        {revisionDraft.gratuityEnabled !== false && activePreview && (activePreview.gratuity || 0) > 0 && (
                          <span className="text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-1.5 py-0.5">
                            {fmtMoney(activePreview.gratuity || 0)}
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={revisionDraft.gratuityEnabled ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setDraftField('gratuityEnabled', val);
                          refreshDraftSalaryFromCTC({ gratuityEnabled: val });
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400 mt-1">
                      Accrual of statutory gratuity amount {revisionDraft.gratuityEnabled !== false && activePreview && (activePreview.gratuity || 0) > 0 && `(${fmtMoney(activePreview.gratuity || 0)})`}
                    </span>
                  </div>
                </div>

                {/* Additional CTC Settings if statutory components enabled */}
                {((revisionDraft.pfEnabled !== false) || (revisionDraft.gratuityEnabled !== false)) && (
                  <div className="border-t border-gray-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(revisionDraft.pfEnabled !== false) && (
                      <label className="flex items-center gap-2.5 cursor-pointer select-none border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                        <input
                          type="checkbox"
                          checked={revisionDraft.includePfInCTC ?? false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setDraftField('includePfInCTC', val);
                            refreshDraftSalaryFromCTC({ includePfInCTC: val });
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-xs font-semibold text-gray-800 block">
                            Include Employer PF in CTC {revisionDraft.includePfInCTC === true && activePreview && `(${fmtMoney(activePreview.pfEmployer || 0)})`}
                          </span>
                          <span className="text-[10px] text-gray-400">Employer contribution reduces Gross take-home</span>
                        </div>
                      </label>
                    )}

                    {(revisionDraft.gratuityEnabled !== false) && (
                      <label className="flex items-center gap-2.5 cursor-pointer select-none border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                        <input
                          type="checkbox"
                          checked={revisionDraft.includeGratuityInCTC ?? true}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setDraftField('includeGratuityInCTC', val);
                            refreshDraftSalaryFromCTC({ includeGratuityInCTC: val });
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-xs font-semibold text-gray-800 block">
                            Include Gratuity in CTC {revisionDraft.includeGratuityInCTC !== false && activePreview && `(${fmtMoney(activePreview.gratuity || 0)})`}
                          </span>
                          <span className="text-[10px] text-gray-400">Accrued gratuity reduces Gross take-home</span>
                        </div>
                      </label>
                    )}
                  </div>
                )}
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
                  if (c.frequency === 'quarterly') freqSuffix = ' — Quarterly';
                  else if (c.frequency === 'semi_annually') freqSuffix = ' — Semi-Annually';
                  else if (c.frequency === 'annually') freqSuffix = ' — Annually';

                  if (c.id === 'basic') {
                    const pct = revisionDraft.basicPercent !== null && revisionDraft.basicPercent !== undefined ? revisionDraft.basicPercent : Math.round(c.linkValue * 100);
                    suffix = ` (${pct}% of CTC${freqSuffix})`;
                  } else if (c.id === 'hra') {
                    const pct = revisionDraft.hraPercent !== null && revisionDraft.hraPercent !== undefined ? revisionDraft.hraPercent : Math.round(c.linkValue * 100);
                    suffix = ` (${pct}% of Basic${freqSuffix})`;
                  } else if (c.linkedTo === 'ctc_percent') {
                    suffix = ` (${Math.round(c.linkValue * 100)}% of CTC${freqSuffix})`;
                  } else if (c.linkedTo === 'basic_percent') {
                    suffix = ` (${Math.round(c.linkValue * 100)}% of Basic${freqSuffix})`;
                  } else if (c.linkedTo === 'remainder') {
                    suffix = ` (Calculated Remainder${freqSuffix})`;
                  } else if (freqSuffix) {
                    suffix = ` (${freqSuffix.replace(' — ', '')})`;
                  }
                  
                  return {
                    id: c.id,
                    name: getFieldMapping(c.id),
                    label: `${c.name}${suffix}`,
                    isCalculated
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
                      <label className={labelCls}>
                        {item.label}
                      </label>
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
