import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { clearCmsSession, deleteProject, getCmsSession, getImageKitSignature, getMyCmsRole, listProjects, saveProject } from "@/lib/cmsClient";
import styles from "@/styles/Cms.module.scss";

const emptyProject = () => ({
  title: "", slug: "", subtitle: "", category: "interiors", category_title: "Interiors",
  dir: "", cover_url: "", video_url: "", description_blocks: [""],
  metadata: {}, images: [], year: new Date().getFullYear(), client: "", location: "",
  sort_order: 0, published: false,
});

const categories = [
  ["computational_design", "Computational Design"],
  ["material_experiments", "Material Experiments"],
  ["furniture_design", "Furniture Design"],
  ["installation_design", "Installation Design"],
  ["interiors", "Interiors"],
  ["competitions", "Competitions"],
  ["monks_of_method", "Monks of Method"],
];

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function CmsProjects() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function refresh(activeSession) {
    const rows = await listProjects(activeSession);
    setProjects(rows);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const active = getCmsSession();
      if (!active?.access_token || !active?.user?.id) { router.replace("/admin/login"); return; }
      try {
        const currentRole = await getMyCmsRole(active);
        if (!currentRole) { clearCmsSession(); router.replace("/admin/login"); return; }
        const rows = await listProjects(active);
        if (!mounted) return;
        setSession(active); setRole(currentRole); setProjects(rows);
      } catch {
        clearCmsSession();
        router.replace("/admin/login");
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const filtered = useMemo(() => projects.filter(p =>
    (filter === "all" || (filter === "published" ? p.published : !p.published)) &&
    `${p.title} ${p.category_title || ""} ${p.client || ""}`.toLowerCase().includes(query.toLowerCase())
  ), [projects, filter, query]);

  const groupedProjects = useMemo(() => {
    const groups = categories.map(([key, title]) => ({
      key,
      title,
      projects: filtered
        .filter(project => project.category === key || project.category_title === title)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.title.localeCompare(b.title)),
    })).filter(group => group.projects.length);

    const known = new Set(categories.map(([key, title]) => ({ key, title })));
    const unassigned = filtered.filter(project =>
      !categories.some(([key, title]) => project.category === key || project.category_title === title)
    );
    if (unassigned.length) groups.push({
      key: "other",
      title: "Other projects",
      projects: unassigned.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.title.localeCompare(b.title)),
    });
    return groups;
  }, [filtered]);

  const [collapsedGroups, setCollapsedGroups] = useState({});
  function toggleGroup(key) {
    setCollapsedGroups(current => ({ ...current, [key]: !current[key] }));
  }

  function update(field, value) { setForm(current => ({ ...current, [field]: value })); }

  async function uploadFiles(files) {
    if (!session || !files?.length) return;
    setBusy(true); setError(""); setNotice("Preparing secure ImageKit upload…");
    try {
      const auth = await getImageKitSignature(session);
      const uploaded = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        body.append("fileName", file.name);
        body.append("folder", `/RGB Projects/${slugify(form.title || "new-project")}`);
        body.append("publicKey", auth.publicKey);
        body.append("token", auth.token);
        body.append("expire", String(auth.expire));
        body.append("signature", auth.signature);
        const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "ImageKit upload failed.");
        uploaded.push({ image_url: result.url, alt_text: form.title || result.name });
      }
      setForm(current => ({ ...current, images: [...current.images, ...uploaded], cover_url: current.cover_url || uploaded[0]?.image_url }));
      setNotice(`${uploaded.length} image(s) uploaded to ImageKit.`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!form || !session) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.title),
        description_blocks: form.description_blocks.filter(Boolean),
        sort_order: Number(form.sort_order || 0),
        year: form.year ? Number(form.year) : null,
      };
      const saved = await saveProject(session, payload);
      await refresh(session);
      setForm(null);
      setNotice(`“${saved.title}” saved successfully.`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function handleDelete(project) {
    if (!session || !window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await deleteProject(session, project.id);
      await refresh(session);
      setNotice(`“${project.title}” deleted.`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function togglePublish(project) {
    try {
      await saveProject(session, { ...project, published: !project.published });
      await refresh(session);
      setNotice(project.published ? "Project moved to draft." : "Project published.");
    } catch (err) { setError(err.message); }
  }

  function logout() { clearCmsSession(); router.replace("/admin/login"); }

  return (
    <>
      <Head><title>Projects CMS | RGB Design</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main className={styles.dashboard}>
        <aside className={styles.sidebar}>
          <a className={styles.wordmark} href="/">RGB<span>.</span></a>
          <p className={styles.sideLabel}>WORKSPACE</p>
          <div className={styles.sideActive}>▦ <span>Projects</span></div>
          <div className={styles.sideBottom}>
            <span>{role?.role === "administrator" ? "Administrator" : "Project editor"}</span>
            <button className={styles.logout} onClick={logout}>Sign out ↗</button>
          </div>
        </aside>
        <section className={styles.content}>
          <header className={styles.topbar}><span>RGB DESIGN / CONTENT</span><span>{role?.email || session?.user?.email}</span></header>
          <div className={styles.headingRow}>
            <div><p className={styles.eyebrow}>PROJECT LIBRARY</p><h1>Projects<span>.</span></h1><p className={styles.muted}>Manage the work displayed on rgbdesign.in.</p></div>
            <button className={styles.primaryButton} onClick={()=>setForm(emptyProject())}>＋ New project</button>
          </div>
          <div className={styles.statsRow}>
            <div><strong>{projects.length}</strong><span>Total projects</span></div>
            <div><strong>{projects.filter(p=>p.published).length}</strong><span>Published</span></div>
            <div><strong>{projects.filter(p=>!p.published).length}</strong><span>Drafts</span></div>
          </div>
          {notice && <p className={styles.notice}>{notice}</p>}
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.toolbar}>
            <input placeholder="Search projects…" value={query} onChange={e=>setQuery(e.target.value)} />
            <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All projects</option><option value="published">Published</option><option value="draft">Drafts</option></select>
          </div>
          <div className={styles.categoryTree}>
            {groupedProjects.map(group => (
              <section className={styles.categoryGroup} key={group.key}>
                <button
                  type="button"
                  className={styles.categoryHeader}
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={!collapsedGroups[group.key]}
                >
                  <span className={styles.categoryHeaderMain}>
                    <span className={styles.categoryChevron}>{collapsedGroups[group.key] ? "＋" : "−"}</span>
                    <span className={styles.categoryName}>{group.title}</span>
                  </span>
                  <span className={styles.categoryCount}>{group.projects.length} {group.projects.length === 1 ? "project" : "projects"}</span>
                </button>
                {!collapsedGroups[group.key] && (
                  <div className={styles.projectGrid}>
                    {group.projects.map(project => (
                      <article className={styles.projectCard} key={project.id}>
                        <div className={styles.projectCardImage}>
                          {project.cover_url ? <img src={project.cover_url} alt={project.title} /> : <span>RGB.</span>}
                          <span className={project.published ? styles.published : styles.draft}>
                            {project.published ? "Published" : "Draft"}
                          </span>
                        </div>
                        <div className={styles.projectCardInfo}>
                          <div className={styles.projectCardHeading}>
                            <div>
                              <h3>{project.title}</h3>
                              <p>{[project.year, project.client].filter(Boolean).join(" · ") || group.title}</p>
                            </div>
                            <button
                              type="button"
                              className={styles.cardMore}
                              aria-label={`Edit ${project.title}`}
                              onClick={() => setForm({
                                ...project,
                                description_blocks: project.description_blocks?.length ? project.description_blocks : [""],
                                images: project.images || [],
                              })}
                            >↗</button>
                          </div>
                          <div className={styles.projectCardActions}>
                            <button className={styles.textButton} onClick={() => setForm({
                              ...project,
                              description_blocks: project.description_blocks?.length ? project.description_blocks : [""],
                              images: project.images || [],
                            })}>Edit project</button>
                            <button className={styles.textButton} onClick={() => togglePublish(project)}>
                              {project.published ? "Unpublish" : "Publish"}
                            </button>
                            <button className={styles.deleteButton} onClick={() => handleDelete(project)}>Delete</button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
            {!groupedProjects.length && (
              <div className={styles.emptyState}><span>—</span><h3>No projects found</h3><p>Try a different search or filter.</p></div>
            )}
          </div>
        </section>
      </main>
      {form && <div className={styles.modalBackdrop}>
        <form className={styles.editor} onSubmit={handleSave}>
          <div className={styles.editorHeader}><div><p className={styles.eyebrow}>{form.id ? "EDIT PROJECT" : "NEW PROJECT"}</p><h2>{form.title || "Untitled project"}</h2></div><button type="button" className={styles.closeButton} onClick={()=>setForm(null)}>×</button></div>
          <div className={styles.editorBody}>
            <div className={styles.fieldGrid}>
              <label>Project title<input value={form.title} onChange={e=>{const title=e.target.value;setForm(c=>({...c,title,slug:c.id?c.slug:slugify(title)}));}} required /></label>
              <label>URL slug<input value={form.slug} onChange={e=>update("slug",slugify(e.target.value))} required /></label>
              <label>Category<select value={form.category} onChange={e=>{const c=categories.find(x=>x[0]===e.target.value);setForm(f=>({...f,category:c[0],category_title:c[1]}));}}>{categories.map(c=><option key={c[0]} value={c[0]}>{c[1]}</option>)}</select></label>
              <label>Subtitle<input value={form.subtitle || ""} onChange={e=>update("subtitle",e.target.value)} /></label>
              <label>Year<input type="number" value={form.year || ""} onChange={e=>update("year",e.target.value)} /></label>
              <label>Client<input value={form.client || ""} onChange={e=>update("client",e.target.value)} /></label>
              <label>Location<input value={form.location || ""} onChange={e=>update("location",e.target.value)} /></label>
              <label>Legacy folder name<input value={form.dir || ""} onChange={e=>update("dir",e.target.value)} /></label>
              <label className={styles.fullField}>Cover ImageKit URL<input value={form.cover_url || ""} onChange={e=>update("cover_url",e.target.value)} placeholder="https://ik.imagekit.io/…" /></label>
              <label className={styles.fullField}>Video URL<input value={form.video_url || ""} onChange={e=>update("video_url",e.target.value)} placeholder="Vimeo / YouTube / video URL" /></label>
            </div>
            <label className={styles.blockLabel}>Description paragraphs</label>
            {form.description_blocks.map((paragraph,index)=><div className={styles.paragraphRow} key={index}><textarea value={paragraph} onChange={e=>update("description_blocks",form.description_blocks.map((v,i)=>i===index?e.target.value:v))} /><button type="button" onClick={()=>update("description_blocks",form.description_blocks.filter((_,i)=>i!==index))}>Remove</button></div>)}
            <button type="button" className={styles.addParagraph} onClick={()=>update("description_blocks",[...form.description_blocks,""])}>＋ Add paragraph</button>
            <div className={styles.uploadBox}><label>Upload gallery images to ImageKit<input type="file" accept="image/*" multiple disabled={busy} onChange={e=>uploadFiles(e.target.files)} /></label><p>Images are uploaded directly to ImageKit. Existing ImageKit URLs remain unchanged.</p></div>
            <div className={styles.galleryGrid}>{form.images.map((image,index)=><div key={index}><img src={typeof image==="string"?image:image.image_url} alt="" /><button type="button" onClick={()=>update("images",form.images.filter((_,i)=>i!==index))}>Remove</button><button type="button" onClick={()=>update("cover_url",typeof image==="string"?image:image.image_url)}>Set cover</button></div>)}</div>
            <label className={styles.checkbox}><input type="checkbox" checked={!!form.published} onChange={e=>update("published",e.target.checked)} /> Publish immediately after saving</label>
          </div>
          <div className={styles.editorFooter}><button type="button" className={styles.secondaryButton} onClick={()=>setForm(null)}>Cancel</button><button className={styles.primaryButton} disabled={busy}>{busy ? "Saving…" : form.published ? "Save & publish" : "Save draft"}</button></div>
        </form>
      </div>}
    </>
  );
}
