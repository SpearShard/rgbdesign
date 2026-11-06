import { useEffect, useMemo, useRef, useState } from "react";
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

function Icon({ name, size = 16, strokeWidth = 1.6 }) {
  const paths = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.2" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

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
  const [selectedFilesLabel, setSelectedFilesLabel] = useState("");
  const galleryFileInput = useRef(null);

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

  function moveGalleryImage(fromIndex, toIndex) {
    if (!form || toIndex < 0 || toIndex >= form.images.length || fromIndex === toIndex) return;
    const images = [...form.images];
    const [moved] = images.splice(fromIndex, 1);
    images.splice(toIndex, 0, moved);
    setForm(current => ({ ...current, images }));
  }

  function removeGalleryImage(index) {
    const images = form.images.filter((_, imageIndex) => imageIndex !== index);
    const removedUrl = typeof form.images[index] === "string" ? form.images[index] : form.images[index]?.image_url;
    setForm(current => ({
      ...current,
      images,
      cover_url: current.cover_url === removedUrl ? (typeof images[0] === "string" ? images[0] : images[0]?.image_url || "") : current.cover_url,
    }));
  }

  async function uploadFiles(files) {
    if (!session || !files?.length || !form) return;
    if (!form.title.trim()) {
      setError("Add a project title before uploading images so the gallery can be saved to the right project.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("Preparing secure ImageKit upload…");

    try {
      const uploaded = [];

      for (const file of Array.from(files)) {
        // ImageKit requires a fresh, single-use token for every file upload.
        const auth = await getImageKitSignature(session);
        const body = new FormData();
        body.append("file", file);
        body.append("fileName", file.name);
        body.append("folder", `/RGB-Projects/${slugify(form.title)}`);
        body.append("publicKey", auth.publicKey);
        body.append("token", auth.token);
        body.append("expire", String(auth.expire));
        body.append("signature", auth.signature);

        const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
          method: "POST",
          body,
        });
        const result = await response.json();
        if (!response.ok || !result.url) {
          throw new Error(result.message || `ImageKit could not upload ${file.name}.`);
        }

        uploaded.push({ image_url: result.url, alt_text: form.title || result.name });
      }

      // Persist the gallery as part of the upload flow. Previously, uploads only
      // lived in React state until the user separately saved the whole project.
      const nextImages = [...(form.images || []), ...uploaded];
      const nextForm = {
        ...form,
        slug: form.slug || slugify(form.title),
        images: nextImages,
        cover_url: form.cover_url || uploaded[0]?.image_url || "",
        published: form.id ? !!form.published : false,
        description_blocks: (form.description_blocks || []).filter(Boolean),
        sort_order: Number(form.sort_order || 0),
        year: form.year ? Number(form.year) : null,
      };

      const saved = await saveProject(session, nextForm);
      const rows = await listProjects(session);
      const savedProject = rows.find(project => project.id === saved.id);

      setProjects(rows);
      setForm(current => current ? {
        ...current,
        id: saved.id,
        slug: saved.slug || nextForm.slug,
        images: savedProject?.images || nextImages,
        cover_url: savedProject?.cover_url || nextForm.cover_url,
        published: savedProject?.published ?? nextForm.published,
      } : current);
      setNotice(`${uploaded.length} image(s) uploaded and saved to the project gallery.`);
      setSelectedFilesLabel(`${uploaded.length} image(s) uploaded and saved`);
    } catch (err) {
      setError(err.message || "Image upload failed. Please try again.");
      setNotice("");
    } finally {
      setBusy(false);
    }
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
          <div className={styles.sideActive}><Icon name="grid" size={15} /><span>Projects</span></div>
          <div className={styles.sideBottom}>
            <span>{role?.role === "administrator" ? "Administrator" : "Project editor"}</span>
            <button className={styles.logout} onClick={logout}>Sign out <Icon name="arrow" size={13} /></button>
          </div>
        </aside>
        <section className={styles.content}>
          <header className={styles.topbar}><span>RGB DESIGN / CONTENT</span><span>{role?.email || session?.user?.email}</span></header>
          <div className={styles.headingRow}>
            <div><p className={styles.eyebrow}>PROJECT LIBRARY</p><h1>Projects<span>.</span></h1><p className={styles.muted}>Manage the work displayed on rgbdesign.in.</p></div>
            <button className={styles.primaryButton} onClick={()=>setForm(emptyProject())}><Icon name="plus" size={15} /> New project</button>
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
                    <span className={styles.categoryChevron}><Icon name="chevron" size={15} /></span>
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
                          <span className={styles.imageCount}>
                            {project.images?.length || 0} {project.images?.length === 1 ? "image" : "images"}
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
                            ><Icon name="arrow" size={14} /></button>
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
          <div className={styles.editorHeader}><div><p className={styles.eyebrow}>{form.id ? "EDIT PROJECT" : "NEW PROJECT"}</p><h2>{form.title || "Untitled project"}</h2></div><button type="button" className={styles.closeButton} aria-label="Close editor" onClick={()=>setForm(null)}><Icon name="close" size={19} /></button></div>
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
              <label className={styles.fullField}>Video URL<input value={form.video_url || ""} onChange={e=>update("video_url",e.target.value)} placeholder="Vimeo / YouTube / video URL" /></label>
            </div>
            <label className={styles.blockLabel}>Description paragraphs</label>
            {form.description_blocks.map((paragraph,index)=><div className={styles.paragraphRow} key={index}><textarea value={paragraph} onChange={e=>update("description_blocks",form.description_blocks.map((v,i)=>i===index?e.target.value:v))} /><button type="button" onClick={()=>update("description_blocks",form.description_blocks.filter((_,i)=>i!==index))}>Remove</button></div>)}
            <button type="button" className={styles.addParagraph} onClick={()=>update("description_blocks",[...form.description_blocks,""])}>＋ Add paragraph</button>
            <section className={styles.coverPicker}>
              <div className={styles.coverPickerHeading}>
                <div><span className={styles.blockLabel}>Project cover</span><p>Choose the image used on the Works page and project cards.</p></div>
                {form.cover_url && <button type="button" onClick={()=>update("cover_url","")}>Clear cover</button>}
              </div>
              {form.cover_url ? <img className={styles.coverPreview} src={form.cover_url} alt="Selected project cover" /> : <div className={styles.coverPlaceholder}>Your cover preview will appear here</div>}
              {!form.images.length && <p className={styles.coverHint}>Upload images below, then select any image as the cover.</p>}
            </section>
            <div className={styles.uploadBox}>
              <input
                ref={galleryFileInput}
                className={styles.hiddenFileInput}
                type="file"
                accept="image/*"
                multiple
                disabled={busy}
                onChange={e=>{
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  setSelectedFilesLabel(files.map(file=>file.name).join(", "));
                  uploadFiles(files);
                  e.target.value = "";
                }}
              />
              <div className={styles.uploadControlRow}>
                <div><strong>Gallery images</strong><p>Choose one or more images to add to this project.</p></div>
                <button type="button" className={styles.chooseFilesButton} disabled={busy} onClick={()=>galleryFileInput.current?.click()}>
                  {busy ? "Uploading…" : "Choose files"}
                </button>
              </div>
              <p className={styles.selectedFilesText}>{busy ? "Uploading selected images…" : selectedFilesLabel || "No files selected"}</p>
              {error && <p className={styles.error} role="alert">{error}</p>}
              {notice && <p className={styles.notice} role="status">{notice}</p>}
              <p>Images upload directly to ImageKit and appear in the gallery when the upload succeeds.</p>
            </div>
            <section className={styles.galleryManager} aria-labelledby="gallery-manager-title">
              <div className={styles.galleryManagerHeader}>
                <div>
                  <span className={styles.blockLabel} id="gallery-manager-title">Gallery</span>
                  <p>{form.images.length} {form.images.length === 1 ? "image" : "images"} · Drag to reorder, or use the arrow controls</p>
                </div>
                <button type="button" className={styles.galleryAddButton} onClick={() => galleryFileInput.current?.click()} disabled={busy}>＋ Add images</button>
              </div>
              {form.images.length ? (
                <div className={styles.galleryManagerGrid}>
                  {form.images.map((image,index)=>{
                    const imageUrl = typeof image === "string" ? image : image.image_url;
                    const isCover = form.cover_url === imageUrl;
                    const imageName = typeof image === "string" ? imageUrl.split("/").pop()?.split("?")[0] : image.alt_text || imageUrl.split("/").pop()?.split("?")[0];
                    return <article
                      className={styles.galleryManagerItem}
                      key={imageUrl || index}
                      draggable={!busy}
                      onDragStart={event => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); }}
                      onDragOver={event => event.preventDefault()}
                      onDrop={event => { event.preventDefault(); const from = Number(event.dataTransfer.getData("text/plain")); if (Number.isInteger(from)) moveGalleryImage(from,index); }}
                    >
                      <button type="button" className={styles.galleryManagerImage} onClick={()=>update("cover_url",imageUrl)} aria-label={isCover ? "Current cover image" : `Set ${imageName} as cover`}>
                        <img src={imageUrl} alt={typeof image === "string" ? "" : image.alt_text || ""} loading="lazy" />
                        {isCover && <span className={styles.coverTag}>Cover</span>}
                        <span className={styles.galleryIndex}>{String(index+1).padStart(2,"0")}</span>
                      </button>
                      <div className={styles.galleryManagerMeta}>
                        <span title={imageName}>{imageName}</span>
                        <div className={styles.galleryManagerControls}>
                          <button type="button" onClick={()=>moveGalleryImage(index,index-1)} disabled={index===0} aria-label={`Move ${imageName} earlier`}>←</button>
                          <button type="button" onClick={()=>moveGalleryImage(index,index+1)} disabled={index===form.images.length-1} aria-label={`Move ${imageName} later`}>→</button>
                          <button type="button" onClick={()=>removeGalleryImage(index)} aria-label={`Remove ${imageName}`}>Remove</button>
                        </div>
                      </div>
                      <button type="button" className={isCover ? styles.coverSelectedButton : styles.coverSelectButton} onClick={()=>update("cover_url",imageUrl)}>{isCover ? "Selected cover" : "Use as cover"}</button>
                    </article>;
                  })}
                </div>
              ) : <div className={styles.galleryEmpty}><strong>Your gallery is empty</strong><span>Upload project photography to build the visual story. Your first image can become the cover.</span><button type="button" onClick={()=>galleryFileInput.current?.click()} disabled={busy}>Choose images</button></div>}
            </section>
            <label className={styles.checkbox}><input type="checkbox" checked={!!form.published} onChange={e=>update("published",e.target.checked)} /> Publish immediately after saving</label>
          </div>
          <div className={styles.editorFooter}><button type="button" className={styles.secondaryButton} onClick={()=>setForm(null)}>Cancel</button><button className={styles.primaryButton} disabled={busy}>{busy ? "Saving…" : form.published ? "Save & publish" : "Save draft"}</button></div>
        </form>
      </div>}
    </>
  );
}
