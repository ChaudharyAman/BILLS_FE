import api from '../api/axios';

export const getMyProfiles = async () => {
  const response = await api.get('/profiles/mine');
  return response.data;
};

export const createProfile = async (data) => {
  const response = await api.post('/profiles', data);
  return response.data;
};

export const updateProfile = async (id, data) => {
  const response = await api.put(`/profiles/${id}`, data);
  return response.data;
};

export const deleteProfile = async (id) => {
  const response = await api.delete(`/profiles/${id}`);
  return response.data;
};

export const setDefaultProfile = async (id) => {
  const response = await api.post(`/profiles/${id}/set-default`);
  return response.data;
};

export const getActiveProfileId = () => {
  return sessionStorage.getItem('activeProfileId') || localStorage.getItem('activeProfileId') || null;
};

export const setActiveProfileId = (profileId) => {
  if (profileId) {
    localStorage.setItem('activeProfileId', profileId);
    sessionStorage.setItem('activeProfileId', profileId);
  } else {
    localStorage.removeItem('activeProfileId');
    sessionStorage.removeItem('activeProfileId');
  }
};
