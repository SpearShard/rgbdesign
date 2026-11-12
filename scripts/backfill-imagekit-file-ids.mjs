/**
 * Backfill ImageKit file IDs for existing RGB CMS gallery rows.
 *
 * Required environment:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (server-side only; never use NEXT_PUBLIC_ for this key)
 *   IMAGEKIT_PRIVATE_KEY
 *
 * Dry run (default):
 *   node scripts/backfill-imagekit-file-ids.mjs
 *
 * Apply matches:
 *   node scripts/backfill-imagekit-file-ids.mjs --apply
 *
 * Only unique URL-path matches are updated. Ambiguous or unmatched images are skipped.
 * The script never deletes ImageKit files.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const imageKitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const apply = process.argv.includes("--apply");
const pageSize = 1000;

if (!supabaseUrl || !serviceKey || !imageKitPrivateKey) {
  console.error("Missing environment. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and IMAGEKIT_PRIVATE_KEY.");
  process.exit(1);
}

const supabaseHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

function canonicalPath(value) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean).filter(part => !part.startsWith("tr:"));
    return "/" + parts.join("/");
  } catch {
    return null;
  }
}

async function readJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();
  let data;
  try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) {
    const message = typeof data === "string" ? data : data?.message || data?.hint || JSON.stringify(data);
    throw new Error(`HTTP ${response.status}: ${message}`);
  }
  return data;
}

async function fetchMissingRows() {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`${supabaseUrl}/rest/v1/project_images`);
    url.searchParams.set("select", "id,project_id,image_url,file_id");
    url.searchParams.set("file_id", "is.null");
    url.searchParams.set("order", "id.asc");
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));
    const page = await readJson(url, { headers: supabaseHeaders });
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function fetchImageKitFiles() {
  const files = [];
  const auth = "Basic " + Buffer.from(`${imageKitPrivateKey}:`).toString("base64");
  for (let skip = 0; ; skip += pageSize) {
    const url = new URL("https://api.imagekit.io/v1/files");
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("skip", String(skip));
    const page = await readJson(url, { headers: { Authorization: auth } });
    if (!Array.isArray(page)) throw new Error("Unexpected ImageKit file-list response.");
    files.push(...page);
    if (page.length < pageSize) break;
  }
  return files;
}

async function main() {
  console.log("Fetching gallery rows with missing ImageKit File IDs…");
  const rows = await fetchMissingRows();
  console.log(`Found ${rows.length} gallery row(s) without file_id.`);
  if (!rows.length) return;

  console.log("Fetching ImageKit file inventory…");
  const files = await fetchImageKitFiles();
  console.log(`Fetched ${files.length} ImageKit file(s).`);

  const byPath = new Map();
  for (const file of files) {
    if (!file?.fileId || !file?.url) continue;
    const path = canonicalPath(file.url);
    if (!path) continue;
    const list = byPath.get(path) || [];
    list.push(file);
    byPath.set(path, list);
  }

  const matched = [];
  const unmatched = [];
  const ambiguous = [];

  for (const row of rows) {
    const path = canonicalPath(row.image_url);
    const candidates = path ? (byPath.get(path) || []) : [];
    if (candidates.length === 1) matched.push({ row, file: candidates[0] });
    else if (candidates.length > 1) ambiguous.push(row);
    else unmatched.push(row);
  }

  console.log(`Unique matches: ${matched.length}`);
  console.log(`Unmatched: ${unmatched.length}`);
  console.log(`Ambiguous: ${ambiguous.length}`);

  for (const item of matched) {
    console.log(`  ${item.row.id} -> ${item.file.fileId} (${item.row.image_url})`);
  }

  if (!apply) {
    console.log("\nDry run only. No database rows were changed.");
    console.log("Review the matches, then rerun with --apply to save unique matches.");
    return;
  }

  let updated = 0;
  let skipped = 0;
  for (const { row, file } of matched) {
    const url = new URL(`${supabaseUrl}/rest/v1/project_images`);
    url.searchParams.set("id", `eq.${row.id}`);
    url.searchParams.set("file_id", "is.null");
    const response = await fetch(url, {
      method: "PATCH",
      headers: { ...supabaseHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ file_id: file.fileId }),
    });
    const body = await response.text();
    if (!response.ok) {
      console.error(`Failed to update row ${row.id}: HTTP ${response.status} ${body}`);
      skipped += 1;
      continue;
    }
    let result = [];
    try { result = body ? JSON.parse(body) : []; } catch {}
    if (result.length) updated += 1;
    else skipped += 1;
  }

  console.log(`\nBackfill complete. Updated: ${updated}; skipped: ${skipped}.`);
  console.log(`Still missing (unmatched + ambiguous): ${unmatched.length + ambiguous.length}.`);
}

main().catch(error => {
  console.error("ImageKit File ID backfill failed:", error.message);
  process.exit(1);
});
