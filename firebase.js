// ============================================================
// Kunwar Accounting Services — Firebase Auth
// Pure Firebase only — no Supabase dependency here
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDZYQYkyqUYqhmzu2vOtIdX2SrHDROiM0Y",
  authDomain:        "kunwar-accounting.firebaseapp.com",
  projectId:         "kunwar-accounting",
  storageBucket:     "kunwar-accounting.firebasestorage.app",
  messagingSenderId: "775485451446",
  appId:             "1:775485451446:web:6aa2c71f32302680670a17"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'en';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// ── Save user to localStorage after login ─────────────────────
function saveUserLocally(user) {
  if (!user) return;
  localStorage.setItem('kas_user_data', JSON.stringify({
    uid:   user.uid,
    email: user.email || '',
    name:  user.displayName || user.email?.split('@')[0] || 'Client',
    phone: user.phoneNumber || '',
    photo: user.photoURL || ''
  }));
}

// ── Save user to Supabase (best effort — won't block login) ──
async function syncToSupabase(user) {
  if (!user) return;
  try {
    const key = window.SUPABASE_ANON_KEY;
    if (!key || key === 'PASTE_YOUR_ANON_KEY_HERE') return; // skip if not configured
    const url = 'https://lkvmlgpuktbxohtuvwmb.supabase.co/rest/v1/users';
    const payload = {
      firebase_uid: user.uid,
      email: user.email || '',
      name: user.displayName || '',
      phone: user.phoneNumber || '',
      photo_url: user.photoURL || '',
      last_login: new Date().toISOString()
    };
    // Try upsert
    await fetch(url + `?firebase_uid=eq.${user.uid}`, {
      method: 'PATCH',
      headers: {
        'apikey': key, 'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json', 'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    }).then(async r => {
      if (r.status === 404 || (await r.json()).length === 0) {
        // User doesn't exist, create
        await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': key, 'Authorization': 'Bearer ' + key,
            'Content-Type': 'application/json', 'Prefer': 'return=representation'
          },
          body: JSON.stringify({ ...payload, role: 'client', created_at: new Date().toISOString() })
        });
      }
    });
  } catch(e) {
    // Silent fail — don't block login if Supabase sync fails
    console.warn('Supabase sync (non-critical):', e.message);
  }
}

// ── Auth state observer ───────────────────────────────────────
function onUserChanged(callback) {
  return onAuthStateChanged(auth, async user => {
    if (user) {
      saveUserLocally(user);
      syncToSupabase(user); // async, non-blocking
    } else {
      localStorage.removeItem('kas_user_data');
    }
    callback(user);
  });
}

// ── Google Sign-In ────────────────────────────────────────────
async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  saveUserLocally(result.user);
  syncToSupabase(result.user);
  return result.user;
}

// ── Email + Password ──────────────────────────────────────────
async function signUpEmail(email, password, name, phone) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  // Reload to get updated profile
  await cred.user.reload();
  saveUserLocally({ ...cred.user, displayName: name, phoneNumber: phone });
  syncToSupabase({ ...cred.user, displayName: name, phoneNumber: phone });
  return cred.user;
}

async function signInEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  saveUserLocally(cred.user);
  syncToSupabase(cred.user);
  return cred.user;
}

// ── Phone OTP ─────────────────────────────────────────────────
function setupRecaptcha(containerId) {
  try {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  } catch(e) {}
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {}
  });
  return window.recaptchaVerifier;
}

async function sendOTP(phoneNumber) {
  const recaptcha = setupRecaptcha('recaptcha-container');
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptcha);
  window.confirmationResult = confirmation;
  return confirmation;
}

async function verifyOTP(otp) {
  if (!window.confirmationResult) throw new Error('No OTP sent. Please send OTP first.');
  const cred = await window.confirmationResult.confirm(otp);
  saveUserLocally(cred.user);
  syncToSupabase(cred.user);
  return cred.user;
}

// ── Password Reset ────────────────────────────────────────────
async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Sign Out ──────────────────────────────────────────────────
async function kasSignOut() {
  await signOut(auth);
  localStorage.removeItem('kas_user_data');
  localStorage.removeItem('kas_tool_access');
  localStorage.removeItem('kas_sb_token');
}

// ── Helpers ───────────────────────────────────────────────────
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('kas_user_data') || 'null'); }
  catch(e) { return null; }
}

function isFirebaseAdmin(user) {
  return user && user.email === 'sukant@kunwaraccountingservices.in';
}

export {
  auth, app,
  onUserChanged,
  signInWithGoogle,
  signUpEmail,
  signInEmail,
  sendOTP, verifyOTP,
  resetPassword,
  kasSignOut,
  getCurrentUser,
  isFirebaseAdmin,
  updateProfile
};
