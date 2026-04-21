-- ================================================================
-- COMPLETE FIX - PASTE ALL OF THIS IN SUPABASE SQL EDITOR → RUN
-- ================================================================

-- STEP 1: Create tables if they don't exist yet
create table if not exists services (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  category text not null,
  name text not null,
  fee_range text not null,
  description text,
  is_active boolean default true,
  sort_order int default 0
);

create table if not exists packages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  category text not null,
  name text not null,
  price_range text not null,
  billing_cycle text default 'month',
  description text,
  includes text[],
  is_popular boolean default false,
  is_active boolean default true,
  sort_order int default 0
);

create table if not exists testimonials (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  client_name text not null,
  business_name text,
  service_type text,
  review_text text not null,
  rating int default 5,
  initials text,
  avatar_color text default '#0C447C',
  is_active boolean default true,
  sort_order int default 0
);

create table if not exists payment_settings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  upi_id text,
  upi_enabled boolean default true,
  paytm_number text,
  paytm_enabled boolean default true,
  bank_name text,
  bank_account text,
  bank_ifsc text,
  bank_enabled boolean default true,
  payment_note text,
  updated_at timestamptz default now()
);

create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  email text unique not null,
  phone text,
  business_name text,
  business_type text,
  package_id uuid,
  status text default 'active'
);

create table if not exists due_dates (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  client_id uuid references clients(id) on delete cascade,
  service_name text not null,
  due_date date not null,
  status text default 'pending',
  notes text
);

create table if not exists contact_forms (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  phone text not null,
  email text,
  business_type text,
  service_needed text,
  message text,
  is_read boolean default false
);

create table if not exists payments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  client_id uuid references clients(id) on delete cascade,
  amount numeric not null,
  payment_method text,
  service_description text,
  status text default 'pending',
  payment_date date
);

-- STEP 2: Enable RLS on all tables
alter table services enable row level security;
alter table packages enable row level security;
alter table testimonials enable row level security;
alter table payment_settings enable row level security;
alter table clients enable row level security;
alter table due_dates enable row level security;
alter table contact_forms enable row level security;
alter table payments enable row level security;

-- STEP 3: Drop ALL old policies (completely clean slate)
do $$ declare r record; begin
  for r in (select policyname, tablename from pg_policies
            where tablename in ('services','packages','testimonials','payment_settings',
                                'clients','due_dates','contact_forms','payments'))
  loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- STEP 4: Create simple open policies — allow all operations for anon + authenticated
create policy "open_services"         on services         for all using (true) with check (true);
create policy "open_packages"         on packages         for all using (true) with check (true);
create policy "open_testimonials"     on testimonials     for all using (true) with check (true);
create policy "open_payment_settings" on payment_settings for all using (true) with check (true);
create policy "open_clients"          on clients          for all using (true) with check (true);
create policy "open_due_dates"        on due_dates        for all using (true) with check (true);
create policy "open_contact_forms"    on contact_forms    for all using (true) with check (true);
create policy "open_payments"         on payments         for all using (true) with check (true);

-- STEP 5: Insert default data only if tables are empty

-- Payment settings
insert into payment_settings (upi_id, upi_enabled, paytm_number, paytm_enabled, bank_name, bank_account, bank_ifsc, bank_enabled, payment_note)
select 'sukant.kunwar@superyes', true, '+91 80761 36300', true,
       'Your Bank Name', 'XXXX XXXX XXXX', 'XXXXXXXX', true,
       'Please send payment screenshot on WhatsApp +91 80761 36300 with your name and service.'
where not exists (select 1 from payment_settings limit 1);

-- Testimonials
insert into testimonials (client_name, business_name, service_type, review_text, rating, initials, avatar_color, sort_order)
select client_name, business_name, service_type, review_text, rating, initials, avatar_color, sort_order
from (values
  ('Rajesh Sharma','Sharma Electronics, Dwarka','GST Filing','Sukant has been handling our GST returns for 2+ years. Never a single missed deadline. Best accountant in Dwarka!',5,'RS','#0C447C',1),
  ('Priya Gupta','PG Boutique, Uttam Nagar','Bookkeeping & ITR','Explained everything clearly and filed my ITR in 2 days. The monthly bookkeeping has really helped me understand my finances.',5,'PG','#185FA5',2),
  ('Amit Verma','AV Traders, Nawada','Payroll & Compliance','Managing payroll for 8 employees was a headache. Kunwar Accounting took over PF, ESI, TDS — all on time every month.',5,'AV','#1D9E75',3),
  ('Deepak Kumar','DK Constructions, Palam','CFO Advisory','The monthly MIS reports have been a game changer. I finally understand where my money is going. Worth every rupee.',5,'DK','#534AB7',4),
  ('Neha Jain','Neha Dental Clinic, Vikaspuri','ITR Filing','Taxes were confusing as a doctor. Sukant made it simple and found deductions I did not know about. Saved significant tax.',5,'NJ','#993556',5)
) as v(client_name, business_name, service_type, review_text, rating, initials, avatar_color, sort_order)
where not exists (select 1 from testimonials limit 1);

