import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
const explicitApiBase = apiUrl ? `${apiUrl}/api` : null;
const baseURL = import.meta.env.DEV ? '/api' : (explicitApiBase || '/api');
const AUTH_TOKEN_KEY = 'authToken';

export const storeAuthSession = (authData) => {
  if (authData?.token) {
    localStorage.setItem(AUTH_TOKEN_KEY, authData.token);
  }

  if (authData?.user) {
    localStorage.setItem('user', JSON.stringify({ user: authData.user }));
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem('user');
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with every request
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    if (error.response && error.response.status === 401 && error.config?.url !== '/auth/logout') {
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
