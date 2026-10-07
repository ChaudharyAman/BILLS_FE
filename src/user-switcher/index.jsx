import React from 'react';
import { useUserSwitcher } from './useUserSwitcher';
import ImpersonationBanner from './ImpersonationBanner';
import FloatingTrigger from './FloatingTrigger';
import UserSwitcherModal from './UserSwitcherModal';

/**
 * Main User Switcher Plugin Component
 * 
 * Automatically manages:
 * 1. Persistent Impersonation Banner when switched
 * 2. Floating quick-access trigger button (always visible in bottom-right corner when not switched)
 * 3. Searchable Modal to switch to any user
 */
const UserSwitcherPlugin = () => {
  const {
    isSwitched,
    switchedBy,
    canSwitch,
    isMasterUser,
    isModalOpen,
    openModal,
    closeModal,
    users,
    loadingUsers,
    loadUsers,
    switchUser,
    exitSwitch,
    switchingUserId,
    exiting,
    authRequired,
    authenticateAsMaster,
    authenticating,
  } = useUserSwitcher();

  // Secret keyboard shortcut (Ctrl + Shift + S) to open switcher
  // BUG-02 FIX: Only activate shortcut for verified Master User — regular users
  // should not even discover this feature exists via keyboard interaction.
  React.useEffect(() => {
    if (!isMasterUser) return; // do not attach listener for non-master sessions
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        openModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openModal, isMasterUser]);

  return (
    <>
      {/* 1. Impersonation Banner (Visible whenever active session is switched) */}
      {isSwitched && (
        <ImpersonationBanner
          switchedBy={switchedBy}
          onOpenSwitcher={openModal}
          onExitSwitch={exitSwitch}
          exiting={exiting}
        />
      )}

      {/* 2. Floating Trigger Button (Strictly visible ONLY to Master User when not switched) */}
      {!isSwitched && isMasterUser && (
        <FloatingTrigger
          onOpenSwitcher={openModal}
          isMasterUser={isMasterUser}
        />
      )}

      {/* 3. User Switcher Modal */}
      <UserSwitcherModal
        isOpen={isModalOpen}
        onClose={closeModal}
        users={users}
        loading={loadingUsers}
        onSwitchUser={switchUser}
        switchingUserId={switchingUserId}
        onRefresh={loadUsers}
        authRequired={authRequired}
        onAuthenticateAsMaster={authenticateAsMaster}
        authenticating={authenticating}
      />
    </>
  );
};

export default UserSwitcherPlugin;
export { useUserSwitcher, ImpersonationBanner, UserSwitcherModal, FloatingTrigger };
