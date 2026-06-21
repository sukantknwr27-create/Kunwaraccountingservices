// ============================================================
// Admin Auth Guard — include this in admin.html
// Checks Firebase auth and redirects if not admin
// ============================================================

import { onUserChanged, isFirebaseAdmin, kasSignOut } from './firebase.js';

export function requireAdmin() {
  return new Promise((resolve) => {
    onUserChanged(async user => {
      if (!user) {
        window.location.href = 'admin-login.html';
        return;
      }
      if (!isFirebaseAdmin(user)) {
        await kasSignOut();
        window.location.href = 'admin-login.html';
        return;
      }
      resolve(user);
    });
  });
}
