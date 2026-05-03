import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);
const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().substring(0, 10);

const ProfitLossStatement = () => {
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(monthEnd);
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get(`/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`)
      .then(res => setReport(res.data))
      .catch(() => alert('Failed to load P&L report'));
  }, [startDate, endDate]);

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex justify-between items-start mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Profit & Loss</h1>
          <p className="text-gray-500 mt-1">Revenue, expenses, and net income</p>
        </div>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Export PDF</button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6 print:hidden flex gap-3">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      {report && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 print:shadow-none print:border-0">
          <StatementSection title="Revenue" rows={report.revenue} totalLabel="Total Revenue" total={report.totalRevenue} />
          <div className="my-6 border-t border-gray-200" />
          <StatementSection title="Operating Expenses" rows={report.expenses} totalLabel="Total Expenses" total={report.totalExpenses} />
          <div className={`mt-8 rounded-xl p-5 flex justify-between font-bold text-xl ${report.netIncome >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <span>Net Income</span>
            <span>{fmtMoney(report.netIncome)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const StatementSection = ({ title, rows, totalLabel, total }) => (
  <section>
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    <div className="space-y-2">
      {(rows || []).map(row => (
        <div key={row.name} className="flex justify-between text-sm">
          <span className="text-gray-600">{row.name}</span>
          <span className="font-semibold">{fmtMoney(row.total)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-gray-200 pt-3 mt-3 font-bold">
        <span>{totalLabel}</span>
        <span>{fmtMoney(total)}</span>
      </div>
    </div>
  </section>
);

export default ProfitLossStatement;
