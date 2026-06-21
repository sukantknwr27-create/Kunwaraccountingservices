// Kunwar Accounting Services — Supabase Client
// Guard against duplicate loading (fixes "already declared" error)
if (typeof window.SUPABASE_ANON_KEY === 'undefined') {

  var SUPABASE_URL      = 'https://lkvmlgpuktbxohtuvwmb.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrdm1sZ3B1a3RieG9odHV2d21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NjY2MTUsImV4cCI6MjA5MTU0MjYxNX0.KKhiMsZSwBbiyQo3B5jHKxerIYQqMZ18HvDY03u2J6I';

  window.SUPABASE_URL      = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

  window.sbFetch = async function(table, method, body, qs) {
    method = method || 'GET';
    body   = body   || null;
    qs     = qs     || '';
    var headers = {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type':  'application/json',
      'Accept':        'application/json'
    };
    if (method === 'POST' || method === 'PATCH') headers['Prefer'] = 'return=representation';
    var opts = { method: method, headers: headers };
    if (body && method !== 'GET' && method !== 'DELETE') opts.body = JSON.stringify(body);
    var res = await fetch(SUPABASE_URL + '/rest/v1/' + table + qs, opts);
    if (method === 'DELETE') return null;
    var text = await res.text();
    if (!res.ok) {
      console.error('Supabase error [' + res.status + ']', table, text);
      throw new Error('DB error ' + res.status + ': ' + text);
    }
    return text ? JSON.parse(text) : [];
  };

}
