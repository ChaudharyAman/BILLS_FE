# User Switcher Extension (Frontend)

This folder contains the complete, isolated frontend implementation for the **User Switcher & Impersonation** feature.

---

## 🌟 What This Feature Provides

1. **Floating "Switch User" Button**:
   - Automatically appears for the Master User (or Superadmin) on any page of the app.
   - Clicking it opens a fast, searchable user directory.

2. **User Switcher Modal**:
   - Live search by username, email, phone.
   - Filter by role (Admins, Regular Users, All).
   - View plan badges (Pro/Free), active status.
   - 1-click **Switch** button to impersonate and navigate as that user.

3. **Persistent Impersonation Banner**:
   - While impersonating any user, a high-visibility, sleek banner is pinned to the top of the screen:
     - Shows who you are currently viewing as.
     - Provides a **Switch User** button to jump directly to someone else.
     - Provides an **Exit to Master** button to restore your original Master User session instantly.

---

## 🗑️ How to Delete / Remove This Feature

This folder is 100% plug-and-play and isolated:
1. You can delete the entire `MBF/src/user-switcher/` folder at any time.
2. The dynamic loader (`UserSwitcherLoader.jsx`) detects that the folder was removed and safely renders `null`.
3. Your application will build and run without any errors, warnings, or missing dependencies.
