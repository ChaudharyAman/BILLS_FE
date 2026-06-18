import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaCheck, FaPlus } from 'react-icons/fa';
import api from '../api/axios';
import Modal from '../components/Modal';
import { buildMasterSalaryStructure, DEFAULT_PAYROLL_CONFIG, fmtMoney } from '../utils/payroll';

const defaultForm = {
  employeeId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  address: { line1: '', line2: '', city: '', state: '', zip: '', country: 'India' },
  designation: '',
  department: '',
  joiningDate: '',
  dateOfLeaving: '',
  location: '',
  employmentType: 'full-time',
  useSalaryComponents: true,
  status: 'active',
  role: '',
  payType: 'salaried',
  hourlyRate: 0,
  monthlyCTC: 0,
  flexiAmount: 0,
  broadband: 0,
  petrol: 0,
  lta: 0,
  insuranceAmount: 0,
  employerNPS: 0,
  joiningBonus: 0,
  basicPercent: null,
  hraPercent: null,
  pfEnabled: true,
  esiEnabled: true,
  ptEnabled: true,
  lwfEnabled: true,
  gratuityEnabled: true,
  includePfInCTC: false,
  includeGratuityInCTC: true,
  salaryStructure: {
    basic: 0,
    hra: 0,
    conveyance: 0,
    medicalAllowance: 0,
    specialAllowance: 0,
    otherAllowances: [],
  },
  deductions: { pf: 0, esi: 0, professionalTax: 0, tds: 0, otherDeductions: [] },
  bankDetails: { accountName: '', accountNumber: '', ifscCode: '', bankName: '', branch: '' },
  panNumber: '',
  uanNumber: '',
  aadharNumber: '',
  taxRegime: 'new',
  declarations: {
    section80C: 0,
    section80D: 0,
    section24b: 0,
    section80CCD1B: 0,
    rentPaidMonthly: 0,
    isMetroCity: false,
    otherExemptions: 0,
  },
};

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(defaultForm);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [config, setConfig] = useState(DEFAULT_PAYROLL_CONFIG);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentDraft, setDepartmentDraft] = useState({ name: '', code: '' });
  const [ctcPeriod, setCtcPeriod] = useState('monthly');

  const isIntern = formData.employmentType === 'intern';
  const isHourly = formData.payType === 'hourly';
  const useComponents = formData.useSalaryComponents !== false && !isIntern && !isHourly;

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const [deptRes, configRes, rolesRes] = await Promise.all([
          api.get('/departments', { signal: controller.signal }),
          api.get('/payroll/config', { signal: controller.signal }),
          api.get('/roles', { signal: controller.signal }),
        ]);
        setDepartments(deptRes.data || []);
        setConfig({ ...DEFAULT_PAYROLL_CONFIG, ...(configRes.data || {}) });
        setRoles(rolesRes.data || []);
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error(error);
      }
    };

    const fetchEmployee = async () => {
      if (!id) return;
      try {
        const res = await api.get(`/employees/${id}`, { signal: controller.signal });
        const data = res.data;
        setFormData({
          ...defaultForm,
          ...data,
          department: data.department?._id || data.department || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.substring(0, 10) : '',
          joiningDate: data.joiningDate ? data.joiningDate.substring(0, 10) : '',
          dateOfLeaving: data.dateOfLeaving ? data.dateOfLeaving.substring(0, 10) : '',
          address: { ...defaultForm.address, ...(data.address || {}) },
          salaryStructure: { ...defaultForm.salaryStructure, ...(data.salaryStructure || {}) },
          deductions: { ...defaultForm.deductions, ...(data.deductions || {}) },
          bankDetails: { ...defaultForm.bankDetails, ...(data.bankDetails || {}) },
          taxRegime: data.taxRegime || 'new',
          declarations: { ...defaultForm.declarations, ...(data.declarations || {}) },
          pfEnabled: data.pfEnabled !== false,
          esiEnabled: data.esiEnabled !== false,
          ptEnabled: data.ptEnabled !== false,
          lwfEnabled: data.lwfEnabled !== false,
          gratuityEnabled: data.gratuityEnabled !== false,
          includePfInCTC: data.includePfInCTC === true,
          includeGratuityInCTC: data.includeGratuityInCTC !== false,
        });
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        toast.error('Failed to load employee');
      }
    };

    fetchData();
    fetchEmployee();

    return () => controller.abort();
  }, [id]);

  const setField = (name, value) => {
    if (!name.includes('.')) {
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    const [parent, child] = name.split('.');
    setFormData((prev) => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
  };

  const handleRoleChange = (roleId) => {
    const selectedRole = roles.find((r) => r._id === roleId);
    if (!selectedRole) {
      setFormData((prev) => ({
        ...prev,
        role: '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      role: selectedRole._id,
      employmentType: selectedRole.employmentType || prev.employmentType,
      payType: selectedRole.payType,
      useSalaryComponents: selectedRole.useSalaryComponents !== false,
      monthlyCTC: selectedRole.payType === 'salaried' ? selectedRole.monthlyCTC : 0,
      hourlyRate: selectedRole.payType === 'hourly' ? selectedRole.hourlyRate : 0,
      pfEnabled: selectedRole.pfEnabled,
      esiEnabled: selectedRole.esiEnabled,
      ptEnabled: selectedRole.ptEnabled,
      lwfEnabled: selectedRole.lwfEnabled,
      gratuityEnabled: selectedRole.gratuityEnabled,
      includePfInCTC: selectedRole.includePfInCTC,
      includeGratuityInCTC: selectedRole.includeGratuityInCTC,
      basicPercent: selectedRole.basicPercent !== null ? selectedRole.basicPercent : null,
      hraPercent: selectedRole.hraPercent !== null ? selectedRole.hraPercent : null,
    }));

    toast.success(`Applied template settings for Job Role: ${selectedRole.name}`);
  };

  const handleEmploymentTypeChange = (newType) => {
    if (newType === 'intern') {
      // Interns get a flat consolidated stipend — no components, no statutory deductions
      setFormData((prev) => ({
        ...prev,
        employmentType: 'intern',
        useSalaryComponents: false,
        pfEnabled: false,
        esiEnabled: false,
        ptEnabled: false,
        lwfEnabled: false,
        gratuityEnabled: false,
        includePfInCTC: false,
        includeGratuityInCTC: false,
        basicPercent: null,
        hraPercent: null,
      }));
      toast('Intern mode: flat stipend, no statutory deductions.', { icon: '🎓' });
    } else {
      setFormData((prev) => ({
        ...prev,
        employmentType: newType,
        // Restore defaults when switching away from intern
        ...(prev.employmentType === 'intern' ? {
          useSalaryComponents: true,
          pfEnabled: true,
          esiEnabled: true,
          ptEnabled: true,
          lwfEnabled: true,
          gratuityEnabled: true,
          includePfInCTC: false,
          includeGratuityInCTC: true,
        } : {}),
      }));
    }
  };

  // Derive Employment Type options from configured roles (only those that exist in templates)
  const ALL_EMPLOYMENT_TYPES = [
    { value: 'full-time', label: 'Full Time' },
    { value: 'part-time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'intern', label: 'Intern / Trainee' },
  ];
  const configuredEmploymentTypes = useMemo(() => {
    if (!roles || roles.length === 0) return ALL_EMPLOYMENT_TYPES;
    const seen = new Set(roles.map(r => r.employmentType || 'full-time'));
    return ALL_EMPLOYMENT_TYPES.filter(et => seen.has(et.value));
  }, [roles]);

  const localPreview = useMemo(() => buildMasterSalaryStructure(formData, config), [formData, config]);

  const refreshSalaryFromCTC = async (overrideFields) => {
    const overrides = (overrideFields && typeof overrideFields === 'object' && !('nativeEvent' in overrideFields)) ? overrideFields : {};
    const merged = { ...formData, ...overrides };
    const monthlyCTC = Number(merged.monthlyCTC) || 0;
    if (!monthlyCTC) return;

    try {
      setCalculating(true);
      const res = await api.post('/payroll/calculate-salary', {
        monthlyCTC,
        employmentType: merged.employmentType,
        basicPercent: merged.basicPercent === null || merged.basicPercent === '' ? null : Number(merged.basicPercent),
        hraPercent: merged.hraPercent === null || merged.hraPercent === '' ? null : Number(merged.hraPercent),
        useSalaryComponents: merged.useSalaryComponents !== false,
        basic: config.salaryComponents?.find(c => c.id === 'basic')?.linkedTo === 'fixed' ? Number(merged.salaryStructure?.basic) : undefined,
        hra: config.salaryComponents?.find(c => c.id === 'hra')?.linkedTo === 'fixed' ? Number(merged.salaryStructure?.hra) : undefined,
        specialAllowance: config.salaryComponents?.find(c => c.id === 'special')?.linkedTo === 'fixed' ? Number(merged.salaryStructure?.specialAllowance) : undefined,
        flexiAmount: Number(merged.flexiAmount) || 0,
        broadband: Number(merged.broadband) || 0,
        petrol: Number(merged.petrol) || 0,
        lta: Number(merged.lta) || 0,
        insuranceAmount: Number(merged.insuranceAmount) || 0,
        employerNPS: Number(merged.employerNPS) || 0,
        professionalTax: Number(merged.deductions.professionalTax) || 0,
        tds: Number(merged.deductions.tds) || 0,
        otherDeductions: (merged.deductions?.otherDeductions || []).map((d) => ({
          name: d.name,
          amount: Number(d.amount) || 0,
        })),
        conveyance: Number(merged.salaryStructure.conveyance) || 0,
        medicalAllowance: Number(merged.salaryStructure.medicalAllowance) || 0,
        otherAllowances: (merged.salaryStructure?.otherAllowances || []).map((allowance) => ({
          name: allowance.name,
          amount: Number(allowance.amount) || 0,
        })),
        pfEnabled: merged.pfEnabled !== false,
        esiEnabled: merged.esiEnabled !== false,
        ptEnabled: merged.ptEnabled !== false,
        lwfEnabled: merged.lwfEnabled !== false,
        gratuityEnabled: merged.gratuityEnabled !== false,
        includePfInCTC: merged.includePfInCTC === true,
        includeGratuityInCTC: merged.includeGratuityInCTC !== false,
      });
      const master = res.data.master;
      setFormData((prev) => ({
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

  const addDepartment = async () => {
    if (!departmentDraft.name.trim() || !departmentDraft.code.trim()) {
      toast.error('Department name and code are required');
      return;
    }

    try {
      const res = await api.post('/departments', { name: departmentDraft.name.trim(), code: departmentDraft.code.trim() });
      setDepartments((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData((prev) => ({ ...prev, department: res.data._id }));
      setDepartmentDraft({ name: '', code: '' });
      setShowDepartmentModal(false);
      toast.success('Department added');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to add department');
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (step < 4) {
      setStep((currentStep) => Math.min(4, currentStep + 1));
      return;
    }

    try {
      setSaving(true);
      const cleanSalaryStructure = {
        ...formData.salaryStructure,
        basic: Number(localPreview.basicMaster) || 0,
        hra: Number(localPreview.hraMaster) || 0,
        conveyance: Number(formData.salaryStructure.conveyance ?? localPreview.conveyance) || 0,
        medicalAllowance: Number(formData.salaryStructure.medicalAllowance ?? localPreview.medicalAllowance) || 0,
        specialAllowance: Number(localPreview.specialAllowance) || 0,
        grossSalary: Number(localPreview.grossSalary) || 0,
        ctc: Number(localPreview.monthlyCTC) || 0,
        otherAllowances: (formData.salaryStructure.otherAllowances || []).map((allowance) => ({
          ...allowance,
          amount: Number(allowance.amount) || 0,
        })),
      };

      if (config?.salaryComponents) {
        config.salaryComponents.forEach(c => {
          if (!['basic', 'hra', 'special', 'conveyance', 'medical', 'flexi', 'broadband', 'petrol', 'lta'].includes(c.id)) {
            const val = localPreview.earningsMap?.[c.id] ?? 0;
            cleanSalaryStructure[c.id] = Number(val) || 0;
          }
        });
      }

      const payload = {
        ...formData,
        monthlyCTC: Number(formData.monthlyCTC) || 0,
        basicPercent: formData.basicPercent === null || formData.basicPercent === '' ? null : Number(formData.basicPercent),
        hraPercent: formData.hraPercent === null || formData.hraPercent === '' ? null : Number(formData.hraPercent),
        pfEnabled: formData.pfEnabled !== false,
        esiEnabled: formData.esiEnabled !== false,
        ptEnabled: formData.ptEnabled !== false,
        lwfEnabled: formData.lwfEnabled !== false,
        gratuityEnabled: formData.gratuityEnabled !== false,
        includePfInCTC: formData.includePfInCTC === true,
        includeGratuityInCTC: formData.includeGratuityInCTC !== false,
        flexiAmount: Number(formData.flexiAmount) || 0,
        broadband: Number(formData.broadband) || 0,
        petrol: Number(formData.petrol) || 0,
        lta: Number(formData.lta) || 0,
        insuranceAmount: Number(formData.insuranceAmount) || 0,
        employerNPS: Number(formData.employerNPS) || 0,
        joiningBonus: Number(formData.joiningBonus) || 0,
        salaryStructure: cleanSalaryStructure,
        deductions: {
          pf: formData.pfEnabled !== false ? (Number(localPreview.pfEmployee) || 0) : 0,
          esi: formData.esiEnabled !== false ? (Number(localPreview.esiEmployee) || 0) : 0,
          professionalTax: formData.ptEnabled !== false ? (Number(localPreview.professionalTax) || 0) : 0,
          tds: Number(formData.deductions.tds) || 0,
          otherDeductions: (formData.deductions?.otherDeductions || []).map((d) => ({
            name: d.name,
            amount: Number(d.amount) || 0,
          })),
        },
        taxRegime: formData.taxRegime || 'new',
        declarations: {
          section80C: Number(formData.declarations?.section80C) || 0,
          section80D: Number(formData.declarations?.section80D) || 0,
          section24b: Number(formData.declarations?.section24b) || 0,
          section80CCD1B: Number(formData.declarations?.section80CCD1B) || 0,
          rentPaidMonthly: Number(formData.declarations?.rentPaidMonthly) || 0,
          isMetroCity: Boolean(formData.declarations?.isMetroCity),
          otherExemptions: Number(formData.declarations?.otherExemptions) || 0,
        },
      };

      if (id) await api.put(`/employees/${id}`, payload);
      else await api.post('/employees', payload);

      toast.success(`Employee ${id ? 'updated' : 'created'} successfully`);
      navigate('/employees');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'text-xs font-semibold text-gray-600 mb-1.5 inline-block';

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <h1 className="text-3xl font-bold mb-6">{id ? 'Edit Employee' : 'Add Employee'}</h1>

      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 p-4 flex flex-wrap gap-2">
          {['Personal', 'Employment', 'Salary', 'Bank & Tax'].map((label, idx) => (
            <button key={label} type="button" onClick={(e) => { e.preventDefault(); setStep(idx + 1); }} className={`px-4 py-2 rounded-lg text-sm font-semibold ${step === idx + 1 ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {idx + 1}. {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['employeeId', 'Employee ID', 'text', true],
                ['firstName', 'First Name', 'text', true],
                ['lastName', 'Last Name', 'text', true],
                ['email', 'Email', 'email', true],
                ['phone', 'Phone'],
                ['dateOfBirth', 'Date of Birth', 'date'],
                ['location', 'Location'],
              ].map(([name, label, type = 'text', required]) => (
                <div key={name}>
                  <label className={labelCls}>{label}{required ? ' *' : ''}</label>
                  <input type={type} required={required} value={formData[name] || ''} onChange={(e) => setField(name, e.target.value)} className={inputCls} />
                </div>
              ))}
              <div>
                <label className={labelCls}>Gender</label>
                <select value={formData.gender} onChange={(e) => setField('gender', e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {['address.line1', 'address.line2', 'address.city', 'address.state', 'address.zip'].map((name) => (
                <div key={name}>
                  <label className={labelCls}>{name.split('.')[1].replace('line1', 'Address Line 1').replace('line2', 'Address Line 2').toUpperCase()}</label>
                  <input value={name.split('.').reduce((obj, key) => obj?.[key], formData) || ''} onChange={(e) => setField(name, e.target.value)} className={inputCls} />
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Job Role Template</label>
                <select
                  value={formData.role || ''}
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
                <label className={labelCls}>Pay Type</label>
                <select
                  value={formData.payType || 'salaried'}
                  onChange={(e) => setField('payType', e.target.value)}
                  className={inputCls}
                >
                  <option value="salaried">Salaried (Monthly Base)</option>
                  <option value="hourly">Hourly Rate contract</option>
                </select>
              </div>

              {formData.role && (
                <div className="col-span-1 md:col-span-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 flex flex-wrap items-center gap-2">
                  <span className="font-bold">Job Role Template Applied:</span>
                  <span>Selecting this role pre-populated salary parameters and statutory switches. You can still modify values manually.</span>
                  {formData.useSalaryComponents === false && (
                    <span className="ml-auto bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wide">Flat Salary — No Component Breakdown</span>
                  )}
                  {formData.payType === 'hourly' && (
                    <span className="ml-auto bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-full px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wide">Hourly Rate Contract</span>
                  )}
                </div>
              )}

              <div>
                <label className={labelCls}>Designation</label>
                <input value={formData.designation} onChange={(e) => setField('designation', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Department</label>
                <div className="flex gap-2">
                  <select value={formData.department} onChange={(e) => setField('department', e.target.value)} className={inputCls}>
                    <option value="">Select Department</option>
                    {departments.map((dept) => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowDepartmentModal(true)} className="px-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-600"><FaPlus /></button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Joining Date *</label>
                <input type="date" required value={formData.joiningDate} onChange={(e) => setField('joiningDate', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Date of Leaving</label>
                <input type="date" value={formData.dateOfLeaving} onChange={(e) => setField('dateOfLeaving', e.target.value)} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Status</label>
                <select value={formData.status} onChange={(e) => setField('status', e.target.value)} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>

              {formData.payType === 'salaried' && formData.employmentType !== 'intern' && (
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-gray-700">Use Salary Components</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Break salary into Basic, HRA, etc. Disable for a flat monthly amount.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newVal = formData.useSalaryComponents === false;
                      const extraOverrides = !newVal ? {
                        pfEnabled: false,
                        esiEnabled: false,
                        ptEnabled: false,
                        lwfEnabled: false,
                        gratuityEnabled: false,
                        includePfInCTC: false,
                        includeGratuityInCTC: false,
                      } : {
                        pfEnabled: true,
                        esiEnabled: true,
                        ptEnabled: true,
                        lwfEnabled: true,
                        gratuityEnabled: true,
                        includePfInCTC: false,
                        includeGratuityInCTC: true,
                      };
                      setFormData(prev => ({
                        ...prev,
                        useSalaryComponents: newVal,
                        ...extraOverrides,
                      }));
                      refreshSalaryFromCTC({ useSalaryComponents: newVal, ...extraOverrides });
                    }}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.useSalaryComponents !== false ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.useSalaryComponents !== false ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              )}

              <div>
                {formData.payType === 'hourly' ? (
                  <div>
                    <label className={labelCls}>Hourly Rate *</label>
                    <div className="relative rounded-lg shadow-sm">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-400 text-sm font-semibold">₹</span>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.hourlyRate || 0}
                        onChange={(e) => setField('hourlyRate', Number(e.target.value) || 0)}
                        className={inputCls + ' pl-7'}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400">Estimates in next steps are calculated assuming 160 hours/month.</p>
                  </div>
                ) : (
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
                          ? (formData.monthlyCTC || 0)
                          : Math.round((formData.monthlyCTC || 0) * 12)
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setField('monthlyCTC', ctcPeriod === 'monthly' ? val : Math.round((val / 12) * 100) / 100);
                      }}
                      onBlur={refreshSalaryFromCTC}
                      className={inputCls}
                    />
                    <div className="mt-1 text-xs text-gray-500">{calculating ? 'Calculating salary structure...' : 'Auto-fills Basic, HRA, and Special Allowance using payroll settings.'}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              {formData.employmentType === 'intern' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm font-semibold text-blue-800 animate-fade-in">
                  Interns/Trainees receive a consolidated stipend (100% Basic Salary) without HRA or statutory contributions.
                </div>
              )}

              {/* Custom Overrides Card — only for salaried with components, not intern */}
              {formData.employmentType !== 'intern' && formData.payType !== 'hourly' && formData.useSalaryComponents !== false && (
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
                          value={formData.basicPercent ?? ''}
                          onChange={(e) => setField('basicPercent', e.target.value === '' ? null : Number(e.target.value))}
                          onBlur={refreshSalaryFromCTC}
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
                          value={formData.hraPercent ?? ''}
                          onChange={(e) => setField('hraPercent', e.target.value === '' ? null : Number(e.target.value))}
                          onBlur={refreshSalaryFromCTC}
                          className={inputCls}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-400 text-sm">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">CTC Components</h2>
                  <span className="text-xs text-gray-500">Synced with payroll settings</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {useComponents && <SummaryCard label="PF Employer" value={fmtMoney(localPreview.pfEmployer)} />}
                  {useComponents && <SummaryCard label="Gratuity" value={fmtMoney(localPreview.gratuity)} />}
                  {useComponents && <SummaryCard label="LWF Employer" value={fmtMoney(localPreview.lwfEmployer)} />}
                  <SummaryCard label="Annual CTC" value={fmtMoney(localPreview.annualCTC)} />
                  <SummaryCard label="Gross Salary" value={fmtMoney(localPreview.grossSalary)} />
                  <SummaryCard label="Net Take-Home Estimate" value={fmtMoney(localPreview.netTakeHome)} />
                </div>
              </div>

              {/* Statutory & Contribution Switches */}
              {useComponents && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>Statutory Components & Contribution Toggles</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-semibold">Statutory Toggles</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Enable or disable specific statutory contributions for this employee. Disabling a component will zero out its values in salary calculations immediately.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* PF Toggle */}
                  <div className="flex flex-col border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">Provident Fund (PF)</span>
                        {formData.pfEnabled !== false && localPreview && (
                          <span className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-1.5 py-0.5">
                            {fmtMoney(localPreview.pfEmployee + localPreview.pfEmployer)}
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.pfEnabled ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setField('pfEnabled', val);
                          refreshSalaryFromCTC({ pfEnabled: val });
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400 mt-1">
                      Both Employee & Employer PF contributions {formData.pfEnabled !== false && localPreview && `(EE: ${fmtMoney(localPreview.pfEmployee)}, ER: ${fmtMoney(localPreview.pfEmployer)})`}
                    </span>
                  </div>

                  {/* ESI Toggle */}
                  <div className="flex flex-col border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">State Insurance (ESI)</span>
                        {formData.esiEnabled !== false && localPreview && (localPreview.esiEmployee + localPreview.esiEmployer) > 0 && (
                          <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-1.5 py-0.5">
                            {fmtMoney(localPreview.esiEmployee + localPreview.esiEmployer)}
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.esiEnabled ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setField('esiEnabled', val);
                          refreshSalaryFromCTC({ esiEnabled: val });
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400 mt-1">
                      Employee State Insurance (ESI) deductions {formData.esiEnabled !== false && localPreview && (localPreview.esiEmployee + localPreview.esiEmployer) > 0 && `(EE: ${fmtMoney(localPreview.esiEmployee)}, ER: ${fmtMoney(localPreview.esiEmployer)})`}
                    </span>
                  </div>

                  {/* Professional Tax Toggle */}
                  <div className="flex flex-col border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">Professional Tax (PT)</span>
                        {formData.ptEnabled !== false && localPreview && localPreview.professionalTax > 0 && (
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-1.5 py-0.5">
                            {fmtMoney(localPreview.professionalTax)}
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.ptEnabled ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setField('ptEnabled', val);
                          refreshSalaryFromCTC({ ptEnabled: val });
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400 mt-1">
                      State Professional Tax deduction {formData.ptEnabled !== false && localPreview && localPreview.professionalTax > 0 && `(${fmtMoney(localPreview.professionalTax)})`}
                    </span>
                  </div>

                  {/* LWF Toggle */}
                  <div className="flex flex-col border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">Welfare Fund (LWF)</span>
                        {formData.lwfEnabled !== false && localPreview && (localPreview.lwfEmployee + localPreview.lwfEmployer) > 0 && (
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-1.5 py-0.5">
                            {fmtMoney(localPreview.lwfEmployee + localPreview.lwfEmployer)}
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.lwfEnabled ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setField('lwfEnabled', val);
                          refreshSalaryFromCTC({ lwfEnabled: val });
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400 mt-1">
                      Labour Welfare Fund contributions {formData.lwfEnabled !== false && localPreview && (localPreview.lwfEmployee + localPreview.lwfEmployer) > 0 && `(EE: ${fmtMoney(localPreview.lwfEmployee)}, ER: ${fmtMoney(localPreview.lwfEmployer)})`}
                    </span>
                  </div>

                  {/* Gratuity Toggle */}
                  <div className="flex flex-col border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">Gratuity Provision</span>
                        {formData.gratuityEnabled !== false && localPreview && localPreview.gratuity > 0 && (
                          <span className="text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-1.5 py-0.5">
                            {fmtMoney(localPreview.gratuity)}
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.gratuityEnabled ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setField('gratuityEnabled', val);
                          refreshSalaryFromCTC({ gratuityEnabled: val });
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400 mt-1">
                      Accrual of statutory gratuity amount {formData.gratuityEnabled !== false && localPreview && localPreview.gratuity > 0 && `(${fmtMoney(localPreview.gratuity)})`}
                    </span>
                  </div>
                </div>

                {/* Additional CTC Settings if statutory components enabled */}
                {((formData.pfEnabled !== false) || (formData.gratuityEnabled !== false)) && (
                  <div className="border-t border-gray-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(formData.pfEnabled !== false) && (
                      <label className="flex items-center gap-2.5 cursor-pointer select-none border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                        <input
                          type="checkbox"
                          checked={formData.includePfInCTC ?? false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setField('includePfInCTC', val);
                            refreshSalaryFromCTC({ includePfInCTC: val });
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-xs font-semibold text-gray-800 block">
                            Include Employer PF in CTC {formData.includePfInCTC === true && localPreview && `(${fmtMoney(localPreview.pfEmployer)})`}
                          </span>
                          <span className="text-[10px] text-gray-400">Employer contribution reduces Gross take-home</span>
                        </div>
                      </label>
                    )}

                    {(formData.gratuityEnabled !== false) && (
                      <label className="flex items-center gap-2.5 cursor-pointer select-none border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                        <input
                          type="checkbox"
                          checked={formData.includeGratuityInCTC ?? true}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setField('includeGratuityInCTC', val);
                            refreshSalaryFromCTC({ includeGratuityInCTC: val });
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-xs font-semibold text-gray-800 block">
                            Include Gratuity in CTC {formData.includeGratuityInCTC !== false && localPreview && `(${fmtMoney(localPreview.gratuity)})`}
                          </span>
                          <span className="text-[10px] text-gray-400">Accrued gratuity reduces Gross take-home</span>
                        </div>
                      </label>
                    )}
                  </div>
                )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const getFieldMapping = (componentId) => {
                    switch (componentId) {
                      case 'basic':
                        return 'salaryStructure.basic';
                      case 'hra':
                        return 'salaryStructure.hra';
                      case 'special':
                        return 'salaryStructure.specialAllowance';
                      case 'conveyance':
                        return 'salaryStructure.conveyance';
                      case 'medical':
                        return 'salaryStructure.medicalAllowance';
                      case 'flexi':
                        return 'flexiAmount';
                      case 'broadband':
                        return 'broadband';
                      case 'petrol':
                        return 'petrol';
                      case 'lta':
                        return 'lta';
                      case 'default_insurance_amount':
                        return 'insuranceAmount';
                      case 'employerNPS':
                        return 'employerNPS';
                      default:
                        return `salaryStructure.${componentId}`;
                    }
                  };

                  const getPreviewValue = (cId) => {
                    if (!localPreview) return 0;
                    if (localPreview.earningsMap && localPreview.earningsMap[cId] !== undefined) {
                      return localPreview.earningsMap[cId];
                    }
                    if (cId === 'basic') return localPreview.basicMaster;
                    if (cId === 'hra') return localPreview.hraMaster;
                    if (cId === 'special') return localPreview.specialAllowance;
                    if (cId === 'conveyance') return localPreview.conveyance;
                    if (cId === 'medical') return localPreview.medicalAllowance;
                    if (cId === 'flexi') return localPreview.flexi;
                    if (cId === 'broadband') return localPreview.broadband;
                    if (cId === 'petrol') return localPreview.petrol;
                    if (cId === 'lta') return localPreview.lta;
                    if (cId === 'default_insurance_amount') return localPreview.insurance;
                    if (cId === 'employerNPS') return localPreview.employerNPS;
                    if (cId === 'deductions.tds') return localPreview.tds;
                    return 0;
                  };

                  const isIntern = formData.employmentType === 'intern';
                  const isHourly = formData.payType === 'hourly';
                  const useComponents = formData.useSalaryComponents !== false && !isIntern && !isHourly;
                  const comps = config?.salaryComponents || [];
                  
                  // Filter out company-wide configuration parameters
                  let filtered = comps.filter(c => ![
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

                  if (!useComponents) {
                    filtered = filtered.filter(c => c.id === 'basic');
                  }

                  const list = filtered.map(c => {
                    const isHourly = formData.payType === 'hourly';
                    const isCalculated = isIntern || isHourly ? true : (c.linkedTo !== 'fixed');
                    let suffix = '';
                    let freqSuffix = '';
                    if (c.frequency === 'quarterly') freqSuffix = ' — Quarterly';
                    else if (c.frequency === 'semi_annually') freqSuffix = ' — Semi-Annually';
                    else if (c.frequency === 'annually') freqSuffix = ' — Annually';

                    let labelName = c.name || c.id;
                    if (c.id === 'basic') {
                      if (isIntern) {
                        suffix = ' (Consolidated Stipend)';
                      } else if (isHourly) {
                        labelName = 'Contract Wages (Hourly)';
                        suffix = ' (Hourly Rate × 160 hrs)';
                      } else if (!useComponents) {
                        suffix = ' (Flat Salary)';
                      } else {
                        const pct = formData.basicPercent !== null && formData.basicPercent !== undefined ? formData.basicPercent : Math.round(c.linkValue * 100);
                        suffix = ` (${pct}% of CTC${freqSuffix})`;
                      }
                    } else if (c.id === 'hra') {
                      const pct = formData.hraPercent !== null && formData.hraPercent !== undefined ? formData.hraPercent : Math.round(c.linkValue * 100);
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
                      label: `${labelName}${suffix}`,
                      isCalculated
                    };
                  });

                  if (!useComponents) {
                    if (!list.some(item => item.id === 'deductions.tds')) {
                      list.push({ id: 'deductions.tds', name: 'deductions.tds', label: 'Income Tax (TDS) / Tax Amount', isCalculated: false });
                    }
                  } else {
                    // Always append insuranceAmount, employerNPS and deductions.tds if they aren't already included
                    if (!list.some(item => item.id === 'default_insurance_amount')) {
                      list.push({ id: 'default_insurance_amount', name: 'insuranceAmount', label: 'Insurance Amount', isCalculated: false });
                    }
                    if (!list.some(item => item.id === 'employerNPS')) {
                      list.push({ id: 'employerNPS', name: 'employerNPS', label: 'Employer NPS', isCalculated: false });
                    }
                    if (!list.some(item => item.id === 'deductions.tds')) {
                      list.push({ id: 'deductions.tds', name: 'deductions.tds', label: 'Income Tax (TDS) / Tax Amount', isCalculated: false });
                    }

                    // Append dynamic statutory components if enabled
                    if (formData.pfEnabled !== false && localPreview) {
                      if (config?.pfCalculationType === 'fixed') {
                        list.push({ id: 'pf_employee', name: 'pf_employee', label: 'Employee PF contribution (Fixed)', isCalculated: true, customValue: localPreview.pfEmployee });
                        list.push({ id: 'pf_employer', name: 'pf_employer', label: 'Employer PF contribution (Fixed)', isCalculated: true, customValue: localPreview.pfEmployer });
                      } else {
                        const pfEEPct = Math.round((config?.pfRate ?? 0.12) * 100);
                        const pfERPct = Math.round((config?.pfEmployerRate ?? 0.12) * 100);
                        list.push({ id: 'pf_employee', name: 'pf_employee', label: `Employee PF contribution (${pfEEPct}%)`, isCalculated: true, customValue: localPreview.pfEmployee });
                        list.push({ id: 'pf_employer', name: 'pf_employer', label: `Employer PF contribution (${pfERPct}%)`, isCalculated: true, customValue: localPreview.pfEmployer });
                      }
                    }
                    if (formData.esiEnabled !== false && localPreview && (localPreview.esiEmployee + localPreview.esiEmployer) > 0) {
                      const esiEEPct = (config?.esiEmployeeRate ?? 0.0075) * 100;
                      const esiERPct = (config?.esiEmployerRate ?? 0.0325) * 100;
                      list.push({ id: 'esi_employee', name: 'esi_employee', label: `Employee ESI deduction (${esiEEPct}%)`, isCalculated: true, customValue: localPreview.esiEmployee });
                      list.push({ id: 'esi_employer', name: 'esi_employer', label: `Employer ESI contribution (${esiERPct}%)`, isCalculated: true, customValue: localPreview.esiEmployer });
                    }
                    if (formData.ptEnabled !== false && localPreview && localPreview.professionalTax > 0) {
                      list.push({ id: 'pt_amount', name: 'deductions.professionalTax', label: 'Professional Tax (PT)', isCalculated: true, customValue: localPreview.professionalTax });
                    }
                    if (formData.lwfEnabled !== false && localPreview && (localPreview.lwfEmployee + localPreview.lwfEmployer) > 0) {
                      list.push({ id: 'lwf_employee', name: 'lwf_employee', label: 'Employee LWF contribution', isCalculated: true, customValue: localPreview.lwfEmployee });
                      list.push({ id: 'lwf_employer', name: 'lwf_employer', label: 'Employer LWF contribution', isCalculated: true, customValue: localPreview.lwfEmployer });
                    }
                    if (formData.gratuityEnabled !== false && localPreview && localPreview.gratuity > 0) {
                      const gratPct = Math.round((config?.gratuityRate ?? 0.0481) * 10000) / 100;
                      list.push({ id: 'gratuity_amount', name: 'gratuity_amount', label: `Gratuity Provision (${gratPct}%)`, isCalculated: true, customValue: localPreview.gratuity });
                    }
                  }

                  return list.map((item) => {
                    const value = item.customValue !== undefined
                      ? item.customValue
                      : (item.isCalculated
                          ? getPreviewValue(item.id)
                          : (item.name === 'salaryStructure.basic' ? (formData.salaryStructure?.basic ?? localPreview.basicMaster ?? 0) :
                             item.name === 'salaryStructure.hra' ? (formData.salaryStructure?.hra ?? localPreview.hraMaster ?? 0) :
                             item.name === 'salaryStructure.specialAllowance' ? (formData.salaryStructure?.specialAllowance ?? localPreview.specialAllowance ?? 0) :
                             item.name === 'deductions.tds' ? (formData.deductions?.tds ?? '') :
                             (item.name.includes('.') 
                               ? (item.name.split('.').reduce((obj, key) => obj?.[key], formData) ?? getPreviewValue(item.id) ?? 0)
                               : (formData[item.name] ?? getPreviewValue(item.id) ?? 0)
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
                          placeholder={item.customValue !== undefined ? `Live Est: ₹${item.customValue}` : (item.id === 'deductions.tds' ? `Live Est: ₹${localPreview.tds}` : `Live Est: ₹${getPreviewValue(item.id)}`)}
                          value={value}
                          onChange={(e) => setField(item.name, e.target.value === '' ? '' : Number(e.target.value))}
                          onBlur={refreshSalaryFromCTC}
                          className={`${inputCls} ${item.isCalculated ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed font-medium' : ''}`}
                        />
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Custom Allowances Section */}
              {useComponents && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span>Custom Allowances</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full font-semibold">Other Earnings</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const currentAllowances = formData.salaryStructure?.otherAllowances || [];
                        setField('salaryStructure.otherAllowances', [...currentAllowances, { name: '', amount: 0 }]);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
                    >
                      <FaPlus size={10} /> Add Custom Allowance
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Define additional custom allowance types for this employee (e.g. Children Education, Uniform Allowance). These will increase Gross Salary and be balanced under Special Allowance.
                  </p>

                  {(!formData.salaryStructure?.otherAllowances || formData.salaryStructure.otherAllowances.length === 0) ? (
                    <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-medium bg-gray-50/20">
                      No custom allowances defined. Click "+ Add Custom Allowance" above to add one.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.salaryStructure.otherAllowances.map((allowance, index) => (
                        <div key={index} className="flex gap-3 items-end bg-gray-50/50 p-3 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">Allowance Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Children Education"
                              value={allowance.name || ''}
                              onChange={(e) => {
                                const updated = [...(formData.salaryStructure?.otherAllowances || [])];
                                updated[index] = { ...updated[index], name: e.target.value };
                                setField('salaryStructure.otherAllowances', updated);
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
                                const updated = [...(formData.salaryStructure?.otherAllowances || [])];
                                updated[index] = { ...updated[index], amount: e.target.value === '' ? '' : Number(e.target.value) };
                                setField('salaryStructure.otherAllowances', updated);
                              }}
                              onBlur={refreshSalaryFromCTC}
                              className={inputCls}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (formData.salaryStructure?.otherAllowances || []).filter((_, idx) => idx !== index);
                              setField('salaryStructure.otherAllowances', updated);
                              refreshSalaryFromCTC({ salaryStructure: { ...formData.salaryStructure, otherAllowances: updated } });
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
              )}

              {/* Custom Deductions Section */}
              {useComponents && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <span>Custom Deductions</span>
                      <span className="text-[10px] bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full font-semibold">Other Deductions</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const currentDeductions = formData.deductions?.otherDeductions || [];
                        setField('deductions.otherDeductions', [...currentDeductions, { name: '', amount: 0 }]);
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5"
                    >
                      <FaPlus size={10} /> Add Custom Deduction
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Define additional custom monthly deductions for this employee (e.g. Car Lease, Corporate Accommodation). These will automatically reduce the Net Take-Home Salary estimate.
                  </p>

                  {(!formData.deductions?.otherDeductions || formData.deductions.otherDeductions.length === 0) ? (
                    <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-medium bg-gray-50/20">
                      No custom deductions defined. Click "+ Add Custom Deduction" above to add one.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.deductions.otherDeductions.map((deduction, index) => (
                        <div key={index} className="flex gap-3 items-end bg-gray-50/50 p-3 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">Deduction Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Car Lease Deduction"
                              value={deduction.name || ''}
                              onChange={(e) => {
                                const updated = [...(formData.deductions?.otherDeductions || [])];
                                updated[index] = { ...updated[index], name: e.target.value };
                                setField('deductions.otherDeductions', updated);
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
                                const updated = [...(formData.deductions?.otherDeductions || [])];
                                updated[index] = { ...updated[index], amount: e.target.value === '' ? '' : Number(e.target.value) };
                                setField('deductions.otherDeductions', updated);
                              }}
                              onBlur={refreshSalaryFromCTC}
                              className={inputCls}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (formData.deductions?.otherDeductions || []).filter((_, idx) => idx !== index);
                              setField('deductions.otherDeductions', updated);
                              refreshSalaryFromCTC({ deductions: { ...formData.deductions, otherDeductions: updated } });
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
              )}

              {useComponents && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                  <h2 className="text-lg font-bold mb-4">One-Time Pay</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Joining Bonus</label>
                      <input type="number" step="any" min="0" value={formData.joiningBonus || 0} onChange={(e) => setField('joiningBonus', e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Bank Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['bankDetails.accountName', 'Account Name'],
                    ['bankDetails.accountNumber', 'Account Number'],
                    ['bankDetails.ifscCode', 'IFSC Code'],
                    ['bankDetails.bankName', 'Bank Name'],
                    ['bankDetails.branch', 'Branch'],
                  ].map(([name, label]) => (
                    <div key={name}>
                      <label className={labelCls}>{label}</label>
                      <input
                        type="text"
                        value={name.includes('.') ? name.split('.').reduce((obj, key) => obj?.[key], formData) || '' : formData[name] || ''}
                        onChange={(e) => setField(name, e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Tax Profile & Statutory Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  {[
                    ['panNumber', 'PAN Number'],
                    ['uanNumber', 'UAN Number'],
                    ['aadharNumber', 'Aadhar Number'],
                    ['deductions.professionalTax', 'Professional Tax (Monthly)'],
                  ].map(([name, label]) => (
                    <div key={name}>
                      <label className={labelCls}>{label}</label>
                      <input
                        type={name.startsWith('deductions.') ? 'number' : 'text'}
                        step={name.startsWith('deductions.') ? 'any' : undefined}
                        value={name.includes('.') ? name.split('.').reduce((obj, key) => obj?.[key], formData) || '' : formData[name] || ''}
                        onChange={(e) => setField(name, e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-5 space-y-5">
                  <div>
                    <label className="text-sm font-bold text-gray-700 block mb-2">Income Tax Regime Selection</label>
                    <div className="flex gap-4 flex-col md:flex-row">
                      <button
                        type="button"
                        onClick={() => setField('taxRegime', 'new')}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all ${
                          formData.taxRegime === 'new'
                            ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-bold text-sm text-gray-900">New Tax Regime (Default)</div>
                        <div className="text-xs text-gray-500 mt-1">Sleeker slabs, Standard Deduction of ₹75,000. No investment deductions allowed.</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setField('taxRegime', 'old')}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all ${
                          formData.taxRegime === 'old'
                            ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-bold text-sm text-gray-900">Old Tax Regime</div>
                        <div className="text-xs text-gray-500 mt-1">Allows investments (80C, 80D, 24b, NPS) and HRA rent exemption. Standard Deduction of ₹50,000.</div>
                      </button>
                    </div>
                  </div>

                  {formData.taxRegime === 'old' && (
                    <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-5 space-y-4">
                      <h4 className="font-bold text-sm text-gray-800">Investment Declarations (Old Regime Exemptions)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={labelCls}>Section 80C (Max ₹1.5L)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="PPF, EPF, ELSS, etc."
                            value={formData.declarations?.section80C || 0}
                            onChange={(e) => setField('declarations.section80C', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Section 80D (Max ₹25k)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Medical Insurance"
                            value={formData.declarations?.section80D || 0}
                            onChange={(e) => setField('declarations.section80D', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Section 24(b) (Max ₹2L)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Home Loan Interest"
                            value={formData.declarations?.section24b || 0}
                            onChange={(e) => setField('declarations.section24b', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Section 80CCD(1B) (Max ₹50k)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="NPS Self Contribution"
                            value={formData.declarations?.section80CCD1B || 0}
                            onChange={(e) => setField('declarations.section80CCD1B', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Other Exemptions</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="LTA, other exemptions"
                            value={formData.declarations?.otherExemptions || 0}
                            onChange={(e) => setField('declarations.otherExemptions', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Monthly Rent Paid (HRA)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Rent paid per month"
                            value={formData.declarations?.rentPaidMonthly || 0}
                            onChange={(e) => setField('declarations.rentPaidMonthly', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          id="isMetroCity"
                          checked={formData.declarations?.isMetroCity || false}
                          onChange={(e) => setField('declarations.isMetroCity', e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isMetroCity" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
                          Resides in a Metro City (Delhi, Mumbai, Chennai, Kolkata) — allows 50% Basic HRA cap instead of 40%.
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
                    <h4 className="font-bold text-sm text-emerald-800 flex justify-between items-center">
                      <span>Live Estimated Tax Breakdown</span>
                      <span className="text-xs px-2 py-0.5 bg-emerald-100 rounded-full font-semibold">
                        Regime: {formData.taxRegime === 'old' ? 'Old' : 'New'}
                      </span>
                    </h4>
                    {localPreview.taxDetails && (
                      (() => {
                        const details = formData.taxRegime === 'old'
                          ? localPreview.taxDetails.oldRegime
                          : localPreview.taxDetails.newRegime;
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium text-emerald-700">
                            <div>
                              <div className="text-gray-500">Gross Salary (Annual)</div>
                              <div className="font-bold text-base text-emerald-900 mt-0.5">
                                {fmtMoney(localPreview.totalEarnings * 12)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">Exemptions & Deductions</div>
                              <div className="font-bold text-base text-emerald-900 mt-0.5">
                                {fmtMoney(
                                  formData.taxRegime === 'old'
                                    ? details.totalDeductions
                                    : details.standardDeduction
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">Net Taxable Income</div>
                              <div className="font-bold text-base text-emerald-900 mt-0.5">
                                {fmtMoney(details.netTaxableIncome)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">Est. Tax & Cess (Annual)</div>
                              <div className="font-bold text-base text-emerald-900 mt-0.5">
                                {fmtMoney(details.annualTax)}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>TDS override (Monthly) — Leave 0 to auto-deduct live estimate</label>
                    <div className="flex gap-4 items-center">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Manual Monthly TDS override"
                        value={formData.deductions?.tds || 0}
                        onChange={(e) => setField('deductions.tds', e.target.value)}
                        onBlur={refreshSalaryFromCTC}
                        className={inputCls}
                      />
                      <div className="text-xs text-gray-500">
                        Current monthly tax deduction: <span className="font-bold text-gray-900">
                          {fmtMoney(formData.deductions?.tds > 0 ? formData.deductions.tds : localPreview.tds)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between">
          <button type="button" onClick={(e) => { e.preventDefault(); setStep((current) => Math.max(1, current - 1)); }} disabled={step === 1} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold disabled:opacity-50">Previous</button>
          {step < 4 ? (
            <button type="button" onClick={(e) => { e.preventDefault(); setStep((current) => current + 1); }} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">Next</button>
          ) : (
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
              <FaCheck /> Save Employee
            </button>
          )}
        </div>
      </form>

      <Modal isOpen={showDepartmentModal} onClose={() => setShowDepartmentModal(false)} title="Add Department">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Department Name</label>
            <input value={departmentDraft.name} onChange={(e) => setDepartmentDraft((prev) => ({ ...prev, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Department Code</label>
            <input value={departmentDraft.code} onChange={(e) => setDepartmentDraft((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowDepartmentModal(false)} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold">Cancel</button>
            <button type="button" onClick={addDepartment} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
    <div className="mt-2 text-lg font-bold text-gray-900">{value}</div>
  </div>
);

export default EmployeeForm;
