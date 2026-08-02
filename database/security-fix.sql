-- ================================================================
-- KUNWAR ACCOUNTING SERVICES — SECURITY FIX
-- Replaces the wide-open "using (true) with check (true)" policies
-- (which let anyone with the public anon key read/write/delete every
-- client's data) with policies scoped to real identity.
--
-- ⚠️ REQUIRED ONE-TIME SETUP BEFORE RUNNING THIS FILE:
-- This app authenticates users with Firebase, not Supabase Auth, so
-- there is no built-in auth.uid(). To let Postgres RLS see WHO is
-- calling, you must turn on Supabase's "Third-Party Auth" support
-- for Firebase so Supabase accepts and verifies Firebase ID tokens:
--   Supabase Dashboard → Project Settings → Authentication →
--   Third-Party Auth → Add provider → Firebase → paste your
--   Firebase Project ID (kunwar-accounting).
-- Once that's enabled, a Firebase ID token sent as the request's
-- Authorization: Bearer header is verified by Supabase and exposed
-- to policies as auth.jwt(), with the Firebase UID in auth.jwt()->>'sub'
-- and the user's email in auth.jwt()->>'email'.
--
-- The site's JS (js/supabase.js, js/notifications.js, js/firebase.js,
-- pages/account/login.html, pages/account/dashboard.html) has already
-- been updated to send the signed-in user's Firebase ID token instead
-- of the anon key, so no further front-end changes are needed once
-- Third-Party Auth is turned on.
--
-- FAIL-CLOSED BY DESIGN: if you skip the setup step above, auth.jwt()
-- will simply be null and every policy below will deny access rather
-- than allow it — the site's public pages (services/packages/pricing,
-- lead forms) will keep working, but login-only dashboards/admin panel
-- will not, until Third-Party Auth is configured.
--
-- Run this in the Supabase SQL Editor. Test on a staging project
-- first if possible before running against production.
-- ================================================================

-- ── Admin helper ────────────────────────────────────────────────
-- Centralizes the "is this the business owner?" check in one place.
-- Uses the verified email claim from the Firebase ID token, not
-- anything a client can spoof on their own.
create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'sukant@kunwaraccountingservices.in';
$$;

-- ── Drop all previous "open" policies ───────────────────────────
do $$
declare r record;
begin
  for r in (
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('users','tool_leads','filings','documents','reports',
                         'notifications','services','packages','testimonials',
                         'payment_settings','clients','due_dates','contact_forms','payments')
  ) loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- ── users: self or admin ────────────────────────────────────────
create policy "users_select" on users for select
  using (is_admin() or firebase_uid = auth.jwt()->>'sub');
create policy "users_insert" on users for insert
  with check (is_admin() or firebase_uid = auth.jwt()->>'sub');
create policy "users_update" on users for update
  using (is_admin() or firebase_uid = auth.jwt()->>'sub');
create policy "users_delete" on users for delete
  using (is_admin());

-- ── filings: client can read their own; only admin manages them ─
create policy "filings_select" on filings for select
  using (is_admin() or user_id in (select id from users where firebase_uid = auth.jwt()->>'sub'));
create policy "filings_admin_write" on filings for all
  using (is_admin()) with check (is_admin());

-- ── documents: client owns theirs (read/upload/delete); admin all ─
create policy "documents_select" on documents for select
  using (is_admin() or user_id in (select id from users where firebase_uid = auth.jwt()->>'sub'));
create policy "documents_insert" on documents for insert
  with check (is_admin() or user_id in (select id from users where firebase_uid = auth.jwt()->>'sub'));
create policy "documents_delete" on documents for delete
  using (is_admin() or user_id in (select id from users where firebase_uid = auth.jwt()->>'sub'));
create policy "documents_update" on documents for update
  using (is_admin());

-- ── reports: client can read/mark-read their own; admin creates ─
create policy "reports_select" on reports for select
  using (is_admin() or user_id in (select id from users where firebase_uid = auth.jwt()->>'sub'));
