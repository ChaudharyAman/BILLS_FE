import api from '../api/axios';

/**
 * Fetch switch status of the current session
 */
export const fetchSwitchStatus = async () => {
  try {
    const response = await api.get('/user-switch/status');
    return response.data;
  } catch (error) {
    console.warn('[UserSwitcher] fetchSwitchStatus failed:', error.message);
    return { isSwitched: false, canSwitch: false, currentUser: null };
  }
};

/**
 * Fetch system users list with optional search and role filtering
 */
export const fetchSwitchableUsers = async ({ search = '', role = '', page = 1, limit = 100 } = {}) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (role) params.append('role', role);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  const response = await api.get(`/user-switch/users?${params.toString()}`);
  return response.data;
};

/**
 * Switch active session to target user
 */
export const executeUserSwitch = async (targetUserId) => {
  const response = await api.post('/user-switch/switch', { targetUserId });
  return response.data;
};

/**
 * Exit switched session and return to Master User
 */
export const executeExitSwitch = async (data = {}) => {
  const payload = typeof data === 'string' ? { masterId: data } : (data || {});
  const response = await api.post('/user-switch/exit', payload);
  return response.data;
};

/**
 * Directly authenticate as Master User
 */
export const authenticateMaster = async ({ username, password } = {}) => {
  const response = await api.post('/user-switch/login', { username, password });
  return response.data;
};
