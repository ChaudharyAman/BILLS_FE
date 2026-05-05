import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
const explicitApiBase = apiUrl ? `${apiUrl}/api` : null;
const baseURL = import.meta.env.DEV ? '/api' : (explicitApiBase || '/api');

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with every request
});

api.interceptors.request.use(
  (config) => {
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
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user');
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
