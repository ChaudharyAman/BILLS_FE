import api from '../api/axios';

export const getProfileShares = async (profileId) => {
  const response = await api.get(`/profiles/${profileId}/shares`);
  return response.data;
};

export const createProfileShare = async (profileId, data) => {
  const response = await api.post(`/profiles/${profileId}/shares`, data);
  return response.data;
};

export const updateProfileShare = async (profileId, shareId, data) => {
  const response = await api.patch(`/profiles/${profileId}/shares/${shareId}`, data);
  return response.data;
};

export const revokeProfileShare = async (profileId, shareId) => {
  const response = await api.post(`/profiles/${profileId}/shares/${shareId}/revoke`);
  return response.data;
};

export const getPublicShareMetadata = async (token, passcode = null) => {
  const config = passcode ? { headers: { 'x-share-passcode': passcode } } : {};
  const response = await api.get(`/shared/${token}`, config);
  return response.data;
};
