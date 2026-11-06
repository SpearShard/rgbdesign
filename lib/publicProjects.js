const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CATEGORY_ORDER = [
  "computational_design",
  "material_experiments",
  "furniture_design",
  "installation_design",
  "interiors",
  "competitions",
  "monks_of_method",
];

export async function getPublishedProjectData() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
    const projectsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?select=*&published=eq.true&order=category.asc,sort_order.asc,title.asc`,
      { headers }
    );
    if (!projectsResponse.ok) throw new Error(`Projects request failed (${projectsResponse.status})`);

    const rows = await projectsResponse.json();
    if (!rows.length) return {};

    const ids = rows.map((row) => row.id);
    const imagesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/project_images?select=*&project_id=in.(${ids.join(",")})&order=sort_order.asc`,
      { headers }
    );
    if (!imagesResponse.ok) throw new Error(`Project images request failed (${imagesResponse.status})`);

    const images = await imagesResponse.json();
    const grouped = {};

    rows.forEach((row) => {
      const category = row.category || "other";
      if (!grouped[category]) {
        grouped[category] = {
          title: row.category_title || category.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
          projects: [],
        };
      }

      const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
      grouped[category].projects.push({
        ...metadata,
        id: row.id,
        title: row.title,
        slug: row.slug,
        subtitle: row.subtitle || "",
        dir: row.dir || "",
        cover: row.cover_url || "",
        video: row.video_url || "",
        description: Array.isArray(row.description_blocks)
          ? row.description_blocks.filter(Boolean)
          : (row.description ? row.description.split(/\n\n+/).filter(Boolean) : []),
        images: images
          .filter((image) => image.project_id === row.id)
          .map((image) => image.image_url),
        year: row.year,
        client: row.client,
        location: row.location,
        sort_order: row.sort_order,
      });
    });

    return Object.fromEntries(
      [...CATEGORY_ORDER.filter((key) => grouped[key]), ...Object.keys(grouped).filter((key) => !CATEGORY_ORDER.includes(key))]
        .map((key) => [key, grouped[key]])
    );
  } catch (error) {
    console.error("Could not load published RGB projects from Supabase:", error);
    return null;
  }
}