create policy "reports_update" on reports for update
  using (is_admin() or user_id in (select id from users where firebase_uid = auth.jwt()->>'sub'));
create policy "reports_admin_write" on reports for insert
  with check (is_admin());
create policy "reports_admin_delete" on reports for delete
  using (is_admin());

-- ── notifications: client reads/marks-read their own; admin sends ─
create policy "notifications_select" on notifications for select
  using (is_admin() or user_id in (select id from users where firebase_uid = auth.jwt()->>'sub'));
create policy "notifications_update" on notifications for update
  using (is_admin() or user_id in (select id from users where firebase_uid = auth.jwt()->>'sub'));
create policy "notifications_insert" on notifications for insert
  with check (is_admin());
create policy "notifications_delete" on notifications for delete
  using (is_admin());

-- ── Public marketing content: anyone can read, only admin edits ──
create policy "services_read" on services for select using (true);
create policy "services_admin_write" on services for insert with check (is_admin());
create policy "services_admin_update" on services for update using (is_admin());
create policy "services_admin_delete" on services for delete using (is_admin());

create policy "packages_read" on packages for select using (true);
create policy "packages_admin_write" on packages for insert with check (is_admin());
create policy "packages_admin_update" on packages for update using (is_admin());
create policy "packages_admin_delete" on packages for delete using (is_admin());

create policy "testimonials_read" on testimonials for select using (true);
create policy "testimonials_admin_write" on testimonials for insert with check (is_admin());
create policy "testimonials_admin_update" on testimonials for update using (is_admin());
create policy "testimonials_admin_delete" on testimonials for delete using (is_admin());

create policy "payment_settings_read" on payment_settings for select using (true);
create policy "payment_settings_admin_write" on payment_settings for insert with check (is_admin());
create policy "payment_settings_admin_update" on payment_settings for update using (is_admin());

-- ── Public lead-capture forms: anyone can submit, only admin reads ─
create policy "tool_leads_insert" on tool_leads for insert with check (true);
create policy "tool_leads_admin_select" on tool_leads for select using (is_admin());
create policy "tool_leads_admin_delete" on tool_leads for delete using (is_admin());

create policy "contact_forms_insert" on contact_forms for insert with check (true);
create policy "contact_forms_admin_select" on contact_forms for select using (is_admin());
create policy "contact_forms_admin_delete" on contact_forms for delete using (is_admin());

-- ── Internal CRM data (no public-facing form touches these): admin only ─
create policy "clients_admin_all" on clients for all using (is_admin()) with check (is_admin());
create policy "due_dates_admin_all" on due_dates for all using (is_admin()) with check (is_admin());
create policy "payments_admin_all" on payments for all using (is_admin()) with check (is_admin());

-- ================================================================
-- STORAGE: lock down the client-documents bucket the same way.
-- Each client's files live under a folder named after their Firebase
-- UID (see dashboard.html), so the folder name itself is the check.
-- Run this AFTER creating the 'client-documents' bucket if you
-- haven't already (Supabase Dashboard → Storage → New bucket,
-- name: client-documents, Public: OFF).
-- ================================================================
drop policy if exists "client_documents_select" on storage.objects;
drop policy if exists "client_documents_insert" on storage.objects;
drop policy if exists "client_documents_delete" on storage.objects;

create policy "client_documents_select" on storage.objects for select
  using (
    bucket_id = 'client-documents'
    and (is_admin() or (storage.foldername(name))[1] = auth.jwt()->>'sub')
  );
create policy "client_documents_insert" on storage.objects for insert
  with check (
    bucket_id = 'client-documents'
    and (is_admin() or (storage.foldername(name))[1] = auth.jwt()->>'sub')
  );
create policy "client_documents_delete" on storage.objects for delete
  using (
    bucket_id = 'client-documents'
    and (is_admin() or (storage.foldername(name))[1] = auth.jwt()->>'sub')
  );
