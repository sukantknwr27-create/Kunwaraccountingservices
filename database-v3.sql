-- ================================================================
-- KUNWAR ACCOUNTING SERVICES — Database Update v3
-- Run this in Supabase SQL Editor AFTER your existing fix-database.sql
-- ================================================================

-- 1. USERS TABLE (Firebase auth users)
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  firebase_uid text unique not null,
  email text,
  name text,
  phone text,
  photo_url text,
  role text default 'client',
  package_name text,
  last_login timestamptz,
  notifications_enabled boolean default true
);

-- 2. TOOL LEADS TABLE
create table if not exists tool_leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  phone text not null,
  tool_used text,
  firebase_uid text
);

-- 3. FILINGS TABLE
create table if not exists filings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references users(id) on delete cascade,
  filing_type text not null,
  period text not null,
  status text default 'pending',
  due_date date,
  completed_date date,
  remarks text,
  updated_at timestamptz default now()
);

-- 4. DOCUMENTS TABLE
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size integer,
  uploaded_by text default 'client',
  description text
);

-- 5. REPORTS TABLE
create table if not exists reports (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  report_type text,
  period text,
  file_path text,
  is_read boolean default false
);

-- 6. NOTIFICATIONS TABLE
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'deadline',
  is_read boolean default false,
  link text
);

-- Enable RLS
alter table users enable row level security;
alter table tool_leads enable row level security;
alter table filings enable row level security;
alter table documents enable row level security;
alter table reports enable row level security;
alter table notifications enable row level security;

-- Drop old conflicting policies
do $$ declare r record; begin
  for r in (select policyname, tablename from pg_policies
            where tablename in ('users','tool_leads','filings','documents','reports','notifications'))
  loop execute format('drop policy if exists %I on %I', r.policyname, r.tablename); end loop;
end $$;

-- Open policies
create policy "open_users"         on users         for all using (true) with check (true);
create policy "open_tool_leads"    on tool_leads    for all using (true) with check (true);
create policy "open_filings"       on filings       for all using (true) with check (true);
create policy "open_documents"     on documents     for all using (true) with check (true);
create policy "open_reports"       on reports       for all using (true) with check (true);
create policy "open_notifications" on notifications for all using (true) with check (true);

-- Verify
select 'users' as tbl, count(*) from users
union all select 'tool_leads', count(*) from tool_leads
union all select 'filings', count(*) from filings
union all select 'documents', count(*) from documents
union all select 'reports', count(*) from reports
union all select 'notifications', count(*) from notifications;
