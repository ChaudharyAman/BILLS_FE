import api from '../api/axios';

export const getBusinessUnits = async (params = {}) => {
  const response = await api.get('/business-units', { params });
  return response.data;
};

export const getBusinessUnitRollup = async () => {
  const response = await api.get('/business-units/rollup');
  return response.data;
};

export const getBusinessUnitSummary = async (id) => {
  const response = await api.get(`/business-units/summary/${id}`);
  return response.data;
};

export const createBusinessUnit = async (data) => {
  const response = await api.post('/business-units', data);
  return response.data;
};

export const updateBusinessUnit = async (id, data) => {
  const response = await api.put(`/business-units/${id}`, data);
  return response.data;
};

export const deleteBusinessUnit = async (id) => {
  const response = await api.delete(`/business-units/${id}`);
  return response.data;
};

export default {
  getBusinessUnits,
  getBusinessUnitRollup,
  getBusinessUnitSummary,
  createBusinessUnit,
  updateBusinessUnit,
  deleteBusinessUnit,
};
