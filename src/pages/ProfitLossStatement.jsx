import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getDefaultDateRange = () => {
  const today = new Date();
  return {
    startDate: getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: getLocalDateString(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
};

const ProfitLossStatement = () => {
  const [startDate, setStartDate] = useState(getDefaultDateRange().startDate);
  const [endDate, setEndDate] = useState(getDefaultDateRange().endDate);
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get(`/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`, { signal: controller.signal });
        setReport(res.data);
      } catch (fetchError) {
        if (fetchError.name === 'CanceledError' || fetchError.name === 'AbortError') return;
        console.error(fetchError);
        setError('Failed to load P&L report');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
    return () => controller.abort();
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

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6 print:hidden flex flex-wrap gap-3">
        <div>
          <label htmlFor="pl-start-date" className="sr-only">Start date</label>
          <input id="pl-start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="pl-end-date" className="sr-only">End date</label>
          <input id="pl-end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center text-gray-500">Loading report...</div>
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-xl shadow-sm p-8 text-center text-red-600">{error}</div>
      ) : report ? (
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
