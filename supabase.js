// ============================================================
// Kunwar Accounting Services — Supabase Client
// Replace PASTE_YOUR_ANON_KEY_HERE with your actual anon key
// Supabase → Project Settings → API → anon public key (eyJ...)
// ============================================================

const SUPABASE_URL = 'https://lkvmlgpuktbxohtuvwmb.supabase.co';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY_HERE';

// Make key available globally for document upload
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

async function sbFetch(table, method = 'GET', body = null, qs = '') {
  const token = localStorage.getItem('kas_sb_token') || SUPABASE_ANON_KEY;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (method === 'POST' || method === 'PATCH') headers['Prefer'] = 'return=representation';
  const opts = { method, headers };
  if (body && method !== 'GET' && method !== 'DELETE') opts.body = JSON.stringify(body);
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + qs, opts);
  if (method === 'DELETE') return null;
  const text = await res.text();
  if (!res.ok) {
    console.error('Supabase error [' + res.status + ']', method, table, text);
    throw new Error('DB error ' + res.status + ': ' + text);
  }
  return text ? JSON.parse(text) : [];
}
