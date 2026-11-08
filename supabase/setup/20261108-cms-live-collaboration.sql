-- RGB CMS collaboration presence
-- Authenticated CMS editors can see the online roster, but can only write their own heartbeat.
begin;

create table if not exists public.cms_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  project_id uuid references public.projects(id) on delete set null,
  project_title text not null default 'Browsing projects',
  last_seen timestamptz not null default now()
);

create index if not exists cms_presence_last_seen_idx on public.cms_presence(last_seen desc);
alter table public.cms_presence enable row level security;
revoke all on public.cms_presence from anon, authenticated;
grant select, insert, update, delete on public.cms_presence to authenticated;

drop policy if exists "CMS editors can view online presence" on public.cms_presence;
create policy "CMS editors can view online presence" on public.cms_presence for select to authenticated
using (exists (select 1 from public.cms_admins a where a.user_id = (select auth.uid())));

drop policy if exists "CMS editors can create their own presence" on public.cms_presence;
create policy "CMS editors can create their own presence" on public.cms_presence for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.cms_admins a where a.user_id = (select auth.uid())));

drop policy if exists "CMS editors can update their own presence" on public.cms_presence;
create policy "CMS editors can update their own presence" on public.cms_presence for update to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.cms_admins a where a.user_id = (select auth.uid())))
with check (user_id = (select auth.uid()) and exists (select 1 from public.cms_admins a where a.user_id = (select auth.uid())));

drop policy if exists "CMS editors can delete their own presence" on public.cms_presence;
create policy "CMS editors can delete their own presence" on public.cms_presence for delete to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.cms_admins a where a.user_id = (select auth.uid())));

commit;
