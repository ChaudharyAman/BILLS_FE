import { useMemo } from 'react';

/**
 * Custom hook for checking user RBAC permissions in frontend UI.
 * NOTE: This is for UX convenience only (showing/hiding buttons).
 * The backend `authorize()` middleware is the real security boundary.
 */
export function usePermissions() {
  const userStr = localStorage.getItem('user');

  const authData = useMemo(() => {
    if (!userStr) return null;
    try {
      const parsed = JSON.parse(userStr);
      return parsed.user || parsed;
    } catch (e) {
      return null;
    }
  }, [userStr]);

  const isOwner = Boolean(authData?.isOwner) || authData?.role === 'superadmin';
  const permissions = authData?.permissions || {};
  const enabledModules = authData?.enabledModules;

  const isModuleEnabled = (moduleName) => {
    if (authData?.role === 'superadmin') return true;
    if (!enabledModules || !Array.isArray(enabledModules)) return true;
    return enabledModules.includes(moduleName);
  };

  const can = (moduleName, action = 'view') => {
    if (!isModuleEnabled(moduleName)) return false;
    if (authData?.role === 'superadmin') return true;
    if (isOwner) {
      const modPerms = permissions[moduleName];
      if (modPerms && modPerms[action] === false) return false;
      return true;
    }
    const modPerms = permissions[moduleName];
    if (!modPerms) return false;
    return Boolean(modPerms[action]);
  };

  return {
    isOwner,
    can,
    isModuleEnabled,
    enabledModules,
    user: authData,
    permissions,
  };
}

export default usePermissions;
