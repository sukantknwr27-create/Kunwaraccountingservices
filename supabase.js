const SUPABASE_URL = 'https://lkvmlgpuktbxohtuvwmb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CRGsBcmAzvJxwc1YbLKBXQ_4YqS7alj';

async function sbFetch(table, method='GET', body=null, qs='') {
  const token = localStorage.getItem('kas_token') || SUPABASE_KEY;
  const url = `${SUPABASE_URL}/rest/v1/${table}${qs}`;
  const h = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (method === 'POST' || method === 'PATCH') h['Prefer'] = 'return=representation';
  const opts = { method, headers: h };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (method === 'DELETE') return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function authPost(path, payload) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.error || data.msg) throw new Error(data.error?.message || data.msg || 'Auth error');
  return data;
}

async function signUp(email, password, name, phone, business) {
  return authPost('signup', { email, password, data: { name, phone, business_name: business } });
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

function adminSignOut() {
  localStorage.removeItem('kas_token');
  localStorage.removeItem('kas_user');
  window.location.href = 'admin-login.html';
}

function getUser() {
  const u = localStorage.getItem('kas_user');
  return u ? JSON.parse(u) : null;
}

function getToken() { return localStorage.getItem('kas_token'); }

function requireAuth() {
  if (!getToken()) { window.location.href = 'login.html'; return false; }
  return true;
}

function isAdmin() {
  const u = getUser();
  return u && u.email === 'sukant@kunwaraccountingservices.in';
}

async function sendPasswordReset(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return res.ok;
}

async function updatePassword(newPassword) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword })
  });
  return res.ok;
}
