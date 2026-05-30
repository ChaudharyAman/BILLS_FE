import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
const explicitApiBase = apiUrl ? `${apiUrl}/api` : null;
const baseURL = import.meta.env.DEV ? '/api' : (explicitApiBase || '/api');

export const storeAuthSession = (authData) => {
  if (authData?.user) {
    localStorage.setItem('user', JSON.stringify({ user: authData.user }));
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

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If the request fails with a 401 (Unauthorized) error, redirect to login
    const url = error.config?.url;
    const isAuthProbe = url === '/auth/me';
    if (error.response && error.response.status === 401 && url !== '/auth/logout' && !isAuthProbe) {
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
