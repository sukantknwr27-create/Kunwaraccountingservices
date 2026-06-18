// ============================================================
// Kunwar Accounting Services — Firebase Configuration
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, RecaptchaVerifier,
         signInWithPopup, signInWithPhoneNumber,
         createUserWithEmailAndPassword, signInWithEmailAndPassword,
         signOut, onAuthStateChanged, updateProfile }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// ── Supabase config (kept in one place) ──────────────────────
const SUPABASE_URL  = 'https://lkvmlgpuktbxohtuvwmb.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrdm1sZ3B1a3RieG9odHV2d21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NjY2MTUsImV4cCI6MjA5MTU0MjYxNX0.KKhiMsZSwBbiyQo3B5jHKxerIYQqMZ18HvDY03u2J6I'; // same key as supabase.js

async function sbFetch(table, method='GET', body=null, qs='') {
  const token = localStorage.getItem('kas_sb_token') || SUPABASE_KEY;
  const h = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (method==='POST'||method==='PATCH') h['Prefer']='return=representation';
  const opts = { method, headers: h };
  if (body && method!=='GET' && method!=='DELETE') opts.body = JSON.stringify(body);
  const res = await fetch(SUPABASE_URL+'/rest/v1/'+table+qs, opts);
  if (method==='DELETE') return null;
  const text = await res.text();
  if (!res.ok) throw new Error('DB error '+res.status+': '+text);
  return text ? JSON.parse(text) : [];
}

// ── Save user to Supabase after any login ─────────────────────
async function syncUserToSupabase(firebaseUser) {
  if (!firebaseUser) return;
  try {
    const existing = await sbFetch('users','GET',null,
      `?firebase_uid=eq.${firebaseUser.uid}&select=id`);
    const payload = {
      firebase_uid:  firebaseUser.uid,
      email:         firebaseUser.email || '',
      name:          firebaseUser.displayName || '',
      phone:         firebaseUser.phoneNumber || '',
      photo_url:     firebaseUser.photoURL || '',
      last_login:    new Date().toISOString()
    };
    if (existing && existing.length > 0) {
      await sbFetch('users','PATCH',payload,`?firebase_uid=eq.${firebaseUser.uid}`);
    } else {
      await sbFetch('users','POST',{...payload, role:'client', created_at: new Date().toISOString()});
    }
    localStorage.setItem('kas_user_data', JSON.stringify({
      uid:   firebaseUser.uid,
      email: firebaseUser.email,
      name:  firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Client',
      phone: firebaseUser.phoneNumber || '',
      photo: firebaseUser.photoURL || ''
    }));
  } catch(e) { console.warn('User sync error:', e); }
}

// ── Auth State Observer ────────────────────────────────────────
function onUserChanged(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) await syncUserToSupabase(user);
    callback(user);
  });
}

// ── Google Sign-In ────────────────────────────────────────────
async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await syncUserToSupabase(result.user);
  return result.user;
}

// ── Email + Password ──────────────────────────────────────────
async function signUpEmail(email, password, name, phone) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  // Also save phone to Supabase since Firebase email auth doesn't store phone
  await syncUserToSupabase({...cred.user, displayName: name, phoneNumber: phone});
  return cred.user;
}

async function signInEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await syncUserToSupabase(cred.user);
  return cred.user;
}

// ── Phone OTP ─────────────────────────────────────────────────
function setupRecaptcha(containerId) {
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
    window.recaptchaVerifier = null;
  }
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {}
  });
  return window.recaptchaVerifier;
}

async function sendOTP(phoneNumber) {
  // phoneNumber must be in format +91XXXXXXXXXX
  const recaptcha = setupRecaptcha('recaptcha-container');
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptcha);
  window.confirmationResult = confirmation;
  return confirmation;
}

async function verifyOTP(otp) {
  if (!window.confirmationResult) throw new Error('No OTP sent yet');
  const cred = await window.confirmationResult.confirm(otp);
  await syncUserToSupabase(cred.user);
  return cred.user;
}

// ── Sign Out ──────────────────────────────────────────────────
async function kasSignOut() {
  await signOut(auth);
  localStorage.removeItem('kas_user_data');
  localStorage.removeItem('kas_sb_token');
  localStorage.removeItem('kas_tool_access');
}

// ── Get current user data ─────────────────────────────────────
function getCurrentUser() {
  const raw = localStorage.getItem('kas_user_data');
  return raw ? JSON.parse(raw) : null;
}

function isLoggedIn() { return !!auth.currentUser; }

export {
  auth, googleProvider, app,
  signInWithGoogle, signUpEmail, signInEmail,
  sendOTP, verifyOTP, kasSignOut,
  onUserChanged, getCurrentUser, isLoggedIn,
  syncUserToSupabase, sbFetch
};