-- Services
insert into services (category, name, fee_range, sort_order)
select category, name, fee_range, sort_order from (values
  ('Income Tax','ITR Filing — Salaried Individual (Simple)','₹1,500 – ₹3,000',1),
  ('Income Tax','ITR Filing — Salaried + Capital Gains','₹3,000 – ₹8,000',2),
  ('Income Tax','ITR Filing — Freelancer / Consultant','₹3,000 – ₹6,000',3),
  ('Income Tax','ITR Filing — Proprietorship / Small Business','₹5,000 – ₹15,000',4),
  ('Income Tax','ITR Filing — HUF','₹4,000 – ₹10,000',5),
  ('Income Tax','ITR Filing — NRI','₹8,000 – ₹20,000',6),
  ('Income Tax','Advance Tax Computation','₹1,500 – ₹3,000',7),
  ('Income Tax','Tax Planning & Advisory','₹3,000 – ₹10,000',8),
  ('Income Tax','Income Tax Notice / Scrutiny Reply','₹5,000 – ₹20,000',9),
  ('Income Tax','Revised / Belated ITR Filing','₹2,000 – ₹5,000',10),
  ('GST','GST Registration','₹1,500 – ₹3,000',1),
  ('GST','GSTR-1 Filing (Monthly/Quarterly)','₹500 – ₹1,500/month',2),
  ('GST','GSTR-3B Filing','₹500 – ₹1,500/month',3),
  ('GST','GST Combo (GSTR-1 + GSTR-3B)','₹1,500 – ₹3,500/month',4),
  ('GST','GSTR-9 Annual Return','₹5,000 – ₹15,000',5),
  ('GST','GST Notice / Show Cause Reply','₹5,000 – ₹15,000',6),
  ('GST','GST Reconciliation (ITC Matching)','₹3,000 – ₹8,000',7),
  ('Bookkeeping','Monthly Bookkeeping — Small Shop/Trader','₹1,500 – ₹4,000/month',1),
  ('Bookkeeping','Monthly Bookkeeping — Service Business','₹2,500 – ₹7,000/month',2),
  ('Bookkeeping','Tally Data Entry & Maintenance','₹1,500 – ₹5,000/month',3),
  ('Bookkeeping','Financial Statement Preparation','₹3,000 – ₹10,000',4),
  ('Bookkeeping','Cleanup / Catch-up Bookkeeping','₹5,000 – ₹20,000 (one-time)',5),
  ('TDS','TDS Return Filing (per quarter, up to 5 entries)','₹1,500 – ₹3,000',1),
  ('TDS','TDS Return Filing (per quarter, 5+ entries)','₹3,000 – ₹7,000',2),
  ('TDS','TDS Challan Payment Assistance','₹300 – ₹500/challan',3),
  ('TDS','Form 16 / 16A Generation','₹150 – ₹300/employee',4),
  ('TDS','TDS Reconciliation','₹2,000 – ₹5,000',5),
  ('Payroll','Monthly Payroll Processing','₹100 – ₹200/employee/month',1),
  ('Payroll','PF / ESI Registration','₹2,000 – ₹4,000',2),
  ('Payroll','PF / ESI Monthly Filing','₹1,000 – ₹2,500/month',3),
  ('Payroll','Full & Final Settlement','₹500 – ₹1,500/employee',4),
  ('Registration','Proprietorship / MSME Registration','₹1,000 – ₹3,000',1),
  ('Registration','Private Limited Company Incorporation','₹8,000 – ₹20,000',2),
  ('Registration','LLP Incorporation','₹7,000 – ₹15,000',3),
  ('Registration','Partnership Firm Registration','₹5,000 – ₹12,000',4),
  ('Registration','Shop & Establishment Registration','₹1,000 – ₹3,000',5),
  ('Registration','Digital Signature Certificate (DSC)','₹1,000 – ₹2,000',6),
  ('Registration','FSSAI Registration','₹2,000 – ₹5,000',7),
  ('Audit','Tax Audit u/s 44AB','₹10,000 – ₹30,000',1),
  ('Audit','Stock Audit','₹5,000 – ₹15,000',2),
  ('Audit','Internal Audit (Small Business)','₹5,000 – ₹15,000/month',3),
  ('ROC','Annual ROC Filing — Pvt Ltd (AOC-4 + MGT-7)','₹5,000 – ₹15,000',1),
  ('ROC','Director KYC (DIR-3 KYC)','₹500 – ₹1,000',2),
  ('ROC','LLP Annual Filing','₹3,000 – ₹8,000',3)
) as v(category, name, fee_range, sort_order)
where not exists (select 1 from services limit 1);

