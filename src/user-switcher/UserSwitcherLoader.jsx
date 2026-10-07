import React, { Suspense } from 'react';
import UserSwitcherPlugin from './index';

/**
 * User Switcher Loader
 * Encapsulated inside the user-switcher folder.
 */
export default function UserSwitcherLoader(props) {
  return (
    <Suspense fallback={null}>
      <UserSwitcherPlugin {...props} />
    </Suspense>
  );
}
