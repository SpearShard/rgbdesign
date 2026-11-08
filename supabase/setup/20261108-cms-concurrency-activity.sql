-- RGB CMS: optimistic concurrency + immutable activity history
-- Additive migration. Back up production before applying.
-- CMS writes use database RPCs so project, gallery, version and audit events commit atomically.
begin;

alter table public.projects add column if not exists version integer not null default 1;

create table if not exists public.cms_activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text not null,
  project_id uuid,
  project_title text not null,
  action text not null check (action in ('project_created','project_updated','images_added','images_removed','project_published','project_unpublished','project_deleted')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists cms_activity_log_created_at_idx on public.cms_activity_log(created_at desc);
create index if not exists cms_activity_log_project_id_idx on public.cms_activity_log(project_id,created_at desc);
alter table public.cms_activity_log enable row level security;
revoke all on public.cms_activity_log from anon, authenticated;
grant select on public.cms_activity_log to authenticated;
drop policy if exists "CMS users can read activity history" on public.cms_activity_log;
create policy "CMS users can read activity history" on public.cms_activity_log for select to authenticated
using (exists(select 1 from public.cms_admins a where a.user_id=(select auth.uid())));

-- Prevent direct browser writes from bypassing version validation.
revoke insert, update, delete on public.projects from authenticated;
revoke insert, update, delete on public.project_images from authenticated;

create or replace function public.cms_save_project(p_project jsonb,p_expected_version integer default null)
returns public.projects
language plpgsql security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_user_id uuid:=auth.uid();
  v_email text;
  v_id uuid;
  v_existing public.projects%rowtype;
  v_saved public.projects%rowtype;
  v_added integer:=0;
  v_removed integer:=0;
  v_images jsonb:=coalesce(p_project->'images','[]'::jsonb);
  v_is_new boolean:=nullif(p_project->>'id','') is null;
begin
  select email into v_email from public.cms_admins where user_id=v_user_id;
  if v_user_id is null or v_email is null then
    raise exception using errcode='42501',message='You do not have permission to edit CMS projects.';
  end if;
  if jsonb_typeof(v_images)<>'array' then
    raise exception using errcode='22023',message='Project images must be an array.';
  end if;

  if v_is_new then
    insert into public.projects(title,slug,subtitle,category,category_title,dir,cover_url,video_url,description,description_blocks,metadata,year,client,location,sort_order,published,updated_at)
    values(p_project->>'title',p_project->>'slug',nullif(p_project->>'subtitle',''),coalesce(p_project->>'category','interiors'),
      nullif(p_project->>'category_title',''),nullif(p_project->>'dir',''),nullif(p_project->>'cover_url',''),nullif(p_project->>'video_url',''),
      coalesce(p_project->>'description',''),coalesce(p_project->'description_blocks','[]'::jsonb),coalesce(p_project->'metadata','{}'::jsonb),
      nullif(p_project->>'year','')::integer,nullif(p_project->>'client',''),nullif(p_project->>'location',''),
      coalesce(nullif(p_project->>'sort_order','')::integer,0),coalesce((p_project->>'published')::boolean,false),now())
    returning * into v_saved;
  else
    v_id:=(p_project->>'id')::uuid;
    select * into v_existing from public.projects where id=v_id for update;
    if not found then raise exception using errcode='P0001',message='This project no longer exists. Refresh the library before continuing.'; end if;
    if v_existing.version<>coalesce(p_expected_version,-1) then
      raise exception using errcode='P0001',message='CONFLICT: This project was changed by another editor. Your changes were not saved. Close this editor, refresh the project, and reapply your changes.';
    end if;

    select count(*) into v_removed from public.project_images old_img
      where old_img.project_id=v_id and not exists(
        select 1 from jsonb_array_elements(v_images) new_img where new_img->>'image_url'=old_img.image_url
      );
    select count(*) into v_added from jsonb_array_elements(v_images) new_img
      where not exists(select 1 from public.project_images old_img where old_img.project_id=v_id and old_img.image_url=new_img->>'image_url');

    update public.projects set
      title=p_project->>'title',slug=p_project->>'slug',subtitle=nullif(p_project->>'subtitle',''),
      category=coalesce(p_project->>'category','interiors'),category_title=nullif(p_project->>'category_title',''),
      dir=nullif(p_project->>'dir',''),cover_url=nullif(p_project->>'cover_url',''),video_url=nullif(p_project->>'video_url',''),
      description=coalesce(p_project->>'description',''),description_blocks=coalesce(p_project->'description_blocks','[]'::jsonb),
      metadata=coalesce(p_project->'metadata','{}'::jsonb),year=nullif(p_project->>'year','')::integer,
      client=nullif(p_project->>'client',''),location=nullif(p_project->>'location',''),
      sort_order=coalesce(nullif(p_project->>'sort_order','')::integer,0),published=coalesce((p_project->>'published')::boolean,false),
      updated_at=now(),version=version+1
    where id=v_id and version=p_expected_version returning * into v_saved;
    if not found then raise exception using errcode='P0001',message='CONFLICT: This project changed while you were saving. Refresh and try again.'; end if;
    delete from public.project_images where project_id=v_saved.id;
  end if;

  insert into public.project_images(project_id,image_url,alt_text,sort_order)
  select v_saved.id,item->>'image_url',coalesce(nullif(item->>'alt_text',''),v_saved.title),
    coalesce(nullif(item->>'sort_order','')::integer,ordinality::integer-1)
  from jsonb_array_elements(v_images) with ordinality as gallery(item,ordinality)
  where nullif(item->>'image_url','') is not null;

  if v_is_new then
    select count(*) into v_added from public.project_images where project_id=v_saved.id;
  end if;

  insert into public.cms_activity_log(actor_id,actor_email,project_id,project_title,action,details)
  values(v_user_id,v_email,v_saved.id,v_saved.title,case when v_is_new then 'project_created' else 'project_updated' end,jsonb_build_object('version',v_saved.version));
  if v_added>0 then
    insert into public.cms_activity_log(actor_id,actor_email,project_id,project_title,action,details)
    values(v_user_id,v_email,v_saved.id,v_saved.title,'images_added',jsonb_build_object('count',v_added,'summary',v_added||' image(s) added'));
  end if;
  if v_removed>0 then
    insert into public.cms_activity_log(actor_id,actor_email,project_id,project_title,action,details)
    values(v_user_id,v_email,v_saved.id,v_saved.title,'images_removed',jsonb_build_object('count',v_removed,'summary',v_removed||' image(s) removed'));
  end if;
  if not v_is_new and v_existing.published is distinct from v_saved.published then
    insert into public.cms_activity_log(actor_id,actor_email,project_id,project_title,action)
    values(v_user_id,v_email,v_saved.id,v_saved.title,case when v_saved.published then 'project_published' else 'project_unpublished' end);
  end if;
  return v_saved;
end;
$$;

create or replace function public.cms_delete_project(p_project_id uuid,p_expected_version integer)
returns void language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare
  v_user_id uuid:=auth.uid();
  v_email text;
  v_project public.projects%rowtype;
begin
  select email into v_email from public.cms_admins where user_id=v_user_id;
  if v_user_id is null or v_email is null then raise exception using errcode='42501',message='You do not have permission to delete CMS projects.'; end if;
  select * into v_project from public.projects where id=p_project_id for update;
  if not found then raise exception using errcode='P0001',message='This project was already deleted. Refresh the library.'; end if;
  if v_project.version<>p_expected_version then
    raise exception using errcode='P0001',message='CONFLICT: This project was changed by another editor. It was not deleted. Refresh the library and try again.';
  end if;
  insert into public.cms_activity_log(actor_id,actor_email,project_id,project_title,action,details)
  values(v_user_id,v_email,v_project.id,v_project.title,'project_deleted',jsonb_build_object('version',v_project.version));
  delete from public.project_images where project_id=p_project_id;
  delete from public.projects where id=p_project_id and version=p_expected_version;
end;
$$;

revoke all on function public.cms_save_project(jsonb,integer) from public;
revoke all on function public.cms_delete_project(uuid,integer) from public;
grant execute on function public.cms_save_project(jsonb,integer) to authenticated;
grant execute on function public.cms_delete_project(uuid,integer) to authenticated;
commit;
