-- ================================================================
-- KUNWAR ACCOUNTING SERVICES — Database Update v3
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. USERS TABLE (replaces old clients for auth)
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  firebase_uid text unique not null,
  email text,
  name text,
  phone text,
  photo_url text,
  role text default 'client', -- 'client' or 'admin'
  last_login timestamptz,
  notifications_enabled boolean default true
);

-- 2. TOOL LEADS TABLE (capture details before tool access)
create table if not exists tool_leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  phone text not null,
  tool_used text,
  firebase_uid text
);

-- 3. FILINGS TABLE (track filing status per client)
create table if not exists filings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references users(id) on delete cascade,
  filing_type text not null,  -- 'GST', 'ITR', 'TDS', 'PF', 'ROC'
  period text not null,        -- 'Apr 2026', 'FY 2025-26' etc
  status text default 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
  due_date date,
  completed_date date,
  remarks text,
  updated_at timestamptz default now()
);

-- 4. DOCUMENTS TABLE (client document uploads)
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references users(id) on delete cascade,
  file_name text not null,
  file_path text not null,    -- Supabase storage path
  file_type text,              -- 'PAN', 'Aadhaar', 'Bank Statement', 'Invoice', 'Other'
  file_size integer,
  uploaded_by text default 'client', -- 'client' or 'admin'
  description text
);

-- 5. REPORTS TABLE (admin uploads reports for clients)
create table if not exists reports (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  report_type text,  -- 'P&L', 'Balance Sheet', 'Tax Computation', 'GST Summary'
  period text,
  file_path text,    -- Supabase storage path
  is_read boolean default false
);

-- 6. NOTIFICATIONS TABLE
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'deadline',  -- 'deadline', 'filing', 'payment', 'general'
  is_read boolean default false,
  link text
);

-- Enable RLS on all new tables
alter table users enable row level security;
alter table tool_leads enable row level security;
alter table filings enable row level security;
alter table documents enable row level security;
alter table reports enable row level security;
alter table notifications enable row level security;

-- Open policies (same as before)
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
