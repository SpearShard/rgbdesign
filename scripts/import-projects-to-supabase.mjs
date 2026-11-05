/**
 * One-time import of the existing public/projects.json into Supabase.
 * Run locally only: SUPABASE_SERVICE_ROLE_KEY must never be committed or exposed to a browser.
 *
 * PowerShell:
 *   $env:NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
 *   node scripts/import-projects-to-supabase.mjs
 *
 * The script is idempotent by slug: it upserts project rows and replaces their gallery rows.
 * It does not touch projects_list (the homepage's separate curated collection).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "public/projects.json"), "utf8"));
const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!baseUrl || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.");
  process.exit(1);
}

const slugify = value => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function api(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${response.status}: ${data?.message || data?.hint || text}`);
  return data;
}

let imported = 0;
for (const [category, group] of Object.entries(source)) {
  if (category === "projects_list" || !Array.isArray(group?.projects)) continue;
  for (let index = 0; index < group.projects.length; index++) {
    const item = group.projects[index];
    const slug = slugify(item.title);
    const rows = await api(
      `/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&select=id`,
      { method: "GET" }
    );
    const payload = {
      title: item.title,
      slug,
      legacy_title: item.title,
      subtitle: item.subtitle || null,
      category,
      category_title: group.title || category,
      dir: item.dir || null,
      cover_url: item.cover || item.images?.[0] || null,
      video_url: item.video || null,
      description: Array.isArray(item.description) ? item.description.join("\\n\\n") : (item.description || null),
      description_blocks: Array.isArray(item.description) ? item.description : [],
      metadata: Object.fromEntries(Object.entries(item).filter(([key]) =>
        !["title", "subtitle", "dir", "cover", "video", "images", "description"].includes(key)
      )),
      sort_order: index,
      published: true,
      updated_at: new Date().toISOString(),
    };

    let saved;
    if (rows?.[0]?.id) {
      const updated = await api(`/rest/v1/projects?id=eq.${rows[0].id}&select=id`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload),
      });
      saved = updated[0];
    } else {
      const inserted = await api("/rest/v1/projects?select=id", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload),
      });
      saved = inserted[0];
    }

    await api(`/rest/v1/project_images?project_id=eq.${saved.id}`, { method: "DELETE" });
    const gallery = (item.images || []).map((url, imageIndex) => ({
      project_id: saved.id,
      image_url: url,
      alt_text: item.title,
      sort_order: imageIndex,
    }));
    if (gallery.length) await api("/rest/v1/project_images", {
      method: "POST",
      body: JSON.stringify(gallery),
    });

    imported++;
    console.log(`Imported ${imported}: ${item.title}`);
  }
}
console.log(`Finished. Imported/updated ${imported} projects. Homepage projects_list was left untouched.`);
