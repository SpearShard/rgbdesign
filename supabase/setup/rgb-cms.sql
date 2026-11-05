-- RGB CMS setup
-- Safe additive schema: preserves existing public project read policies and all current website data.
-- Run in the RGB Supabase project's SQL Editor after reviewing this file.

begin;

alter table public.projects
  add column if not exists category_title text,
  add column if not exists dir text,
  add column if not exists description_blocks jsonb not null default '[]'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists legacy_title text;

alter table public.project_images
  add column if not exists alt_text text;

create index if not exists projects_published_category_sort_idx
  on public.projects (published, category, sort_order);

create index if not exists project_images_project_sort_idx
  on public.project_images (project_id, sort_order);

create table if not exists public.cms_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('administrator', 'editor')),
  created_at timestamptz not null default now()
);

alter table public.cms_admins enable row level security;

revoke all on public.cms_admins from anon, authenticated;
grant select on public.cms_admins to authenticated;

drop policy if exists "CMS users can read their own role" on public.cms_admins;
create policy "CMS users can read their own role"
  on public.cms_admins
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "CMS users can manage projects" on public.projects;
create policy "CMS users can manage projects"
  on public.projects
  for all
  to authenticated
  using (
    exists (
      select 1 from public.cms_admins a
      where a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.cms_admins a
      where a.user_id = (select auth.uid())
    )
  );

drop policy if exists "CMS users can manage project images" on public.project_images;
create policy "CMS users can manage project images"
  on public.project_images
  for all
  to authenticated
  using (
    exists (
      select 1 from public.cms_admins a
      where a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.cms_admins a
      where a.user_id = (select auth.uid())
    )
  );

grant select on public.projects to anon, authenticated;
grant select on public.project_images to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;
grant insert, update, delete on public.project_images to authenticated;

commit;

-- After both users have signed in at least once, bootstrap their roles from auth.users.
-- Run this separately only after confirming the auth.users rows exist:
--
-- insert into public.cms_admins (user_id, email, role)
-- select id, email, 'administrator'
-- from auth.users
-- where lower(email) = lower('jayaditya530@gmail.com')
-- on conflict (user_id) do update set email = excluded.email, role = excluded.role;
--
-- insert into public.cms_admins (user_id, email, role)
-- select id, email, 'editor'
-- from auth.users
-- where lower(email) = lower('roshnigeraa@gmail.com')
-- on conflict (user_id) do update set email = excluded.email, role = excluded.role;
