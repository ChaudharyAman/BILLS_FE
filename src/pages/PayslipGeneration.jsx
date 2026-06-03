import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaDownload, FaEnvelope } from 'react-icons/fa';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';

const fmtMoney = (value) => `Rs. ${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const titleCase = (value) => String(value || '-').replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const defaultEarningKeys = [
  { id: 'basic', name: 'Basic Salary', type: 'earning' },
  { id: 'hra', name: 'House Rent Allowance', type: 'earning' },
  { id: 'flexi', name: 'Flexi Amount', type: 'earning' },
  { id: 'broadband', name: 'Broadband', type: 'earning' },
  { id: 'petrol', name: 'Petrol', type: 'earning' },
  { id: 'lta', name: 'LTA', type: 'earning' },
  { id: 'conveyance', name: 'Conveyance', type: 'earning' },
  { id: 'medical', name: 'Medical Allowance', type: 'earning' },
  { id: 'special', name: 'Special Allowance', type: 'earning' },
];

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
      @page { size: A4; margin: 1cm; }
      @media print {
        .print-hide { display: none !important; }
        body { background: white !important; }
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
      toast.success(res.data?.message || 'Email feature coming soon');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to email payslip');
    } finally {
      setEmailing(false);
    }
  };

  const sections = useMemo(() => {
    if (!slip) return null;
    const employer = slip.employerContributions || {};
    const variablePay = slip.variablePay || {};
    const deductions = slip.deductions || {};

    return {
      earnings: [
        ...(slip.config?.salaryComponents || defaultEarningKeys)
          .filter(c => c.type === 'earning')
          .map(c => {
            const val = slip.earnings?.[c.id] ?? 
                        slip.earnings?.[c.name] ?? 
                        slip.earnings?.[
                          c.id === 'flexi' ? 'flexiAmount' : 
                          c.id === 'special' ? 'specialAllowance' : 
                          c.id === 'medical' ? 'medicalAllowance' : ''
                        ];
            return [c.name, val];
          })
          .filter(([, amount]) => Number(amount) > 0),
        ['Overtime', slip.earnings?.overtime],
        ...(slip.earnings?.otherEarnings || []).map((item) => [item.name, item.amount]),
      ].filter(([, amount]) => Number(amount) > 0),
      employer: [
        ['PF (Employer)', employer.pfEmployer],
        ['ESI (Employer)', employer.esiEmployer],
        ['Gratuity', employer.gratuity],
        ['LWF (Employer)', employer.lwfEmployer],
        ['Insurance', employer.insuranceEmployer],
        ['Employer NPS', employer.nps],
      ].filter(([, amount]) => Number(amount) > 0),
      variable: [
        ['Joining Bonus', variablePay.joiningBonus],
        ['Loyalty Bonus', variablePay.loyaltyBonus],
        ['Incentive', variablePay.incentive],
        ['Special Bonus', variablePay.specialBonus],
        ['Other', variablePay.otherAllowanceArrear],
      ].filter(([, amount]) => Number(amount) > 0),
      deductions: [
        ['PF Deduction', deductions.pfEmployee],
        ['ESI', deductions.esiEmployee],
        ['Professional Tax', deductions.professionalTax],
        ['TDS', deductions.tds],
        ['Insurance', deductions.insuranceEmployee],
        ['LWF', deductions.lwfEmployee],
        ['Gratuity', deductions.gratuityDeduction],
        ['Loan Deduction', deductions.loanDeduction],
        ['Advance Deduction', deductions.advanceDeduction],
        ...(deductions.otherDeductions || []).map((item) => [item.name, item.amount]),
      ].filter(([, amount]) => Number(amount) > 0),
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

  if (!slip || !sections) return <div className="container mx-auto p-6 text-red-600">Payslip not available.</div>;

  const company = slip.company || {};
  const employeeName = `${slip?.employee?.firstName ?? ''} ${slip?.employee?.lastName ?? ''}`.trim() || '-';
  const payPeriod = `${slip?.period?.monthName ?? '-'} ${slip?.period?.year ?? ''}`.trim();
  const initials = employeeName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'NA';
  const addressParts = [company?.address?.line1, company?.address?.city, company?.address?.state, company?.address?.zip].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 font-sans text-slate-900 md:px-6 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between print-hide">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payslip</h1>
          <p className="mt-1 text-sm text-slate-500">Professional payroll statement for {payPeriod}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={emailPayslip} disabled={emailing} className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60">
            <FaEnvelope /> {emailing ? 'Sending...' : 'Email to Employee'}
          </button>
          <button onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800">
            <FaDownload /> Download PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="border-b border-slate-200 bg-slate-900 px-8 py-8 text-white">
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

        <div className="px-8 py-8">
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
                <MetricTile label="Paid Days" value={slip?.paidDays ?? '-'} />
                <MetricTile label="Paid Leaves" value={slip?.paidLeaves ?? 0} />
                <MetricTile label="LOP Days" value={slip?.lop ?? 0} />
              </div>
              <div className="mt-4 border-t border-slate-200 pt-4">
                <Info label="Transaction ID" value={slip?.transactionId || '-'} />
              </div>
            </SectionCard>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <AmountTable title="Earnings" rows={sections.earnings} totalLabel="Total Earnings" total={slip.earnings?.totalEarnings} />
            <AmountTable title="Deductions" rows={sections.deductions} totalLabel="Total Deductions" total={slip.deductions?.totalDeductions} />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <AmountTable title="Employer Contributions" rows={sections.employer} totalLabel="Gross Total Salary" total={slip.employerContributions?.grossTotalSalary} />
            <AmountTable title="Variable Pay" rows={sections.variable} totalLabel="Total Variable Pay" total={slip.variablePay?.totalVariablePay} />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {slip.remarks || slip.notes || 'This is a system-generated payslip and reflects salary processed for the stated payroll period.'}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Net Pay</div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-emerald-800">{fmtMoney(slip.netSalary)}</div>
              <div className="mt-2 text-sm text-emerald-700">Total payable: {fmtMoney(slip.totalPayable)}</div>
            </div>
          </div>
        </div>
        {slip.auditLog?.length > 0 && (
          <div className="px-8 py-6 border-t border-slate-200 print-hide">
            <details>
              <summary className="text-sm font-semibold text-slate-700 cursor-pointer">Status history</summary>
              <div className="mt-3 space-y-2">
                {slip.auditLog.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="capitalize font-semibold text-slate-700">{entry.status}</span>
                    <span>·</span>
                    <span>{entry.changedBy}</span>
                    <span>·</span>
                    <span>{new Date(entry.changedAt).toLocaleDateString('en-IN')}</span>
                    <span>·</span>
                    <span>{fmtMoney(entry.netSalary)}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
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

const AmountTable = ({ title, rows, totalLabel, total }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200">
    <div className="bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
    <div className="divide-y divide-slate-200">
      {(rows.length ? rows : [['-', 0]]).map(([label, amount], index) => (
        <div key={`${title}-${index}`} className="flex items-center justify-between px-5 py-3 text-sm">
          <span className="text-slate-700">{label}</span>
          <span className="font-medium text-slate-900">{label === '-' ? '-' : fmtMoney(amount)}</span>
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-900">
      <span>{totalLabel}</span>
      <span>{fmtMoney(total)}</span>
    </div>
  </div>
);

export default PayslipGeneration;
