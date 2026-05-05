import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const ProjectDashboard = () => {
  const [summaries, setSummaries] = useState([]);

  useEffect(() => {
    api.get('/projects?limit=100')
      .then(async (res) => {
        const projects = res.data.data || [];
        const data = await Promise.all(projects.map(project => api.get(`/projects/${project._id}/summary`).then(summary => summary.data)));
        setSummaries(data);
      })
      .catch(() => alert('Failed to load project dashboard'));
  }, []);

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <h1 className="text-3xl font-bold mb-6">Project Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {summaries.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 md:col-span-2">No project data found.</div>
        ) : summaries.map(item => {
          const profitMargin = item.totalIncome > 0 ? Math.round((item.netProfit / item.totalIncome) * 100) : 0;
          return (
            <div key={item.project._id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-lg">{item.project.name}</h2>
                  <p className="text-sm text-gray-500">{item.project.code}</p>
                </div>
                <span className="capitalize text-sm font-semibold">{item.project.status}</span>
              </div>
              <Metric label="Revenue" value={fmtMoney(item.totalIncome)} />
              <Metric label="Expenses" value={fmtMoney(item.totalExpenses)} />
              <Metric label="Net Profit" value={fmtMoney(item.netProfit)} />
              <Metric label="Profit Margin" value={`${profitMargin}%`} />
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Budget Utilisation</span>
                  <span>{item.budgetUtilisationPct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${Math.min(item.budgetUtilisationPct, 100)}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Metric = ({ label, value }) => (
  <div className="flex justify-between border-b border-gray-100 py-2 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

export default ProjectDashboard;
