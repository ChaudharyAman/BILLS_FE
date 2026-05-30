import api from './axios';

export const getTaxDashboard = (paramsOrMonth, year) => {
  if (typeof paramsOrMonth === 'object') {
    return api.get('/reports/tax-dashboard', { params: paramsOrMonth });
  }
  return api.get('/reports/tax-dashboard', { params: { month: paramsOrMonth, year } });
};
