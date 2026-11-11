-- RGB CMS: track ImageKit file IDs for safe gallery cleanup.
-- Run this migration in the RGB Supabase SQL Editor before deploying the delete UI.
begin;
alter table public.project_images add column if not exists file_id text;

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

  insert into public.project_images(project_id,image_url,file_id,alt_text,sort_order)
  select v_saved.id,item->>'image_url',nullif(item->>'file_id',''),coalesce(nullif(item->>'alt_text',''),v_saved.title),
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


revoke all on function public.cms_save_project(jsonb,integer) from public;
grant execute on function public.cms_save_project(jsonb,integer) to authenticated;
commit;
