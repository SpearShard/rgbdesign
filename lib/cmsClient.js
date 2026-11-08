const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SESSION_KEY = "rgb-cms-session";

export function getCmsSession() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

export function saveCmsSession(session) {
  if (typeof window !== "undefined") window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearCmsSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
}

async function request(path, options = {}, token) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("CMS is not configured. Add the Supabase public URL and publishable key to the environment.");
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token || SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.text();
  let data;
  try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) throw new Error(data?.message || data?.msg || data?.hint || `Request failed (${response.status})`);
  return data;
}

export async function signIn(email, password) {
  const session = await request("/auth/v1/token?grant_type=password", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  saveCmsSession(session);
  return session;
}

export async function getMyCmsRole(session) {
  const rows = await request(`/rest/v1/cms_admins?select=email,role&user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`, {}, session.access_token);
  return rows?.[0] || null;
}

export async function listProjects(session) {
  const rows = await request("/rest/v1/projects?select=*&order=category.asc,sort_order.asc,title.asc", {}, session.access_token);
  const ids = rows.map(row => row.id);
  let images = [];
  if (ids.length) {
    images = await request(`/rest/v1/project_images?select=*&project_id=in.(${ids.join(",")})&order=sort_order.asc`, {}, session.access_token);
  }
  return rows.map(row => ({
    ...row,
    images: images.filter(image => image.project_id === row.id),
    description_blocks: Array.isArray(row.description_blocks) ? row.description_blocks : [],
    metadata: row.metadata || {},
  }));
}

export async function saveProject(session, project) {
  const { id, images, ...fields } = project;
  const payload = {
    ...fields,
    updated_at: new Date().toISOString(),
    description: (fields.description_blocks || []).join("\n\n"),
  };
  const path = id ? `/rest/v1/projects?id=eq.${id}` : "/rest/v1/projects";
  const data = await request(path, {
    method: id ? "PATCH" : "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  }, session.access_token);
  const saved = data?.[0];
  if (!saved) throw new Error("Project was not saved.");
  await request(`/rest/v1/project_images?project_id=eq.${saved.id}`, {
    method: "DELETE",
  }, session.access_token);
  const imageRows = (images || []).map((image, index) => ({
    project_id: saved.id,
    image_url: typeof image === "string" ? image : image.image_url,
    alt_text: typeof image === "string" ? saved.title : (image.alt_text || saved.title),
    sort_order: index,
  }));
  if (imageRows.length) await request("/rest/v1/project_images", {
    method: "POST", body: JSON.stringify(imageRows),
  }, session.access_token);
  return saved;
}

export async function deleteProject(session, id) {
  // Remove gallery rows first; the existing FK may not be configured with ON DELETE CASCADE.
  await request(`/rest/v1/project_images?project_id=eq.${id}`, { method: "DELETE" }, session.access_token);
  await request(`/rest/v1/projects?id=eq.${id}`, { method: "DELETE" }, session.access_token);
}

export async function getImageKitSignature(session) {
  const response = await fetch("/api/cms/imagekit-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not authorise ImageKit upload.");
  return data;
}
