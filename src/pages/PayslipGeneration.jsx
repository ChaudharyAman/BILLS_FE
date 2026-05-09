import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { FaDownload } from 'react-icons/fa';

const fmtMoney = (value) => `Rs. ${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const titleCase = (value) => String(value || '-').replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const PayslipGeneration = () => {
  const { id } = useParams();
  const printRef = useRef(null);
  const [slip, setSlip] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    api.get(`/payroll/${id}/generate-payslip`, { signal: controller.signal })
      .then((res) => setSlip(res.data.payslip))
      .catch((fetchError) => {
        if (fetchError.name === 'CanceledError' || fetchError.name === 'AbortError') return;
        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Failed to load payslip');
      });

    return () => controller.abort();
  }, [id]);

  const downloadPdf = () => {
    window.print();
  };

  if (error) return <div className="container mx-auto p-6 text-red-600">{error}</div>;
  if (!slip) return <div className="container mx-auto p-6 text-gray-500">Loading payslip...</div>;

  const earnings = slip.earnings || {};
  const deductions = slip.deductions || {};
  const company = slip.company || {};
  const employeeName = `${slip?.employee?.firstName ?? ''} ${slip?.employee?.lastName ?? ''}`.trim() || '-';
  const payPeriod = `${slip?.period?.monthName ?? '-'} ${slip?.period?.year ?? ''}`.trim();
  const paidDays = Number(slip.presentDays) + Number(slip.paidLeaves || 0);
  const lopDays = Math.max(Number(slip.unpaidLeaves || 0), Number(slip.workingDays || 0) - paidDays);
  const initials = employeeName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'NA';
  const totalGross = Number(earnings.totalEarnings) || 0;
  const totalDeductions = Number(deductions.totalDeductions) || 0;
  const netSalary = Number(slip.netSalary) || 0;
  const earningsRows = [
    ['Basic Salary', earnings.basic],
    ['House Rent Allowance', earnings.hra],
    ['Conveyance Allowance', earnings.conveyance],
    ['Medical Allowance', earnings.medicalAllowance],
    ['Special Allowance', earnings.specialAllowance],
    ['Overtime', earnings.overtime],
    ['Bonus', earnings.bonus],
    ['Incentives', earnings.incentives],
    ...(earnings.otherEarnings || []).map((item) => [item.name, item.amount]),
  ].filter(([, amount]) => Number(amount) > 0);
  const deductionRows = [
    ['Provident Fund', deductions.pf],
    ['ESI', deductions.esi],
    ['Professional Tax', deductions.professionalTax],
    ['TDS', deductions.tds],
    ['Loan Deduction', deductions.loanDeduction],
    ['Advance Deduction', deductions.advanceDeduction],
    ...(deductions.otherDeductions || []).map((item) => [item.name, item.amount]),
  ].filter(([, amount]) => Number(amount) > 0);
  const rowCount = Math.max(earningsRows.length, deductionRows.length, 6);
  const amountRows = Array.from({ length: rowCount }, (_, index) => ({
    earning: earningsRows[index] || ['', ''],
    deduction: deductionRows[index] || ['', ''],
  }));
  const addressParts = [
    company?.address?.line1,
    company?.address?.city,
    company?.address?.state,
    company?.address?.zip,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 font-sans text-slate-900 md:px-6 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payslip</h1>
          <p className="mt-1 text-sm text-slate-500">Professional payroll statement for {payPeriod}</p>
        </div>
        <button onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800">
          <FaDownload /> Download PDF
        </button>
      </div>

      <div ref={printRef} className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="border-b border-slate-200 bg-slate-900 px-8 py-8 text-white print:px-6 print:py-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              {company.logoUrl ? (
                <div className="flex h-16 w-36 items-center justify-center rounded-xl bg-white px-3 py-2 shadow-sm">
                  <img src={company.logoUrl} alt="Company logo" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/10 text-lg font-bold tracking-wide">
                  {initials}
                </div>
              )}
              <div>
                <div className="text-2xl font-bold tracking-tight">{company.companyName || 'Flance'}</div>
                <div className="mt-1 text-sm text-slate-300">Payslip for the month of {payPeriod}</div>
                {addressParts.length > 0 && (
                  <div className="mt-2 max-w-xl text-xs leading-5 text-slate-400">{addressParts.join(', ')}</div>
                )}
              </div>
            </div>

            <div className="min-w-[220px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Document Summary</div>
              <div className="mt-3 space-y-2 text-sm">
                <SummaryRow label="Payslip Status" value={titleCase(slip.status)} />
                <SummaryRow label="Payment Date" value={fmtDate(slip.paymentDate)} />
                <SummaryRow label="Generated On" value={fmtDate(slip.generatedAt)} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-8 print:px-6 print:py-6">
          <div className="grid gap-6 md:grid-cols-[1.3fr,0.9fr]">
            <SectionCard title="Employee Details">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Info label="Employee Name" value={employeeName} />
                <Info label="Employee ID" value={slip?.employee?.employeeId ?? '-'} />
                <Info label="Designation" value={slip?.employee?.designation || '-'} />
                <Info label="Department" value={slip?.employee?.department?.name || '-'} />
                <Info label="Pay Period" value={payPeriod} />
                <Info label="Payment Method" value={slip?.paymentMethod || '-'} />
              </div>
            </SectionCard>

            <SectionCard title="Attendance & Payroll">
              <div className="grid grid-cols-2 gap-4">
                <MetricTile label="Working Days" value={slip?.workingDays ?? '-'} />
                <MetricTile label="Paid Days" value={paidDays || '-'} />
                <MetricTile label="Present Days" value={slip?.presentDays ?? '-'} />
                <MetricTile label="LOP Days" value={lopDays || 0} />
              </div>
              <div className="mt-4 border-t border-slate-200 pt-4">
                <Info label="Transaction ID" value={slip?.transactionId || '-'} />
              </div>
            </SectionCard>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-4 bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <div className="px-5 py-3">Earnings</div>
                  <div className="border-l border-slate-200 px-5 py-3 text-right">Amount</div>
                  <div className="border-l border-slate-200 px-5 py-3">Deductions</div>
                  <div className="border-l border-slate-200 px-5 py-3 text-right">Amount</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {amountRows.map((row, index) => (
                    <div key={`pay-row-${index}`} className="grid grid-cols-4 text-sm">
                      <div className="px-5 py-3 text-slate-700">{row.earning[0] || <span className="text-slate-300">-</span>}</div>
                      <div className="border-l border-slate-200 px-5 py-3 text-right font-medium text-slate-900">
                        {row.earning[0] ? fmtMoney(row.earning[1]) : <span className="text-slate-300">-</span>}
                      </div>
                      <div className="border-l border-slate-200 px-5 py-3 text-slate-700">{row.deduction[0] || <span className="text-slate-300">-</span>}</div>
                      <div className="border-l border-slate-200 px-5 py-3 text-right font-medium text-slate-900">
                        {row.deduction[0] ? fmtMoney(row.deduction[1]) : <span className="text-slate-300">-</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 border-t border-slate-200 bg-slate-50 text-sm font-bold text-slate-900">
                  <div className="px-5 py-4">Total Earnings</div>
                  <div className="border-l border-slate-200 px-5 py-4 text-right">{fmtMoney(totalGross)}</div>
                  <div className="border-l border-slate-200 px-5 py-4">Total Deductions</div>
                  <div className="border-l border-slate-200 px-5 py-4 text-right">{fmtMoney(totalDeductions)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This is a system-generated payslip and reflects salary processed for the stated payroll period.
                Please contact payroll or HR for any clarifications regarding earnings, deductions, or attendance.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Net Pay</div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-emerald-800">{fmtMoney(netSalary)}</div>
              <div className="mt-2 text-sm text-emerald-700">Credited for {payPeriod}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Company Contact</div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {company.contactName && <div>{company.contactName}</div>}
                {company.email && <div>{company.email}</div>}
                {company.phone && <div>{company.phone}</div>}
                {company.website && <div>{company.website}</div>}
                {company.gstin && <div>GSTIN: {company.gstin}</div>}
                {company.pan && <div>PAN: {company.pan}</div>}
              </div>
            </div>

            <div className="md:text-right">
              {company.signatureUrl && (
                <img src={company.signatureUrl} alt="Authorized signature" className="mb-3 h-14 max-w-[180px] object-contain md:ml-auto" />
              )}
              <div className="inline-block min-w-[180px] border-t border-slate-300 pt-2 text-sm font-semibold text-slate-700">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value }) => (
  <div>
    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
    <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
  </div>
);

const SectionCard = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
    <div className="mt-4">{children}</div>
  </div>
);

const MetricTile = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
  </div>
);

const SummaryRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-slate-400">{label}</span>
    <span className="font-semibold text-white">{value}</span>
  </div>
);

export default PayslipGeneration;
