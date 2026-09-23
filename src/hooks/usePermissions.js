import { useMemo, useCallback } from 'react';

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

  const isSharedSession =
    sessionStorage.getItem('isSharedSession') === 'true' ||
    sessionStorage.getItem('isSharedViewOnly') === 'true' ||
    localStorage.getItem('isSharedViewOnly') === 'true';

  const shareRules = useMemo(() => {
    if (!isSharedSession) return null;
    try {
      const stored = sessionStorage.getItem('shareRules');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [isSharedSession]);

  const shareAccessLevel =
    shareRules?.accessLevel ||
    sessionStorage.getItem('shareAccessLevel') ||
    (sessionStorage.getItem('isSharedViewOnly') === 'true' ? 'VIEW_ONLY' : 'VIEW_ONLY');

  const isSharedViewOnly = isSharedSession && shareAccessLevel === 'VIEW_ONLY';
  const isSharedCanEdit = isSharedSession && shareAccessLevel === 'CAN_EDIT';

  const isOwner = !isSharedSession && (Boolean(authData?.isOwner) || authData?.role === 'superadmin');
  const permissions = authData?.permissions || {};
  const enabledModules = authData?.enabledModules;

  const isModuleEnabled = useCallback((moduleName) => {
    if (isSharedSession) {
      if (!shareRules || !Array.isArray(shareRules.modules) || shareRules.modules.length === 0) {
        return false;
      }
      const allowed = new Set(shareRules.modules);
      if (moduleName === 'reports' && (allowed.has('reports') || allowed.has('financialReports'))) return true;
      if (moduleName === 'financialReports' && (allowed.has('reports') || allowed.has('financialReports'))) return true;
      if (moduleName === 'income' && (allowed.has('income') || allowed.has('incomes'))) return true;
      if (moduleName === 'incomes' && (allowed.has('income') || allowed.has('incomes'))) return true;
      return allowed.has(moduleName);
    }
    if (authData?.role === 'superadmin') return true;
    if (!enabledModules || !Array.isArray(enabledModules)) return true;
    return enabledModules.includes(moduleName);
  }, [authData?.role, isSharedSession, shareRules, enabledModules]);

  const can = useCallback((moduleName, action = 'view') => {
    // Shared Mode Boundary
    if (isSharedSession) {
      if (!isModuleEnabled(moduleName)) return false;

      // PDF / Print download check
      if (action === 'pdf' || action === 'print') {
        return shareRules?.allowPdfDownload !== false;
      }

      // CSV/Excel Export check
      if (action === 'export') {
        return Boolean(shareRules?.allowDataExport);
      }

      // Communication actions (send email) - never allowed in view-only share
      if (action === 'email' || action === 'sendEmail') {
        return isSharedCanEdit;
      }

      if (action === 'view') return true;

      // Destructive/management actions are never permitted in public/invite shares
      if (action === 'delete' || action === 'approve') return false;

      // In VIEW_ONLY mode, reject write actions
      if (isSharedViewOnly) return false;

      // In CAN_EDIT mode, check if module has a specific view-only override
      if (isSharedCanEdit && (action === 'create' || action === 'edit')) {
        const modPerm = shareRules?.modulePermissions?.[moduleName];
        if (modPerm === 'view') return false;
        return true;
      }

      return false;
    }

    if (!isModuleEnabled(moduleName)) return false;
    if (authData?.role === 'superadmin') return true;

    // Normal user convenience checks for export, print, email
    if (action === 'export' || action === 'pdf' || action === 'print') {
      return isOwner || Boolean(permissions[moduleName]?.view);
    }
    if (action === 'email' || action === 'sendEmail') {
      return isOwner || Boolean(permissions[moduleName]?.edit || permissions[moduleName]?.create);
    }

    if (isOwner) {
      const modPerms = permissions[moduleName];
      if (modPerms && modPerms[action] === false) return false;
      return true;
    }
    const modPerms = permissions[moduleName];
    if (!modPerms) return false;
    return Boolean(modPerms[action]);
  }, [isSharedSession, isSharedViewOnly, isSharedCanEdit, shareRules, isModuleEnabled, authData?.role, isOwner, permissions]);

  return {
    isOwner,
    isSharedSession,
    isSharedViewOnly,
    isSharedCanEdit,
    shareAccessLevel,
    shareRules,
    can,
    isModuleEnabled,
    enabledModules,
    user: authData,
    permissions,
  };
}

export default usePermissions;
