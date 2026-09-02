import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaSearch, FaUserEdit, FaCalculator, FaLayerGroup, FaShieldAlt, FaLock } from 'react-icons/fa';
import api from '../api/axios';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import { fmtMoney } from '../utils/payroll';
import { getOnboardingFields } from '../utils/compensationTypeFields';

const BulkSalaryRevision = () => {
  const navigate = useNavigate();

  // Role Permission Gate
  const userStr = localStorage.getItem('user');
  let userRole = 'admin';
  try {
    const parsed = userStr ? JSON.parse(userStr) : null;
    const userObj = parsed?.user || parsed;
    if (userObj?.role) userRole = String(userObj.role).toLowerCase();
  } catch (e) {
    console.error('Failed to parse user role for bulk revision gate:', e);
  }

  const ALLOWED_ROLES = ['admin', 'owner', 'superadmin', 'hr_admin', 'payroll_admin'];
  const isAuthorized = ALLOWED_ROLES.includes(userRole);

  // Step state: 1: Scope & Config, 2: Preview, 3: Execution Summary
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(true);

  // Reference data
  const [departments, setDepartments] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);

  // Step 1 Form States
  const [targetMode, setTargetMode] = useState('filter'); // 'filter' | 'select'
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [incrementMode, setIncrementMode] = useState('uniform'); // 'uniform' | 'individual'
  const [incrementType, setIncrementType] = useState('percentage'); // 'percentage' | 'flat_amount'
  const [incrementValue, setIncrementValue] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('Bulk Annual Salary Increment');

  // Individual revisions state (employeeId -> { newCTC, newHourlyRate, dailyRate, compensationType })
  const [individualRevisions, setIndividualRevisions] = useState({});

  // Step 2 & 3 Results
  const [previewData, setPreviewData] = useState([]);
  const [previewErrors, setPreviewErrors] = useState([]);
  const [executionResult, setExecutionResult] = useState(null);

  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingEmployees(true);
        const [deptRes, empRes] = await Promise.all([
          api.get('/departments'),
          api.get('/employees?limit=1000&status=active'),
        ]);
        setDepartments(deptRes.data || []);
        setAllEmployees(empRes.data.data || empRes.data || []);
      } catch (err) {
        console.error('Failed to load initial data for bulk salary revision:', err);
        toast.error('Failed to load employees or departments');
      } finally {
        setFetchingEmployees(false);
      }
    };
    fetchData();
  }, []);

  // Filtered employees for display/selection
  const filteredEmployees = allEmployees.filter((emp) => {
    if (selectedDepartment && emp.department?._id !== selectedDepartment && emp.department !== selectedDepartment) {
      return false;
    }
    if (selectedDesignation && emp.designation?.toLowerCase() !== selectedDesignation.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const code = (emp.employeeId || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    }
    return true;
  });

  const toggleEmployeeSelection = (id) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (filteredEmployees.every((emp) => selectedEmployeeIds.includes(emp._id))) {
      const filteredSet = new Set(filteredEmployees.map((e) => e._id));
      setSelectedEmployeeIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const newSet = new Set([...selectedEmployeeIds, ...filteredEmployees.map((e) => e._id)]);
      setSelectedEmployeeIds(Array.from(newSet));
    }
  };

  const buildRevisionsFromTable = () => {
    return selectedEmployeeIds.map((id) => {
      const emp = allEmployees.find((e) => e._id === id);
      const item = individualRevisions[id] || {};
      const compType = item.compensationType || emp?.compensationType || 'monthly_salary';
      const fields = getOnboardingFields(compType);

      const revisionObj = {
        employeeId: id,
        compensationType: compType,
        newCTC: item.newCTC !== undefined ? Number(item.newCTC) : Number(emp?.monthlyCTC || 0),
        newHourlyRate: item.newHourlyRate !== undefined ? Number(item.newHourlyRate) : Number(emp?.hourlyRate || 0),
        dailyRate: item.dailyRate !== undefined ? Number(item.dailyRate) : Number(emp?.dailyRate || 0),
      };

      if (fields.includes('weeklyRate')) {
        revisionObj.weeklyRate = item.weeklyRate !== undefined ? Number(item.weeklyRate) : Number(emp?.weeklyRate || 0);
      }
      if (fields.includes('projectFee')) {
        revisionObj.projectFee = item.projectFee !== undefined ? Number(item.projectFee) : Number(emp?.projectFee || 0);
      }
      if (fields.includes('milestoneAmount')) {
        revisionObj.milestoneAmount = item.milestoneAmount !== undefined ? Number(item.milestoneAmount) : Number(emp?.milestoneAmount || 0);
      }

      return revisionObj;
    });
  };

  // Step 1 Validation & Preview Fetch
  const handleProceedToPreview = async () => {
    if (!effectiveDate) {
      toast.error('Effective Date is required');
      return;
    }

    if (incrementMode === 'uniform') {
      const val = Number(incrementValue);
      if (!val || val <= 0) {
        toast.error('Please provide a valid positive increment value');
        return;
      }
    }

    let payload = {
      effectiveDate,
      reason: reason || 'Bulk Annual Salary Increment',
      preview: true,
      previewOnly: true,
    };

    if (targetMode === 'select' || (incrementMode === 'individual')) {
      if (selectedEmployeeIds.length === 0 && incrementMode === 'uniform') {
        toast.error('Please select at least one employee');
        return;
      }
    }

    if (incrementMode === 'individual') {
      const revisions = buildRevisionsFromTable();
      if (revisions.length === 0) {
        toast.error('Please select employees and enter individual salary amounts');
        return;
      }
      payload.revisions = revisions;
    } else {
      payload.incrementType = incrementType;
      payload.incrementValue = Number(incrementValue);
      if (targetMode === 'select') {
        payload.employeeIds = selectedEmployeeIds;
      } else {
        if (selectedDepartment) payload.department = selectedDepartment;
        if (selectedDesignation) payload.designation = selectedDesignation;
      }
    }

    try {
      setLoading(true);
      const res = await api.post('/employees/bulk-salary-revision', payload);
      setPreviewData(res.data.preview || res.data.success || []);
      setPreviewErrors(res.data.errors || []);
      setStep(2);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to generate revision preview');
    } finally {
      setLoading(false);
    }
  };

  // Open confirmation modal
  const openConfirmModal = () => {
    setConfirmInputText('');
    setShowConfirmModal(true);
  };

  // Step 2 Commit Execution
  const handleCommitRevision = async () => {
    setShowConfirmModal(false);

    let payload = {
      effectiveDate,
      reason: reason || 'Bulk Annual Salary Increment',
    };

    if (incrementMode === 'individual') {
      payload.revisions = buildRevisionsFromTable();
    } else {
      payload.incrementType = incrementType;
      payload.incrementValue = Number(incrementValue);
      if (targetMode === 'select') {
        payload.employeeIds = selectedEmployeeIds;
      } else {
        if (selectedDepartment) payload.department = selectedDepartment;
        if (selectedDesignation) payload.designation = selectedDesignation;
      }
    }

    try {
      setLoading(true);
      const res = await api.post('/employees/bulk-salary-revision', payload);
      setExecutionResult(res.data);
      setStep(3);
      toast.success(res.data.message || 'Bulk salary revision completed');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to apply bulk salary revision');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="container mx-auto p-6 font-sans text-gray-900 max-w-xl text-center py-16">
        <div className="bg-white border border-red-200 rounded-2xl p-8 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl">
            <FaLock />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Bulk salary revisions alter active master compensation structures and historical revision logs company-wide.
            This operation requires Tenant Admin, Owner, or HR Admin privileges.
          </p>
          <div className="pt-2">
            <Link
              to="/employees"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              <FaArrowLeft size={12} /> Return to Employee Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900 dark:text-slate-100 max-w-6xl transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/employees" className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
              <FaArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">Bulk Salary Revision</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 ml-7">
            Apply percentage or flat salary increments across departments, designations, or custom employee cohorts.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={`px-3 py-1.5 rounded-full transition-colors ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300'}`}>
            1. Scope & Config
          </span>
          <span className="text-gray-300 dark:text-slate-600">→</span>
          <span className={`px-3 py-1.5 rounded-full transition-colors ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300'}`}>
            2. Preview & Validate
          </span>
          <span className="text-gray-300 dark:text-slate-600">→</span>
          <span className={`px-3 py-1.5 rounded-full transition-colors ${step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300'}`}>
            3. Summary
          </span>
        </div>
      </div>

      {/* STEP 1: SCOPE & CONFIG */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Config Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 transition-colors">
            <h2 className="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
              <FaCalculator className="text-blue-600 dark:text-blue-400" /> Revision Parameters
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Effective Date *</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Reason for Revision</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Annual Appraisal 2026"
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Increment Distribution</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIncrementMode('uniform')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      incrementMode === 'uniform' ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300'
                    }`}
                  >
                    Uniform Policy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIncrementMode('individual');
                      setTargetMode('select');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      incrementMode === 'individual' ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300'
                    }`}
                  >
                    Custom Table
                  </button>
                </div>
              </div>
            </div>

            {incrementMode === 'uniform' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Increment Method</label>
                  <select
                    value={incrementType}
                    onChange={(e) => setIncrementType(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat_amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    {incrementType === 'percentage' ? 'Percentage Rate (%)' : 'Flat Amount per Employee (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={incrementType === 'percentage' ? '0.1' : '100'}
                    value={incrementValue}
                    onChange={(e) => setIncrementValue(e.target.value)}
                    placeholder={incrementType === 'percentage' ? 'e.g. 10.5' : 'e.g. 5000'}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Scope Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <FaLayerGroup className="text-blue-600 dark:text-blue-400" /> Employee Scope Selection
              </h2>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetMode('filter')}
                  disabled={incrementMode === 'individual'}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                    targetMode === 'filter' ? 'bg-gray-800 dark:bg-blue-600 text-white border-gray-800 dark:border-blue-600' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-700'
                  }`}
                >
                  By Filter Criteria
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('select')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                    targetMode === 'select' ? 'bg-gray-800 dark:bg-blue-600 text-white border-gray-800 dark:border-blue-600' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-700'
                  }`}
                >
                  Manual Selection ({selectedEmployeeIds.length})
                </button>
              </div>
            </div>

            {targetMode === 'filter' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Target Department</label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Target Designation</label>
                  <input
                    type="text"
                    value={selectedDesignation}
                    onChange={(e) => setSelectedDesignation(e.target.value)}
                    placeholder="e.g. Senior Software Engineer (Leave blank for all)"
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-3 text-gray-400 dark:text-slate-500" size={12} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search employee name or code..."
                      className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg pl-9 pr-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-gray-700 dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    {filteredEmployees.every((emp) => selectedEmployeeIds.includes(emp._id)) ? 'Deselect All Visible' : 'Select All Visible'}
                  </button>
                </div>

                {/* Employee Table */}
                <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 dark:bg-slate-800/80 sticky top-0 border-b border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300">
                      <tr>
                        <th className="p-3 w-10 text-center">Sel</th>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Designation</th>
                        <th className="p-3 text-right">Current CTC / Rate</th>
                        {incrementMode === 'individual' && <th className="p-3 w-44 text-right">New Value Override</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
                      {fetchingEmployees ? (
                        <tr>
                          <td colSpan="6" className="p-6 text-center text-gray-400 dark:text-slate-500">Loading employees...</td>
                        </tr>
                      ) : filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-6 text-center text-gray-400 dark:text-slate-500">No matching employees found</td>
                        </tr>
                      ) : (
                        filteredEmployees.map((emp) => {
                          const isSelected = selectedEmployeeIds.includes(emp._id);
                          const isHourly = emp.compensationType === 'hourly';
                          const isDaily = emp.compensationType === 'daily_wage';
                          const currentVal = isHourly ? emp.hourlyRate : isDaily ? emp.dailyRate : emp.monthlyCTC;
                          const label = isHourly ? '/hr' : isDaily ? '/day' : '/mo';

                          return (
                            <tr key={emp._id} className={isSelected ? 'bg-blue-50/30 dark:bg-blue-950/30' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleEmployeeSelection(emp._id)}
                                  className="h-4 w-4 text-blue-600 rounded cursor-pointer dark:bg-slate-800 dark:border-slate-700"
                                />
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-gray-900 dark:text-slate-100">{emp.firstName} {emp.lastName}</div>
                                <div className="text-[10px] text-gray-400 dark:text-slate-500">{emp.employeeId}</div>
                              </td>
                              <td className="p-3 text-gray-600 dark:text-slate-400">{emp.department?.name || emp.department || '-'}</td>
                              <td className="p-3 text-gray-600 dark:text-slate-400">{emp.designation || '-'}</td>
                              <td className="p-3 text-right font-semibold text-gray-900 dark:text-slate-100">
                                {fmtMoney(currentVal)} <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">{label}</span>
                              </td>

                              {incrementMode === 'individual' && (() => {
                                const fields = getOnboardingFields(emp.compensationType || 'monthly_salary');
                                let targetField = 'newCTC';
                                let targetLabel = 'Monthly CTC';
                                let initialValue = emp.monthlyCTC;

                                if (fields.includes('hourlyRate')) {
                                  targetField = 'newHourlyRate';
                                  targetLabel = 'Hourly Rate';
                                  initialValue = emp.hourlyRate;
                                } else if (fields.includes('dailyRate')) {
                                  targetField = 'dailyRate';
                                  targetLabel = 'Daily Rate';
                                  initialValue = emp.dailyRate;
                                } else if (fields.includes('weeklyRate')) {
                                  targetField = 'weeklyRate';
                                  targetLabel = 'Weekly Rate';
                                  initialValue = emp.weeklyRate;
                                } else if (fields.includes('projectFee')) {
                                  targetField = 'projectFee';
                                  targetLabel = 'Project Fee';
                                  initialValue = emp.projectFee;
                                } else if (fields.includes('milestoneAmount')) {
                                  targetField = 'milestoneAmount';
                                  targetLabel = 'Milestone Amount';
                                  initialValue = emp.milestoneAmount;
                                }

                                const currentValue = individualRevisions[emp._id]?.[targetField] ?? '';

                                return (
                                  <td className="p-2 text-right">
                                    <input
                                      type="number"
                                      disabled={!isSelected}
                                      value={currentValue}
                                      placeholder={`${targetLabel}: ${initialValue || 0}`}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setIndividualRevisions((prev) => ({
                                          ...prev,
                                          [emp._id]: {
                                            ...(prev[emp._id] || {}),
                                            compensationType: emp.compensationType || 'monthly_salary',
                                            [targetField]: val === '' ? '' : Number(val),
                                          },
                                        }));
                                      }}
                                      className="w-36 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded px-2 py-1 text-xs text-right disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:opacity-50"
                                    />
                                  </td>
                                );
                              })()}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleProceedToPreview}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading ? 'Processing...' : 'Generate Preview →'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & VALIDATION */}
      {step === 2 && (() => {
        const validItems = previewData.filter((item) => !item.validationError);
        const erroredItems = previewData.filter((item) => item.validationError);
        const skippedCount = erroredItems.length + (previewErrors?.length || 0);

        const totalCostChange = validItems.reduce((sum, item) => {
          if (item.compensationType === 'hourly' || item.compensationType === 'daily_wage') return sum;
          return sum + (Number(item.newCTC || 0) - Number(item.previousCTC || 0));
        }, 0);

        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4 transition-colors">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-800 dark:text-slate-100">Revision Preview & Simulation</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Effective Date: <span className="font-semibold text-gray-800 dark:text-slate-200">{effectiveDate}</span> · Reason: <span className="font-semibold text-gray-800 dark:text-slate-200">{reason}</span>
                  </p>
                </div>
                <div className="flex gap-2 text-xs font-bold">
                  <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {validItems.length} Ready to Revise
                  </span>
                  {skippedCount > 0 && (
                    <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                      {skippedCount} Skipped (Validation Error)
                    </span>
                  )}
                </div>
              </div>

              {/* Exact summary line banner */}
              <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-xs text-blue-900 dark:text-blue-200 font-medium flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-950 dark:text-blue-50">{validItems.length} employees will be revised</span>
                  {skippedCount > 0 && <span>, <span className="font-bold text-amber-700 dark:text-amber-300">{skippedCount} skipped due to validation errors</span></span>}
                  <span>, total monthly payroll cost change: <span className={`font-bold ${totalCostChange >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{totalCostChange >= 0 ? '+' : ''}{fmtMoney(totalCostChange)}</span></span>
                </div>
              </div>

              {/* Error alerts if top-level preview errors returned */}
              {previewErrors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 text-xs text-red-700 dark:text-red-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-800 dark:text-red-200">
                    <FaExclamationTriangle /> {previewErrors.length} Scope Validation Errors
                  </div>
                  {previewErrors.map((err, i) => (
                    <div key={i}>• {err.employeeName || err.employeeId}: {err.error}</div>
                  ))}
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 dark:bg-slate-800/80 sticky top-0 border-b border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300">
                    <tr>
                      <th className="p-3">Employee</th>
                      <th className="p-3 text-right">Current Pay</th>
                      <th className="p-3 text-right">New Pay</th>
                      <th className="p-3 text-right">Change (₹ / %)</th>
                      <th className="p-3 text-center">Compensation Type</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
                    {previewData.map((item, index) => {
                      const isHourly = item.compensationType === 'hourly';
                      const isDaily = item.compensationType === 'daily_wage';

                      const prev = isHourly ? item.previousHourlyRate : isDaily ? item.previousDailyRate : item.previousCTC;
                      const next = isHourly ? item.newHourlyRate : isDaily ? item.newDailyRate : item.newCTC;
                      const diff = next - prev;
                      const pctChange = prev > 0 ? ((diff / prev) * 100).toFixed(1) : '0.0';
                      const unit = isHourly ? '/hr' : isDaily ? '/day' : '/mo';

                      const hasErr = Boolean(item.validationError);

                      return (
                        <tr key={index} className={hasErr ? 'bg-red-50/40 dark:bg-red-950/30 hover:bg-red-50/60' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}>
                          <td className="p-3">
                            <div className="font-bold text-gray-900 dark:text-slate-100">{item.employeeName}</div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500">{item.employeeCode}</div>
                          </td>
                          <td className="p-3 text-right text-gray-600 dark:text-slate-400">
                            {fmtMoney(prev)} <span className="text-[10px] text-gray-400 dark:text-slate-500">{unit}</span>
                          </td>
                          <td className="p-3 text-right font-bold text-gray-900 dark:text-slate-100">
                            {fmtMoney(next)} <span className="text-[10px] text-gray-400 dark:text-slate-500">{unit}</span>
                          </td>
                          <td className={`p-3 text-right font-bold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {diff >= 0 ? '+' : ''}{fmtMoney(diff)} <span className="text-[10px] font-normal text-gray-500 dark:text-slate-400">({diff >= 0 ? '+' : ''}{pctChange}%)</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-semibold text-[10px] px-2 py-0.5 rounded-full capitalize">
                              {(item.compensationType || 'monthly_salary').replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3">
                            {hasErr ? (
                              <div className="text-red-600 dark:text-red-400 font-bold text-[11px] flex items-center gap-1">
                                <FaExclamationTriangle size={11} />
                                <span>⚠️ {item.validationError}</span>
                              </div>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                ✅ Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
              >
                ← Back to Config
              </button>
              <button
                type="button"
                onClick={openConfirmModal}
                disabled={loading || validItems.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {loading ? 'Applying Revisions...' : `Confirm & Apply to ${validItems.length} Employee(s)`}
              </button>
            </div>
          </div>
        );
      })()}

      {/* STEP 3: SUMMARY & RECONCILIATION */}
      {step === 3 && executionResult && (() => {
        const readyInPreview = previewData.filter((i) => !i.validationError);
        const actualSuccessList = executionResult.success || [];
        const actualErrorList = executionResult.errors || [];

        // Check for concurrent discrepancies (ready in preview but failed during submit)
        const readyIds = new Set(readyInPreview.map((i) => String(i.employeeId)));
        const unexpectedErrors = actualErrorList.filter((e) => readyIds.has(String(e.employeeId)));

        const isFullyReconciled = unexpectedErrors.length === 0;

        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm text-center space-y-4 transition-colors">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl ${
                isFullyReconciled ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}>
                {isFullyReconciled ? <FaCheckCircle /> : <FaExclamationTriangle />}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {isFullyReconciled ? 'Bulk Revision Successfully Applied' : 'Bulk Revision Applied with Discrepancies'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                Updated salary master structures and recorded revision history entries effective <span className="font-semibold text-gray-800 dark:text-slate-200">{effectiveDate}</span>.
              </p>

              {/* Reconciliation Alert Banner */}
              <div className={`p-4 rounded-xl border text-xs text-left max-w-xl mx-auto font-medium ${
                isFullyReconciled ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}>
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <FaShieldAlt /> {isFullyReconciled ? 'Reconciliation Status: 100% Match' : 'Reconciliation Alert: Concurrent Discrepancy Detected'}
                </div>
                {isFullyReconciled ? (
                  <p>All {actualSuccessList.length} employee(s) predicted as ready in preview were successfully updated without error.</p>
                ) : (
                  <p>{unexpectedErrors.length} employee(s) expected to succeed during preview failed during live execution (likely modified concurrently by another admin).</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-2">
                <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">Successfully Revised</div>
                  <div className="text-3xl font-extrabold text-emerald-800 dark:text-emerald-200 mt-1">{actualSuccessList.length}</div>
                </div>

                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-4 rounded-xl text-center">
                  <div className="text-xs font-bold text-red-700 dark:text-red-300 uppercase">Execution Errors</div>
                  <div className="text-3xl font-extrabold text-red-800 dark:text-red-200 mt-1">{actualErrorList.length}</div>
                </div>
              </div>

              {actualErrorList.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 text-xs text-red-700 dark:text-red-300 text-left max-w-lg mx-auto space-y-1">
                  <div className="font-bold text-red-800 dark:text-red-200">Errors encountered during live submission:</div>
                  {actualErrorList.map((e, i) => (
                    <div key={i}>• {e.employeeName || e.employeeId}: {e.error}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4">
              <Link
                to="/employees"
                className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
              >
                Go to Employee Directory
              </Link>
              <Link
                to="/payroll/process"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
              >
                Proceed to Payroll Processing →
              </Link>
            </div>
          </div>
        );
      })()}

      {/* CONFIRMATION FRICTION MODAL */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Bulk Salary Revision"
      >
        <div className="space-y-4 text-sm text-gray-900 dark:text-slate-100">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
            <div className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5 text-sm">
              <FaExclamationTriangle className="text-amber-600 dark:text-amber-400" /> Irreversible Action Warning
            </div>
            <p>
              This will update active master salary structures and append official revision history records for{' '}
              <strong className="text-amber-950 dark:text-amber-100">
                {previewData.filter((i) => !i.validationError).length} employee(s)
              </strong>{' '}
              effective <strong className="text-amber-950 dark:text-amber-100">{effectiveDate}</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
              Type <span className="font-mono bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-red-600 dark:text-red-400 border border-gray-300 dark:border-slate-700">CONFIRM</span> to unlock submission:
            </label>
            <input
              type="text"
              value={confirmInputText}
              onChange={(e) => setConfirmInputText(e.target.value)}
              placeholder="CONFIRM"
              className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-3 py-2 text-sm font-mono tracking-wider text-center focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-bold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommitRevision}
              disabled={confirmInputText.trim() !== 'CONFIRM' || loading}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? 'Executing...' : `Confirm & Apply to ${previewData.filter((i) => !i.validationError).length} Employees`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BulkSalaryRevision;
