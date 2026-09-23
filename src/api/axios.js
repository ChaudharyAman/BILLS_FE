import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
const explicitApiBase = apiUrl ? `${apiUrl}/api` : null;
const baseURL = import.meta.env.DEV ? '/api' : (explicitApiBase || '/api');

export const storeAuthSession = (authData) => {
  if (authData?.user) {
    localStorage.setItem('user', JSON.stringify({ user: authData.user }));
  }
  if (authData?.token) {
    localStorage.setItem('authToken', authData.token);
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
};

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with every request
});

// Add a request interceptor to inject the Bearer token
api.interceptors.request.use(
  (config) => {
    const isShared =
      sessionStorage.getItem('isSharedSession') === 'true' ||
      sessionStorage.getItem('isSharedViewOnly') === 'true' ||
      window.location.pathname.startsWith('/shared');
    const token = isShared
      ? (sessionStorage.getItem('token') || localStorage.getItem('authToken'))
      : (localStorage.getItem('authToken') || sessionStorage.getItem('token'));
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const activeProfileId = isShared
      ? (sessionStorage.getItem('activeProfileId') || localStorage.getItem('activeProfileId'))
      : (localStorage.getItem('activeProfileId') || sessionStorage.getItem('activeProfileId'));
    if (activeProfileId) {
      config.headers['X-Profile-Id'] = activeProfileId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If the request fails with a 401 (Unauthorized) error, redirect to login
    const url = error.config?.url || '';
    const isAuthProbe = url === '/auth/me';
    const isShared =
      sessionStorage.getItem('isSharedSession') === 'true' ||
      sessionStorage.getItem('isSharedViewOnly') === 'true' ||
      Boolean(sessionStorage.getItem('token')) ||
      window.location.pathname.startsWith('/shared');

    const isPublicOrShare =
      isShared ||
      url.startsWith('/shared') ||
      url.includes('/shared/') ||
      url.startsWith('/public') ||
      Boolean(error.response?.data?.requiresPasscode) ||
      window.location.pathname.startsWith('/submit');

    if (error.response && error.response.status === 401 && url !== '/auth/logout' && !isAuthProbe && !isPublicOrShare) {
      clearAuthSession();
      if (window.location.pathname !== '/login') {
        // Call logout to clear the HttpOnly JWT cookie server-side
        api.post('/auth/logout').catch(() => {}).finally(() => {
          window.location.href = '/login';
        });
      }
    }
    return Promise.reject(error);
  }
);

export default api;
