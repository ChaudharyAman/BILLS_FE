import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { FaCheck, FaPlus } from 'react-icons/fa';

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
  employmentType: 'full-time',
  status: 'active',
  salaryStructure: {
    basic: 0,
    hra: 0,
    conveyance: 0,
    medicalAllowance: 0,
    specialAllowance: 0,
    otherAllowances: [],
  },
  deductions: { pf: 0, esi: 0, professionalTax: 0, tds: 0 },
  bankDetails: { accountName: '', accountNumber: '', ifscCode: '', bankName: '', branch: '' },
  panNumber: '',
  uanNumber: '',
  aadharNumber: '',
};

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(defaultForm);
  const [departments, setDepartments] = useState([]);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data || [])).catch(() => {});
    if (id) {
      api.get(`/employees/${id}`).then(res => {
        const data = res.data;
        setFormData({
          ...defaultForm,
          ...data,
          department: data.department?._id || data.department || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.substring(0, 10) : '',
          joiningDate: data.joiningDate ? data.joiningDate.substring(0, 10) : '',
          address: { ...defaultForm.address, ...(data.address || {}) },
          salaryStructure: { ...defaultForm.salaryStructure, ...(data.salaryStructure || {}) },
          deductions: { ...defaultForm.deductions, ...(data.deductions || {}) },
          bankDetails: { ...defaultForm.bankDetails, ...(data.bankDetails || {}) },
        });
      }).catch(() => alert('Failed to load employee'));
    }
  }, [id]);

  const setField = (name, value) => {
    if (!name.includes('.')) {
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }
    const [parent, child] = name.split('.');
    setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
  };

  const grossSalary = useMemo(() => {
    const s = formData.salaryStructure;
    const other = (s.otherAllowances || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return ['basic', 'hra', 'conveyance', 'medicalAllowance', 'specialAllowance'].reduce((sum, key) => sum + (Number(s[key]) || 0), other);
  }, [formData.salaryStructure]);

  const addDepartment = async () => {
    const name = window.prompt('Department name');
    if (!name) return;
    const code = window.prompt('Department code', name.slice(0, 3).toUpperCase());
    if (!code) return;

    try {
      const res = await api.post('/departments', { name, code });
      setDepartments(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, department: res.data._id }));
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to add department');
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...formData,
        salaryStructure: {
          ...formData.salaryStructure,
          basic: Number(formData.salaryStructure.basic) || 0,
          hra: Number(formData.salaryStructure.hra) || 0,
          conveyance: Number(formData.salaryStructure.conveyance) || 0,
          medicalAllowance: Number(formData.salaryStructure.medicalAllowance) || 0,
          specialAllowance: Number(formData.salaryStructure.specialAllowance) || 0,
          otherAllowances: (formData.salaryStructure.otherAllowances || []).map((allowance) => ({
            ...allowance,
            amount: Number(allowance.amount) || 0,
          })),
        },
        deductions: Object.fromEntries(Object.entries(formData.deductions).map(([key, value]) => [key, Number(value) || 0])),
      };
      if (id) await api.put(`/employees/${id}`, payload);
      else await api.post('/employees', payload);
      navigate('/employees');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save employee');
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
              ].map(([name, label, type = 'text', required]) => (
                <div key={name}>
                  <label className={labelCls}>{label}{required ? ' *' : ''}</label>
                  <input type={type} required={required} value={formData[name] || ''} onChange={e => setField(name, e.target.value)} className={inputCls} />
                </div>
              ))}
              <div>
                <label className={labelCls}>Gender</label>
                <select value={formData.gender} onChange={e => setField('gender', e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {['address.line1', 'address.line2', 'address.city', 'address.state', 'address.zip'].map(name => (
                <div key={name}>
                  <label className={labelCls}>{name.split('.')[1].replace('line1', 'Address Line 1').replace('line2', 'Address Line 2').toUpperCase()}</label>
                  <input value={name.split('.').reduce((obj, key) => obj?.[key], formData) || ''} onChange={e => setField(name, e.target.value)} className={inputCls} />
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Designation</label>
                <input value={formData.designation} onChange={e => setField('designation', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Department</label>
                <div className="flex gap-2">
                  <select value={formData.department} onChange={e => setField('department', e.target.value)} className={inputCls}>
                    <option value="">Select Department</option>
                    {departments.map(dept => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
                  </select>
                  <button type="button" onClick={addDepartment} className="px-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-600"><FaPlus /></button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Joining Date *</label>
                <input type="date" required value={formData.joiningDate} onChange={e => setField('joiningDate', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Employment Type</label>
                <select value={formData.employmentType} onChange={e => setField('employmentType', e.target.value)} className={inputCls}>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={formData.status} onChange={e => setField('status', e.target.value)} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['salaryStructure.basic', 'Basic Salary *'],
                  ['salaryStructure.hra', 'HRA'],
                  ['salaryStructure.conveyance', 'Conveyance'],
                  ['salaryStructure.medicalAllowance', 'Medical Allowance'],
                  ['salaryStructure.specialAllowance', 'Special Allowance'],
                  ['deductions.pf', 'PF'],
                  ['deductions.esi', 'ESI'],
                  ['deductions.professionalTax', 'Professional Tax'],
                  ['deductions.tds', 'TDS'],
                ].map(([name, label]) => (
                  <div key={name}>
                    <label className={labelCls}>{label}</label>
                    <input type="number" min="0" value={name.split('.').reduce((obj, key) => obj?.[key], formData) || 0} onChange={e => setField(name, e.target.value)} className={inputCls} />
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-blue-800 font-bold">
                Gross Salary: ₹{grossSalary.toLocaleString('en-IN')}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['bankDetails.accountName', 'Account Name'],
                ['bankDetails.accountNumber', 'Account Number'],
                ['bankDetails.ifscCode', 'IFSC Code'],
                ['bankDetails.bankName', 'Bank Name'],
                ['bankDetails.branch', 'Branch'],
                ['panNumber', 'PAN Number'],
                ['uanNumber', 'UAN Number'],
                ['aadharNumber', 'Aadhar Number'],
              ].map(([name, label]) => (
                <div key={name}>
                  <label className={labelCls}>{label}</label>
                  <input value={name.includes('.') ? name.split('.').reduce((obj, key) => obj?.[key], formData) || '' : formData[name] || ''} onChange={e => setField(name, e.target.value)} className={inputCls} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between">
          <button type="button" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold disabled:opacity-50">Previous</button>
          {step < 4 ? (
            <button type="button" onClick={() => setStep(s => s + 1)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">Next</button>
          ) : (
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
              <FaCheck /> Save Employee
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
