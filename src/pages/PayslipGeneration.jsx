import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaDownload, FaEnvelope, FaChevronLeft } from 'react-icons/fa';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';

const fmtMoney = (value) => {
  if (value === undefined || value === null || value === '-') return '-';
  const num = Number(value);
  if (isNaN(num)) return '-';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
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

  const downloadPdf = () => {
    const styleNode = document.createElement('style');
    styleNode.innerHTML = `
      @page { 
        size: A4 portrait; 
        margin: 0.5cm; 
      }
      @media print {
        .print-hide { display: none !important; }
        body { 
          background: white !important; 
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .payslip-container {
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
        }
      }
    `;
    document.head.appendChild(styleNode);

    const cleanup = () => {
      styleNode.remove();
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    window.print();
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
    const earnings = [
      {
        name: 'Basic',
        rate: structure.basic || 0,
        monthly: slip.earnings?.basic || 0,
        arrear: '-'
      },
      {
        name: 'HRA',
        rate: structure.hra || 0,
        monthly: slip.earnings?.hra || 0,
        arrear: '-'
      },
      {
        name: 'Special All',
        rate: structure.specialAllowance || 0,
        monthly: slip.earnings?.specialAllowance || slip.earnings?.special || 0,
        arrear: '-'
      },
      {
        name: 'Meal',
        rate: emp.mealAllowance || emp.meal || 0,
        monthly: slip.earnings?.mealAllowance || slip.earnings?.meal || 0,
        arrear: '-'
      },
      {
        name: 'Broadband',
        rate: emp.broadband || 0,
        monthly: slip.earnings?.broadband || 0,
        arrear: '-'
      },
      {
        name: 'Insurance',
        rate: emp.insuranceAmount || 0,
        monthly: slip.earnings?.insuranceAmount || 0,
        arrear: '-'
      },
      {
        name: 'Employer PF',
        rate: slip.employerContributions?.pfEmployer || 0,
        monthly: slip.employerContributions?.pfEmployer || 0,
        arrear: '-'
      }
    ].filter(e => e.rate > 0 || e.monthly > 0);

    // Deductions list
    const deductions = [
      { name: 'PF - Employees', amount: slip.deductions?.pfEmployee || 0 },
      { name: 'ESIC Deduction', amount: slip.deductions?.esiEmployee || 0 },
      { name: 'Prof Tax Deduction', amount: slip.deductions?.professionalTax || 0 },
      { name: 'Income Tax', amount: slip.deductions?.tds || 0 },
      { name: 'Advance Deduction', amount: slip.deductions?.advanceDeduction || 0 },
      { name: 'Insurance Deduction', amount: slip.deductions?.insuranceEmployee || 0 },
      { name: 'Employer PF', amount: slip.employerContributions?.pfEmployer || 0 }
    ].filter(d => d.amount > 0);

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
  const employee = slip.employee || {};
  const employeeName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || '-';
  const payPeriod = `${slip.period?.monthName ?? '-'} ${slip.period?.year ?? ''}`.trim().toUpperCase();

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
    <div className="min-h-screen bg-slate-100 py-6 px-4 md:px-8 font-serif text-gray-900 print:bg-white print:py-0 print:px-0">
      
      {/* Action Header bar */}
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between print-hide">
        <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <FaChevronLeft size={12} /> Back
        </button>
        <div className="flex gap-3">
          <button onClick={emailPayslip} disabled={emailing} className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
            <FaEnvelope /> {emailing ? 'Sending...' : 'Email to Employee'}
          </button>
          <button onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
            <FaDownload /> Download PDF / Print
          </button>
        </div>
      </div>

      {/* Spreadsheet styled Payslip Sheet */}
      <div className="payslip-container mx-auto max-w-4xl bg-white border border-gray-400 p-8 shadow-sm print:shadow-none print:border-none print:p-0">
        
        {/* Table wrapper for perfect Excel layout borders */}
        <div className="border border-black text-[11px] leading-relaxed">
          
          {/* Company header block */}
          <div className="flex items-center justify-between border-b border-black p-4">
            <div className="flex items-center gap-3">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt="logo" className="h-10 object-contain max-w-[120px]" />
              ) : (
                <span className="font-bold text-base tracking-wide text-gray-800">ResourceGateway</span>
              )}
            </div>
            <div className="text-center flex-1 pr-10">
              <h1 className="text-sm font-bold uppercase tracking-tight">{company.companyName || 'Resource Gateway Consulting Private Limited'}</h1>
              <p className="text-[10px] text-gray-700 mt-0.5">{company.address?.line1 || 'C - 5/25, First Floor, Sector- 52'}, {company.address?.city || 'Gurgaon'}, {company.address?.state || 'Haryana'}</p>
              <h2 className="text-xs font-bold mt-2 tracking-wide">PAY SLIP FOR THE MONTH OF {payPeriod}</h2>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-800 whitespace-nowrap self-start">
              {employee.taxRegime === 'old' ? 'OLD TAX REGIME' : 'NEW TAX REGIME'}
            </div>
          </div>

          {/* Employee Info Grid */}
          <div className="grid grid-cols-3 border-b border-black">
            {/* Column 1 */}
            <div className="border-r border-black p-2 space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-600">Emp. Code</span> <span className="font-bold text-right">{employee.employeeId || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Name</span> <span className="font-bold text-right">{employeeName}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Designation</span> <span className="font-bold text-right">{employee.designation || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Department</span> <span className="font-bold text-right">{employee.department?.name || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Cost Centre</span> <span className="font-bold text-right">TaaS</span></div>
              <div className="flex justify-between"><span className="text-gray-600">DOJ</span> <span className="font-bold text-right">{fmtDate(employee.joiningDate)}</span></div>
            </div>
            
            {/* Column 2 */}
            <div className="border-r border-black p-2 space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-600">PF UAN No.</span> <span className="font-bold text-right">{employee.uanNumber || 'NA'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Location</span> <span className="font-bold text-right">{employee.location || 'Gurgaon'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Payment</span> <span className="font-bold text-right">{slip.paymentMethod || 'Bank Transfer'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Bank A/c</span> <span className="font-bold text-right">{employee.bankDetails?.accountNumber || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">PAN</span> <span className="font-bold text-right">{employee.panNumber || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Gender</span> <span className="font-bold text-right">{employee.gender || '-'}</span></div>
            </div>

            {/* Column 3 */}
            <div className="p-2 space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-600">Month Days</span> <span className="font-bold text-right">{Number(slip.workingDays || 30).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Payable Days</span> <span className="font-bold text-right">{Number(slip.paidDays || 30).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">PF No.</span> <span className="font-bold text-right">{employee.pfNumber || employee.pfNo || 'NA'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">ESI No.</span> <span className="font-bold text-right">{employee.esiNumber || 'NA'}</span></div>
            </div>
          </div>

          {/* Earnings / Deductions Subheader */}
          <div className="grid grid-cols-7 border-b border-black text-center font-bold bg-gray-50">
            <div className="col-span-5 border-r border-black py-1">Earnings</div>
            <div className="col-span-2 py-1">Deductions</div>
          </div>

          {/* Table Headers */}
          <div className="grid grid-cols-7 border-b border-black font-bold text-center bg-gray-100">
            <div className="col-span-2 border-r border-black py-1 text-left px-2">Description</div>
            <div className="border-r border-black py-1">Rate</div>
            <div className="border-r border-black py-1">Monthly</div>
            <div className="border-r border-black py-1">Arrear</div>
            <div className="border-r border-black py-1 text-left px-2">Description</div>
            <div className="py-1 text-right px-2">Amount</div>
          </div>

          {/* Table Rows */}
          <div className="border-b border-black divide-y divide-gray-200">
            {Array.from({ length: tableData.maxRows }).map((_, idx) => {
              const earn = tableData.earnings[idx] || null;
              const ded = tableData.deductions[idx] || null;

              return (
                <div key={idx} className="grid grid-cols-7 text-center">
                  {/* Earnings cell */}
                  <div className="col-span-2 border-r border-black py-1 text-left px-2 font-semibold">
                    {earn ? earn.name : ''}
                  </div>
                  <div className="border-r border-black py-1 text-right px-2">
                    {earn ? fmtMoney(earn.rate) : ''}
                  </div>
                  <div className="border-r border-black py-1 text-right px-2">
                    {earn ? fmtMoney(earn.monthly) : ''}
                  </div>
                  <div className="border-r border-black py-1 text-right px-2 text-gray-500">
                    {earn ? earn.arrear : ''}
                  </div>

                  {/* Deductions cell */}
                  <div className="border-r border-black py-1 text-left px-2">
                    {ded ? ded.name : ''}
                  </div>
                  <div className="py-1 text-right px-2 font-semibold">
                    {ded ? fmtMoney(ded.amount) : ''}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals Row */}
          <div className="grid grid-cols-7 border-b border-black font-bold bg-gray-50 text-center">
            <div className="col-span-2 border-r border-black py-1.5 text-left px-2">CTC</div>
            <div className="border-r border-black py-1.5 text-right px-2">{fmtMoney(tableData.totalEarningRate)}</div>
            <div className="border-r border-black py-1.5 text-right px-2">{fmtMoney(tableData.totalEarningMonthly)}</div>
            <div className="border-r border-black py-1.5 text-right px-2">-</div>
            <div className="border-r border-black py-1.5 text-left px-2">Total Deduction</div>
            <div className="py-1.5 text-right px-2">{fmtMoney(tableData.totalDeductions)}</div>
          </div>

          {/* Net Take Home Bar */}
          <div className="flex justify-between font-bold border-b border-black px-4 py-2 bg-gray-100">
            <span>NET TAKE HOME FOR THE MONTH</span>
            <span className="text-sm">{fmtMoney(tableData.netTakeHome)}</span>
          </div>

          {/* ----------------- TAX WORKSHEET SECTION ----------------- */}
          <div className="border-b border-black text-center font-bold py-1 bg-gray-800 text-white uppercase tracking-wider">
            Income Tax Worksheet for the period April {startYear} - March {endYear}
          </div>

          <div className="grid grid-cols-5 border-b border-black">
            {/* Columns 1-2: Gross breakdown & Tax Calcs */}
            <div className="col-span-2 border-r border-black">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-black font-bold text-center">
                    <th className="py-1 text-left px-2 border-r border-black">Description</th>
                    <th className="py-1 text-right px-2 border-r border-black">Gross</th>
                    <th className="py-1 text-right px-2 border-r border-black">Exempt</th>
                    <th className="py-1 text-right px-2">Taxable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {compBreakdown.map((row, i) => (
                    <tr key={i}>
                      <td className="py-0.5 px-2 border-r border-black font-medium">{row.name}</td>
                      <td className="py-0.5 px-2 border-r border-black text-right">{fmtMoney(row.gross)}</td>
                      <td className="py-0.5 px-2 border-r border-black text-right text-gray-500">{row.exempt ? fmtMoney(row.exempt) : '-'}</td>
                      <td className="py-0.5 px-2 text-right">{fmtMoney(row.taxable)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-t border-black font-bold">
                    <td className="py-1 px-2 border-r border-black">Gross Salary</td>
                    <td className="py-1 px-2 border-r border-black text-right">{fmtMoney(worksheet.grossSalary)}</td>
                    <td className="py-1 px-2 border-r border-black text-right">-</td>
                    <td className="py-1 px-2 text-right">{fmtMoney(worksheet.grossSalary)}</td>
                  </tr>
                  {/* Deductions and standard tax calculations list */}
                  <tr className="divide-x divide-gray-200">
                    <td colSpan="3" className="py-0.5 px-2 border-r border-black">Standard Deduction</td>
                    <td className="py-0.5 px-2 text-right font-medium">{fmtMoney(worksheet.standardDeduction)}</td>
                  </tr>
                  <tr className="divide-x divide-gray-200">
                    <td colSpan="3" className="py-0.5 px-2 border-r border-black">Taxable Income</td>
                    <td className="py-0.5 px-2 text-right font-bold bg-gray-50">{fmtMoney(worksheet.taxableIncome)}</td>
                  </tr>
                  <tr className="divide-x divide-gray-200">
                    <td colSpan="3" className="py-0.5 px-2 border-r border-black">Total Tax</td>
                    <td className="py-0.5 px-2 text-right font-medium">{fmtMoney(worksheet.totalTax)}</td>
                  </tr>
                  <tr className="divide-x divide-gray-200">
                    <td colSpan="3" className="py-0.5 px-2 border-r border-black">Educational Cess (4%)</td>
                    <td className="py-0.5 px-2 text-right font-medium">{fmtMoney(worksheet.cess)}</td>
                  </tr>
                  <tr className="divide-x divide-gray-200 font-bold bg-gray-100">
                    <td colSpan="3" className="py-1 px-2 border-r border-black">Net Tax</td>
                    <td className="py-1 px-2 text-right">{fmtMoney(worksheet.netTax)}</td>
                  </tr>
                  <tr className="divide-x divide-gray-200">
                    <td colSpan="3" className="py-0.5 px-2 border-r border-black">Tax Deducted Till Date</td>
                    <td className="py-0.5 px-2 text-right font-medium">{fmtMoney(worksheet.taxDeductedTillDate)}</td>
                  </tr>
                  <tr className="divide-x divide-gray-200">
                    <td colSpan="3" className="py-0.5 px-2 border-r border-black">Tax to be Deducted</td>
                    <td className="py-0.5 px-2 text-right font-medium">{fmtMoney(worksheet.taxToDeducted)}</td>
                  </tr>
                  <tr className="divide-x divide-gray-200 font-bold bg-amber-50">
                    <td colSpan="3" className="py-1 px-2 border-r border-black">Tax Deduction this Month</td>
                    <td className="py-1 px-2 text-right text-amber-950">{fmtMoney(worksheet.taxDeductionThisMonth)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Column 3-4: Deduction Under Chapter VI-A & 80C */}
            <div className="col-span-2 border-r border-black text-[10px]">
              <div className="bg-gray-100 border-b border-black font-bold py-1 px-2 text-center">
                Deduction Under Chapter VI-A
              </div>
              <div className="p-2 space-y-1">
                <div className="flex justify-between font-bold border-b border-gray-100 pb-0.5">
                  <span>Investments u/s 80C</span>
                  <span>Amount</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Provident Fund (EPF)</span>
                  <span>{fmtMoney(employee.declarations?.epf || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Public Provident Fund (PPF)</span>
                  <span>{fmtMoney(employee.declarations?.ppf || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Principal - Housing Loan</span>
                  <span>{fmtMoney(employee.declarations?.homeLoanPrincipal || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Life Insurance Premium</span>
                  <span>{fmtMoney(employee.declarations?.lic || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>ELSS Mutual Funds</span>
                  <span>{fmtMoney(employee.declarations?.elss || 0)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-100 pt-1">
                  <span>Total of Investment u/s 80C</span>
                  <span>{fmtMoney(employee.declarations?.section80C || 0)}</span>
                </div>
              </div>

              {/* Other chapter VI-A sections */}
              <div className="border-t border-black p-2 space-y-1">
                <div className="flex justify-between font-bold pb-0.5 border-b border-gray-100">
                  <span>Section Details</span>
                  <span>Value</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>U/S 80C (Capped)</span>
                  <span>{fmtMoney(Math.min(150000, employee.declarations?.section80C || 0))}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>U/S 80D (Medical)</span>
                  <span>{fmtMoney(employee.declarations?.section80D || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>U/S 80CCD (NPS)</span>
                  <span>{fmtMoney(employee.declarations?.section80CCD1B || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Interest on Housing Loan u/s 24b</span>
                  <span>{fmtMoney(employee.declarations?.section24b || 0)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-100 pt-1">
                  <span>Total Deductions Chapter VI-A</span>
                  <span>{fmtMoney(
                    Math.min(150000, employee.declarations?.section80C || 0) + 
                    (employee.declarations?.section80D || 0) + 
                    (employee.declarations?.section80CCD1B || 0)
                  )}</span>
                </div>
              </div>
            </div>

            {/* Column 5: Month-wise TDS Detail */}
            <div className="col-span-1 text-[10px] flex flex-col justify-between">
              <div>
                <div className="bg-gray-100 border-b border-black font-bold py-1 px-2 text-center">
                  Tax Deducted Details
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-[9px] font-bold text-gray-700">
                      <th className="py-0.5 px-2 text-left">Month</th>
                      <th className="py-0.5 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthsList.map((m, idx) => (
                      <tr key={idx}>
                        <td className="py-0.5 px-2 text-gray-600">{m.name}</td>
                        <td className="py-0.5 px-2 text-right font-medium">{fmtMoney(tdsMonths[m.key] || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-black p-2 bg-gray-50">
                <div className="flex justify-between font-bold text-[9px]">
                  <span>LEAVE BALANCE ON MONTH END</span>
                  <span>0.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* HRA Calculation Row */}
          <div className="border-b border-black text-center font-bold py-1 bg-gray-800 text-white uppercase tracking-wider">
            HRA Calculation
          </div>
          <table className="w-full text-[10px] text-center border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-black font-bold">
                <th className="py-1 px-2 border-r border-black">From</th>
                <th className="py-1 px-2 border-r border-black">To</th>
                <th className="py-1 px-2 border-r border-black">Rent Paid</th>
                <th className="py-1 px-2 border-r border-black">Actual HRA</th>
                <th className="py-1 px-2 border-r border-black">40/50% of Basic</th>
                <th className="py-1 px-2 border-r border-black">Rent - 10% of Basic</th>
                <th className="py-1 px-2">Exempt HRA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 px-2 border-r border-black">April</td>
                <td className="py-1 px-2 border-r border-black">March</td>
                <td className="py-1 px-2 border-r border-black">{fmtMoney(hraCalc.rentPaid)}</td>
                <td className="py-1 px-2 border-r border-black">{fmtMoney(hraCalc.actualHRA)}</td>
                <td className="py-1 px-2 border-r border-black">{fmtMoney(hraCalc.basicPercent)}</td>
                <td className="py-1 px-2 border-r border-black">{fmtMoney(hraCalc.rentMinusBasic10)}</td>
                <td className="py-1 px-2 font-bold bg-gray-50">{fmtMoney(hraCalc.exemptHRA)}</td>
              </tr>
            </tbody>
          </table>

        </div>

        {/* Footer generator message */}
        <p className="text-center text-[10px] text-gray-500 font-sans tracking-wide mt-6">
          THIS IS COMPUTER GENERATED PAY SLIP - SIGNATURE NOT REQUIRED.
        </p>

      </div>
    </div>
  );
};

export default PayslipGeneration;
