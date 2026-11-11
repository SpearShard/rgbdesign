export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization || "").replace(/^Bearer\\s+/i, "");
  const { fileId, projectId } = req.body || {};
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

  if (!token || !fileId || !projectId || !supabaseUrl || !supabaseKey || !privateKey) {
    return res.status(400).json({ error: "Missing authentication or image details." });
  }
  if (typeof fileId !== "string" || fileId.length > 200 || !/^[A-Za-z0-9_-]+$/.test(fileId)) {
    return res.status(400).json({ error: "Invalid ImageKit file ID." });
  }

  try {
    const headers = { apikey: supabaseKey, Authorization: `Bearer ${token}` };
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers });
    if (!userResponse.ok) return res.status(401).json({ error: "Please sign in again." });
    const user = await userResponse.json();

    const roleResponse = await fetch(
      `${supabaseUrl}/rest/v1/cms_admins?select=user_id&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
      { headers }
    );
    if (!roleResponse.ok) return res.status(503).json({ error: "Could not verify CMS permissions." });
    if (!(await roleResponse.json()).length) return res.status(403).json({ error: "You do not have permission to delete images." });

    const projectResponse = await fetch(
      `${supabaseUrl}/rest/v1/projects?select=id&id=eq.${encodeURIComponent(projectId)}&limit=1`,
      { headers }
    );
    if (!projectResponse.ok) return res.status(503).json({ error: "Could not verify the project." });
    if (!(await projectResponse.json()).length) return res.status(404).json({ error: "Project not found." });

    // Never delete a file that is still referenced by a different project.
    const refsResponse = await fetch(
      `${supabaseUrl}/rest/v1/project_images?select=project_id&file_id=eq.${encodeURIComponent(fileId)}`,
      { headers }
    );
    if (!refsResponse.ok) return res.status(503).json({ error: "Could not verify image references. Nothing was deleted." });
    const refs = await refsResponse.json();
    if (refs.length) {
      return res.status(409).json({ error: "This image is still referenced by a project gallery. Remove all gallery references before permanently deleting it." });
    }

    const deleteResponse = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
    });
    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      const detail = await deleteResponse.text();
      console.error("ImageKit file deletion failed:", deleteResponse.status, detail.slice(0, 500));
      return res.status(502).json({ error: "ImageKit could not delete this file. The gallery change is saved; you can retry permanent deletion." });
    }
    return res.status(200).json({ deleted: true });
  } catch (error) {
    console.error("ImageKit delete endpoint failed:", error);
    return res.status(500).json({ error: "Could not delete the ImageKit file." });
  }
}
