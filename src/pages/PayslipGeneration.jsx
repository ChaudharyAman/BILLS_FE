import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { FaDownload } from 'react-icons/fa';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PayslipGeneration = () => {
  const { id } = useParams();
  const printRef = useRef(null);
  const [slip, setSlip] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const controller = new AbortController();

    api.get(`/payroll/${id}/generate-payslip`, { signal: controller.signal })
      .then(res => setSlip(res.data.payslip))
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

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-3xl font-bold">Payslip</h1>
        <button onClick={downloadPdf} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
          <FaDownload /> Download PDF
        </button>
      </div>

      <div ref={printRef} className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 max-w-4xl mx-auto print:shadow-none print:border-0">
        <div className="border-b border-gray-200 pb-5 mb-6">
          <h2 className="text-2xl font-bold text-[#1a2e44]">Flance</h2>
          <p className="text-gray-500">Salary Slip for {slip?.period?.monthName ?? '-'} {slip?.period?.year ?? ''}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
          <Info label="Employee" value={`${slip?.employee?.firstName ?? '-'} ${slip?.employee?.lastName ?? ''}`} />
          <Info label="Employee ID" value={slip?.employee?.employeeId ?? '-'} />
          <Info label="Designation" value={slip?.employee?.designation || '-'} />
          <Info label="Department" value={slip?.employee?.department?.name || '-'} />
          <Info label="Working Days" value={slip?.workingDays ?? '-'} />
          <Info label="Present Days" value={slip?.presentDays ?? '-'} />
          <Info label="Payment Date" value={slip?.paymentDate ? new Date(slip.paymentDate).toLocaleDateString('en-IN') : '-'} />
          <Info label="Status" value={slip?.status || '-'} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AmountTable
            title="Earnings"
            rows={[
              ['Basic', earnings.basic],
              ['HRA', earnings.hra],
              ['Conveyance', earnings.conveyance],
              ['Medical Allowance', earnings.medicalAllowance],
              ['Special Allowance', earnings.specialAllowance],
              ['Overtime', earnings.overtime],
              ['Bonus', earnings.bonus],
              ['Incentives', earnings.incentives],
              ...(earnings.otherEarnings || []).map(item => [item.name, item.amount]),
            ]}
            total={earnings.totalEarnings}
          />
          <AmountTable
            title="Deductions"
            rows={[
              ['PF', deductions.pf],
              ['ESI', deductions.esi],
              ['Professional Tax', deductions.professionalTax],
              ['TDS', deductions.tds],
              ['Loan Deduction', deductions.loanDeduction],
              ['Advance Deduction', deductions.advanceDeduction],
              ...(deductions.otherDeductions || []).map(item => [item.name, item.amount]),
            ]}
            total={deductions.totalDeductions}
          />
        </div>

        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-5 flex justify-between items-center">
          <span className="text-green-700 font-bold">Net Pay</span>
          <span className="text-2xl font-bold text-green-700">{fmtMoney(slip.netSalary)}</span>
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value }) => (
  <div>
    <div className="text-gray-500 text-xs uppercase font-semibold">{label}</div>
    <div className="font-semibold mt-1 capitalize">{value}</div>
  </div>
);

const AmountTable = ({ title, rows, total }) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden">
    <div className="bg-gray-50 px-4 py-3 font-bold">{title}</div>
    <table className="w-full text-sm">
      <tbody>
        {rows.filter(([, amount]) => Number(amount) > 0).map(([label, amount], idx) => (
          <tr key={`${label}-${idx}`} className="border-t border-gray-100">
            <td className="px-4 py-2 text-gray-600">{label}</td>
            <td className="px-4 py-2 text-right font-semibold">{fmtMoney(amount)}</td>
          </tr>
        ))}
        <tr className="border-t border-gray-200 bg-gray-50">
          <td className="px-4 py-3 font-bold">Total</td>
          <td className="px-4 py-3 text-right font-bold">{fmtMoney(total)}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

export default PayslipGeneration;
