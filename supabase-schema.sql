-- TribalGrant AI persistent database + private document storage
create extension if not exists pgcrypto;

create table if not exists public.applications (
  id text primary key,
  name text not null,
  scheme text not null check (scheme in ('NFST','NOS')),
  status text not null default 'Pending',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.applications(id) on delete cascade,
  bucket text not null,
  filename text not null,
  storage_path text,
  document_type text,
  extracted_text text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.applications(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists applications_status_idx on public.applications(status);
create index if not exists documents_application_idx on public.documents(application_id);
create index if not exists audit_application_idx on public.audit_logs(application_id);

alter table public.applications enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

-- The application currently talks to Supabase only from server routes using the secret key.
-- Do not create anon policies for these tables unless you intentionally move to client-side access.

do $$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('scholarship-documents','scholarship-documents',false,6291456,array['image/jpeg','image/png','image/webp'])
  on conflict (id) do nothing;
exception when others then null;
end $$;