-- Packages
insert into packages (category, name, price_range, billing_cycle, description, includes, is_popular, sort_order)
select category, name, price_range, billing_cycle, description, includes, is_popular, sort_order from (values
  ('Individual / Salaried','Basic Salaried Plan','₹2,000 – ₹4,000','year','For salaried employees needing annual tax compliance',array['ITR Filing (Salaried)','Advance Tax Computation','WhatsApp support'],false,1),
  ('Individual / Salaried','Investor Plan','₹5,000 – ₹10,000','year','For salaried + investment income',array['ITR (Salary + Capital Gains)','Tax Advisory & Planning','Priority support'],true,2),
  ('Individual / Salaried','NRI Plan','₹10,000 – ₹25,000','year','Complete NRI tax compliance',array['ITR (NRI)','Form 15CA / 15CB','Tax Advisory'],false,3),
  ('Small Business','GST Monthly','₹2,000 – ₹4,000','month','For GST-registered businesses',array['GSTR-1 + GSTR-3B filing','GSTR-9 Annual Return','Monthly deadline reminders'],false,1),
  ('Small Business','Accounts Pro','₹4,000 – ₹8,000','month','Bookkeeping + full GST compliance',array['Bookkeeping + GST Returns','TDS Filing (quarterly)','P&L + Balance Sheet','Priority WhatsApp support'],true,2),
  ('Small Business','Proprietor All-in-One','₹6,000 – ₹12,000','month','Everything under one roof',array['Bookkeeping + GST','ITR Filing (annual, included)','TDS (quarterly)','Dedicated support'],false,3),
  ('Startups & Companies','Startup Launch','₹12,000 – ₹20,000','one-time','Get your startup registered and compliant',array['Company/LLP Registration','GST Registration','PAN/TAN Application','DSC for directors'],false,1),
  ('Startups & Companies','Startup Growth','₹8,000 – ₹15,000','month','Complete ongoing compliance for startups',array['Bookkeeping + GST','ITR + TDS Compliance','ROC Annual Filing','Monthly MIS Reports'],true,2),
  ('Startups & Companies','Startup Premium','₹15,000 – ₹30,000','month','All services + Virtual CFO advisory',array['Everything in Growth plan','Payroll Management','Virtual CFO Advisory','Dedicated account manager'],false,3),
  ('Payroll / Employers','Payroll Starter','₹2,000 – ₹4,000','month','For small teams up to 5 staff',array['Payroll for up to 5 staff','PF/ESI Filing','Monthly payslips','Challan generation'],false,1),
  ('Payroll / Employers','Payroll Pro','₹4,000 – ₹8,000','month','For growing teams up to 20 staff',array['Payroll for up to 20 staff','PF/ESI Filing','Form 16 (annual)','Full & Final Settlement'],true,2),
  ('Payroll / Employers','HR Compliance','₹6,000 – ₹12,000','month','Full payroll + statutory compliance',array['Full payroll management','PF/ESI + TDS on salary','Form 16 generation','Compliance calendar'],false,3),
  ('Virtual CFO','Virtual CFO Basic','₹10,000 – ₹20,000','month','Strategic financial management',array['Monthly MIS Reports','Bookkeeping + GST','ITR Filing (annual)','Cash flow analysis'],false,1),
  ('Virtual CFO','Virtual CFO Pro','₹20,000 – ₹40,000','month','Complete financial management for SMEs',array['MIS + Bookkeeping + GST','TDS + Payroll + ITR','ROC Annual Filing','2 CFO advisory calls/month','Dedicated account manager'],true,2)
) as v(category, name, price_range, billing_cycle, description, includes, is_popular, sort_order)
where not exists (select 1 from packages limit 1);

-- FINAL CHECK — you should see row counts > 0 for each table
select 'services'         as table_name, count(*) as total_rows from services
union all
select 'packages',                        count(*) from packages
union all
select 'testimonials',                    count(*) from testimonials
union all
select 'payment_settings',                count(*) from payment_settings
order by table_name;
