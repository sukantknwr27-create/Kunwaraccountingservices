// ============================================================
// IMPORTANT: Replace SUPABASE_ANON_KEY below with your real
// anon key from: Supabase → Project Settings → API → anon public
// It starts with "eyJ..." and is very long
// ============================================================

const SUPABASE_URL = 'https://lkvmlgpuktbxohtuvwmb.supabase.co';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY_HERE';

// ── Core database fetch ───────────────────────────────────────────────────
async function sbFetch(table, method = 'GET', body = null, qs = '') {
  // Use logged-in user's token if available, otherwise use anon key
  const token = localStorage.getItem('kas_token') || SUPABASE_ANON_KEY;

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
  }

  const opts = { method, headers };
  if (body && method !== 'GET' && method !== 'DELETE') {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + qs, opts);

  if (method === 'DELETE') return null;

  const text = await res.text();

  if (!res.ok) {
    console.error('Supabase error [' + res.status + '] ' + method + ' ' + table + ':', text);
    throw new Error('DB error ' + res.status + ': ' + text);
  }

  return text ? JSON.parse(text) : [];
}

// ── Auth helpers ──────────────────────────────────────────────────────────
async function authPost(path, payload) {
  const res = await fetch(SUPABASE_URL + '/auth/v1/' + path, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || data.error || 'Auth failed');
  return data;
}

async function signUp(email, password, name, phone, business) {
  return authPost('signup', {
    email, password,
    data: { name, phone, business_name: business }
  });
}

async function signIn(email, password) {
  const data = await authPost('token?grant_type=password', { email, password });
  localStorage.setItem('kas_token', data.access_token);
  localStorage.setItem('kas_user', JSON.stringify(data.user));
  return data;
}

function signOut() {
  localStorage.removeItem('kas_token');
  localStorage.removeItem('kas_user');
  window.location.href = 'index.html';
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('kas_user') || 'null'); }
  catch { return null; }
}

function getToken() {
  return localStorage.getItem('kas_token');
}

function requireAuth() {
  if (!getToken()) { window.location.href = 'login.html'; return false; }
  return true;
}

function isAdmin() {
  const u = getUser();
  return u && u.email === 'sukant@kunwaraccountingservices.in';
}

async function sendPasswordReset(email) {
  const res = await fetch(SUPABASE_URL + '/auth/v1/recover', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return res.ok;
}

async function updatePassword(newPassword) {
  const res = await fetch(SUPABASE_URL + '/auth/v1/user', {
    method: 'PUT',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + getToken(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: newPassword })
  });
  return res.ok;
}
