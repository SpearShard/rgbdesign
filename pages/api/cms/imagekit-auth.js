import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization || "").replace(/^Bearer\\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!token || !url || !key || !privateKey || !process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY) {
    return res.status(503).json({ error: "CMS upload service is not configured." });
  }

  try {
    const userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    if (!userResponse.ok) return res.status(401).json({ error: "Please sign in again." });
    const user = await userResponse.json();

    const roleResponse = await fetch(
      `${url}/rest/v1/cms_admins?select=role&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${token}` } }
    );
    const roles = roleResponse.ok ? await roleResponse.json() : [];
    if (!roles?.length) return res.status(403).json({ error: "You do not have CMS upload permission." });

    const expire = Math.floor(Date.now() / 1000) + 60 * 10;
    const uploadToken = crypto.randomUUID();
    const signature = crypto.createHmac("sha1", privateKey).update(uploadToken + expire).digest("hex");
    return res.status(200).json({
      token: uploadToken,
      expire,
      signature,
      publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    });
  } catch {
    return res.status(500).json({ error: "Could not generate upload credentials." });
  }
}
