# What was fixed

## 🔴 Security (do this first)
- **`database/security-fix.sql`** — new file. Replaces the wide-open
  `using (true) with check (true)` RLS policies (which let anyone with the
  public anon key read/write/delete every client's data) with policies
  scoped to real identity: clients can only see their own filings,
  documents, reports, notifications; only the admin email can manage
  clients, payments, due dates, and site content. Public forms
  (contact, tool leads) stay insert-only for visitors. Also locks down
  the `client-documents` storage bucket the same way.
- **Required one-time setup before this SQL will work**: this app logs
  people in with Firebase, not Supabase Auth, so Postgres RLS has no way
  to know who's asking unless you turn on Supabase's **Third-Party Auth**
  support for Firebase (Project Settings → Authentication → Third-Party
  Auth → Add provider → Firebase → your Firebase project ID). Full
  instructions are in the comment block at the top of the SQL file.
  **Fails closed**: if you skip this step, the policies simply deny
  everyone rather than leaving anything open, so public pages keep working
  but the dashboard/admin panel won't work until it's configured.
- Updated `js/supabase.js`, `js/notifications.js`, `js/firebase.js`,
  `pages/account/login.html`, `pages/account/dashboard.html` so every
  Supabase request now sends the signed-in user's Firebase ID token
  instead of the shared anon key — this is what lets the new RLS
  policies identify the caller.
- Document uploads now save into a storage folder named after the
  client's Firebase UID (`dashboard.html`) so storage policies can
  verify ownership.
- Removed `js/admin-auth-check.js` — it was dead code that imported
  functions that don't exist in `firebase.js` (would have thrown an
  error if it were ever actually loaded) and wasn't referenced by any
  page. Cleaned up its leftover references in `vercel.json` and `js/nav.js`.
- Added `<meta name="robots" content="noindex, nofollow">` to all four
  account pages (`admin.html`, `admin-login.html`, `dashboard.html`,
  `login.html`) so they can't end up indexed even if linked externally.
- Added `/firebase.js` to `robots.txt`'s disallow list to match the
  other internal scripts.

## 🟡 SEO
- Added the missing `<link rel="canonical">` to the 5 calculator pages
  that didn't have one (depreciation, EMI, P&L, salary, HRA calculators).
- Moved the homepage's JSON-LD business schema out of a JS-injected
  `<script>` (added to `<head>` at runtime) into a static `<script>` tag
  in the HTML, so it's guaranteed to be seen even without JS execution.

## ⚪ Dead code / config cleanup
- `manifest.json` was completely unused (not linked from any page) and
  pointed at a non-existent `/app.html` and 8 icon files that didn't
  exist. Generated real icon PNGs from your actual `favicon.svg` brand
  mark (`icons/icon-*.png`, 72–512px), pointed `start_url` and shortcuts
  at real pages, and linked the manifest from `index.html` so the site
  is now actually installable as a PWA from the homepage. (If you want
  it installable from every page, add the same
  `<link rel="manifest" href="manifest.json"/>` line — adjusting the
  relative path — to the other pages' `<head>`.)

## What to do next
1. Run `database/security-fix.sql` in the Supabase SQL editor (staging
   first if you have one).
2. Enable Firebase Third-Party Auth in Supabase (see the SQL file's
   header comment).
3. Deploy this updated code.
4. Log in as a normal client and as the admin and click through the
   dashboard/admin panel once to confirm reads/writes still work end
   to end — I wasn't able to test against your live Supabase/Firebase
   project, so this step matters.
