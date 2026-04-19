-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- This creates all tables needed to link admin panel with website
-- ============================================================

-- SERVICES TABLE (for services.html)
create table if not exists services (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  category text not null,
  name text not null,
  fee_range text not null,
  description text,
  is_active boolean default true,
  sort_order integer default 0
);

-- PACKAGES TABLE (for packages.html)
create table if not exists packages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  category text not null,
  name text not null,
  price_range text not null,
  billing_cycle text default 'month',
  description text,
  includes text[],
  is_popular boolean default false,
  is_active boolean default true,
  sort_order integer default 0
);

-- TESTIMONIALS TABLE (for testimonials.html)
create table if not exists testimonials (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  client_name text not null,
  business_name text,
  service_type text,
  review_text text not null,
  rating integer default 5,
  initials text,
  avatar_color text default '#0C447C',
  is_active boolean default true,
  sort_order integer default 0
);

-- PAYMENT SETTINGS TABLE (for payment.html)
create table if not exists payment_settings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  upi_id text,
  upi_enabled boolean default true,
  paytm_number text,
  paytm_enabled boolean default true,
  bank_name text,
  bank_account text,
  bank_ifsc text,
  bank_enabled boolean default true,
  payment_note text,
  updated_at timestamp with time zone default now()
);

-- SITE SETTINGS TABLE (about, contact info, etc.)
create table if not exists site_settings (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value text,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table services enable row level security;
alter table packages enable row level security;
alter table testimonials enable row level security;
alter table payment_settings enable row level security;
alter table site_settings enable row level security;

-- Public read access (website can read without login)
create policy "Public read services" on services for select using (true);
create policy "Public read packages" on packages for select using (true);
create policy "Public read testimonials" on testimonials for select using (true);
create policy "Public read payment_settings" on payment_settings for select using (true);
create policy "Public read site_settings" on site_settings for select using (true);

-- Admin full access
create policy "Admin all services" on services for all using (true);
create policy "Admin all packages" on packages for all using (true);
create policy "Admin all testimonials" on testimonials for all using (true);
create policy "Admin all payment_settings" on payment_settings for all using (true);
create policy "Admin all site_settings" on site_settings for all using (true);

-- ============================================================
-- INSERT DEFAULT DATA
-- ============================================================

-- Default payment settings
insert into payment_settings (upi_id, upi_enabled, paytm_number, paytm_enabled, bank_name, bank_account, bank_ifsc, bank_enabled, payment_note)
values (
  'sukant.kunwar@superyes', true,
  '+91 80761 36300', true,
  'Your Bank Name', 'XXXX XXXX XXXX', 'XXXXXXXX', true,
  'Please send payment screenshot to WhatsApp +91 80761 36300 with your name and service.'
) on conflict do nothing;

-- Default site settings
insert into site_settings (key, value) values
  ('firm_name', 'Kunwar Accounting Services'),
  ('owner_name', 'Sukant Kunwar'),
  ('phone', '+91 80761 36300'),
  ('email', 'sukant@kunwaraccountingservices.in'),
  ('address', 'Dwarka, New Delhi – 110075'),
  ('gstin', ''),
  ('working_hours', 'Monday – Saturday, 9:00 AM – 7:00 PM'),
  ('whatsapp_message', 'Hi! I want to book a free consultation.')
on conflict (key) do nothing;

-- Default testimonials
insert into testimonials (client_name, business_name, service_type, review_text, rating, initials, avatar_color, sort_order) values
  ('Rajesh Sharma', 'Sharma Electronics, Dwarka', 'GST Filing', 'Sukant has been handling our GST returns for over 2 years. Never a single missed deadline. Best accountant in Dwarka!', 5, 'RS', '#0C447C', 1),
  ('Priya Gupta', 'PG Boutique, Uttam Nagar', 'Bookkeeping & ITR', 'Explained everything clearly and filed my ITR in 2 days. The monthly bookkeeping has really helped me understand my business finances.', 5, 'PG', '#185FA5', 2),
  ('Amit Verma', 'AV Traders, Nawada', 'Payroll & Compliance', 'Managing payroll for 8 employees was a headache. Kunwar Accounting took over PF, ESI, TDS — all on time every month.', 5, 'AV', '#1D9E75', 3),
  ('Sunita Malhotra', 'SM Catering, Janakpuri', 'GST Registration', 'Got GST registration done in just 3 days. Sukant guided me through the whole process. Recommended to all my friends!', 5, 'SM', '#854F0B', 4),
  ('Deepak Kumar', 'DK Constructions, Palam', 'CFO Advisory', 'The monthly MIS reports have been a game changer. I finally understand where my money is going. Worth every rupee.', 5, 'DK', '#534AB7', 5),
  ('Neha Jain', 'Neha Dental Clinic, Vikaspuri', 'ITR Filing', 'As a doctor, taxes were confusing. Sukant made it simple and found deductions I did not know about. Saved me significant tax.', 5, 'NJ', '#993556', 6)
on conflict do nothing;
