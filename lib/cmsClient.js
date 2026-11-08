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
  const { id, images, version, ...fields } = project;
  const payload = {
    ...fields,
    ...(id ? { id } : {}),
    images: (images || []).map((image, index) => ({
      image_url: typeof image === "string" ? image : image.image_url,
      alt_text: typeof image === "string" ? fields.title : (image.alt_text || fields.title),
      sort_order: index,
    })),
    description: (fields.description_blocks || []).join("\\n\\n"),
  };
  const saved = await request("/rest/v1/rpc/cms_save_project", {
    method: "POST",
    body: JSON.stringify({ p_project: payload, p_expected_version: id ? Number(version || 1) : null }),
  }, session.access_token);
  if (!saved?.id) throw new Error("Project was not saved.");
  return saved;
}

export async function deleteProject(session, id, expectedVersion) {
  return request("/rest/v1/rpc/cms_delete_project", {
    method: "POST",
    body: JSON.stringify({ p_project_id: id, p_expected_version: Number(expectedVersion || 1) }),
  }, session.access_token);
}

export async function listActivity(session, limit = 60) {
  return request(`/rest/v1/cms_activity_log?select=id,actor_id,actor_email,action,project_title,details,created_at&order=created_at.desc&limit=${limit}`, {}, session.access_token);
}


export async function getCmsPresence(session) {
  const cutoff = new Date(Date.now() - 45000).toISOString();
  return request(`/rest/v1/cms_presence?select=user_id,email,project_id,project_title,last_seen&last_seen=gte.${encodeURIComponent(cutoff)}&order=last_seen.desc`, {}, session.access_token);
}

export async function upsertCmsPresence(session, presence) {
  return request("/rest/v1/cms_presence?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: session.user.id,
      email: session.user.email || "",
      project_id: presence?.project_id || null,
      project_title: presence?.project_title || "Browsing projects",
      last_seen: new Date().toISOString(),
    }),
  }, session.access_token);
}

export async function removeCmsPresence(session) {
  if (!session?.user?.id) return;
  return request(`/rest/v1/cms_presence?user_id=eq.${encodeURIComponent(session.user.id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  }, session.access_token);
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
