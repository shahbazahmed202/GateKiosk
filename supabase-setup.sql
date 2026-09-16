-- ============================================================
-- Disrupt.com Reception / Security Portal — Supabase setup
-- Run once: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run
-- ============================================================

-- 1. ROLES / PROFILES ----------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null check (role in ('security','reception','admin')),
  created_at timestamptz default now()
);

-- helper: the current signed-in user's role
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 2. MASTER EMPLOYEE LIST (admin manages; security reads for lookup)
create table if not exists public.employees (
  code   text primary key,
  name   text not null,
  campus text
);

-- 3. SECURITY team: RFID card-less entries -------------------
create table if not exists public.rfid_entries (
  id          uuid primary key default gen_random_uuid(),
  code        text,
  name        text,
  reason      text check (reason in ('Card Lost','Card Forgot')),
  campus      text,
  home_campus text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz default now()
);

-- 4. RECEPTION team: visitor log -----------------------------
create table if not exists public.visitor_log (
  id             uuid primary key default gen_random_uuid(),
  name           text,
  phone          text,
  cnic           text,
  person_to_meet text,
  purpose        text,
  campus         text,
  card_number    text,
  card_returned  boolean,
  nic_photo_url  text,
  check_in       timestamptz default now(),
  check_out      timestamptz,
  source         text default 'desk' check (source in ('desk','self')),
  status         text default 'in',            -- in | out | pending (self)
  created_by     uuid default auth.uid()
);

-- 5. RECEPTION team: courier log -----------------------------
create table if not exists public.courier_log (
  id         uuid primary key default gen_random_uuid(),
  direction  text check (direction in ('inbound','outbound')),
  company    text,
  tracking   text,
  party      text,
  recipient  text,
  logged_by  text,
  note       text,
  status     text,
  campus     text,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

-- 6. Guest feedback ------------------------------------------
create table if not exists public.guest_feedback (
  id         uuid primary key default gen_random_uuid(),
  rating     int check (rating between 1 and 5),
  comment    text,
  name       text,
  campus     text,
  created_at timestamptz default now()
);

-- 7. ENABLE ROW-LEVEL SECURITY -------------------------------
alter table public.profiles       enable row level security;
alter table public.employees      enable row level security;
alter table public.rfid_entries   enable row level security;
alter table public.visitor_log    enable row level security;
alter table public.courier_log    enable row level security;
alter table public.guest_feedback enable row level security;

-- profiles: read own row; admin reads all
create policy "profile self read" on public.profiles
  for select using (id = auth.uid() or public.my_role() = 'admin');

-- employees: any signed-in user can read (needed for RFID lookup); admin writes
create policy "emp read"  on public.employees for select
  using (auth.role() = 'authenticated');
create policy "emp write" on public.employees for all
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- rfid_entries: SECURITY + ADMIN only  (reception CANNOT see)
create policy "rfid read"  on public.rfid_entries for select
  using (public.my_role() in ('security','admin'));
create policy "rfid write" on public.rfid_entries for insert
  with check (public.my_role() in ('security','admin'));

-- visitor_log: RECEPTION + ADMIN only  (security CANNOT see)
create policy "vis read"   on public.visitor_log for select
  using (public.my_role() in ('reception','admin'));
create policy "vis write"  on public.visitor_log for insert
  with check (public.my_role() in ('reception','admin'));
create policy "vis update" on public.visitor_log for update
  using (public.my_role() in ('reception','admin'));

-- courier_log: RECEPTION + ADMIN only
create policy "cour read"   on public.courier_log for select
  using (public.my_role() in ('reception','admin'));
create policy "cour write"  on public.courier_log for insert
  with check (public.my_role() in ('reception','admin'));
create policy "cour update" on public.courier_log for update
  using (public.my_role() in ('reception','admin'));

-- guest_feedback: RECEPTION + ADMIN read; staff insert
create policy "fb read"        on public.guest_feedback for select
  using (public.my_role() in ('reception','admin'));
create policy "fb write staff" on public.guest_feedback for insert
  with check (public.my_role() in ('reception','admin'));

-- 8. QR SELF CHECK-IN (anonymous guest on their own phone) ----
--    anon can INSERT a self check-in + feedback, but can READ nothing.
create policy "vis self insert" on public.visitor_log for insert to anon
  with check (source = 'self' and card_number is null and check_out is null);
create policy "fb self insert" on public.guest_feedback for insert to anon
  with check (true);

-- 9. REAL-TIME (live updates on the reception/security tablets)
alter publication supabase_realtime add table public.visitor_log;
alter publication supabase_realtime add table public.rfid_entries;
alter publication supabase_realtime add table public.courier_log;
alter publication supabase_realtime add table public.guest_feedback;

-- ============================================================
-- AFTER RUNNING THIS:
--
-- A) Create logins:  Authentication -> Users -> Add user  (email + password)
--    e.g. security@disrupt.com , reception@disrupt.com , admin@disrupt.com
--
-- B) Give each user a role (run once per user, change the email each time):
--
--    insert into public.profiles (id, full_name, role)
--    select id, 'Reception Desk', 'reception'
--    from auth.users where email = 'reception@disrupt.com'
--    on conflict (id) do update set role = excluded.role;
--
--    roles:  'security'   -> only RFID / card-less entries
--            'reception'  -> only visitor + courier + feedback
--            'admin'      -> everything + employee master list
--
-- C) Load the 491 employees into public.employees
--    (I can generate an INSERT script from your CSV, or import via the portal admin).
-- ============================================================
