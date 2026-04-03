create extension if not exists pgcrypto;

create table if not exists public.binn_projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  area text not null check (area in ('Negocio', 'Personal', 'Salud', 'Familia', 'Otro')),
  objective text not null default '',
  impact integer not null check (impact between 1 and 5),
  urgency integer not null check (urgency between 1 and 5),
  effort integer not null check (effort between 1 and 5),
  status text not null check (status in ('Idea', 'En marcha', 'Pausado', 'Cerrado', 'Archivado'))
);

create table if not exists public.binn_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid references public.binn_projects(id) on delete set null,
  title text not null,
  task_date date not null,
  is_key boolean not null default false,
  status text not null check (status in ('Pendiente', 'En curso', 'Hecha'))
);

create table if not exists public.binn_daily_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.binn_projects(id) on delete cascade,
  log_date date not null,
  summary_today text not null default '',
  next_session text not null default '',
  later_pending text not null default '',
  decisions text not null default '',
  ai_prompt text not null default '',
  constraint binn_daily_logs_project_id_log_date_key unique (project_id, log_date)
);

create index if not exists binn_tasks_task_date_idx on public.binn_tasks (task_date);
create index if not exists binn_tasks_project_id_idx on public.binn_tasks (project_id);
create index if not exists binn_daily_logs_project_log_date_idx on public.binn_daily_logs (project_id, log_date desc);

alter table public.binn_projects enable row level security;
alter table public.binn_tasks enable row level security;
alter table public.binn_daily_logs enable row level security;

create policy "binn_projects_public_read"
on public.binn_projects
for select
to anon, authenticated
using (true);

create policy "binn_projects_public_insert"
on public.binn_projects
for insert
to anon, authenticated
with check (true);

create policy "binn_projects_public_update"
on public.binn_projects
for update
to anon, authenticated
using (true)
with check (true);

create policy "binn_projects_public_delete"
on public.binn_projects
for delete
to anon, authenticated
using (true);

create policy "binn_tasks_public_read"
on public.binn_tasks
for select
to anon, authenticated
using (true);

create policy "binn_tasks_public_insert"
on public.binn_tasks
for insert
to anon, authenticated
with check (true);

create policy "binn_tasks_public_update"
on public.binn_tasks
for update
to anon, authenticated
using (true)
with check (true);

create policy "binn_daily_logs_public_read"
on public.binn_daily_logs
for select
to anon, authenticated
using (true);

create policy "binn_daily_logs_public_insert"
on public.binn_daily_logs
for insert
to anon, authenticated
with check (true);

create policy "binn_daily_logs_public_update"
on public.binn_daily_logs
for update
to anon, authenticated
using (true)
with check (true);
