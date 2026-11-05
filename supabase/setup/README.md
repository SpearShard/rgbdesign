# RGB CMS setup

This CMS is isolated under `/admin`. Public website pages and styles are intentionally not changed in this phase.

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`: RGB Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: project publishable key (or legacy anon key).
- `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`: ImageKit public key.
- `IMAGEKIT_PRIVATE_KEY`: ImageKit private key; server-side only.
- `SUPABASE_SERVICE_ROLE_KEY`: only needed for the one-time import script; server/terminal only.

Never commit `.env.local`, a Supabase secret/service-role key, or the ImageKit private key.

## Database setup

1. Open the SQL Editor for the existing `rgb-design` Supabase project.
2. Review and run `supabase/setup/rgb-cms.sql`.
3. The script only adds fields/indexes and a CMS roles table/policies. It retains the existing public SELECT policies.
4. Create the two users in Supabase Authentication (invite them or use the dashboard). Emails:
   - `jayaditya530@gmail.com` — administrator
   - `roshnigeraa@gmail.com` — editor
5. After both users exist, run the two role-bootstrap INSERT statements at the bottom of `rgb-cms.sql`. They do nothing if an account hasn't been created yet.
6. Set passwords through Supabase's invite/password-reset flow; don't share passwords in chat.

## Import existing projects

After the schema is ready, run:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://njodwbhvtpehlcfdlifl.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
node scripts/import-projects-to-supabase.mjs
```

The importer preserves all existing ImageKit URLs, category ordering, image ordering, description paragraphs, video URLs, and extra metadata. It deliberately skips `projects_list`, which powers the current homepage's curated project cards.

## Current scope / safety

- `/admin/login` and `/admin/projects` are standalone CMS routes.
- Image uploads are signed by `/api/cms/imagekit-auth`; the ImageKit private key stays on the server.
- The browser uses the Supabase publishable/anon key and the signed-in user's access token. RLS controls project writes.
- The public website still reads its existing `public/projects.json` in this phase. No public page has been switched to database data yet.
- Existing project URLs are title-based (`/works/<title>`). Before switching public pages, preserve these routes and test the legacy title mapping.
- User/role management UI and administrator-only role changes are not implemented yet. Role assignment is bootstrapped through the SQL Editor for now.
- Do not merge this branch or deploy until the CMS is configured, imported, and tested.
