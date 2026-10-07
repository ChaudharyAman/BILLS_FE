import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api, { storeAuthSession } from '../api/axios';
import {
  fetchSwitchStatus,
  fetchSwitchableUsers,
  executeUserSwitch,
  executeExitSwitch,
  authenticateMaster,
} from './api';

// All switch state is stored in sessionStorage (tab-scoped, cleared on tab close).
const SS = {
  get: (key) => sessionStorage.getItem(key),
  set: (key, val) => sessionStorage.setItem(key, val),
  remove: (...keys) => keys.forEach((k) => sessionStorage.removeItem(k)),
};

const clearSwitchState = () =>
  SS.remove('switch_user_active', 'switch_user_switched_by', 'switch_user_target', 'switch_user_token');

export const useUserSwitcher = () => {
  const [isSwitched, setIsSwitched] = useState(() => {
    return SS.get('switch_user_active') === 'true';
  });
  const [switchedBy, setSwitchedBy] = useState(() => {
    try {
      const stored = SS.get('switch_user_switched_by');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  // Default to FALSE for guests and normal users to prevent unauthorized UI exposure
  const [canSwitch, setCanSwitch] = useState(false);
  const [isMasterUser, setIsMasterUser] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [switchingUserId, setSwitchingUserId] = useState(null);
  const [exiting, setExiting] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  // Sync state from sessionStorage and backend
  const refreshStatus = useCallback(async () => {
    const isMarkedSwitched = SS.get('switch_user_active') === 'true';

    // Local state check (user profile stays in localStorage — not a secret)
    const rawUser = localStorage.getItem('user');
    let currentUserObj = null;
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        currentUserObj = parsed.user || parsed;
      } catch {}
    }

    // If logged out, purge switch state immediately (VULN-08)
    if (!currentUserObj) {
      setIsSwitched(false);
      setSwitchedBy(null);
      setCanSwitch(false);
      setIsMasterUser(false);
      clearSwitchState();
      return;
    }

    const isMaster = Boolean(currentUserObj?.isMasterUser);

    if (isMarkedSwitched) {
      setIsSwitched(true);
      setCanSwitch(true);
    } else if (isMaster) {
      setCanSwitch(true);
      setIsMasterUser(true);
    } else {
      setCanSwitch(false);
      setIsMasterUser(false);
    }

    try {
      const statusData = await fetchSwitchStatus();
      if (statusData) {
        if (statusData.isSwitched) {
          setIsSwitched(true);
          setSwitchedBy(statusData.switchedBy);
          setCanSwitch(true);
          SS.set('switch_user_active', 'true');
          if (statusData.switchedBy) {
            SS.set('switch_user_switched_by', JSON.stringify(statusData.switchedBy));
          }
        } else {
          // VULN-08: Explicitly clear switched state when backend confirms not switched
          setIsSwitched(false);
          setSwitchedBy(null);
          clearSwitchState();
        }

        // Strictly allow only MasterUser
        if (statusData.currentUser?.isMasterUser) {
          setIsMasterUser(true);
          setCanSwitch(true);
        } else {
          setIsMasterUser(false);
          // Only set canSwitch false if we're not in a switched session
          if (!statusData.isSwitched) {
            setCanSwitch(false);
          }
        }
      }
    } catch (err) {
      // Retain local evaluation if network is offline
    }
  }, []);

  useEffect(() => {
    refreshStatus();

    const handleAuthSync = () => {
      refreshStatus();
    };

    window.addEventListener('auth-sync', handleAuthSync);
    window.addEventListener('storage', handleAuthSync);

    return () => {
      window.removeEventListener('auth-sync', handleAuthSync);
      window.removeEventListener('storage', handleAuthSync);
    };
  }, [refreshStatus]);

  // Load switchable users list
  const loadUsers = useCallback(async ({ search = '', role = '' } = {}) => {
    setLoadingUsers(true);
    setAuthRequired(false);
    try {
      const data = await fetchSwitchableUsers({ search, role, limit: 150 });
      setUsers(data.users || []);
    } catch (error) {
      console.warn('[UserSwitcher] Error loading users:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setAuthRequired(true);
      } else {
        toast.error(error.response?.data?.message || 'Failed to load users');
      }
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Authenticate as Master Admin with user-supplied credentials (no hardcoded credentials)
  const authenticateAsMaster = async ({ username, password } = {}) => {
    if (!username || !password) {
      toast.error('Please enter the Master Admin username and password');
      return;
    }

    setAuthenticating(true);
    try {
      let authData = null;

      try {
        authData = await authenticateMaster({ username, password });
      } catch (err) {
        const response = await api.post('/auth/login', {
          username,
          password,
        });
        authData = response.data;
      }

      if (authData?.token && authData?.user) {
        storeAuthSession(authData);
        setIsMasterUser(true);
        setCanSwitch(true);
        setAuthRequired(false);
        toast.success('Authenticated as Master Admin');
        window.dispatchEvent(new Event('auth-sync'));
        await loadUsers();
      }
    } catch (error) {
      console.error('[UserSwitcher] Master authentication failed:', error);
      toast.error(error.response?.data?.message || 'Invalid Master Admin credentials');
    } finally {
      setAuthenticating(false);
    }
  };

  // Switch to target user
  const handleSwitchUser = async (targetUser) => {
    if (!targetUser || !targetUser._id) return;
    setSwitchingUserId(targetUser._id);

    try {
      // 1. Call backend switch endpoint
      const response = await executeUserSwitch(targetUser._id);

      // 2. Update state flags in sessionStorage (tokens stay tab-scoped)
      SS.set('switch_user_active', 'true');
      SS.set('switch_user_switched_by', JSON.stringify(response.switchedBy));
      SS.set('switch_user_target', JSON.stringify(targetUser));
      if (response.token) {
        SS.set('switch_user_token', response.token);
      }

      // Clear any stored activeProfileId to let target user's default company profile resolve
      localStorage.removeItem('activeProfileId');
      sessionStorage.removeItem('activeProfileId');

      storeAuthSession({
        token: response.token,
        user: response.user,
      });

      setIsSwitched(true);
      setSwitchedBy(response.switchedBy);
      setIsModalOpen(false);

      toast.success(`Switched to user: ${targetUser.username} (${targetUser.email})`);

      // Dispatch auth-sync so all active components re-mount with new user identity
      window.dispatchEvent(new Event('auth-sync'));

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('[UserSwitcher] Switch error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setAuthRequired(true);
      }
      toast.error(error.response?.data?.message || 'Failed to switch user');
    } finally {
      setSwitchingUserId(null);
    }
  };

  // Exit impersonation session and restore master user
  const handleExitSwitch = async () => {
    setExiting(true);
    try {
      // Backend validates active switched token and returns freshly signed master token
      const switchToken = SS.get('switch_user_token') || sessionStorage.getItem('authToken');
      const restoreData = await executeExitSwitch({ switchToken });

      // Clear switch state flags from sessionStorage
      clearSwitchState();

      if (restoreData?.token && restoreData?.user) {
        storeAuthSession({ token: restoreData.token, user: restoreData.user });
      }

      setIsSwitched(false);
      setSwitchedBy(null);

      toast.success('Restored Master User session');

      window.dispatchEvent(new Event('auth-sync'));
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('[UserSwitcher] Exit error:', error);
      if (error.response?.status === 400 || error.response?.status === 401) {
        clearSwitchState();
        setIsSwitched(false);
        setSwitchedBy(null);
        window.dispatchEvent(new Event('auth-sync'));
      }
      toast.error(error.response?.data?.message || 'Failed to exit switched session');
    } finally {
      setExiting(false);
    }
  };

  return {
    isSwitched,
    switchedBy,
    canSwitch,
    isMasterUser,
    isModalOpen,
    openModal: () => {
      setIsModalOpen(true);
      loadUsers();
    },
    closeModal: () => setIsModalOpen(false),
    users,
    loadingUsers,
    loadUsers,
    switchUser: handleSwitchUser,
    exitSwitch: handleExitSwitch,
    switchingUserId,
    exiting,
    authRequired,
    authenticateAsMaster,
    authenticating,
  };
};
