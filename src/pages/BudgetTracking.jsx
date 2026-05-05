import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const BudgetTracking = () => {
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    api.get('/reports/budget-vs-actual')
      .then(res => setBudgets(res.data.data || []))
      .catch(() => alert('Failed to load budget tracking'));
  }, []);

  const colorFor = (pct) => pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';
  const chartData = budgets.map(b => ({
    name: b.category?.name || b.name,
    Budget: b.budgetAmount,
    Spent: b.spentAmount,
  }));

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Budget Tracking</h1>
        <p className="text-gray-500 mt-1">Budget vs actual spend by category</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-bold mb-4">Budget vs Actual</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => fmtMoney(value)} />
              <Bar dataKey="Budget" fill="#2563eb" />
              <Bar dataKey="Spent" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 md:col-span-2">No active budgets found.</div>
        ) : budgets.map((budget, index) => {
          const pct = Number(budget.utilizationPct);
          const safePct = Number.isFinite(pct) ? pct : 0;
          const clampedPct = Math.max(0, Math.min(safePct, 100));
          return (
            <button
              key={budget._id || budget.id || `budget-${index}`}
              type="button"
              onClick={() => {
                if (budget.category?._id) window.location.href = `/expenses?category=${budget.category._id}`;
              }}
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 text-left hover:border-blue-300"
            >
              <div className="flex justify-between gap-4 mb-3">
                <div>
                  <div className="font-bold">{budget.category?.name || budget.name}</div>
                  <div className="text-sm text-gray-500">{fmtMoney(budget.spentAmount)} / {fmtMoney(budget.budgetAmount)}</div>
                </div>
                <div className="font-bold">{safePct}%</div>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${colorFor(safePct)}`} style={{ width: `${clampedPct}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetTracking;
