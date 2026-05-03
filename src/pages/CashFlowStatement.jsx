import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);
const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().substring(0, 10);

const CashFlowStatement = () => {
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(monthEnd);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get(`/reports/cash-flow?startDate=${startDate}&endDate=${endDate}`)
      .then(res => setReport(res.data))
      .catch(() => alert('Failed to load cash flow'));
  }, [startDate, endDate]);

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex justify-between items-start mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Cash Flow</h1>
          <p className="text-gray-500 mt-1">Operating, investing, and financing flow</p>
        </div>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Export PDF</button>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6 print:hidden flex flex-wrap gap-3">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input type="number" value={openingBalance} onChange={e => setOpeningBalance(Number(e.target.value) || 0)} placeholder="Opening balance" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      {report && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
          <Row label="Cash from Operating Activities" value={report.operating} />
          <Row label="Cash from Investing Activities" value={report.investing} />
          <Row label="Cash from Financing Activities" value={report.financing} />
          <div className="border-t my-4" />
          <Row label="Net Cash Flow" value={report.netCashFlow} strong />
          <Row label="Opening Balance" value={openingBalance} />
          <Row label="Closing Balance" value={openingBalance + report.netCashFlow} strong />
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value, strong }) => (
  <div className={`flex justify-between py-3 ${strong ? 'font-bold text-lg' : ''}`}>
    <span>{label}</span>
    <span>{fmtMoney(value)}</span>
  </div>
);

export default CashFlowStatement;
