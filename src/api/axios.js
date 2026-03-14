import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with every request
});

// Add a request interceptor (keeping it around in case other headers are needed later, but removing token logic)
api.interceptors.request.use(
  (config) => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.token) {
          config.headers.Authorization = `Bearer ${userObj.token}`;
        }
      }
    } catch (e) {
      console.warn("Axios interceptor: could not parse user from storage", e);
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
