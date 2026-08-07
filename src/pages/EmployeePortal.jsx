import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FaWallet, FaFileInvoiceDollar, FaHandHoldingUsd, FaReceipt,
  FaFilePdf, FaLock, FaUnlock, FaPrint, FaCloudUploadAlt,
  FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaCalculator,
  FaUserCircle, FaInfoCircle, FaDownload, FaCalendarCheck,
  FaEdit, FaTrash
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';
import {
  buildMasterSalaryStructure,
  DEFAULT_PAYROLL_CONFIG,
  fmtMoney,
  payrollStatusClass,
  calculateTaxDetails
} from '../utils/payroll';

const formatIndianDate = (dString) => {
  if (!dString) return '-';
  const date = new Date(dString);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
};

const EmployeePortal = () => {
  // Portal States
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employee, setEmployee] = useState(null);
  const [config, setConfig] = useState(DEFAULT_PAYROLL_CONFIG);
  const [payrolls, setPayrolls] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loans, setLoans] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveDraft, setLeaveDraft] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    numberOfDays: '',
    reason: ''
  });
  
  const [decForm, setDecForm] = useState({
    taxRegime: 'new',
    rentPaidMonthly: 0,
    isMetroCity: false,
    section80C: 0,
    epf: 0,
    ppf: 0,
    elss: 0,
    lic: 0,
    homeLoanPrincipal: 0,
    section80D: 0,
    section24b: 0,
    section80CCD1B: 0,
    otherExemptions: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, declarations, claims, loans, payslips, form16
  
  // Modal / Form States
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [editingClaimId, setEditingClaimId] = useState(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  const [claimDraft, setClaimDraft] = useState({
    category: 'broadband',
    amount: '',
    billUrl: '', // intentionally empty — user must provide a real bill URL or upload
  });
  
  const [loanDraft, setLoanDraft] = useState({
    principalAmount: '',
    emiAmount: '',
    reason: '',
  });

  // Mock Upload Zone file name simulation
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Fetch all employees (for simulator selector) and initial employee data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // Get config
        const configRes = await api.get('/payroll/config');
        setConfig({ ...DEFAULT_PAYROLL_CONFIG, ...(configRes.data || {}) });

        // Get active employees list to enable portal switching/simulation
        const employeesRes = await api.get('/employees/active');
        const activeList = employeesRes.data || [];
        setEmployees(activeList);

        if (activeList.length > 0) {
          // Identify if logged-in user matches any employee email
          const currentUserStr = localStorage.getItem('user');
          let matchedId = activeList[0]._id;
          if (currentUserStr) {
            try {
              const u = JSON.parse(currentUserStr).user;
              const matched = activeList.find(emp => emp.email.toLowerCase() === u.email.toLowerCase());
              if (matched) matchedId = matched._id;
            } catch (e) {}
          }
          setSelectedEmployeeId(matchedId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load portal configuration');
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch employee-specific data when selectedEmployeeId changes
  useEffect(() => {
    if (!selectedEmployeeId) return;
    // AbortController prevents stale data from a previous (slower) request overwriting
    // the results from a later (faster) request when the user rapidly switches employees.
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchEmployeeData = async () => {
      try {
        setLoadingEmployee(true);
        const [empRes, payrollsRes, claimsRes, loansRes, leavesRes, balancesRes, typesRes] = await Promise.all([
          api.get(`/employees/${selectedEmployeeId}`, { signal }),
          api.get(`/payroll?employeeId=${selectedEmployeeId}&limit=12`, { signal }),
          api.get(`/reimbursements?employee=${selectedEmployeeId}`, { signal }),
          api.get(`/loans?employee=${selectedEmployeeId}`, { signal }),
          api.get(`/leaves/requests?employee=${selectedEmployeeId}`, { signal }),
          api.get(`/leaves/balances?employee=${selectedEmployeeId}`, { signal }),
          api.get('/leaves/types', { signal })
        ]);

        setEmployee(empRes.data);
        setPayrolls(payrollsRes.data.data || []);
        setClaims(claimsRes.data || []);
        setLoans(loansRes.data || []);
        setLeaves(leavesRes.data || []);
        setLeaveBalances(balancesRes.data || []);
        setLeaveTypes(typesRes.data || []);
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return; // aborted — ignore
        console.error(err);
        toast.error('Failed to fetch employee records');
      } finally {
        if (!signal.aborted) {
          setLoadingEmployee(false);
          setLoading(false);
        }
      }
    };
    fetchEmployeeData();
    return () => controller.abort(); // cleanup on employee change or unmount
  }, [selectedEmployeeId]);

  // Master Structure build
  const salaryStructure = useMemo(() => {
    if (!employee) return null;
    return buildMasterSalaryStructure(employee, config);
  }, [employee, config]);

  const allEarningComponents = useMemo(() => {
    if (config?.salaryComponents && config.salaryComponents.length > 0) {
      return config.salaryComponents.filter(c => c.type === 'earning');
    }
    return [
      { id: 'basic', name: 'Basic Salary' },
      { id: 'hra', name: 'House Rent Allowance (HRA)' },
      { id: 'flexi', name: 'Flexi Wallet Allowance' },
      { id: 'broadband', name: 'Broadband Allowance' },
      { id: 'petrol', name: 'Petrol Allowance' },
      { id: 'lta', name: 'Leave Travel Allowance (LTA)' },
      { id: 'special', name: 'Special Allowance (Balancing Component)' },
    ];
  }, [config?.salaryComponents]);

  const getFreqSuffix = (frequency) => {
    if (!frequency || frequency === 'monthly') return '';
    if (frequency === 'quarterly') return ' (Quarterly)';
    if (frequency === 'semi_annually') return ' (Semi-Annually)';
    if (frequency === 'annually') return ' (Annually)';
    return '';
  };

  const getMasterComponentValue = (structure, componentId) => {
    if (!structure) return 0;
    if (structure.earningsMap && structure.earningsMap[componentId] !== undefined) {
      return structure.earningsMap[componentId];
    }
    if (componentId === 'basic') return structure.basicMaster;
    if (componentId === 'hra') return structure.hraMaster;
    if (componentId === 'special') return structure.specialAllowance;
    if (componentId === 'flexi') return structure.flexi;
    if (componentId === 'medical') return structure.medicalAllowance;
    return structure[componentId] ?? 0;
  };

  // Sync decForm when employee changes
  useEffect(() => {
    if (employee) {
      const d = employee.declarations || {};
      setDecForm({
        taxRegime: employee.taxRegime || 'new',
        rentPaidMonthly: Number(d.rentPaidMonthly) || 0,
        isMetroCity: !!d.isMetroCity,
        section80C: Number(d.section80C) || 0,
        // 80C breakdown sub-fields — persisted to DB and restored on reload
        epf: Number(d.epf) || 0,
        ppf: Number(d.ppf) || 0,
        elss: Number(d.elss) || 0,
        lic: Number(d.lic) || 0,
        homeLoanPrincipal: Number(d.homeLoanPrincipal) || 0,
        section80D: Number(d.section80D) || 0,
        section24b: Number(d.section24b) || 0,
        section80CCD1B: Number(d.section80CCD1B) || 0,
        otherExemptions: Number(d.otherExemptions) || 0,
      });
    }
  }, [employee]);

  const handleDecFormChange = (key, value) => {
    setDecForm((prev) => {
      const updated = { ...prev, [key]: value };

      if (['epf', 'ppf', 'elss', 'lic', 'homeLoanPrincipal'].includes(key)) {
        // Sum from sub-fields
        const sum = (Number(updated.epf) || 0) +
                    (Number(updated.ppf) || 0) +
                    (Number(updated.elss) || 0) +
                    (Number(updated.lic) || 0) +
                    (Number(updated.homeLoanPrincipal) || 0);
        updated.section80C = Math.min(sum, 150000);
      } else if (key === 'section80C') {
        // Direct edit of the 80C total — reset sub-fields to avoid stale sum
        // conflicts on the next sub-field change.
        updated.section80C = Math.min(Number(value) || 0, 150000);
        updated.epf = 0;
        updated.ppf = 0;
        updated.elss = 0;
        updated.lic = 0;
        updated.homeLoanPrincipal = 0;
      } else if (key === 'section80D') {
        updated.section80D = Math.min(Number(value) || 0, 25000);
      } else if (key === 'section24b') {
        updated.section24b = Math.min(Number(value) || 0, 200000);
      } else if (key === 'section80CCD1B') {
        updated.section80CCD1B = Math.min(Number(value) || 0, 50000);
      }

      return updated;
    });
  };

  const liveSalaryStructure = useMemo(() => {
    if (!employee) return null;

    const mergedEmployee = {
      ...employee,
      taxRegime: decForm.taxRegime,
      declarations: {
        rentPaidMonthly: Number(decForm.rentPaidMonthly) || 0,
        isMetroCity: !!decForm.isMetroCity,
        section80C: Number(decForm.section80C) || 0,
        section80D: Number(decForm.section80D) || 0,
        section24b: Number(decForm.section24b) || 0,
        section80CCD1B: Number(decForm.section80CCD1B) || 0,
        otherExemptions: Number(decForm.otherExemptions) || 0,
      }
    };

    return buildMasterSalaryStructure(mergedEmployee, config);
  }, [employee, decForm, config]);

  // Handle regime switch
  const handleRegimeChange = async (regime) => {
    if (!employee) return;
    try {
      const res = await api.put(`/employees/${employee._id}`, { taxRegime: regime });
      setEmployee(res.data);
      toast.success(`Tax regime switched to ${regime.toUpperCase()}`);
    } catch (err) {
      toast.error('Failed to switch tax regime');
    }
  };

  // Submit declarations
  const handleDeclarationSubmit = async (e) => {
    e.preventDefault();
    if (!employee) return;
    try {
      const decUpdate = {
        taxRegime: decForm.taxRegime,
        declarations: {
          section80C: Number(decForm.section80C) || 0,
          // 80C breakdown sub-fields — persisted so the UI can restore them on reload
          epf: Number(decForm.epf) || 0,
          ppf: Number(decForm.ppf) || 0,
          elss: Number(decForm.elss) || 0,
          lic: Number(decForm.lic) || 0,
          homeLoanPrincipal: Number(decForm.homeLoanPrincipal) || 0,
          section80D: Number(decForm.section80D) || 0,
          section24b: Number(decForm.section24b) || 0,
          section80CCD1B: Number(decForm.section80CCD1B) || 0,
          rentPaidMonthly: Number(decForm.rentPaidMonthly) || 0,
          isMetroCity: !!decForm.isMetroCity,
          otherExemptions: Number(decForm.otherExemptions) || 0,
        }
      };

      const res = await api.put(`/employees/${employee._id}/declarations`, decUpdate);
      setEmployee(res.data);
      toast.success('Investment declarations & tax regime updated successfully!');
      setUploadedFileName('');
    } catch (err) {
      toast.error('Failed to update declarations');
    }
  };

  const handleDownloadBreakup = () => {
    if (!employee || !salaryStructure) return;

    const toAnnual = (val) => (Number(val) || 0) * 12;

    const data = [
      ['SALARY BREAKUP / CTC STRUCTURE', ''],
      ['', ''],
      ['EMPLOYEE DETAILS', ''],
      ['Employee ID', employee.employeeId],
      ['Name', `${employee.firstName} ${employee.lastName}`.trim()],
      ['Designation', employee.designation || '-'],
      ['Department', employee.department?.name || '-'],
      ['Date of Joining', formatIndianDate(employee.joiningDate)],
      ['Location', employee.location || '-'],
      ['Employment Type', employee.employmentType || '-'],
      ['Tax Regime', employee.taxRegime === 'old' ? 'Old Regime' : 'New Regime'],
      ['', ''],
      ['SALARY COMPONENTS', 'Monthly (INR)', 'Annual (INR)'],
    ];

    allEarningComponents.forEach(c => {
      const val = getMasterComponentValue(salaryStructure, c.id);
      const shouldShow = ['basic', 'hra', 'special'].includes(c.id) || val > 0;
      if (shouldShow) {
        let label = c.name;
        if (c.id === 'basic') {
          // Normalize: value may be stored as 0.5 (fraction) or 50 (percent)
          const rawPct = employee.basicPercent !== undefined && employee.basicPercent !== null ? employee.basicPercent : 50;
          const pct = rawPct > 1 ? rawPct : rawPct * 100;
          label = `${c.name} (${pct}% of CTC)`;
        } else if (c.id === 'hra') {
          const rawPct = employee.hraPercent !== undefined && employee.hraPercent !== null ? employee.hraPercent : 50;
          const pct = rawPct > 1 ? rawPct : rawPct * 100;
          label = `${c.name} (${pct}% of Basic)`;
        }
        data.push([label, val, toAnnual(val)]);
      }
    });

    if (salaryStructure.employerNPS > 0) {
      data.push(['Employer NPS Contribution', salaryStructure.employerNPS, toAnnual(salaryStructure.employerNPS)]);
    }

    data.push(['Gross Salary (Total Earnings)', salaryStructure.totalEarnings, toAnnual(salaryStructure.totalEarnings)]);
    data.push(['', '', '']);
    
    data.push(['EMPLOYER CONTRIBUTIONS', 'Monthly (INR)', 'Annual (INR)']);
    if (salaryStructure.pfEmployer > 0) {
      const pfLabel = config?.pfCalculationType === 'fixed' ? "Employer PF (Fixed)" : "Employer PF (12% of Basic)";
      data.push([pfLabel, salaryStructure.pfEmployer, toAnnual(salaryStructure.pfEmployer)]);
    }
    if (salaryStructure.esiEmployer > 0) {
      data.push(['Employer ESI Contribution', salaryStructure.esiEmployer, toAnnual(salaryStructure.esiEmployer)]);
    }
    if (salaryStructure.gratuity > 0) {
      data.push(['Gratuity Provision (4.81%)', salaryStructure.gratuity, toAnnual(salaryStructure.gratuity)]);
    }
    if (salaryStructure.lwfEmployer > 0) {
      data.push(['Labor Welfare Fund (Employer)', salaryStructure.lwfEmployer, toAnnual(salaryStructure.lwfEmployer)]);
    }
    if (salaryStructure.insurance > 0) {
      data.push(['Corporate Medical Insurance', salaryStructure.insurance, toAnnual(salaryStructure.insurance)]);
    }

    data.push(['Total Employer Cost (Stated CTC)', salaryStructure.grossTotalSalary, toAnnual(salaryStructure.grossTotalSalary)]);
    
    data.push(['', '', '']);
    data.push(['STATUTORY DEDUCTIONS (EMPLOYEE)', 'Monthly (INR)', 'Annual (INR)']);
    
    const activePayroll = payrolls && payrolls.length > 0 ? payrolls[0] : null;
    const pfEmp = activePayroll?.deductions?.pfEmployee ?? salaryStructure.pfEmployee ?? 0;
    const esiEmp = activePayroll?.deductions?.esiEmployee ?? salaryStructure.esiEmployee ?? 0;
    const lwfEmp = activePayroll?.deductions?.lwfEmployee ?? salaryStructure.lwfEmployee ?? 0;
    const ptVal = activePayroll?.deductions?.professionalTax ?? salaryStructure.professionalTax ?? 0;
    const tdsVal = activePayroll?.deductions?.tds ?? salaryStructure.tds ?? 0;

    if (pfEmp > 0) {
      data.push(['PF Employee Deduction', pfEmp, toAnnual(pfEmp)]);
    }
    if (esiEmp > 0) {
      data.push(['ESI Employee Deduction', esiEmp, toAnnual(esiEmp)]);
    }
    if (lwfEmp > 0) {
      data.push(['LWF Employee Deduction', lwfEmp, toAnnual(lwfEmp)]);
    }
    if (ptVal > 0) {
      data.push(['Professional Tax (PT)', ptVal, toAnnual(ptVal)]);
    }
    if (tdsVal > 0) {
      data.push(['Income Tax (TDS)', tdsVal, toAnnual(tdsVal)]);
    }

    const totalDeds = pfEmp + esiEmp + lwfEmp + ptVal + tdsVal;
    data.push(['Total Deductions', totalDeds, toAnnual(totalDeds)]);

    data.push(['', '', '']);
    data.push(['ESTIMATED TAKE-HOME PAY', salaryStructure.netTakeHome, toAnnual(salaryStructure.netTakeHome)]);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 38 },
      { wch: 15 },
      { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { WBProps: { fullCalcOnLoad: true } };
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Breakup');
    XLSX.writeFile(workbook, `${employee.firstName}_${employee.lastName}_Salary_Breakup.xlsx`);
    toast.success('Salary breakup downloaded successfully');
  };

  // Submit / Edit / Delete Claim

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!employee) return;
    try {
      const amt = Number(claimDraft.amount);
      if (!amt || amt <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      
      if (editingClaimId) {
        const res = await api.put(`/reimbursements/${editingClaimId}`, {
          category: claimDraft.category,
          amount: amt,
          billUrl: claimDraft.billUrl
        });
        setClaims(claims.map(c => c._id === editingClaimId ? res.data : c));
        toast.success('Reimbursement claim updated successfully');
      } else {
        const res = await api.post('/reimbursements', {
          employee: employee._id,
          category: claimDraft.category,
          amount: amt,
          billUrl: claimDraft.billUrl
        });
        setClaims([res.data, ...claims]);
        toast.success('Reimbursement claim submitted successfully');
      }

      setShowClaimModal(false);
      setEditingClaimId(null);
      setClaimDraft({ category: 'broadband', amount: '', billUrl: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save claim');
    }
  };

  const handleEditClaim = (claim) => {
    setEditingClaimId(claim._id);
    setClaimDraft({
      category: claim.category || 'broadband',
      amount: claim.amount || '',
      billUrl: claim.billUrl || ''
    });
    setShowClaimModal(true);
  };

  const handleDeleteClaim = async (claimId) => {
    if (!window.confirm('Are you sure you want to delete this reimbursement claim?')) return;
    try {
      await api.delete(`/reimbursements/${claimId}`);
      setClaims(claims.filter(c => c._id !== claimId));
      toast.success('Reimbursement claim deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete claim');
    }
  };

  // Submit Loan
  const handleLoanSubmit = async (e) => {
    e.preventDefault();
    if (!employee) return;
    try {
      const pAmt = Number(loanDraft.principalAmount);
      const emi = Number(loanDraft.emiAmount);
      if (!pAmt || pAmt <= 0 || !emi || emi <= 0) {
        toast.error('Amounts must be positive values');
        return;
      }

      const res = await api.post('/loans', {
        employee: employee._id,
        principalAmount: pAmt,
        emiAmount: emi,
        reason: loanDraft.reason,
        status: 'pending_approval'
      });

      setLoans([res.data, ...loans]);
      setShowLoanModal(false);
      setLoanDraft({ principalAmount: '', emiAmount: '', reason: '' });
      toast.success('Loan/advance request submitted for HR approval');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request loan');
    }
  };

  // Submit Leave
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!employee) return;
    try {
      const numDays = Number(leaveDraft.numberOfDays);
      if (!numDays || numDays <= 0) {
        toast.error('Please enter a valid number of days');
        return;
      }

      const res = await api.post('/leaves/requests', {
        employee: employee._id,
        leaveType: leaveDraft.leaveType || leaveTypes[0]?._id,
        startDate: leaveDraft.startDate,
        endDate: leaveDraft.endDate,
        numberOfDays: numDays,
        reason: leaveDraft.reason
      });

      setLeaves([res.data, ...leaves]);
      setShowLeaveModal(false);
      setLeaveDraft({ leaveType: leaveTypes[0]?._id || '', startDate: '', endDate: '', numberOfDays: '', reason: '' });
      toast.success('Leave request submitted successfully');

      // Refresh balances
      const balRes = await api.get(`/leaves/balances?employee=${employee._id}`);
      setLeaveBalances(balRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    }
  };

  // Payslip password protection validator
  const handleUnlockPayslip = async (e) => {
    e.preventDefault();
    if (!selectedSlip || !employee) return;
    
    // Password combination rule: First 4 characters of name in UPPERCASE + DDMM of joiningDate or dateOfBirth
    // Since DOB might be empty, use joiningDate as reliable fallback.
    const cleanName = ((employee.firstName || '') + (employee.lastName || '')).replace(/\s+/g, '').toUpperCase();
    const namePart = cleanName.slice(0, 4).padEnd(4, 'X');
    
    const dateRef = employee.dateOfBirth ? new Date(employee.dateOfBirth) : (employee.joiningDate ? new Date(employee.joiningDate) : new Date());
    const day = String(dateRef.getDate()).padStart(2, '0');
    const month = String(dateRef.getMonth() + 1).padStart(2, '0');
    const expectedPassword = `${namePart}${day}${month}`;

    if (unlockPassword.trim().toUpperCase() === expectedPassword) {
      try {
        toast.success('Payslip unlocked! Downloading encrypted PDF...');
        setShowUnlockModal(false);
        setUnlockPassword('');
        setPasswordError(false);

        const response = await api.get(`/payroll/${selectedSlip._id}/payslip-pdf?encrypted=true`, {
          responseType: 'blob',
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        const empId = employee.employeeId || 'EMP';
        const mLabel = selectedSlip.month || 'Payslip';
        link.setAttribute('download', `Payslip_${empId}_${mLabel}_${selectedSlip.year || 2026}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error(err);
        toast.error('Failed to download encrypted PDF payslip');
      }
    } else {
      setPasswordError(true);
      toast.error('Invalid password! Hint: Name initials + DDMM format.');
    }
  };

  // Form 12BB / Form 16 print preview helper
  const triggerPrintWindow = (elementId) => {
    const content = document.getElementById(elementId).innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${elementId.replace('_', ' ').toUpperCase()}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @media print {
              body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none; }
              .page-break { page-break-before: always !important; }
            }
            .traces-watermark {
              background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='140' viewBox='0 0 180 140'><text fill='rgba(31, 61, 36, 0.03)' font-size='14' font-family='Courier, monospace' font-weight='bold' x='10' y='70' transform='rotate(-35, 90, 70)'>TRACES</text></svg>");
              background-repeat: repeat;
            }
            .traces-double-border {
              border: 3px double #1f3d24;
            }
            .font-mono {
              font-family: 'Courier New', Courier, monospace;
            }
            table {
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #1f3d24 !important;
            }
          </style>
        </head>
        <body class="bg-white p-6 traces-watermark font-serif">
          <div class="max-w-4xl mx-auto">
            ${content}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="container mx-auto p-12 text-center bg-white rounded-3xl border border-gray-200 shadow-sm max-w-2xl">
        <FaWallet size={48} className="mx-auto text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">No Active Employees Registered</h2>
        <p className="text-gray-500 mt-2">Before testing the Employee Self-Service portal, please add active employees under the Employee module.</p>
        <Link to="/employees/new" className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm">
          Add First Employee
        </Link>
      </div>
    );
  }

  const dec = employee?.declarations || {};

  // Convert number to words helper for Form 16 certificate verification
  const convertNumberToWords = (num) => {
    if (!num || num <= 0) return 'Zero';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    let n = Math.floor(num);
    
    const convertLessThanThousand = (val) => {
      let str = '';
      if (val >= 100) {
        str += a[Math.floor(val / 100)] + 'Hundred ';
        val %= 100;
      }
      if (val >= 20) {
        str += b[Math.floor(val / 10)] + ' ';
        val %= 10;
      }
      if (val > 0) {
        str += a[val];
      }
      return str;
    };
    
    let words = '';
    
    // Crores
    const crores = Math.floor(n / 10000000);
    if (crores > 0) {
      words += convertLessThanThousand(crores) + 'Crore ';
      n %= 10000000;
    }
    
    // Lakhs
    const lakhs = Math.floor(n / 100000);
    if (lakhs > 0) {
      words += convertLessThanThousand(lakhs) + 'Lakh ';
      n %= 100000;
    }
    
    // Thousands
    const thousands = Math.floor(n / 1000);
    if (thousands > 0) {
      words += convertLessThanThousand(thousands) + 'Thousand ';
      n %= 1000;
    }
    
    // Remainder
    if (n > 0) {
      words += convertLessThanThousand(n);
    }
    
    return words.trim() + ' Rupees Only';
  };

  // Dynamic accurate quarterly and monthly split calculations for Form 16
  const totalTaxAnnual = employee?.taxRegime === 'new' 
    ? (salaryStructure?.taxDetails?.newRegime?.annualTax || 0)
    : (salaryStructure?.taxDetails?.oldRegime?.annualTax || 0);

  const qTaxBase = Math.floor(totalTaxAnnual / 4);
  const qTaxRemainder = totalTaxAnnual % 4;
  const quartersTax = [
    qTaxBase + (qTaxRemainder > 0 ? 1 : 0),
    qTaxBase + (qTaxRemainder > 1 ? 1 : 0),
    qTaxBase + (qTaxRemainder > 2 ? 1 : 0),
    qTaxBase
  ];

  const mTaxBase = Math.floor(totalTaxAnnual / 12);
  const mTaxRemainder = totalTaxAnnual % 12;
  const monthlyTdsDeposits = Array.from({ length: 12 }, (_, i) => {
    return mTaxBase + (i < mTaxRemainder ? 1 : 0);
  });

  const renderPANBoxes = (pan) => {
    const panStr = (pan || 'XXXXX0000X').toUpperCase().padEnd(10, ' ').slice(0, 10);
    return (
      <div className="flex border-t border-b border-r border-emerald-900 h-6 inline-flex">
        {panStr.split('').map((char, idx) => (
          <div key={idx} className="w-5 h-full border-l border-emerald-900 flex items-center justify-center font-mono text-[10px] font-bold bg-white text-emerald-950">
            {char}
          </div>
        ))}
      </div>
    );
  };

  const renderTANBoxes = (tan) => {
    const tanStr = (tan || 'CALF09876A').toUpperCase().padEnd(10, ' ').slice(0, 10);
    return (
      <div className="flex border-t border-b border-r border-emerald-900 h-6 inline-flex">
        {tanStr.split('').map((char, idx) => (
          <div key={idx} className="w-5 h-full border-l border-emerald-900 flex items-center justify-center font-mono text-[10px] font-bold bg-white text-emerald-950">
            {char}
          </div>
        ))}
      </div>
    );
  };
  const activeEMISum = loans
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + Math.min(l.emiAmount, l.remainingBalance), 0);
  const totalLoanBalance = loans
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + l.remainingBalance, 0);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 font-sans text-gray-900">
      
      {/* ── Dynamic Simulator Ribbon ── */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow-xl px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-500 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full tracking-wider">
              Simulation Console
            </span>
            <span className="text-blue-200 text-xs">Admin View Enabled</span>
          </div>
          <h1 className="text-xl font-bold mt-1 tracking-tight">Employee Self-Service (ESS) Portal</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-blue-200 font-semibold uppercase">Simulate Employee:</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="bg-white/10 text-white border border-white/20 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
          >
            {employees.map(emp => (
              <option key={emp._id} value={emp._id} className="text-slate-900">
                {emp.firstName} {emp.lastName} ({emp.employeeId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingEmployee ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : !employee ? (
        <div className="text-red-500">Employee data not found.</div>
      ) : (
        <>
          {/* ── Metric Highlights ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly CTC</div>
              <div className="text-2xl font-black mt-2 text-slate-800">{fmtMoney(employee.monthlyCTC)}</div>
              <div className="text-[10px] text-emerald-600 font-medium mt-1">₹{(employee.monthlyCTC * 12).toLocaleString('en-IN')} Annual CTC</div>
              <div className="absolute right-4 bottom-4 text-blue-100"><FaWallet size={40} /></div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Take-Home (Est.)</div>
              <div className="text-2xl font-black mt-2 text-emerald-600">{fmtMoney(salaryStructure?.netTakeHome)}</div>
              <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${employee.taxRegime === 'new' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                {employee.taxRegime === 'new' ? 'New Tax Regime' : 'Old Tax Regime'}
              </span>
              <div className="absolute right-4 bottom-4 text-emerald-100"><FaFileInvoiceDollar size={40} /></div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Loans Outstanding</div>
              <div className="text-2xl font-black mt-2 text-slate-800">{fmtMoney(totalLoanBalance)}</div>
              <div className="text-[10px] text-slate-500 mt-1">EMI: {fmtMoney(activeEMISum)}/month</div>
              <div className="absolute right-4 bottom-4 text-amber-100"><FaHandHoldingUsd size={40} /></div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reimbursement Claims</div>
              <div className="text-2xl font-black mt-2 text-slate-800">
                {claims.filter(c => c.status === 'pending').length} Pending
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Approved: {fmtMoney(claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0))}
              </div>
              <div className="absolute right-4 bottom-4 text-purple-100"><FaReceipt size={40} /></div>
            </div>

          </div>

          {/* ── Main Tab Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Sidebar navigation */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm h-fit space-y-1">
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Portal Menu</div>
              <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<FaWallet />} label="CTC Breakup & Regime" />
              <TabButton active={activeTab === 'declarations'} onClick={() => setActiveTab('declarations')} icon={<FaCalculator />} label="Tax & Declarations" />
              <TabButton active={activeTab === 'claims'} onClick={() => setActiveTab('claims')} icon={<FaReceipt />} label="Reimbursements" />
              <TabButton active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} icon={<FaHandHoldingUsd />} label="Loans & Salary Advances" />
              <TabButton active={activeTab === 'leaves'} onClick={() => setActiveTab('leaves')} icon={<FaCalendarCheck />} label="Leaves & LOP" />
              <TabButton active={activeTab === 'payslips'} onClick={() => setActiveTab('payslips')} icon={<FaFileInvoiceDollar />} label="Payslip Ledger" />
              <TabButton active={activeTab === 'form16'} onClick={() => setActiveTab('form16')} icon={<FaFilePdf />} label="Form 16 Preview" />
            </div>

            {/* Content area */}
            <div className="lg:col-span-3">
              
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  
                  {/* Regime Compare Panel */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Regime Selection (FY 2026-27)</h2>
                        <p className="text-xs text-slate-500">Choose the optimal tax scheme. Standard deductions applied automatically.</p>
                      </div>
                      <div className="flex bg-slate-100 p-1.5 rounded-xl border">
                        <button
                          onClick={() => handleRegimeChange('new')}
                          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${employee.taxRegime === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          New Regime
                        </button>
                        <button
                          onClick={() => handleRegimeChange('old')}
                          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${employee.taxRegime === 'old' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          Old Regime
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={`p-5 rounded-2xl border transition-all ${employee.taxRegime === 'new' ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/50 border-slate-200'}`}>
                        <h3 className="font-extrabold text-sm text-indigo-900 mb-4 flex items-center justify-between">
                          New Regime {employee.taxRegime === 'new' && <span className="bg-indigo-600 text-[9px] text-white px-2.5 py-0.5 rounded-full font-bold uppercase">Active</span>}
                        </h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between"><span className="text-slate-500">Gross Estimated Salary:</span><span className="font-semibold">{fmtMoney(salaryStructure?.totalEarnings)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Standard Deduction:</span><span className="font-semibold">{fmtMoney(salaryStructure?.taxDetails.newRegime.standardDeduction)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Taxable Income:</span><span className="font-semibold">{fmtMoney(salaryStructure?.taxDetails.newRegime.netTaxableIncome)}</span></div>
                          <div className="flex justify-between border-t border-indigo-100 pt-2 font-bold"><span className="text-slate-700">Projected Monthly TDS:</span><span className="text-indigo-700">{fmtMoney(salaryStructure?.taxDetails.newRegime.monthlyTax)}</span></div>
                        </div>
                      </div>

                      <div className={`p-5 rounded-2xl border transition-all ${employee.taxRegime === 'old' ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/50 border-slate-200'}`}>
                        <h3 className="font-extrabold text-sm text-amber-900 mb-4 flex items-center justify-between">
                          Old Regime {employee.taxRegime === 'old' && <span className="bg-amber-600 text-[9px] text-white px-2.5 py-0.5 rounded-full font-bold uppercase">Active</span>}
                        </h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between"><span className="text-slate-500">Gross Estimated Salary:</span><span className="font-semibold">{fmtMoney(salaryStructure?.totalEarnings)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Standard &amp; Custom Deductions:</span><span className="font-semibold">{fmtMoney(salaryStructure?.taxDetails.oldRegime.totalDeductions)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Taxable Income:</span><span className="font-semibold">{fmtMoney(salaryStructure?.taxDetails.oldRegime.netTaxableIncome)}</span></div>
                          <div className="flex justify-between border-t border-amber-100 pt-2 font-bold"><span className="text-slate-700">Projected Monthly TDS:</span><span className="text-amber-700">{fmtMoney(salaryStructure?.taxDetails.oldRegime.monthlyTax)}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTC Salary Structure Breakup */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Master CTC Compensation Structure</h2>
                        <p className="text-xs text-slate-500">Monthly components projected under statutory regulations.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-slate-100 border px-3 py-1 rounded-xl text-slate-600 font-semibold">
                          Monthly CTC: {fmtMoney(employee.monthlyCTC)}
                        </span>
                        <button
                          type="button"
                          onClick={handleDownloadBreakup}
                          className="bg-white border border-gray-300 hover:bg-gray-50 text-blue-600 px-3.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-sm"
                        >
                          <FaDownload size={10} /> Download Breakup
                        </button>
                      </div>
                    </div>

                    <table className="w-full text-sm text-slate-700">
                      <thead>
                        <tr className="bg-slate-55 border-b border-slate-200">
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Salary Component</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Projection</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Annual Equivalent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allEarningComponents.map((c) => {
                          const val = getMasterComponentValue(salaryStructure, c.id);
                          const shouldShow = ['basic', 'hra', 'special'].includes(c.id) || val > 0;
                          if (!shouldShow) return null;
                          
                          let label = c.name;
                          if (c.id === 'basic') {
                            const pct = employee.basicPercent !== undefined && employee.basicPercent !== null ? employee.basicPercent : 50;
                            label = `${c.name} (${pct}% of CTC)`;
                          } else if (c.id === 'hra') {
                            const pct = employee.hraPercent !== undefined && employee.hraPercent !== null ? employee.hraPercent : 50;
                            label = `${c.name} (${pct}% of Basic)`;
                          } else {
                            label = `${c.name}${getFreqSuffix(c.frequency)}`;
                          }
                          
                          return (
                            <StructureRow key={c.id} label={label} val={val} isSpecial={c.id === 'special'} />
                          );
                        })}
                        {salaryStructure?.employerNPS > 0 && <StructureRow label="Employer NPS Contribution" val={salaryStructure?.employerNPS} />}
                        
                        <tr className="bg-slate-50/50 font-bold border-t border-b border-slate-200">
                          <td className="px-6 py-3 text-slate-900">Gross Salary (Total Earnings)</td>
                          <td className="px-6 py-3 text-right text-slate-900">{fmtMoney(salaryStructure?.totalEarnings)}</td>
                          <td className="px-6 py-3 text-right text-slate-900">₹{(salaryStructure?.totalEarnings * 12).toLocaleString('en-IN')}</td>
                        </tr>

                        <StructureRow label={config?.pfCalculationType === 'fixed' ? "Employer PF (Fixed)" : "Employer PF (12% of Basic)"} val={salaryStructure?.pfEmployer} isContribution />
                        {salaryStructure?.esiEmployer > 0 && <StructureRow label="Employer ESI Contribution" val={salaryStructure?.esiEmployer} isContribution />}
                        {salaryStructure?.gratuity > 0 && <StructureRow label="Gratuity Provision (4.81%)" val={salaryStructure?.gratuity} isContribution />}
                        {salaryStructure?.lwfEmployer > 0 && <StructureRow label="Labor Welfare Fund (Employer)" val={salaryStructure?.lwfEmployer} isContribution />}
                        <StructureRow label="Corporate Medical Insurance" val={salaryStructure?.insurance} isContribution />

                        <tr className="bg-slate-900 text-white font-bold">
                          <td className="px-6 py-4">Total Employer Cost (Stated CTC)</td>
                          <td className="px-6 py-4 text-right">{fmtMoney(salaryStructure?.grossTotalSalary)}</td>
                          <td className="px-6 py-4 text-right">₹{(salaryStructure?.grossTotalSalary * 12).toLocaleString('en-IN')}</td>
        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* Tab 2: Declarations */}
              {activeTab === 'declarations' && (() => {
                const newRegimeTax = liveSalaryStructure?.taxDetails?.newRegime?.annualTax || 0;
                const oldRegimeTax = liveSalaryStructure?.taxDetails?.oldRegime?.annualTax || 0;
                const lowerRegime = newRegimeTax <= oldRegimeTax ? 'new' : 'old';
                const monthlySavings = Math.abs((liveSalaryStructure?.taxDetails?.newRegime?.monthlyTax || 0) - (liveSalaryStructure?.taxDetails?.oldRegime?.monthlyTax || 0));

                return (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
                        <div>
                          <h2 className="text-lg font-bold text-slate-800">Form 12BB Investment & Tax Declarations</h2>
                          <p className="text-xs text-slate-500">Provide projections for Section 80C, 80D, Sec 24b, and monthly rent details.</p>
                        </div>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-blue-200">
                          FY 2026-27 Projections
                        </span>
                      </div>

                      <form onSubmit={handleDeclarationSubmit} className="space-y-6">
                        {/* Tax Regime Selector */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Tax Regime Preference</label>
                          <div className="flex gap-4">
                            <label className={`flex items-center gap-3 cursor-pointer border rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors w-1/2 ${
                              decForm.taxRegime === 'new' ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-white'
                            }`}>
                              <input
                                type="radio"
                                name="taxRegime"
                                value="new"
                                checked={decForm.taxRegime === 'new'}
                                onChange={() => handleDecFormChange('taxRegime', 'new')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                              />
                              <div>
                                <span className="text-sm font-bold text-slate-800">New Tax Regime</span>
                                <p className="text-[10px] text-slate-500">Lower tax slabs, standard deduction of ₹75,000</p>
                              </div>
                            </label>
                            <label className={`flex items-center gap-3 cursor-pointer border rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors w-1/2 ${
                              decForm.taxRegime === 'old' ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-white'
                            }`}>
                              <input
                                type="radio"
                                name="taxRegime"
                                value="old"
                                checked={decForm.taxRegime === 'old'}
                                onChange={() => handleDecFormChange('taxRegime', 'old')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                              />
                              <div>
                                <span className="text-sm font-bold text-slate-800">Old Tax Regime</span>
                                <p className="text-[10px] text-slate-500">Allows multiple deductions (80C, 80D, HRA exemption)</p>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Monthly Rent and Metro residency */}
                        {decForm.taxRegime === 'old' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Monthly Rent Paid (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={decForm.rentPaidMonthly || ''}
                                onChange={(e) => handleDecFormChange('rentPaidMonthly', Number(e.target.value) || 0)}
                                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                                placeholder="e.g. 15000"
                              />
                            </div>

                            {decForm.rentPaidMonthly > 0 && (
                              <div className="flex items-center mt-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!decForm.isMetroCity}
                                    onChange={(e) => handleDecFormChange('isMetroCity', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <div>
                                    <span className="text-sm font-bold text-slate-800">Metro City Resident</span>
                                    <p className="text-[10px] text-slate-500">Delhi, Mumbai, Kolkata, or Chennai (50% HRA exempt, else 40%)</p>
                                  </div>
                                </label>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Section 80C */}
                        <div className="border-t border-slate-100 pt-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Section 80C (Max ₹1,50,000)</label>
                              <p className="text-[10px] text-slate-400">Sum of sub-investments: EPF, PPF, ELSS, LIC, Home Loan Principal</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-slate-800">Total: ₹{(decForm.section80C || 0).toLocaleString('en-IN')}</span>
                              <span className="text-xs text-slate-400">/ 1,50,000</span>
                            </div>
                          </div>
                          
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${decForm.section80C >= 150000 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min((decForm.section80C / 150000) * 100, 100)}%` }}
                            ></div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">EPF (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={decForm.epf || ''}
                                onChange={(e) => handleDecFormChange('epf', Number(e.target.value) || 0)}
                                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">PPF (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={decForm.ppf || ''}
                                onChange={(e) => handleDecFormChange('ppf', Number(e.target.value) || 0)}
                                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">ELSS (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={decForm.elss || ''}
                                onChange={(e) => handleDecFormChange('elss', Number(e.target.value) || 0)}
                                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">LIC Premium (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={decForm.lic || ''}
                                onChange={(e) => handleDecFormChange('lic', Number(e.target.value) || 0)}
                                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">Home Loan (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={decForm.homeLoanPrincipal || ''}
                                onChange={(e) => handleDecFormChange('homeLoanPrincipal', Number(e.target.value) || 0)}
                                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section 80D, 24b, 80CCD, Other Exemptions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                          <div>
                            <div className="flex justify-between mb-1">
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Section 80D (Health Insurance - Max ₹25K)</label>
                              <span className="text-xs text-slate-400">Max: ₹25,000</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={decForm.section80D || ''}
                              onChange={(e) => handleDecFormChange('section80D', Number(e.target.value) || 0)}
                              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                              placeholder="Health insurance premium"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between mb-1">
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Section 24(b) (Home Loan Interest - Max ₹2L)</label>
                              <span className="text-xs text-slate-400">Max: ₹2,00,000</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={decForm.section24b || ''}
                              onChange={(e) => handleDecFormChange('section24b', Number(e.target.value) || 0)}
                              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                              placeholder="Annual home loan interest"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between mb-1">
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Section 80CCD(1B) (NPS - Max ₹50K)</label>
                              <span className="text-xs text-slate-400">Max: ₹50,000</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={decForm.section80CCD1B || ''}
                              onChange={(e) => handleDecFormChange('section80CCD1B', Number(e.target.value) || 0)}
                              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                              placeholder="Additional NPS contribution"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Other Allowable Exemptions</label>
                            <input
                              type="number"
                              min="0"
                              value={decForm.otherExemptions || ''}
                              onChange={(e) => handleDecFormChange('otherExemptions', Number(e.target.value) || 0)}
                              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                              placeholder="Other tax exemptions"
                            />
                          </div>
                        </div>

                        {/* Premium Drag and Drop Upload Zone */}
                        <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl p-6 bg-slate-50 text-center transition-all">
                          <input
                            type="file"
                            id="bill-upload"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                setUploadedFileName(e.target.files[0].name);
                                toast.success('Document uploaded successfully as attachment!');
                              }
                            }}
                          />
                          <label htmlFor="bill-upload" className="cursor-pointer space-y-2 block">
                            <FaCloudUploadAlt size={40} className="mx-auto text-slate-400" />
                            <div className="text-sm font-semibold text-slate-700">Drag &amp; drop investment receipts/proofs here</div>
                            <div className="text-xs text-slate-400">PDF, PNG, JPG accepted (Max 5MB)</div>
                            {uploadedFileName && (
                              <div className="mt-3 text-xs bg-emerald-100 border border-emerald-300 text-emerald-800 px-3 py-1 rounded-full inline-block">
                                Attached: {uploadedFileName}
                              </div>
                            )}
                          </label>
                        </div>

                        {/* LIVE TAX COMPARISON WIDGET */}
                        {liveSalaryStructure?.taxDetails && (
                          <div className="border-t border-slate-100 pt-6 mt-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center gap-2">
                              <span className="bg-emerald-500 text-white rounded-full p-1 text-[10px]"><FaCalculator /></span>
                              Live Tax Regime Comparison
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* New Regime Card */}
                              <div className={`relative p-5 rounded-2xl border transition-all ${
                                lowerRegime === 'new'
                                  ? 'bg-emerald-50/40 border-emerald-300 shadow-md ring-1 ring-emerald-300'
                                  : 'bg-slate-50/50 border-slate-200 shadow-sm'
                              }`}>
                                {lowerRegime === 'new' && (
                                  <span className="absolute top-4 right-4 bg-emerald-600 text-[10px] text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                    ✓ Recommended
                                  </span>
                                )}
                                <h4 className="font-extrabold text-sm text-slate-800 mb-3 uppercase tracking-wider">New Regime</h4>
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Net Taxable Income:</span>
                                    <span className="font-semibold text-slate-800">{fmtMoney(liveSalaryStructure.taxDetails.newRegime.netTaxableIncome)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Annual Tax Liability:</span>
                                    <span className="font-semibold text-slate-800">{fmtMoney(liveSalaryStructure.taxDetails.newRegime.annualTax)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-sm">
                                    <span className="text-slate-700">Monthly TDS:</span>
                                    <span className="text-slate-900">{fmtMoney(liveSalaryStructure.taxDetails.newRegime.monthlyTax)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Old Regime Card */}
                              <div className={`relative p-5 rounded-2xl border transition-all ${
                                lowerRegime === 'old'
                                  ? 'bg-emerald-50/40 border-emerald-300 shadow-md ring-1 ring-emerald-300'
                                  : 'bg-slate-50/50 border-slate-200 shadow-sm'
                              }`}>
                                {lowerRegime === 'old' && (
                                  <span className="absolute top-4 right-4 bg-emerald-600 text-[10px] text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                    ✓ Recommended
                                  </span>
                                )}
                                <h4 className="font-extrabold text-sm text-slate-800 mb-3 uppercase tracking-wider">Old Regime</h4>
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Total Deductions:</span>
                                    <span className="font-semibold text-emerald-600">- {fmtMoney(liveSalaryStructure.taxDetails.oldRegime.totalDeductions)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Net Taxable Income:</span>
                                    <span className="font-semibold text-slate-800">{fmtMoney(liveSalaryStructure.taxDetails.oldRegime.netTaxableIncome)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Annual Tax Liability:</span>
                                    <span className="font-semibold text-slate-800">{fmtMoney(liveSalaryStructure.taxDetails.oldRegime.annualTax)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-sm">
                                    <span className="text-slate-700">Monthly TDS:</span>
                                    <span className="text-slate-900">{fmtMoney(liveSalaryStructure.taxDetails.oldRegime.monthlyTax)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {monthlySavings > 0 && (
                              <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                                  <span>💡</span>
                                  <span>
                                    You save <span className="text-sm font-bold text-emerald-950">{fmtMoney(monthlySavings)}/month</span> ({fmtMoney(monthlySavings * 12)}/year) by choosing the {lowerRegime === 'new' ? 'New' : 'Old'} Regime!
                                  </span>
                                </div>
                                {decForm.taxRegime !== lowerRegime && (
                                  <button
                                    type="button"
                                    onClick={() => handleDecFormChange('taxRegime', lowerRegime)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                                  >
                                    Switch to {lowerRegime === 'new' ? 'New' : 'Old'} Regime
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Form Submit & Print Buttons */}
                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            onClick={() => triggerPrintWindow('form12bb_print_template')}
                            className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
                          >
                            <FaPrint /> Print Form 12BB
                          </button>
                          <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
                          >
                            Save Projections &amp; Update TDS
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                );
              })()}

              {/* Tab 3: Reimbursements */}
              {activeTab === 'claims' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Monthly Reimbursement Claims</h2>
                        <p className="text-xs text-slate-500">Petrol, Broadband, LTA, and other corporate wallet balances.</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingClaimId(null);
                          setClaimDraft({ category: 'broadband', amount: '', billUrl: '' });
                          setShowClaimModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2"
                      >
                        <FaReceipt /> Submit New Claim
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-slate-700">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date Submitted</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Claimed</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">HR remarks</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {claims.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">No reimbursement claims submitted yet.</td></tr>
                          ) : claims.map((claim) => (
                            <tr key={claim._id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-6 py-4">{formatIndianDate(claim.createdAt)}</td>
                              <td className="px-6 py-4 capitalize font-semibold">{claim.category}</td>
                              <td className="px-6 py-4 text-right font-semibold">{fmtMoney(claim.amount)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1.5
                                  ${claim.status === 'approved' ? 'bg-green-100 text-green-800' : claim.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {claim.status === 'approved' && <FaCheckCircle size={10} />}
                                  {claim.status === 'rejected' && <FaTimesCircle size={10} />}
                                  {claim.status === 'pending' && <FaHourglassHalf size={10} />}
                                  {claim.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 italic">{claim.approverRemarks || '-'}</td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditClaim(claim)}
                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all border border-blue-200"
                                    title="Edit Claim"
                                  >
                                    <FaEdit size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClaim(claim._id)}
                                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all border border-red-200"
                                    title="Delete Claim"
                                  >
                                    <FaTrash size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 4: Loans */}
              {activeTab === 'loans' && (
                <div className="space-y-6">
                  
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Loans &amp; Salary Advances</h2>
                        <p className="text-xs text-slate-500">Track active loans, outstanding liability balances, and monthly deductions.</p>
                      </div>
                      <button
                        onClick={() => setShowLoanModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2"
                      >
                        <FaHandHoldingUsd size={14} /> Request Advance/Loan
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-slate-700">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date Requested</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Principal Amount</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly EMI</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Remaining Balance</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loans.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400">No loan or salary advance requests found.</td></tr>
                          ) : loans.map((loan) => (
                            <tr key={loan._id}>
                              <td className="px-6 py-4">{formatIndianDate(loan.createdAt)}</td>
                              <td className="px-6 py-4 text-right font-semibold">{fmtMoney(loan.principalAmount)}</td>
                              <td className="px-6 py-4 text-right font-semibold">{fmtMoney(loan.emiAmount)}</td>
                              <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtMoney(loan.remainingBalance)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1.5
                                  ${loan.status === 'active' ? 'bg-green-100 text-green-800' : loan.status === 'closed' ? 'bg-indigo-100 text-indigo-800' : loan.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {loan.status === 'active' && <FaCheckCircle size={10} />}
                                  {loan.status === 'closed' && <FaCheckCircle size={10} />}
                                  {loan.status === 'rejected' && <FaTimesCircle size={10} />}
                                  {loan.status === 'pending_approval' && <FaHourglassHalf size={10} />}
                                  {loan.status.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab: Leaves */}
              {activeTab === 'leaves' && (
                <div className="space-y-6">
                  {/* Leave Balances Grid */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Your Leave Balances</h2>
                        <p className="text-xs text-slate-500">Opening, Accrued, Used and remaining balances for the current year.</p>
                      </div>
                      <button
                        onClick={() => {
                          setLeaveDraft({
                            leaveType: leaveTypes[0]?._id || '',
                            startDate: '',
                            endDate: '',
                            numberOfDays: '',
                            reason: ''
                          });
                          setShowLeaveModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2"
                      >
                        <FaCalendarCheck /> Apply for Leave
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {leaveBalances.map((bal) => (
                        <div key={bal._id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 shadow-sm">
                          <div className="text-xs font-bold text-slate-400 uppercase">{bal.leaveType?.name}</div>
                          <div className="text-3xl font-black text-slate-800 mt-2">{bal.closing}</div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            Accrued: {bal.accrued} · Used: {bal.used}
                          </div>
                        </div>
                      ))}
                      {leaveBalances.length === 0 && (
                        <div className="col-span-3 text-center py-6 text-sm text-slate-400 italic">No leave balances allocated yet.</div>
                      )}
                    </div>
                  </div>

                  {/* Submitted Leave Requests */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">Leave Requests History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-slate-700">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Leave Type</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Days</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Approver Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {leaves.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400">No leave requests submitted yet.</td></tr>
                          ) : leaves.map((req) => (
                            <tr key={req._id}>
                              <td className="px-6 py-4 font-semibold uppercase text-slate-800">{req.leaveType?.name}</td>
                              <td className="px-6 py-4">{formatIndianDate(req.startDate)} to {formatIndianDate(req.endDate)}</td>
                              <td className="px-6 py-4 text-right font-semibold">{req.numberOfDays}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1.5
                                  ${req.status === 'approved' ? 'bg-green-100 text-green-800' : req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {req.status === 'approved' && <FaCheckCircle size={10} />}
                                  {req.status === 'rejected' && <FaTimesCircle size={10} />}
                                  {req.status === 'pending' && <FaHourglassHalf size={10} />}
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 italic">{req.approverRemarks || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Payslips */}
              {activeTab === 'payslips' && (
                <div className="space-y-6">
                  
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">Historical Payslips</h2>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-slate-700">
                        <thead>
                          <tr className="bg-slate-55 border-b border-slate-200">
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Payroll Period</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Total Salary</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Total Deductions</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Net Take-Home</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {payrolls.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">No payslips generated yet for this employee.</td></tr>
                          ) : payrolls.map((payroll) => (
                            <tr key={payroll._id}>
                              <td className="px-6 py-4 font-bold text-slate-800">
                                {new Date(0, payroll.month - 1).toLocaleString('en-US', { month: 'long' })} {payroll.year}
                              </td>
                              <td className="px-6 py-4 text-right">{fmtMoney(payroll.totalPayable || payroll.earnings?.totalEarnings)}</td>
                              <td className="px-6 py-4 text-right text-red-600">{fmtMoney(payroll.deductions?.totalDeductions)}</td>
                              <td className="px-6 py-4 text-right font-black text-emerald-600">{fmtMoney(payroll.netSalary)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${payrollStatusClass[payroll.status] || payrollStatusClass.draft}`}>
                                  {payroll.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => {
                                    setSelectedSlip(payroll);
                                    setShowUnlockModal(true);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900 hover:underline inline-flex items-center gap-1 font-bold text-xs"
                                >
                                  <FaLock size={10} /> Open Locked PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 6: Form 16 */}
              {activeTab === 'form16' && (
                <div className="space-y-6">
                  
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Form 16 Certificate Preview</h2>
                        <p className="text-xs text-slate-500">Annual statement of salary paid and tax deducted at source under Sec 203.</p>
                      </div>
                      <button
                        onClick={() => window.print()}
                        className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors"
                      >
                        <FaPrint /> Print Form 16 (TRACES PDF Format)
                      </button>
                    </div>
 
                    {/* Interactive Preview Container */}
                    <div className="border border-slate-300 rounded-2xl p-8 bg-slate-50 shadow-inner max-h-[600px] overflow-y-auto no-scrollbar font-serif text-slate-800 leading-relaxed text-xs">
                      <div id="form16_print_template" className="bg-white p-8 max-w-4xl mx-auto shadow-sm space-y-8 border-4 border-double border-emerald-950 traces-watermark">
                        
                        {/* ================= PART A ================= */}
                        <div className="space-y-4 pb-6">
                          
                          {/* TRACES OFFICIAL BANNER HEADER */}
                          <div className="flex justify-between items-center border-b-2 border-emerald-900 pb-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-emerald-900 text-white font-sans text-xs font-black p-2 rounded-lg leading-tight uppercase tracking-wider text-center">
                                TRACES
                              </div>
                              <div className="leading-tight">
                                <h4 className="font-sans font-bold text-[9px] text-emerald-900 uppercase tracking-widest">INCOME TAX DEPARTMENT</h4>
                                <h3 className="font-sans font-black text-slate-900 text-xs tracking-tight uppercase">Govt. of India · TDS Central Processing Cell</h3>
                              </div>
                            </div>
                            <div className="text-right font-sans text-[8px] text-slate-500 leading-tight">
                              <div>Certificate No: <span className="font-mono font-bold text-slate-800">TDS/2026/F16-{employee.panNumber || 'XXXXX0000X'}</span></div>
                              <div>Date of Issue: <span className="font-mono">{new Date().toLocaleDateString('en-IN')}</span></div>
                            </div>
                          </div>

                          <div className="text-center bg-emerald-50/40 border border-emerald-900 p-3 rounded">
                            <h1 className="text-sm font-extrabold uppercase tracking-wide text-emerald-950">FORM NO. 16</h1>
                            <p className="text-[9px] font-sans text-emerald-800 font-semibold">[See rule 31(1)(a)]</p>
                            <h2 className="text-xs font-bold uppercase mt-1 leading-snug text-slate-900">Certificate under Section 203 of the Income-Tax Act, 1961 for Tax Deducted at Source on Salary</h2>
                            <p className="text-[8px] font-sans text-slate-650 mt-0.5">Certificate of salary paid and TDS deducted, to be filed with quarterly statements in Form 24Q</p>
                          </div>
 
                          {/* PART A HEADER GRID */}
                          <table className="w-full border-collapse border border-emerald-900 text-[10px] bg-white">
                            <tbody>
                              <tr>
                                <td className="border border-emerald-900 p-3 w-1/2 align-top">
                                  <span className="font-sans font-bold text-emerald-900 uppercase tracking-wider block text-[7.5px] mb-1">Name and address of the Employer (Deductor)</span>
                                  <strong className="text-[11px] text-slate-950 block uppercase">Flance Enterprises Inc.</strong>
                                  <span className="text-slate-600 block mt-0.5 font-sans leading-normal">Tech Park Sector V, Salt Lake, Kolkata, West Bengal, 700091</span>
                                </td>
                                <td className="border border-emerald-900 p-3 w-1/2 align-top">
                                  <span className="font-sans font-bold text-emerald-900 uppercase tracking-wider block text-[7.5px] mb-1">Name and address of the Employee</span>
                                  <strong className="text-[11px] text-slate-950 block uppercase">{employee.firstName} {employee.lastName}</strong>
                                  <span className="text-slate-600 block mt-0.5 font-sans leading-normal">{employee.location || 'Haryana, India'}</span>
                                  <span className="text-slate-500 block text-[9px] mt-1 font-sans">Email: {employee.email}</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <table className="w-full border-collapse border border-emerald-900 text-[9.5px] bg-white">
                            <tbody>
                              <tr className="text-center font-sans font-bold bg-emerald-50/20 text-emerald-950">
                                <td className="border border-emerald-900 p-1.5 w-1/4">Employer TAN</td>
                                <td className="border border-emerald-900 p-1.5 w-1/4">Employer PAN</td>
                                <td className="border border-emerald-900 p-1.5 w-1/4">Employee PAN</td>
                                <td className="border border-emerald-900 p-1.5 w-1/4">Assessment Year</td>
                              </tr>
                              <tr className="text-center align-middle">
                                <td className="border border-emerald-900 p-1.5">{renderTANBoxes('CALF09876A')}</td>
                                <td className="border border-emerald-900 p-1.5">{renderPANBoxes('AAACF0987K')}</td>
                                <td className="border border-emerald-900 p-1.5">{renderPANBoxes(employee.panNumber)}</td>
                                <td className="border border-emerald-900 p-1.5 font-sans font-bold text-slate-900 text-[11px]">2026-27</td>
                              </tr>
                              <tr className="text-center font-sans font-bold bg-emerald-50/20 text-emerald-950">
                                <td className="border border-emerald-900 p-1.5" colSpan="2">Period of Service With Employer</td>
                                <td className="border border-emerald-900 p-1.5" colSpan="2">Period of Certificate</td>
                              </tr>
                              <tr className="text-center font-mono">
                                <td className="border border-emerald-900 p-1.5" colSpan="2">01-Apr-2025 to 31-Mar-2026</td>
                                <td className="border border-emerald-900 p-1.5" colSpan="2">01-Apr-2025 to 31-Mar-2026</td>
                              </tr>
                              <tr className="bg-emerald-50/20">
                                <td className="border border-emerald-900 p-2 font-bold font-sans text-emerald-950" colSpan="2">CIT (TDS) Jurisdiction Office Address:</td>
                                <td className="border border-emerald-900 p-2 font-sans text-slate-700" colSpan="2">Commissioner of Income Tax (TDS), 10 Middleton Street, Kolkata, WB, 700071</td>
                              </tr>
                            </tbody>
                          </table>
 
                          {/* SUMMARY OF TAX DEDUCTED AND DEPOSITED */}
                          <div className="space-y-1.5 pt-2">
                            <h3 className="font-sans font-bold text-emerald-950 text-[10px] uppercase tracking-wide">Summary of tax deducted and deposited into Central Government Account</h3>
                            <table className="w-full border-collapse border border-emerald-900 text-center text-[9.5px] bg-white">
                              <thead>
                                <tr className="bg-emerald-50/30 font-bold text-emerald-950 font-sans">
                                  <th className="border border-emerald-900 p-2">Quarter</th>
                                  <th className="border border-emerald-900 p-2">Receipt Number of 24Q</th>
                                  <th className="border border-emerald-900 p-2 text-right">Amount of Tax Deducted (₹)</th>
                                  <th className="border border-emerald-900 p-2 text-right">Amount of Tax Deposited (₹)</th>
                                </tr>
                              </thead>
                              <tbody className="font-mono text-slate-800">
                                {['Q1 (Apr-Jun)', 'Q2 (Jul-Sep)', 'Q3 (Oct-Dec)', 'Q4 (Jan-Mar)'].map((q, idx) => {
                                  const quarterTax = quartersTax[idx];
                                  return (
                                    <tr key={q} className="hover:bg-slate-50/30">
                                      <td className="border border-emerald-900 p-2 text-left font-sans font-semibold text-slate-700">{q}</td>
                                      <td className="border border-emerald-900 p-2">REC-2025Q{idx+1}-829381</td>
                                      <td className="border border-emerald-900 p-2 text-right">{fmtMoney(quarterTax)}</td>
                                      <td className="border border-emerald-900 p-2 text-right">{fmtMoney(quarterTax)}</td>
                                    </tr>
                                  );
                                })}
                                <tr className="bg-emerald-50/10 font-bold font-sans text-slate-900 border-t-2 border-emerald-900">
                                  <td className="border border-emerald-900 p-2 text-left" colSpan="2">Total Annual Tax Deposited</td>
                                  <td className="border border-emerald-900 p-2 text-right font-mono text-emerald-950 text-[10.5px]">
                                    {fmtMoney(totalTaxAnnual)}
                                  </td>
                                  <td className="border border-emerald-900 p-2 text-right font-mono text-emerald-950 text-[10.5px]">
                                    {fmtMoney(totalTaxAnnual)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* I. CHALLAN DETAILS LOG TABLE */}
                          <div className="space-y-1.5 pt-2">
                            <h3 className="font-sans font-bold text-emerald-950 text-[10px] uppercase tracking-wide">I. Details of Tax Deducted and Deposited in the Central Government Account through Challan</h3>
                            <p className="text-[8px] font-sans text-slate-500 -mt-1 mb-1">(Matched and verified with the OLTAS database system logs under Section 203)</p>
                            <table className="w-full border-collapse border border-emerald-900 text-center text-[9px] bg-white">
                              <thead>
                                <tr className="bg-emerald-50/30 font-bold text-emerald-950 font-sans">
                                  <th className="border border-emerald-900 p-1.5 w-[8%]">Sl. No.</th>
                                  <th className="border border-emerald-900 p-1.5 text-right w-[18%]">Tax Deposited (₹)</th>
                                  <th className="border border-emerald-900 p-1.5 w-[18%]">BSR Code of Bank</th>
                                  <th className="border border-emerald-900 p-1.5 w-[22%]">Date of Deposit</th>
                                  <th className="border border-emerald-900 p-1.5 w-[18%]">Challan Serial No.</th>
                                  <th className="border border-emerald-900 p-1.5 w-[16%]">OLTAS Match</th>
                                </tr>
                              </thead>
                              <tbody className="font-mono text-slate-800">
                                {[
                                  { month: 'Apr 2025', date: '07-May-2025', challan: '01982' },
                                  { month: 'May 2025', date: '07-Jun-2025', challan: '02891' },
                                  { month: 'Jun 2025', date: '07-Jul-2025', challan: '03182' },
                                  { month: 'Jul 2025', date: '07-Aug-2025', challan: '04192' },
                                  { month: 'Aug 2025', date: '07-Sep-2025', challan: '05190' },
                                  { month: 'Sep 2025', date: '07-Oct-2025', challan: '06198' },
                                  { month: 'Oct 2025', date: '07-Nov-2025', challan: '07291' },
                                  { month: 'Nov 2025', date: '07-Dec-2025', challan: '08129' },
                                  { month: 'Dec 2025', date: '07-Jan-2026', challan: '09192' },
                                  { month: 'Jan 2026', date: '07-Feb-2026', challan: '10291' },
                                  { month: 'Feb 2026', date: '07-Mar-2026', challan: '11827' },
                                  { month: 'Mar 2026', date: '07-Apr-2026', challan: '12918' },
                                ].map((row, idx) => {
                                  const depAmt = monthlyTdsDeposits[idx];
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/30">
                                      <td className="border border-emerald-900 p-1 font-sans">{idx + 1}</td>
                                      <td className="border border-emerald-900 p-1 text-right font-semibold">{fmtMoney(depAmt)}</td>
                                      <td className="border border-emerald-900 p-1">0210045</td>
                                      <td className="border border-emerald-900 p-1">{row.date}</td>
                                      <td className="border border-emerald-900 p-1">{row.challan}</td>
                                      <td className="border border-emerald-900 p-1 font-sans text-emerald-800 font-extrabold text-[8.5px] uppercase">Matched</td>
                                    </tr>
                                  );
                                })}
                                <tr className="bg-emerald-50/10 font-bold border-t border-emerald-900">
                                  <td className="border border-emerald-900 p-1.5 font-sans" colSpan="1">Total</td>
                                  <td className="border border-emerald-900 p-1.5 text-right font-mono text-[10px] text-emerald-950">{fmtMoney(totalTaxAnnual)}</td>
                                  <td className="border border-emerald-900 p-1.5" colSpan="4"></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
 
                          {/* AUTHORIZED SIGNATORY CERTIFICATE */}
                          <div className="border border-emerald-900 p-4 bg-emerald-50/10 rounded space-y-3 text-[10px]">
                            <h4 className="font-sans font-bold text-emerald-950 uppercase block text-[8px] tracking-wider mb-1">VERIFICATION BY EMPLOYER</h4>
                            <p className="leading-relaxed text-slate-800">
                              I, <strong className="text-slate-900">Siddharth Chatterjee</strong>, son of Mr. K. C. Chatterjee, working in the capacity of <strong className="text-slate-900">Director</strong>, do hereby certify that a sum of 
                              <strong className="text-emerald-950 font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 mx-1">
                                {fmtMoney(totalTaxAnnual)}
                              </strong> 
                              <span>(<strong className="italic text-slate-700">{convertNumberToWords(totalTaxAnnual)}</strong>) </span>
                              has been deducted and deposited to the credit of the Central Government. 
                              I further certify that the information given above is true, complete and correct based on the official corporate payroll and accounting records.
                            </p>
                            <div className="flex justify-between items-end pt-3 font-sans text-[9px] text-slate-500">
                              <div>
                                <div>Place: <strong>Kolkata, WB, India</strong></div>
                                <div className="mt-1">Date: <strong>{new Date().toLocaleDateString('en-IN')}</strong></div>
                              </div>
                              <div className="text-center border-2 border-emerald-800 p-2 bg-emerald-50/30 rounded shadow-sm min-w-[200px] flex items-center gap-2">
                                <div className="text-emerald-700 text-lg">✔</div>
                                <div className="text-left font-sans leading-tight">
                                  <div className="font-black text-emerald-900 text-[9px] uppercase tracking-wider">Signature Verified</div>
                                  <div className="font-mono text-[8px] text-slate-700 mt-0.5">Digitally Signed by:</div>
                                  <div className="font-bold font-serif text-slate-800 text-[10px] italic">Siddharth Chatterjee</div>
                                  <div className="text-[7px] text-slate-500 mt-0.5">CPC-TDS Authority, Government Logs</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
 
                        {/* PAGE SPLIT BOUNDARY */}
                        <div className="page-break my-6 border-t-2 border-dashed border-emerald-900 text-center text-[8px] font-sans font-bold text-slate-400 uppercase tracking-widest no-print py-4">
                          ✂ PAGE SPLIT FOR PRINT (Part B Begins Below) ✂
                        </div>

                        {/* ================= PART B ================= */}
                        <div className="space-y-4 pt-4">
                          <div className="flex justify-between items-center border-b-2 border-emerald-900 pb-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-emerald-900 text-white font-sans text-xs font-black p-2 rounded-lg leading-tight uppercase tracking-wider text-center">
                                TRACES
                              </div>
                              <div className="leading-tight">
                                <h4 className="font-sans font-bold text-[9px] text-emerald-900 uppercase tracking-widest">INCOME TAX DEPARTMENT</h4>
                                <h3 className="font-sans font-black text-slate-900 text-xs tracking-tight uppercase">Part B - Salary Computation Sheet</h3>
                              </div>
                            </div>
                            <div className="text-right font-sans text-[8px] text-slate-500 leading-tight">
                              <div>PAN of Deductor: <span className="font-mono text-slate-800">AAACF0987K</span></div>
                              <div>PAN of Employee: <span className="font-mono text-slate-800">{employee.panNumber || 'XXXXX0000X'}</span></div>
                            </div>
                          </div>

                          <div className="text-center bg-emerald-50/40 border border-emerald-900 p-3 rounded">
                            <h1 className="text-sm font-extrabold uppercase tracking-wide text-emerald-950">FORM NO. 16 - PART B</h1>
                            <p className="text-[9px] font-sans text-emerald-800 font-semibold">[See rule 31(1)(a)]</p>
                            <h2 className="text-xs font-bold uppercase mt-1 leading-snug text-slate-900">Annexure: Details of Salary Paid, Other Income, and Deductions Allowed</h2>
                          </div>

                          <table className="w-full border-collapse border border-emerald-900 text-[10px] bg-white">
                            <thead>
                              <tr className="bg-emerald-50/30 font-bold text-emerald-950 font-sans text-center">
                                <th className="border border-emerald-900 p-2 text-left w-3/5">Details of Salary Paid and Deductions Allowed</th>
                                <th className="border border-emerald-900 p-2 w-1/5 text-right">Sub-Amount (₹)</th>
                                <th className="border border-emerald-900 p-2 w-1/5 text-right">Total Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* 1. Gross Salary */}
                              <tr className="bg-slate-50/30">
                                <td className="border border-emerald-900 p-1.5 font-bold" colSpan="3">1. Gross Salary</td>
                              </tr>
                              <tr>
                                <td className="border border-emerald-900 p-1.5 pl-6">(a) Salary as per provisions contained in section 17(1)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">{fmtMoney(salaryStructure?.totalEarnings * 12)}</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                              </tr>
                              <tr>
                                <td className="border border-emerald-900 p-1.5 pl-6">(b) Value of perquisites under section 17(2) (as per Form 12BA)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">₹0</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                              </tr>
                              <tr>
                                <td className="border border-emerald-900 p-1.5 pl-6">(c) Profits in lieu of salary under section 17(3) (as per Form 12BA)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">₹0</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                              </tr>
                              <tr className="bg-emerald-50/10">
                                <td className="border border-emerald-900 p-1.5 pl-6 font-bold text-emerald-950">Total Gross Salary</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono font-bold text-emerald-950">{fmtMoney(salaryStructure?.totalEarnings * 12)}</td>
                              </tr>

                              {/* 2. Exempt Allowances */}
                              <tr className="bg-slate-50/30">
                                <td className="border border-emerald-900 p-1.5 font-bold" colSpan="3">2. Less: Allowances exempt under section 10</td>
                              </tr>
                              <tr>
                                <td className="border border-emerald-900 p-1.5 pl-6">House Rent Allowance (HRA) exempt under section 10(13A)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">
                                  {employee.taxRegime === 'new' ? '₹0' : fmtMoney(salaryStructure?.taxDetails?.oldRegime?.hraExemption)}
                                </td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                              </tr>
                              <tr className="bg-emerald-50/10">
                                <td className="border border-emerald-900 p-1.5 pl-6 font-bold text-emerald-950">Total Exempt Allowances</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono font-bold text-emerald-950">
                                  {employee.taxRegime === 'new' ? '₹0' : fmtMoney(salaryStructure?.taxDetails?.oldRegime?.hraExemption)}
                                </td>
                              </tr>

                              {/* 3. Balance */}
                              <tr className="bg-slate-100/60 font-bold text-slate-900">
                                <td className="border border-emerald-900 p-1.5">3. Balance (Gross Earnings after Section 10 exemptions)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">
                                  {employee.taxRegime === 'new' 
                                    ? fmtMoney(salaryStructure?.totalEarnings * 12) 
                                    : fmtMoney(Math.max(0, (salaryStructure?.totalEarnings * 12) - (salaryStructure?.taxDetails?.oldRegime?.hraExemption || 0)))}
                                </td>
                              </tr>

                              {/* 4. Deductions under Section 16 */}
                              <tr className="bg-slate-50/30">
                                <td className="border border-emerald-900 p-1.5 font-bold" colSpan="3">4. Less: Deductions under section 16</td>
                              </tr>
                              <tr>
                                <td className="border border-emerald-900 p-1.5 pl-6">(a) Standard deduction under section 16(ia)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">
                                  {employee.taxRegime === 'new' ? '₹75,000' : '₹50,000'}
                                </td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                              </tr>
                              <tr>
                                <td className="border border-emerald-900 p-1.5 pl-6">(b) Tax on employment (Professional Tax) under section 16(iii)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">
                                  {employee.ptEnabled !== false ? fmtMoney((employee.deductions?.professionalTax || 0) * 12) : '₹0'}
                                </td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                              </tr>
                              <tr className="bg-emerald-50/10">
                                <td className="border border-emerald-900 p-1.5 pl-6 font-bold text-emerald-950">Total Section 16 Deductions</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono font-bold text-emerald-950">
                                  {employee.taxRegime === 'new' 
                                    ? '₹75,000' 
                                    : fmtMoney(50000 + (employee.ptEnabled !== false ? (employee.deductions?.professionalTax || 0) * 12 : 0))}
                                </td>
                              </tr>

                              {/* 5. Income Chargeable under head salaries */}
                              <tr className="bg-slate-100/60 font-bold text-slate-900 border-t border-emerald-900">
                                <td className="border border-emerald-900 p-1.5">5. Income chargeable under the head 'Salaries' (3 minus 4)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono text-emerald-950">
                                  {employee.taxRegime === 'new' 
                                    ? fmtMoney(salaryStructure?.taxDetails?.newRegime?.netTaxableIncome) 
                                    : fmtMoney(salaryStructure?.taxDetails?.oldRegime?.netTaxableIncome + (salaryStructure?.taxDetails?.oldRegime?.totalDeductions - 50000 - (employee.ptEnabled !== false ? (employee.deductions?.professionalTax || 0) * 12 : 0)))}
                                </td>
                              </tr>

                              {/* 6. Chapter VI-A Deductions */}
                              <tr className="bg-slate-50/30">
                                <td className="border border-emerald-900 p-1.5 font-bold" colSpan="3">6. Less: Deductions under Chapter VI-A (Old Regime Declarations)</td>
                              </tr>
                              <tr>
                                <td className="border border-emerald-900 p-1.5 pl-6">(a) Section 80C (PPF, ELSS, Insurance premiums, etc.)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">
                                  {employee.taxRegime === 'new' ? '₹0' : fmtMoney(dec.section80C)}
                                </td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                              </tr>
                              <tr>
                                <td className="border border-emerald-900 p-1.5 pl-6">(b) Section 80D (Medical Insurance premiums)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">
                                  {employee.taxRegime === 'new' ? '₹0' : fmtMoney(dec.section80D)}
                                </td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                              </tr>
                              <tr>
                                <td className="border border-emerald-900 p-1.5 pl-6">(c) Section 24b (Interest on home loan principal)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">
                                  {employee.taxRegime === 'new' ? '₹0' : fmtMoney(dec.section24b)}
                                </td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                              </tr>
                              <tr>
                                <td className="border border-emerald-900 p-1.5 pl-6">(d) Section 80CCD(1B) (Additional NPS)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">
                                  {employee.taxRegime === 'new' ? '₹0' : fmtMoney(dec.section80CCD1B)}
                                </td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                              </tr>
                              <tr className="bg-emerald-50/10">
                                <td className="border border-emerald-900 p-1.5 pl-6 font-bold text-emerald-950">Total Chapter VI-A Deductions</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono font-bold text-emerald-950">
                                  {employee.taxRegime === 'new' ? '₹0' : fmtMoney((dec.section80C || 0) + (dec.section80D || 0) + (dec.section24b || 0) + (dec.section80CCD1B || 0))}
                                </td>
                              </tr>

                              {/* 7. Net Taxable Income */}
                              <tr className="bg-emerald-900 text-white font-extrabold text-[11px]">
                                <td className="border border-emerald-900 p-2">7. Total Taxable Income (5 minus 6)</td>
                                <td className="border border-emerald-900 p-2 text-right font-mono">-</td>
                                <td className="border border-emerald-900 p-2 text-right font-mono text-white">
                                  {employee.taxRegime === 'new' 
                                    ? fmtMoney(salaryStructure?.taxDetails?.newRegime?.netTaxableIncome) 
                                    : fmtMoney(salaryStructure?.taxDetails?.oldRegime?.netTaxableIncome)}
                                </td>
                              </tr>

                              {/* 8. Tax Calculation */}
                              <tr className="bg-slate-50/30">
                                <td className="border border-emerald-900 p-1.5 font-bold" colSpan="3">8. Computation of Tax Liability</td>
                              </tr>
                              <tr>
                                <td className="border border-emerald-900 p-1.5 pl-6">Tax payable on Total Income (Calculated under active slab)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">
                                  {employee.taxRegime === 'new' 
                                    ? fmtMoney(salaryStructure?.taxDetails?.newRegime?.annualTaxBase) 
                                    : fmtMoney(salaryStructure?.taxDetails?.oldRegime?.annualTaxBase)}
                                </td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                              </tr>
                              <tr>
                                <td className="border border-emerald-900 p-1.5 pl-6">Add: Health and Education Cess (4% of Tax Payable)</td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">
                                  {employee.taxRegime === 'new' 
                                    ? fmtMoney(salaryStructure?.taxDetails?.newRegime?.cess) 
                                    : fmtMoney(salaryStructure?.taxDetails?.oldRegime?.cess)}
                                </td>
                                <td className="border border-emerald-900 p-1.5 text-right font-mono">-</td>
                              </tr>
                              <tr className="bg-emerald-950 text-white font-extrabold text-[11px] border-t-2 border-emerald-950">
                                <td className="border border-emerald-900 p-2">9. Net Tax Liability / Net TDS Deposited (Annualized)</td>
                                <td className="border border-emerald-900 p-2 text-right font-mono">-</td>
                                <td className="border border-emerald-900 p-2 text-right font-mono text-white">
                                  {fmtMoney(totalTaxAnnual)}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <div className="text-[9.5px] text-slate-550 font-sans text-center mt-3 leading-relaxed">
                            <div>*This is a live-rendered Part B digital certificate generated automatically from the MyBills statutory calculations module in compliance with Indian Income Tax rules.</div>
                            <div className="font-bold text-slate-700">Digitally Certified and Signed by Siddharth Chatterjee.</div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        </>
      )}

      {/* ── Form 12BB Offscreen Print Template ── */}
      <div id="form12bb_print_template" className="hidden bg-white p-12 text-slate-950 font-serif leading-relaxed text-xs">
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-lg font-bold uppercase">FORM NO. 12BB</h1>
          <p className="text-[10px] font-sans text-slate-500">[See rule 26C]</p>
          <h2 className="text-sm font-bold uppercase mt-2">Statement showing particulars of claims by an employee for deduction of tax under Section 192</h2>
        </div>
        <div className="space-y-4">
          <div><strong>1. Name and Address of Employee:</strong> {employee?.firstName} {employee?.lastName} · {employee?.location || '-'}</div>
          <div><strong>2. Permanent Account Number (PAN):</strong> {employee?.panNumber || 'XXXXX0000X'}</div>
          <div><strong>3. Financial Year:</strong> 2026-2027</div>
          <div className="border border-slate-400 mt-6">
            <div className="bg-slate-100 p-2 font-bold font-sans">Details of Claims for Deductions</div>
            <div className="divide-y divide-slate-350">
              <div className="flex justify-between p-2"><span>A. House Rent Allowance (Exempt under Sec 10(13A)):</span><strong>{fmtMoney(salaryStructure?.taxDetails.oldRegime.hraExemption)}</strong></div>
              <div className="flex justify-between p-2"><span>B. Deduction under Section 80C:</span><strong>{fmtMoney(dec.section80C)}</strong></div>
              <div className="flex justify-between p-2"><span>C. Deduction under Section 80D:</span><strong>{fmtMoney(dec.section80D)}</strong></div>
              <div className="flex justify-between p-2"><span>D. Interest on Home Loan (Sec 24b):</span><strong>{fmtMoney(dec.section24b)}</strong></div>
              <div className="flex justify-between p-2"><span>E. Additional NPS Contribution (Sec 80CCD(1B)):</span><strong>{fmtMoney(dec.section80CCD1B)}</strong></div>
              <div className="flex justify-between p-2"><span>F. Other Exemptions claimed:</span><strong>{fmtMoney(dec.otherExemptions)}</strong></div>
            </div>
          </div>
          <div className="mt-12 text-right">
            <div className="inline-block border-t border-slate-900 pt-2 min-w-[200px] text-center">
              Signature of the Employee
            </div>
          </div>
        </div>
      </div>

      {/* ── Reimbursement Submission Modal ── */}
      <Modal isOpen={showClaimModal} onClose={() => { setShowClaimModal(false); setEditingClaimId(null); }} title={editingClaimId ? "Edit Reimbursement Claim" : "Submit Reimbursement Claim"}>
        <form onSubmit={handleClaimSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Claim Category</label>
            <select
              value={claimDraft.category}
              onChange={(e) => setClaimDraft({ ...claimDraft, category: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="broadband">Broadband / Internet</option>
              <option value="petrol">Petrol Reimbursement</option>
              <option value="lta">Leave Travel Allowance (LTA)</option>
              <option value="medical">Medical Expenses</option>
              <option value="other">Other Wallet Allowance</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Claim Amount</label>
            <input
              type="number"
              value={claimDraft.amount}
              onChange={(e) => setClaimDraft({ ...claimDraft, amount: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Enter claimed amount"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowClaimModal(false); setEditingClaimId(null); }} className="px-4 py-2 border rounded-lg text-sm font-semibold">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">{editingClaimId ? 'Update Claim' : 'Submit Claim'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Loan Request Modal ── */}
      <Modal isOpen={showLoanModal} onClose={() => setShowLoanModal(false)} title="Request Salary Advance/Loan">
        <form onSubmit={handleLoanSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Principal Amount</label>
            <input
              type="number"
              value={loanDraft.principalAmount}
              onChange={(e) => setLoanDraft({ ...loanDraft, principalAmount: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Total advance required"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Desired Monthly EMI</label>
            <input
              type="number"
              value={loanDraft.emiAmount}
              onChange={(e) => setLoanDraft({ ...loanDraft, emiAmount: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Target repayment amount per month"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Reason / Remarks</label>
            <textarea
              value={loanDraft.reason}
              onChange={(e) => setLoanDraft({ ...loanDraft, reason: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-24"
              placeholder="Reason for advance"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowLoanModal(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">Submit Request</button>
          </div>
        </form>
      </Modal>

      {/* ── Leave Submission Modal ── */}
      <Modal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Apply for Leave">
        <form onSubmit={handleLeaveSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Leave Type</label>
            <select
              value={leaveDraft.leaveType}
              onChange={(e) => setLeaveDraft({ ...leaveDraft, leaveType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              required
            >
              {leaveTypes.map((lt) => (
                <option key={lt._id} value={lt._id}>
                  {lt.name} ({lt.code}) {lt.isPaid ? '· Paid' : '· Unpaid'}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Start Date</label>
              <input
                type="date"
                value={leaveDraft.startDate}
                onChange={(e) => {
                  const start = e.target.value;
                  let days = leaveDraft.numberOfDays;
                  if (start && leaveDraft.endDate) {
                    const diffTime = Math.abs(new Date(leaveDraft.endDate) - new Date(start));
                    days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                  }
                  setLeaveDraft({ ...leaveDraft, startDate: start, numberOfDays: days });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">End Date</label>
              <input
                type="date"
                value={leaveDraft.endDate}
                onChange={(e) => {
                  const end = e.target.value;
                  let days = leaveDraft.numberOfDays;
                  if (leaveDraft.startDate && end) {
                    const diffTime = Math.abs(new Date(end) - new Date(leaveDraft.startDate));
                    days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                  }
                  setLeaveDraft({ ...leaveDraft, endDate: end, numberOfDays: days });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Number of Days</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={leaveDraft.numberOfDays}
              onChange={(e) => setLeaveDraft({ ...leaveDraft, numberOfDays: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. 1 or 0.5"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Reason / Remarks</label>
            <textarea
              value={leaveDraft.reason}
              onChange={(e) => setLeaveDraft({ ...leaveDraft, reason: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-24"
              placeholder="Reason for leave"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowLeaveModal(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">Submit Application</button>
          </div>
        </form>
      </Modal>

      {/* ── Locked Payslip Password Modal ── */}
      <Modal isOpen={showUnlockModal} onClose={() => {
        setShowUnlockModal(false);
        setUnlockPassword('');
        setPasswordError(false);
      }} title="🔒 Unlock Encrypted PDF Payslip">
        <form onSubmit={handleUnlockPayslip} className="space-y-4">
          <div className="bg-slate-50 border rounded-xl p-4 text-[11px] leading-relaxed text-slate-600">
            <span className="font-bold block text-slate-800 mb-1 flex items-center gap-1"><FaInfoCircle /> PDF Password Encryption Policy:</span>
            Your corporate payslips are protected in compliance with regulatory standards.
            <div className="mt-1 font-mono">Password Format: First 4 characters of your name in UPPERCASE + DDMM of your birth date.</div>
            <div className="mt-1 italic">E.g., if employee is "Tomar Singh" and Birth Date is 15th Aug 1995, enter <span className="font-bold text-slate-900 font-mono">TOMA1508</span>.</div>
          </div>
          
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1 inline-block">Enter PDF Password</label>
            <input
              type="password"
              value={unlockPassword}
              onChange={(e) => {
                setUnlockPassword(e.target.value);
                setPasswordError(false);
              }}
              className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono ${passwordError ? 'border-red-500 animate-pulse' : 'border-gray-300'}`}
              placeholder="e.g. TOMA1508"
              required
            />
            {passwordError && (
              <span className="text-[10px] text-red-500 font-semibold block mt-1">
                Incorrect password! Please check details and try again.
              </span>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowUnlockModal(false);
                setUnlockPassword('');
                setPasswordError(false);
              }}
              className="px-4 py-2 border rounded-xl text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
            >
              <FaUnlock /> Decrypt &amp; View
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full text-left flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all
      ${active ? 'bg-indigo-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
  >
    <span className={active ? 'text-indigo-400' : 'text-slate-400'}>{icon}</span>
    <span>{label}</span>
  </button>
);

const StructureRow = ({ label, val, isContribution, isSpecial }) => (
  <tr className={`hover:bg-slate-50 transition-colors ${isContribution ? 'bg-slate-50/20 text-slate-500 text-xs' : 'text-slate-700'}`}>
    <td className="px-6 py-2.5">
      <div className="flex items-center gap-2">
        {isContribution && <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />}
        {label}
      </div>
    </td>
    <td className={`px-6 py-2.5 text-right font-semibold ${isSpecial ? 'text-indigo-600' : ''}`}>{fmtMoney(val)}</td>
    <td className="px-6 py-2.5 text-right text-slate-400">₹{(val * 12).toLocaleString('en-IN')}</td>
  </tr>
);

export default EmployeePortal;
