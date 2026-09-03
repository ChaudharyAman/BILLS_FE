import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaDownload, FaEnvelope, FaChevronLeft } from 'react-icons/fa';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';
import { getPayslipLineItemLabels, resolveCompensationTypeClient } from '../utils/compensationTypeFields';

const fmtVal = (val, showDash = true) => {
  if (val === null || val === undefined || val === '' || Number(val) === 0) {
    return showDash ? '-' : '';
  }
  const n = Number(val);
  if (isNaN(n)) return val;
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const fmtMoney = (val, showDash = true) => fmtVal(val, showDash);

const fmtDate = (d) => {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime())
      ? String(d)
      : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  } catch {
    return String(d);
  }
};
const titleCase = (value) => String(value || '-').replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const PayslipGeneration = () => {
  const { id } = useParams();
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchPayslip = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/payroll/${id}/generate-payslip`, { signal: controller.signal });
        setSlip(res.data.payslip);
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error(error);
        toast.error(error.response?.data?.message || 'Failed to load payslip');
      } finally {
        setLoading(false);
      }
    };

    fetchPayslip();
    return () => controller.abort();
  }, [id]);

  const [downloading, setDownloading] = useState(false);

  const downloadPdf = async () => {
    try {
      setDownloading(true);
      const response = await api.get(`/payroll/${id}/payslip-pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const empId = slip?.employee?.employeeId || slip?.employeeSnapshot?.employeeId || 'EMP';
      const period = slip?.period ? `${slip.period.monthName}_${slip.period.year}` : 'payslip';
      link.setAttribute('download', `Payslip_${empId}_${period}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Payslip PDF downloaded successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download PDF payslip');
    } finally {
      setDownloading(false);
    }
  };

  const emailPayslip = async () => {
    try {
      setEmailing(true);
      const res = await api.post(`/payroll/${id}/email-payslip`);
      toast.success(res.data?.message || 'Payslip emailed successfully!');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to email payslip');
    } finally {
      setEmailing(false);
    }
  };

  // Compile earnings, deductions, and employer contributions side-by-side
  const tableData = useMemo(() => {
    if (!slip) return null;

    const emp = slip.employee || {};
    const structure = emp.salaryStructure || {};
    
    // Earnings list with: name, rate (base monthly CTC rate), monthly (actual prorated paid)
    let earnings = [];
    if (Array.isArray(slip.earningsLineItems) && slip.earningsLineItems.length > 0) {
      earnings = slip.earningsLineItems.map(item => ({
        name: item.name,
        rate: item.amount,
        monthly: item.amount,
        arrear: item.details || '-'
      }));
    } else {
      // ── NOTE: Source of Truth for Compensation Row Specifications ────────────────
      // Backend source of truth: MBB/utils/payrollMath/compensationRowSpec.js
      // (used by payslipLineItems.js and taxWorksheet.js). If adding new compensation
      // types or changing line item labels, update both backend & frontend fallback.
      // ─────────────────────────────────────────────────────────────────────────────
      const compType = resolveCompensationTypeClient(slip.employeeSnapshot || emp || slip);
      const periodInput = slip.periodInput || {};

      if (['monthly_salary', 'attendance_based', 'salary_plus_commission'].includes(compType)) {
        if (slip.earnings?.basic > 0) earnings.push({ name: 'Basic Salary', rate: structure.basic || slip.earnings.basic, monthly: slip.earnings.basic, arrear: '-' });
        if (slip.earnings?.hra > 0) earnings.push({ name: 'House Rent Allowance (HRA)', rate: structure.hra || slip.earnings.hra, monthly: slip.earnings.hra, arrear: '-' });
        if (slip.earnings?.specialAllowance > 0) earnings.push({ name: 'Special Allowance', rate: structure.specialAllowance || slip.earnings.specialAllowance, monthly: slip.earnings.specialAllowance, arrear: '-' });
        if (slip.earnings?.flexiAmount > 0) earnings.push({ name: 'Flexi Allowance', rate: slip.earnings.flexiAmount, monthly: slip.earnings.flexiAmount, arrear: '-' });
        if (slip.earnings?.broadband > 0) earnings.push({ name: 'Broadband Allowance', rate: slip.earnings.broadband, monthly: slip.earnings.broadband, arrear: '-' });
        if (slip.earnings?.petrol > 0) earnings.push({ name: 'Fuel/Petrol Allowance', rate: slip.earnings.petrol, monthly: slip.earnings.petrol, arrear: '-' });
        if (slip.earnings?.lta > 0) earnings.push({ name: 'Leave Travel Allowance (LTA)', rate: slip.earnings.lta, monthly: slip.earnings.lta, arrear: '-' });
        if (slip.earnings?.conveyance > 0) earnings.push({ name: 'Conveyance Allowance', rate: slip.earnings.conveyance, monthly: slip.earnings.conveyance, arrear: '-' });
        if (slip.earnings?.medicalAllowance > 0) earnings.push({ name: 'Medical Allowance', rate: slip.earnings.medicalAllowance, monthly: slip.earnings.medicalAllowance, arrear: '-' });
        (slip.earnings?.otherEarnings || []).forEach(item => {
          if (Number(item.amount) > 0) earnings.push({ name: item.name || 'Other Allowance', rate: item.amount, monthly: item.amount, arrear: '-' });
        });
      } else if (compType === 'hourly' || compType === 'timesheet_based') {
        const hours = Number(slip.hoursWorked) || Number(periodInput.hoursWorked) || Number(periodInput.hoursLogged) || 0;
        const rate = Number(slip.hourlyRate) || Number(slip.employeeSnapshot?.hourlyRate) || Number(emp.hourlyRate) || 0;
        const total = slip.earnings?.totalEarnings || slip.earnings?.basic || (hours * rate);
        earnings.push({
          name: compType === 'timesheet_based' ? 'Timesheet Logged Hours Pay' : 'Hourly Wages',
          rate: total,
          monthly: total,
          arrear: `${hours} hrs × ₹${rate}/hr`
        });
      } else if (compType === 'daily_wage') {
        const days = Number(slip.paidDays) || Number(periodInput.daysWorked) || 0;
        const rate = Number(slip.employeeSnapshot?.dailyRate) || Number(emp.dailyRate) || (days > 0 ? (slip.earnings?.totalEarnings / days) : 0);
        const total = slip.earnings?.totalEarnings || slip.earnings?.basic || (days * rate);
        earnings.push({
          name: 'Daily Wage Earnings',
          rate: total,
          monthly: total,
          arrear: `${days} days × ₹${rate}/day`
        });
      } else if (compType === 'piece_rate') {
        const units = Number(periodInput.unitsProduced) || 0;
        const rate = Number(periodInput.ratePerUnit) || Number(slip.employeeSnapshot?.rateCard?.[0]?.rate) || Number(emp.rateCard?.[0]?.rate) || 0;
        const unitType = periodInput.unitType || slip.employeeSnapshot?.rateCard?.[0]?.paymentType || 'Units';
        const total = slip.earnings?.totalEarnings || slip.earnings?.basic || (units * rate);
        earnings.push({
          name: `${unitType} Output Pay`,
          rate: total,
          monthly: total,
          arrear: `${units} units × ₹${rate}/unit`
        });
      } else if (compType === 'project_based') {
        const fee = Number(periodInput.projectFee) || slip.earnings?.totalEarnings || slip.earnings?.basic || 0;
        const ref = periodInput.projectRef || periodInput.description || '';
        earnings.push({
          name: `Project Fee${ref ? ` — ${ref}` : ''}`,
          rate: fee,
          monthly: fee,
          arrear: 'Project Deliverable'
        });
      } else if (compType === 'milestone_based') {
        const amt = Number(periodInput.milestoneAmount) || slip.earnings?.totalEarnings || slip.earnings?.basic || 0;
        const ref = periodInput.milestoneRef || '';
        earnings.push({
          name: `Milestone Deliverable${ref ? `: ${ref}` : ''}`,
          rate: amt,
          monthly: amt,
          arrear: 'Milestone Payment'
        });
      } else if (compType === 'retainer') {
        const amt = slip.earnings?.totalEarnings || slip.earnings?.basic || 0;
        earnings.push({
          name: 'Monthly Retainer Fee',
          rate: amt,
          monthly: amt,
          arrear: 'Retainer Contract'
        });
      }

      const variableTxs = (slip.earnings?.variableCompensation || []).map(tx => ({
        name: `${tx.paymentType}${tx.reference ? ` (${tx.reference})` : ''}`,
        rate: tx.rate > 0 ? tx.rate : tx.amount,
        monthly: tx.amount,
        arrear: tx.quantity > 1 ? `${tx.quantity} units` : '-'
      }));
      earnings.push(...variableTxs);

      if (earnings.length === 0 && (slip.earnings?.totalEarnings > 0 || slip.earnings?.basic > 0)) {
        earnings.push({
          name: 'Base Earnings',
          rate: slip.earnings?.totalEarnings || slip.earnings?.basic || 0,
          monthly: slip.earnings?.totalEarnings || slip.earnings?.basic || 0,
          arrear: '-'
        });
      }

      if (slip.earnings?.overtime > 0) {
        earnings.push({
          name: 'Overtime Pay',
          rate: slip.earnings.overtime,
          monthly: slip.earnings.overtime,
          arrear: '-'
        });
      }
    }

    // Deductions list
    let deductions = [];
    if (Array.isArray(slip.deductionsLineItems) && slip.deductionsLineItems.length > 0) {
      deductions = slip.deductionsLineItems.map(item => ({
        name: item.name + (item.details ? ` (${item.details})` : ''),
        amount: item.amount
      }));
    } else {
      deductions = [
        { name: 'PF - Employees', amount: slip.deductions?.pfEmployee || 0 },
        { name: 'ESIC Deduction', amount: slip.deductions?.esiEmployee || 0 },
        { name: 'Prof Tax Deduction', amount: slip.deductions?.professionalTax || 0 },
        { name: 'Income Tax', amount: slip.deductions?.tds || 0 },
        { name: 'Advance Deduction', amount: slip.deductions?.advanceDeduction || 0 },
        { name: 'Insurance Deduction', amount: slip.deductions?.insuranceEmployee || 0 },
        { name: 'Employer PF', amount: slip.employerContributions?.pfEmployer || 0 }
      ];

      if (Array.isArray(slip.deductions?.loanRepayments) && slip.deductions.loanRepayments.length > 0) {
        slip.deductions.loanRepayments.forEach(lr => {
          if (Number(lr.amountApplied) > 0) {
            deductions.push({ name: `Loan (${lr.loanReference || 'Repayment'})`, amount: lr.amountApplied });
          }
        });
      } else if (slip.deductions?.loanDeduction > 0) {
        deductions.push({ name: 'Loan Recovery', amount: slip.deductions.loanDeduction });
      }

      deductions = deductions.filter(d => d.amount > 0);
    }

    // Determine how many rows to render so the table is aligned
    const maxRows = Math.max(earnings.length, deductions.length, 8);
    
    // Total calculation
    const totalEarningRate = earnings.reduce((sum, item) => sum + (Number(item.rate) || 0), 0);
    const totalEarningMonthly = earnings.reduce((sum, item) => sum + (Number(item.monthly) || 0), 0);
    const totalDeductions = deductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    return {
      earnings,
      deductions,
      maxRows,
      totalEarningRate,
      totalEarningMonthly,
      totalDeductions,
      netTakeHome: totalEarningMonthly - totalDeductions
    };
  }, [slip]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 font-sans text-gray-900 space-y-4">
        <Skeleton className="h-12 w-60" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!slip || !tableData) return <div className="container mx-auto p-6 text-red-600">Payslip not available.</div>;

  const company = slip.company || {};
  const companyName = company.companyName || company.name || 'Company';
  const companyLogo = company.logoUrl || '';
  const rawAddress = company.address;
  const companyAddress = typeof rawAddress === 'string'
    ? rawAddress
    : [rawAddress?.line1, rawAddress?.city, rawAddress?.state, rawAddress?.zip].filter(Boolean).join(', ');

  const employee = slip.employee || {};
  const employeeName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || '-';
  const payPeriod = `${slip.period?.monthName ?? '-'} ${slip.period?.year ?? ''}`.trim().toUpperCase();
  const taxRegime = String(employee.taxRegime || slip.employeeSnapshot?.taxRegime || 'new').toUpperCase();

  const currentMonth = slip.period?.month;
  const currentYear = slip.period?.year;
  let startYear = currentYear;
  let endYear = currentYear;
  if (currentMonth !== undefined && currentYear !== undefined) {
    if (currentMonth >= 4) {
      startYear = currentYear;
      endYear = currentYear + 1;
    } else {
      startYear = currentYear - 1;
      endYear = currentYear;
    }
  }

  const worksheet = slip.taxWorksheet || {};
  const compBreakdown = worksheet.componentBreakdown || [];
  const hraCalc = worksheet.hra || {};
  const tdsMonths = worksheet.tdsMonths || {};

  const decl = employee.declarations || slip.employeeSnapshot?.declarations || {};
  const epfVal = decl.epf || 0;
  const ppfVal = decl.ppf || 0;
  const homeLoanVal = decl.homeLoanPrincipal || 0;
  const licVal = decl.lic || 0;
  const elssVal = decl.elss || 0;
  const sec80CVal = decl.section80C || (epfVal + ppfVal + homeLoanVal + licVal + elssVal);
  const sec80CCapped = Math.min(150000, sec80CVal);
  const sec80DVal = decl.section80D || 0;
  const sec80CCDVal = decl.section80CCD1B || 0;
  const sec24bVal = decl.section24b || 0;
  const totalVIA = sec80CCapped + sec80DVal + sec80CCDVal;

  const annualPF = (slip.deductions?.pfEmployee || 0) * 12;
  const annualPT = (slip.deductions?.professionalTax || 0) * 12;
  const annualGross = worksheet.grossSalary || (tableData.totalEarningMonthly * 12);
  const standardDeduction = worksheet.standardDeduction || (taxRegime.includes('NEW') ? 75000 : 50000);
  const chapterVIA = totalVIA > 0 ? totalVIA : (taxRegime.includes('OLD') ? Math.min(150000, annualPF) : 0);
  const taxableIncome = worksheet.taxableIncome !== undefined ? worksheet.taxableIncome : Math.max(0, annualGross - standardDeduction - annualPT - chapterVIA);

  // Dynamic earnings rows for worksheet if compBreakdown is empty
  const worksheetEarnings = (compBreakdown.length > 0)
    ? compBreakdown
    : tableData.earnings.map(e => ({
        name: e.name,
        gross: (Number(e.monthly) || Number(e.rate) || 0) * 12,
        exempt: 0,
        taxable: (Number(e.monthly) || Number(e.rate) || 0) * 12
      }));

  // Format TDS detail list
  const monthsList = [
    { key: 4, name: 'April' },
    { key: 5, name: 'May' },
    { key: 6, name: 'June' },
    { key: 7, name: 'July' },
    { key: 8, name: 'August' },
    { key: 9, name: 'September' },
    { key: 10, name: 'October' },
    { key: 11, name: 'November' },
    { key: 12, name: 'December' },
    { key: 1, name: 'January' },
    { key: 2, name: 'February' },
    { key: 3, name: 'March' }
  ];

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 md:px-8 font-sans text-black print:bg-white print:py-0 print:px-0">
      
      {/* Action Header bar */}
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between print:hidden">
        <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
          <FaChevronLeft size={12} /> Back
        </button>
        <div className="flex gap-3">
          <button onClick={emailPayslip} disabled={emailing} className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-60 cursor-pointer">
            <FaEnvelope /> {emailing ? 'Sending...' : 'Email to Employee'}
          </button>
          <button onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 cursor-pointer">
            <FaDownload /> Download PDF / Print
          </button>
        </div>
      </div>

      {/* Spreadsheet styled Payslip Sheet */}
      <div className="payslip-container mx-auto max-w-4xl bg-white border-2 border-black p-4 sm:p-5 shadow-xs print:shadow-none print:border-2 print:border-black print:p-4 text-black font-sans text-[10px] leading-tight" id="payslip-print-area">
        
        {/* Header: Logo, Company Name & Address */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="w-1/4 flex items-center">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName || 'Company Logo'} className="max-h-14 max-w-[170px] object-contain" />
            ) : (
              <div className="flex items-center gap-1.5 font-bold tracking-tight text-xs text-slate-900">
                <span className="text-blue-600 text-lg font-black leading-none">■</span>
                <span className="font-extrabold text-slate-900">{companyName.split(' ')[0] || 'Company'}</span>
                <span className="text-slate-600 font-semibold">{companyName.split(' ').slice(1, 3).join(' ') || ''}</span>
              </div>
            )}
          </div>
          <div className="w-3/4 text-center pr-6">
            <h1 className="text-sm sm:text-base font-bold tracking-tight uppercase text-black">{companyName}</h1>
            {companyAddress && (
              <p className="text-[10px] font-medium text-black mt-0.5 leading-relaxed">{companyAddress}</p>
            )}
          </div>
        </div>

        {/* Pay Slip Period Subheader */}
        <div className="text-center font-bold uppercase text-[11px] py-1.5 border-b border-black tracking-wide">
          {Boolean(slip.isFullAndFinal || slip.settlementType === 'full_and_final')
            ? `FINAL SETTLEMENT STATEMENT — ${payPeriod}`
            : `PAY SLIP FOR THE MONTH OF ${payPeriod}`}
        </div>

        {/* Compliance & Net Pay Warnings Banner */}
        {Array.isArray(slip.complianceNotes) && slip.complianceNotes.length > 0 && (
          <div className="bg-amber-50 border-b border-black p-1.5 text-[10px] font-semibold text-amber-900 font-sans space-y-0.5">
            {slip.complianceNotes.map((note, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span>⚠️</span> <span>{note}</span>
              </div>
            ))}
          </div>
        )}

        {/* Employee Details 4-Column Box */}
        <div className="grid grid-cols-12 border-b border-black">
          {/* Col 1: Emp. Code, Name, Designation, Department, Cost Centre, DOJ */}
          <div className="col-span-4 border-r border-black p-1.5 space-y-1">
            <div className="flex"><span className="w-24 text-gray-700">Emp. Code</span><span className="font-bold">{employee.employeeId || '-'}</span></div>
            <div className="flex"><span className="w-24 text-gray-700">Name</span><span className="font-bold">{employeeName}</span></div>
            <div className="flex"><span className="w-24 text-gray-700">Designation</span><span className="font-bold">{employee.designation || '-'}</span></div>
            <div className="flex"><span className="w-24 text-gray-700">Department</span><span className="font-bold">{employee.department?.name || '-'}</span></div>
            <div className="flex"><span className="w-24 text-gray-700">Cost Centre</span><span className="font-bold">{employee.costCentre || 'TaaS'}</span></div>
            <div className="flex"><span className="w-24 text-gray-700">DOJ</span><span className="font-bold">{fmtDate(employee.joiningDate)}</span></div>
          </div>

          {/* Col 2: PF UAN No., Month Days, Gender, Payable Days */}
          <div className="col-span-3 border-r border-black p-1.5 space-y-1">
            <div className="flex justify-between"><span className="text-gray-700">PF UAN No.</span><span className="font-bold">{employee.uanNumber || 'NA'}</span></div>
            <div className="flex justify-between mt-6"><span className="text-gray-700">Month Days</span><span className="font-bold">{Number(slip.workingDays || 31).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-700">Gender</span><span className="font-bold">{employee.gender || 'Male'}</span></div>
            <div className="flex justify-between"><span className="text-gray-700">Payable Days</span><span className="font-bold">{Number(slip.paidDays || 31).toFixed(2)}</span></div>
          </div>

          {/* Col 3: Location, Payment, Bank A/c, PAN, PF No., ESI No. */}
          <div className="col-span-3 border-r border-black p-1.5 space-y-1">
            <div className="flex justify-between"><span className="text-gray-700">Location</span><span className="font-bold">{employee.location || 'Office'}</span></div>
            <div className="flex justify-between"><span className="text-gray-700">Payment</span><span className="font-bold">{slip.paymentMethod || 'Bank Transfer'}</span></div>
            <div className="flex justify-between"><span className="text-gray-700">Bank A/c</span><span className="font-bold">{employee.bankDetails?.accountNumber || '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-700">PAN</span><span className="font-bold">{employee.panNumber || '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-700">PF No.</span><span className="font-bold">{employee.pfNumber || employee.pfNo || 'NA'}</span></div>
            <div className="flex justify-between"><span className="text-gray-700">ESI No.</span><span className="font-bold">{employee.esiNumber || 'NA'}</span></div>
          </div>

          {/* Col 4: Tax Regime */}
          <div className="col-span-2 p-1.5 flex items-start justify-center">
            <span className="font-bold text-[9px] uppercase tracking-wide border border-black px-1.5 py-0.5">
              {taxRegime.includes('OLD') ? 'OLD TAX REGIME' : 'NEW TAX REGIME'}
            </span>
          </div>
        </div>

        {/* Earnings & Deductions Section Header */}
        <div className="grid grid-cols-12 border-b border-black text-center font-bold">
          <div className="col-span-7 border-r border-black py-0.5">Earnings</div>
          <div className="col-span-5 py-0.5">Deductions</div>
        </div>

        {/* Column Titles */}
        <div className="grid grid-cols-12 border-b border-black font-bold text-center">
          <div className="col-span-2 border-r border-black py-0.5 text-left px-1.5">Description</div>
          <div className="col-span-1 border-r border-black py-0.5 text-right px-1">Rate</div>
          <div className="col-span-1 border-r border-black py-0.5 text-right px-1">Monthly</div>
          <div className="col-span-1 border-r border-black py-0.5 text-center px-1">Arrear</div>
          <div className="col-span-2 border-r border-black py-0.5 text-right px-1.5 leading-tight text-[8px] sm:text-[9px] flex items-center justify-end">
            Total Earning (Monthly)
          </div>
          <div className="col-span-3 border-r border-black py-0.5 text-left px-1.5">Description</div>
          <div className="col-span-2 py-0.5 text-right px-1.5">Amount</div>
        </div>

        {/* Table Rows (Aligned Line by Line) */}
        <div className="border-b border-black divide-y divide-black">
          {Array.from({ length: Math.max(tableData.earnings.length, tableData.deductions.length, 3) }).map((_, idx) => {
            const earn = tableData.earnings[idx] || null;
            const ded = tableData.deductions[idx] || null;

            return (
              <div key={idx} className="grid grid-cols-12 py-0.5 items-center">
                {/* Earnings Cells */}
                <div className="col-span-2 border-r border-black text-left px-1.5 font-medium">{earn?.name || ''}</div>
                <div className="col-span-1 border-r border-black text-right px-1">{earn ? fmtVal(earn.rate) : ''}</div>
                <div className="col-span-1 border-r border-black text-right px-1">{earn ? fmtVal(earn.monthly) : ''}</div>
                <div className="col-span-1 border-r border-black text-center">{earn?.arrear || ''}</div>
                <div className="col-span-2 border-r border-black text-right px-1.5 font-semibold">{earn ? fmtVal(earn.total || earn.monthly) : ''}</div>

                {/* Deductions Cells */}
                <div className="col-span-3 border-r border-black text-left px-1.5 font-medium">{ded?.name || ''}</div>
                <div className="col-span-2 text-right px-1.5 font-semibold">{ded ? fmtVal(ded.amount) : ''}</div>
              </div>
            );
          })}
        </div>

        {/* CTC / Totals Row */}
        <div className="grid grid-cols-12 border-b border-black font-bold py-1 bg-gray-50 items-center">
          <div className="col-span-2 border-r border-black text-left px-1.5">CTC</div>
          <div className="col-span-1 border-r border-black text-right px-1">{fmtVal(tableData.totalEarningMonthly)}</div>
          <div className="col-span-1 border-r border-black text-right px-1">{fmtVal(tableData.totalEarningMonthly)}</div>
          <div className="col-span-1 border-r border-black text-center">-</div>
          <div className="col-span-2 border-r border-black text-right px-1.5 font-black">{fmtVal(tableData.totalEarningMonthly)}</div>
          <div className="col-span-3 border-r border-black text-left px-1.5">Total Deduction</div>
          <div className="col-span-2 text-right px-1.5 font-black">{fmtVal(tableData.totalDeductions)}</div>
        </div>

        {/* Net Take Home Bar */}
        <div className="flex justify-between items-center font-bold border-b border-black px-4 py-1.5 bg-white">
          <span className="uppercase tracking-wider">NET TAKE HOME FOR THE MONTH</span>
          <span className="text-xs font-black">{fmtVal(tableData.netTakeHome)}</span>
        </div>

        {/* ----------------- INCOME TAX WORKSHEET (DARK BLUE BAR) ----------------- */}
        <div className="border-b border-black text-center font-bold py-1 bg-[#0f2d59] text-white uppercase tracking-wider text-[10px]">
          Income Tax Worksheet for the period April {startYear} - March {endYear}
        </div>

        {/* 3-Section Tax Grid */}
        <div className="grid grid-cols-12 border-b border-black text-[9px] leading-tight">
          
          {/* Section 1: Income Breakdown & Deductions Table (Col 1 to 5) */}
          <div className="col-span-5 border-r border-black">
            <div className="grid grid-cols-12 border-b border-black font-bold text-center bg-gray-50 py-0.5">
              <div className="col-span-5 border-r border-black text-left px-1">Description</div>
              <div className="col-span-2 border-r border-black text-right px-1">Gross</div>
              <div className="col-span-2 border-r border-black text-center">Exempt</div>
              <div className="col-span-3 text-right px-1">Taxable</div>
            </div>
            <div className="divide-y divide-gray-200">
              {worksheetEarnings.map((row, i) => (
                <div key={i} className="grid grid-cols-12 py-0.5">
                  <div className="col-span-5 border-r border-black px-1 font-medium">{row.name}</div>
                  <div className="col-span-2 border-r border-black text-right px-1">{fmtVal(row.gross)}</div>
                  <div className="col-span-2 border-r border-black text-center text-gray-500">{row.exempt ? fmtVal(row.exempt) : '-'}</div>
                  <div className="col-span-3 text-right px-1">{fmtVal(row.taxable)}</div>
                </div>
              ))}
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-5 border-r border-black px-1">Other</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-3 text-center">-</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-5 border-r border-black px-1">Bonus</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-3 text-center">-</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-5 border-r border-black px-1">Arrear</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-2 border-r border-black text-center">-</div><div className="col-span-3 text-center">-</div></div>
              <div className="grid grid-cols-12 py-0.5 border-t border-black font-bold bg-gray-50">
                <div className="col-span-5 border-r border-black px-1">Gross Salary</div>
                <div className="col-span-2 border-r border-black text-right px-1">{fmtVal(annualGross)}</div>
                <div className="col-span-2 border-r border-black text-center">-</div>
                <div className="col-span-3 text-right px-1 font-bold">{fmtVal(annualGross)}</div>
              </div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Deduction - Income from House Property (Intt)</div><div className="col-span-3 text-center">-</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1 font-medium">Standard Deduction</div><div className="col-span-3 text-right px-1">{fmtVal(standardDeduction)}</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Previous Employer Professional Tax</div><div className="col-span-3 text-center">-</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Professional Tax</div><div className="col-span-3 text-right px-1">{fmtVal(annualPT)}</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Under Chapter VI-A</div><div className="col-span-3 text-right px-1">{fmtVal(chapterVIA)}</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Any Other Income</div><div className="col-span-3 text-center">-</div></div>
              <div className="grid grid-cols-12 py-0.5 font-bold bg-gray-50 border-t border-black"><div className="col-span-9 border-r border-black px-1">Taxable Income</div><div className="col-span-3 text-right px-1">{fmtVal(taxableIncome)}</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Total Tax</div><div className="col-span-3 text-center">{worksheet.totalTax ? fmtVal(worksheet.totalTax) : '-'}</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax Rebate</div><div className="col-span-3 text-center">-</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Surcharge</div><div className="col-span-3 text-center">-</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax Due</div><div className="col-span-3 text-center">-</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Educational Cess</div><div className="col-span-3 text-right px-1">{worksheet.cess ? fmtVal(worksheet.cess) : '-'}</div></div>
              <div className="grid grid-cols-12 py-0.5 font-bold"><div className="col-span-9 border-r border-black px-1">Net Tax</div><div className="col-span-3 text-center">{worksheet.netTax ? fmtVal(worksheet.netTax) : '-'}</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax deducted (Previous Employer)</div><div className="col-span-3 text-center">-</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax Deducted Till date</div><div className="col-span-3 text-center">{worksheet.taxDeductedTillDate ? fmtVal(worksheet.taxDeductedTillDate) : '-'}</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax to be Deducted</div><div className="col-span-3 text-center">{worksheet.taxToDeducted ? fmtVal(worksheet.taxToDeducted) : '-'}</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax/ Month</div><div className="col-span-3 text-right px-1">-</div></div>
              <div className="grid grid-cols-12 py-0.5"><div className="col-span-9 border-r border-black px-1">Tax on Non-Recurring Earnings</div><div className="col-span-3 text-center">-</div></div>
              <div className="grid grid-cols-12 py-0.5 font-bold"><div className="col-span-9 border-r border-black px-1">Tax Deduction for this month</div><div className="col-span-3 text-right px-1 text-amber-900">{worksheet.taxDeductionThisMonth ? fmtVal(worksheet.taxDeductionThisMonth) : '-'}</div></div>
            </div>
          </div>

          {/* Section 2: Deduction Under Chapter VI-A (Col 6 to 9) */}
          <div className="col-span-4 border-r border-black flex flex-col justify-between">
            <div>
              <div className="border-b border-black font-bold text-center py-0.5 bg-gray-50">
                Deduction Under Chapter VI-A
              </div>
              <div className="border-b border-black font-bold px-1.5 py-0.5 bg-gray-100">
                Investments u/s 80C
              </div>
              <div className="divide-y divide-gray-200">
                <div className="flex justify-between px-1.5 py-0.5"><span>Provident Fund</span><span>{fmtVal(epfVal || annualPF, false) || '0.00'}</span></div>
                <div className="flex justify-between px-1.5 py-0.5"><span>Public Provident Fund</span><span>{fmtVal(ppfVal)}</span></div>
                <div className="flex justify-between px-1.5 py-0.5"><span>Principal - Housing Loan</span><span>{fmtVal(homeLoanVal)}</span></div>
                <div className="flex justify-between px-1.5 py-0.5"><span>Life Insurance Premium</span><span>{fmtVal(licVal)}</span></div>
                <div className="flex justify-between px-1.5 py-0.5"><span>Mutual Fund</span><span>{fmtVal(elssVal)}</span></div>
                <div className="flex justify-between px-1.5 py-0.5"><span>Atal Pension Yojna</span><span>-</span></div>
                <div className="flex justify-between px-1.5 py-0.5 font-bold border-t border-black bg-gray-50"><span>Total of Investment u/s 80C</span><span>{fmtVal(sec80CVal || annualPF, false) || '0.00'}</span></div>
              </div>

              <div className="border-t border-black divide-y divide-gray-200">
                <div className="flex justify-between px-1.5 py-0.5"><span>U/S 80C</span><span>{fmtVal(sec80CCapped || annualPF)}</span></div>
                <div className="flex justify-between px-1.5 py-0.5"><span>U/S 80D</span><span>{fmtVal(sec80DVal)}</span></div>
                <div className="flex justify-between px-1.5 py-0.5"><span>U/S 80CCD</span><span>{fmtVal(sec80CCDVal)}</span></div>
                <div className="flex justify-between px-1.5 py-0.5"><span>U/S 80 G</span><span>-</span></div>
              </div>
            </div>

            <div className="border-t border-black divide-y divide-gray-200 bg-gray-50">
              <div className="flex justify-between px-1.5 py-0.5 font-bold"><span>Total of Ded Under Chapter</span><span>{fmtVal(totalVIA || annualPF)}</span></div>
              <div className="flex justify-between px-1.5 py-0.5"><span>Interest on Housing Loan</span><span>{fmtVal(sec24bVal)}</span></div>
              <div className="flex justify-between px-1.5 py-0.5"><span>Max Allowed</span><span>-</span></div>
            </div>
          </div>

          {/* Section 3: Tax Deducted Details & Leave Balance (Col 10 to 12) */}
          <div className="col-span-3 flex flex-col justify-between">
            <div>
              <div className="border-b border-black font-bold text-center py-0.5 bg-gray-50">
                Tax Deducted Details
              </div>
              <div className="grid grid-cols-12 border-b border-black font-bold px-1.5 py-0.5 bg-gray-100 text-center">
                <div className="col-span-6 text-left">Month</div>
                <div className="col-span-6 text-right">Amount</div>
              </div>
              <div className="divide-y divide-gray-200">
                {monthsList.map((m, i) => (
                  <div key={i} className="grid grid-cols-12 px-1.5 py-0.5">
                    <div className="col-span-6 text-left">{m.name}</div>
                    <div className="col-span-6 text-right font-medium">{fmtVal(tdsMonths[m.key] || 0)}</div>
                  </div>
                ))}
                <div className="grid grid-cols-12 px-1.5 py-0.5 font-bold border-t border-black bg-gray-50">
                  <div className="col-span-6 text-left">Total</div>
                  <div className="col-span-6 text-right">{fmtVal(Object.values(tdsMonths).reduce((a, b) => a + (Number(b) || 0), 0))}</div>
                </div>
              </div>
            </div>

            <div className="border-t border-black p-1.5 bg-gray-50">
              <div className="flex justify-between font-bold text-[9px]">
                <span>LEAVE BALANCE AS ON MONTH END</span>
                <span>{Number(slip.leaveBalance || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* HRA Calculation Table */}
        <div className="border-b border-black">
          <div className="font-bold px-1.5 py-0.5 bg-gray-100 border-b border-black">
            HRA Calculation
          </div>
          <div className="grid grid-cols-12 text-center font-bold border-b border-black text-[9px] py-0.5 bg-gray-50">
            <div className="col-span-1 border-r border-black">From</div>
            <div className="col-span-1 border-r border-black">To</div>
            <div className="col-span-2 border-r border-black">Rent Paid</div>
            <div className="col-span-2 border-r border-black">Actual HRA</div>
            <div className="col-span-2 border-r border-black">40/50% of Basic</div>
            <div className="col-span-2 border-r border-black">Rent - 10% of Basic</div>
            <div className="col-span-2">Exempt HRA</div>
          </div>
          <div className="grid grid-cols-12 text-center text-[9px] py-0.5 border-b border-black">
            <div className="col-span-1 border-r border-black">April</div>
            <div className="col-span-1 border-r border-black">March</div>
            <div className="col-span-2 border-r border-black">{fmtVal(hraCalc.rentPaid)}</div>
            <div className="col-span-2 border-r border-black">{fmtVal(hraCalc.actualHRA || ((worksheetEarnings.find(e => e.name.toLowerCase().includes('hra'))?.gross) || 0))}</div>
            <div className="col-span-2 border-r border-black">{fmtVal(hraCalc.basicPercent || (((worksheetEarnings.find(e => e.name.toLowerCase().includes('basic'))?.gross) || 0) * 0.4))}</div>
            <div className="col-span-2 border-r border-black">{fmtVal(hraCalc.rentMinusBasic10)}</div>
            <div className="col-span-2 font-bold bg-gray-50">{fmtVal(hraCalc.exemptHRA || ((worksheetEarnings.find(e => e.name.toLowerCase().includes('hra'))?.gross) || 0))}</div>
          </div>
          <div className="grid grid-cols-12 text-center text-[9px] py-0.5 font-bold bg-gray-50">
            <div className="col-span-2 border-r border-black text-center font-bold">Total</div>
            <div className="col-span-10 text-center">-</div>
          </div>
        </div>

        {/* Computer Generated Footer Banner */}
        <div className="bg-[#0f2d59] text-white text-center font-bold text-[9px] py-1 mt-1 tracking-wider uppercase">
          THIS IS COMPUTER GENERATED PAY SLIP - SIGNATURE NOT REQUIRED.
        </div>

      </div>
    </div>
  );
};

export default PayslipGeneration;
