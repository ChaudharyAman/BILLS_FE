import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BalanceSheet = () => {
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get('/reports/balance-sheet')
      .then(res => setReport(res.data))
      .catch(() => alert('Failed to load balance sheet'));
  }, []);

  const assetsRows = Array.isArray(report?.assets)
    ? report.assets.map(item => [item.category, item.total])
    : [];
  const liabilitiesRows = Array.isArray(report?.liabilities)
    ? report.liabilities.map(item => [item.type, item.total])
    : [];

  const totalAssets = report?.totalAssets ?? 0;
  const totalLiabilities = report?.totalLiabilities ?? 0;
  const equity = report?.equity ?? 0;
  const rightSide = totalLiabilities + equity;
  const balanced = Math.abs(totalAssets - rightSide) < 0.01;

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex justify-between items-start mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Balance Sheet</h1>
          <p className="text-gray-500 mt-1">Assets, liabilities, and equity</p>
        </div>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Export PDF</button>
      </div>

      {report && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
          {!balanced && <div className="mb-6 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg p-3 text-sm font-semibold">Balance warning: Assets do not equal liabilities plus equity.</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Panel title="Assets" total={totalAssets} rows={assetsRows} />
            <div>
              <Panel title="Liabilities" total={totalLiabilities} rows={liabilitiesRows} />
              <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-5 flex justify-between font-bold">
                <span>Equity</span>
                <span>{fmtMoney(equity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Panel = ({ title, rows, total }) => (
  <div className="border border-gray-200 rounded-xl overflow-hidden">
    <div className="bg-gray-50 px-5 py-4 font-bold">{title}</div>
    <div className="p-5 space-y-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between capitalize">
          <span className="text-gray-600">{label}</span>
          <span className="font-semibold">{fmtMoney(value)}</span>
        </div>
      ))}
      <div className="border-t pt-3 flex justify-between font-bold">
        <span>Total {title}</span>
        <span>{fmtMoney(total)}</span>
      </div>
    </div>
  </div>
);

export default BalanceSheet;
