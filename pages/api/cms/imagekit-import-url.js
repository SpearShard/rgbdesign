import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function isPublicIPv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0)
  );
}

function isPublicIPv6(address) {
  const value = address.toLowerCase().split("%")[0];
  // Only globally-routable 2000::/3 addresses are accepted. This excludes
  // loopback, link-local, unique-local, mapped IPv4, and unspecified ranges.
  return value.startsWith("2") || value.startsWith("3");
}

async function assertPublicHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") ||
      host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("This image host is not publicly accessible.");
  }

  const literalType = isIP(host);
  if (literalType === 4) {
    if (!isPublicIPv4(host)) throw new Error("Private or local image hosts are not allowed.");
    return;
  }
  if (literalType === 6) {
    if (!isPublicIPv6(host)) throw new Error("Private or local image hosts are not allowed.");
    return;
  }

  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some(record =>
    record.family === 4 ? !isPublicIPv4(record.address) : !isPublicIPv6(record.address)
  )) {
    throw new Error("This image host does not resolve exclusively to public IP addresses.");
  }
}

async function fetchPublicImage(initialUrl) {
  let current = new URL(initialUrl);
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    if (!["http:", "https:"].includes(current.protocol) || current.username || current.password) {
      throw new Error("Only public http/https image URLs are supported.");
    }
    await assertPublicHost(current.hostname);
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "image/jpeg,image/png,image/webp,image/gif,image/avif" },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirectCount === 3) throw new Error("The image URL redirected too many times.");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`The image host returned HTTP ${response.status}.`);

    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.has(contentType)) {
      throw new Error("The URL must point directly to a JPEG, PNG, WebP, GIF, or AVIF image.");
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_IMAGE_BYTES) throw new Error("Images must be 20 MB or smaller.");

    const chunks = [];
    let total = 0;
    if (!response.body) throw new Error("The image host returned an empty response.");
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk);
      total += buffer.length;
      if (total > MAX_IMAGE_BYTES) throw new Error("Images must be 20 MB or smaller.");
      chunks.push(buffer);
    }
    if (!total) throw new Error("The image host returned an empty image.");
    return { buffer: Buffer.concat(chunks), contentType, finalUrl: current };
  }
  throw new Error("Could not follow the image URL.");
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const { imageUrl, projectTitle } = req.body || {};
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!token || !imageUrl || !projectTitle || !supabaseUrl || !supabaseKey || !privateKey) {
    return res.status(400).json({ error: "Missing authentication or image details." });
  }
  if (typeof imageUrl !== "string" || imageUrl.length > 2048 ||
      typeof projectTitle !== "string" || projectTitle.length > 200) {
    return res.status(400).json({ error: "Invalid image URL or project title." });
  }

  try {
    const userHeaders = { apikey: supabaseKey, Authorization: `Bearer ${token}` };
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: userHeaders });
    if (!userResponse.ok) return res.status(401).json({ error: "Please sign in again." });
    const user = await userResponse.json();

    const roleResponse = await fetch(
      `${supabaseUrl}/rest/v1/cms_admins?select=user_id&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
      { headers: userHeaders }
    );
    if (!roleResponse.ok) return res.status(503).json({ error: "Could not verify CMS permissions." });
    if (!(await roleResponse.json()).length) return res.status(403).json({ error: "You do not have permission to import images." });

    const source = new URL(imageUrl);
    if (!["http:", "https:"].includes(source.protocol)) {
      return res.status(400).json({ error: "Use a public http or https image URL." });
    }
    const { buffer, contentType, finalUrl } = await fetchPublicImage(source.href);
    const extension = ({
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
      "image/gif": "gif", "image/avif": "avif",
    })[contentType];
    const baseName = finalUrl.pathname.split("/").filter(Boolean).pop() || "external-image";
    const safeBase = decodeURIComponent(baseName).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 90).replace(/^[-.]+|[-.]+$/g, "");
    const fileName = `${safeBase || "external-image"}.${extension}`;
    const body = new FormData();
    body.append("file", new Blob([buffer], { type: contentType }), fileName);
    body.append("fileName", fileName);
    body.append("folder", `/RGB-Projects/${projectTitle.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`);

    const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
      body,
      signal: AbortSignal.timeout(30000),
    });
    const uploadData = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok || !uploadData.url || !uploadData.fileId) {
      console.error("ImageKit URL import failed:", uploadResponse.status, uploadData.message || uploadData.help || "");
      return res.status(502).json({ error: uploadData.message || "ImageKit could not store this image." });
    }
    return res.status(200).json({
      url: uploadData.url,
      fileId: uploadData.fileId,
      name: uploadData.name || fileName,
    });
  } catch (error) {
    const message = error.name === "TimeoutError"
      ? "The image host took too long to respond. Please try another URL."
      : error.message || "Could not import this image.";
    return res.status(400).json({ error: message });
  }
}
