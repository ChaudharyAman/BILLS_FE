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
  status: 'active',
  monthlyCTC: 0,
  flexiAmount: 0,
  broadband: 0,
  petrol: 0,
  lta: 0,
  insuranceAmount: 1000,
  employerNPS: 0,
  joiningBonus: 0,
  basicPercent: null,
  hraPercent: null,
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
  const [config, setConfig] = useState(DEFAULT_PAYROLL_CONFIG);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentDraft, setDepartmentDraft] = useState({ name: '', code: '' });

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const [deptRes, configRes] = await Promise.all([
          api.get('/departments', { signal: controller.signal }),
          api.get('/payroll/config', { signal: controller.signal }),
        ]);
        setDepartments(deptRes.data || []);
        setConfig({ ...DEFAULT_PAYROLL_CONFIG, ...(configRes.data || {}) });
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

  const localPreview = useMemo(() => buildMasterSalaryStructure(formData, config), [formData, config]);

  const refreshSalaryFromCTC = async () => {
    const monthlyCTC = Number(formData.monthlyCTC) || 0;
    if (!monthlyCTC) return;

    try {
      setCalculating(true);
      const res = await api.post('/payroll/calculate-salary', {
        monthlyCTC,
        basicPercent: formData.basicPercent === null || formData.basicPercent === '' ? null : Number(formData.basicPercent),
        hraPercent: formData.hraPercent === null || formData.hraPercent === '' ? null : Number(formData.hraPercent),
        flexiAmount: Number(formData.flexiAmount) || 0,
        broadband: Number(formData.broadband) || 0,
        petrol: Number(formData.petrol) || 0,
        lta: Number(formData.lta) || 0,
        insuranceAmount: Number(formData.insuranceAmount) || 0,
        employerNPS: Number(formData.employerNPS) || 0,
        professionalTax: Number(formData.deductions.professionalTax) || 0,
        tds: Number(formData.deductions.tds) || 0,
        otherDeductions: (formData.deductions?.otherDeductions || []).map((d) => ({
          name: d.name,
          amount: Number(d.amount) || 0,
        })),
        conveyance: Number(formData.salaryStructure.conveyance) || 0,
        medicalAllowance: Number(formData.salaryStructure.medicalAllowance) || 0,
        otherAllowances: (formData.salaryStructure?.otherAllowances || []).map((allowance) => ({
          name: allowance.name,
          amount: Number(allowance.amount) || 0,
        })),
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
      const payload = {
        ...formData,
        monthlyCTC: Number(formData.monthlyCTC) || 0,
        basicPercent: formData.basicPercent === null || formData.basicPercent === '' ? null : Number(formData.basicPercent),
        hraPercent: formData.hraPercent === null || formData.hraPercent === '' ? null : Number(formData.hraPercent),
        flexiAmount: Number(formData.flexiAmount) || 0,
        broadband: Number(formData.broadband) || 0,
        petrol: Number(formData.petrol) || 0,
        lta: Number(formData.lta) || 0,
        insuranceAmount: Number(formData.insuranceAmount) || 0,
        employerNPS: Number(formData.employerNPS) || 0,
        joiningBonus: Number(formData.joiningBonus) || 0,
        salaryStructure: {
          ...formData.salaryStructure,
          basic: Number(localPreview.basicMaster) || 0,
          hra: Number(localPreview.hraMaster) || 0,
          conveyance: Number(formData.salaryStructure.conveyance) || 0,
          medicalAllowance: Number(formData.salaryStructure.medicalAllowance) || 0,
          specialAllowance: Number(localPreview.specialAllowance) || 0,
          otherAllowances: (formData.salaryStructure.otherAllowances || []).map((allowance) => ({
            ...allowance,
            amount: Number(allowance.amount) || 0,
          })),
        },
        deductions: {
          pf: Number(formData.deductions.pf) || 0,
          esi: Number(formData.deductions.esi) || 0,
          professionalTax: Number(formData.deductions.professionalTax) || 0,
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
            <button key={label} type="button" onClick={() => setStep(idx + 1)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${step === idx + 1 ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
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
                ['dateOfLeaving', 'Date of Leaving', 'date'],
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
                <label className={labelCls}>Employment Type</label>
                <select value={formData.employmentType} onChange={(e) => setField('employmentType', e.target.value)} className={inputCls}>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={formData.status} onChange={(e) => setField('status', e.target.value)} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Monthly CTC</label>
                <input
                  type="number"
                  min="0"
                  value={formData.monthlyCTC || 0}
                  onChange={(e) => setField('monthlyCTC', e.target.value)}
                  onBlur={refreshSalaryFromCTC}
                  className={inputCls}
                />
                <div className="mt-1 text-xs text-gray-500">{calculating ? 'Calculating salary structure...' : 'Auto-fills Basic, HRA, and Special Allowance using payroll settings.'}</div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['salaryStructure.basic', 'Basic Salary'],
                  ['salaryStructure.hra', 'HRA'],
                  ['salaryStructure.conveyance', 'Conveyance'],
                  ['salaryStructure.medicalAllowance', 'Medical Allowance'],
                  ['salaryStructure.specialAllowance', 'Special Allowance'],
                  ['flexiAmount', 'Flexi Amount'],
                  ['broadband', 'Broadband'],
                  ['petrol', 'Petrol'],
                  ['lta', 'LTA'],
                  ['insuranceAmount', 'Insurance Amount'],
                  ['employerNPS', 'Employer NPS'],
                ].map(([name, label]) => {
                  const isAuto = ['salaryStructure.basic', 'salaryStructure.hra', 'salaryStructure.specialAllowance'].includes(name);
                  return (
                    <div key={name}>
                      <label className={labelCls}>
                        {label} {isAuto && <span className="text-[10px] text-blue-500 font-normal ml-1">(Auto-computed)</span>}
                      </label>
                      <input
                        type="number"
                        min="0"
                        readOnly={isAuto}
                        value={
                          name === 'salaryStructure.basic' ? (localPreview.basicMaster || 0) :
                          name === 'salaryStructure.hra' ? (localPreview.hraMaster || 0) :
                          name === 'salaryStructure.specialAllowance' ? (localPreview.specialAllowance || 0) :
                          (name.includes('.') ? name.split('.').reduce((obj, key) => obj?.[key], formData) || 0 : formData[name] || 0)
                        }
                        onChange={isAuto ? undefined : (e) => setField(name, e.target.value)}
                        onBlur={['flexiAmount', 'broadband', 'petrol', 'lta', 'insuranceAmount', 'employerNPS', 'salaryStructure.conveyance', 'salaryStructure.medicalAllowance'].includes(name) ? refreshSalaryFromCTC : undefined}
                        className={`${inputCls} ${isAuto ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200 focus:ring-0 focus:border-gray-200' : ''}`}
                      />
                    </div>
                  );
                })}
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
                            setTimeout(refreshSalaryFromCTC, 0);
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
                            setTimeout(refreshSalaryFromCTC, 0);
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

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">CTC Components</h2>
                  <span className="text-xs text-gray-500">Synced with payroll settings</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <SummaryCard label="PF Employer" value={fmtMoney(localPreview.pfEmployer)} />
                  <SummaryCard label="Gratuity" value={fmtMoney(localPreview.gratuity)} />
                  <SummaryCard label="LWF Employer" value={fmtMoney(localPreview.lwfEmployer)} />
                  <SummaryCard label="Annual CTC" value={fmtMoney(localPreview.annualCTC)} />
                  <SummaryCard label="Gross Salary" value={fmtMoney(localPreview.grossSalary)} />
                  <SummaryCard label="Net Take-Home Estimate" value={fmtMoney(localPreview.netTakeHome)} />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-bold mb-4">One-Time Pay</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Joining Bonus</label>
                    <input type="number" min="0" value={formData.joiningBonus || 0} onChange={(e) => setField('joiningBonus', e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
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
                        min="0"
                        placeholder="Manual Monthly TDS override"
                        value={formData.deductions?.tds || 0}
                        onChange={(e) => setField('deductions.tds', e.target.value)}
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
          <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold disabled:opacity-50">Previous</button>
          {step < 4 ? (
            <button type="button" onClick={() => setStep((current) => current + 1)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">Next</button>
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
