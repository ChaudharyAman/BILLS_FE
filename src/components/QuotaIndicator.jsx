import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { FaChartPie } from 'react-icons/fa';

const QuotaIndicator = ({ type }) => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check user subscription tier
  const userStr = localStorage.getItem('user');
  const userObj = userStr ? JSON.parse(userStr).user : null;
  const isPro = userObj?.subscription?.plan === 'pro';

  useEffect(() => {
    // Only fetch for free users
    if (!isPro) {
      const fetchUsage = async () => {
        try {
          const res = await api.get('/subscriptions/usage');
          setUsage(res.data[type]); // type is 'invoices' or 'quotes'
        } catch (error) {
          console.error(`Error fetching ${type} usage:`, error);
        } finally {
          setLoading(false);
        }
      };
      fetchUsage();
    }
  }, [isPro, type]);

  if (isPro) return null; // Pro users have unlimited
  if (loading || !usage) return <div className="h-14 animate-pulse bg-gray-100 rounded-xl"></div>;

  const { used, limit } = usage;
  const remaining = Math.max(0, limit - used);
  const percentage = Math.min(100, Math.round((used / limit) * 100));

  let barColor = 'bg-blue-500';
  if (percentage >= 100) barColor = 'bg-red-500';
  else if (percentage >= 80) barColor = 'bg-orange-500';

  let title = type === 'invoices' ? 'Invoices' : 'Quotes & Proformas';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-center mb-6 max-w-sm">
      <div className="flex justify-between items-end mb-2">
        <div className="flex items-center gap-2">
          <FaChartPie className="text-gray-400" />
          <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            {title} Quota
          </span>
        </div>
        <div className="text-xs font-semibold">
          <span className={remaining === 0 ? "text-red-600" : "text-gray-600"}>
            {used} / {limit} Used
          </span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all duration-500 ease-out`} style={{ width: `${percentage}%` }}></div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
        <span>{remaining === 0 ? 'Limit reached' : `${remaining} remaining this month`}</span>
        {percentage >= 80 && (
          <a href="/subscription" className="text-blue-600 font-bold hover:underline">
            Upgrade
          </a>
        )}
      </div>
    </div>
  );
};

export default QuotaIndicator;
