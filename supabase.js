// ============================================================
// Kunwar Accounting Services — Supabase Client
// Replace eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrdm1sZ3B1a3RieG9odHV2d21liwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NjY2MTUsImV4cCI6MjA5MTU0MjYxNX0.KKhiMsZSwBbiyQo3B5jHKxerIYQqMZ18HvDY03u2J6I with your actual anon key
// Supabase → Project Settings → API → anon public key (eyJ...)
// ============================================================

const SUPABASE_URL = 'https://lkvmlgpuktbxohtuvwmb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrdm1sZ3B1a3RieG9odHV2d21liwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NjY2MTUsImV4cCI6MjA5MTU0MjYxNX0.KKhiMsZSwBbiyQo3B5jHKxerIYQqMZ18HvDY03u2J6I';

// Make key available globally for document upload
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

async function sbFetch(table, method = 'GET', body = null, qs = '') {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
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
