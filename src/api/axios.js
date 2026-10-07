import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
const explicitApiBase = apiUrl ? `${apiUrl}/api` : null;
const baseURL = import.meta.env.DEV ? '/api' : (explicitApiBase || '/api');

/**
 * Auth session helpers
 *
 * Security model:
 *  - authToken (JWT)  → sessionStorage only: cleared when tab/browser is closed,
 *                        never persisted to disk by the browser.
 *  - user (profile)   → localStorage: not a secret, needed app-wide across tabs.
 *  - switch_* keys    → sessionStorage only: impersonation state is tab-scoped.
 *
 * Tokens are ALSO sent via HttpOnly, Secure, SameSite cookies by the server.
 * The Bearer header approach is kept as a belt-and-suspenders fallback
 * (some environments strip cookies on cross-origin requests).
 */
export const storeAuthSession = (authData) => {
  // Guarantee tokens are NEVER in localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');

  if (authData?.user) {
    // User profile is stored in localStorage so pages know user identity across tabs
    localStorage.setItem('user', JSON.stringify({ user: authData.user }));
  }
  if (authData?.token) {
    // JWT token stored in sessionStorage (never localStorage) so it is
    // automatically cleared when the tab or browser is closed.
    sessionStorage.setItem('authToken', authData.token);
  }
  // Persist impersonation state so the switcher hook re-hydrates correctly.
  // Also sessionStorage — impersonation is tab-scoped by design.
  if (authData?.isSwitchedSession && authData?.switchedBy) {
    sessionStorage.setItem('switch_user_active', 'true');
    sessionStorage.setItem('switch_user_switched_by', JSON.stringify(authData.switchedBy));
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('token');
  // Also clear any lingering switch state
  sessionStorage.removeItem('switch_user_active');
  sessionStorage.removeItem('switch_user_switched_by');
  sessionStorage.removeItem('switch_user_target');
  sessionStorage.removeItem('switch_user_token');
};

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send HttpOnly cookies with every request
});

// Add a request interceptor to inject the Bearer token
api.interceptors.request.use(
  (config) => {
    const isShared =
      sessionStorage.getItem('isSharedSession') === 'true' ||
      sessionStorage.getItem('isSharedViewOnly') === 'true' ||
      window.location.pathname.startsWith('/shared');

    // Read authToken from sessionStorage first, fallback to the shared-session token
    const token = isShared
      ? (sessionStorage.getItem('token') || sessionStorage.getItem('authToken'))
      : (sessionStorage.getItem('authToken') || sessionStorage.getItem('token'));

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
