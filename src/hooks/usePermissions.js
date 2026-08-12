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

  const can = (moduleName, action = 'view') => {
    if (isOwner) return true;
    const modPerms = permissions[moduleName];
    if (!modPerms) return false;
    return Boolean(modPerms[action]);
  };

  return {
    isOwner,
    can,
    user: authData,
    permissions,
  };
}

export default usePermissions;
