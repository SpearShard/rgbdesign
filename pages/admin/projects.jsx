import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { clearCmsSession, deleteImageKitFile, deleteProject, getCmsPresence, getCmsSession, getImageKitSignature, getMyCmsRole, listActivity, listProjects, removeCmsPresence, saveProject, upsertCmsPresence } from "@/lib/cmsClient";
import styles from "@/styles/Cms.module.scss";

const emptyProject = () => ({
  title: "", slug: "", subtitle: "", category: "interiors", category_title: "Interiors",
  dir: "", cover_url: "", video_url: "", description_blocks: [""],
  metadata: {}, images: [], year: new Date().getFullYear(), client: "", location: "",
  sort_order: 0, published: false,
});

const rgbFavicon = "https://raw.githubusercontent.com/SpearShard/RevampRGB/master/app/favicon.ico";

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
  const [activityOpen, setActivityOpen] = useState(false);
  const [pendingImageRemoval, setPendingImageRemoval] = useState(null);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [liveNotice, setLiveNotice] = useState(null);
  const seenActivityIds = useRef(new Set());
  const seenActivityInitialized = useRef(false);
  const presenceTarget = useRef(null);
  const liveNoticeTimer = useRef(null);
  presenceTarget.current = form ? { project_id: form.id || null, project_title: form.id ? (form.title || "Untitled project") : "Creating a project" } : null;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedFilesLabel, setSelectedFilesLabel] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [addingImageUrl, setAddingImageUrl] = useState(false);
  const galleryFileInput = useRef(null);
  const editorRef = useRef(null);
  const busyRef = useRef(false);
  busyRef.current = busy;

  async function refresh(activeSession) {
    const rows = await listProjects(activeSession);
    setProjects(rows);
  }

  async function openActivity() {
    if (!session) return;
    setActivityOpen(true);
    setActivityLoading(true);
    try { setActivity(await listActivity(session)); }
    catch (err) { setError(err.message || "Could not load activity history."); setActivityOpen(false); }
    finally { setActivityLoading(false); }
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
        setSession(active); setRole(currentRole); setProjects(rows); setLoading(false);
      } catch {
        setLoading(false);
        clearCmsSession();
        router.replace("/admin/login");
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  // Heartbeat presence and poll the activity feed. Inactive tabs expire after 45 seconds.
  useEffect(() => {
    if (!session?.user?.id) return undefined;
    let active = true;
    let busyPolling = false;
    const heartbeat = async () => {
      try { await upsertCmsPresence(session, presenceTarget.current); } catch (err) { console.warn("CMS presence heartbeat failed:", err); }
    };
    const refreshPresence = async () => {
      try {
        const rows = await getCmsPresence(session);
        if (active) setOnlineUsers(rows || []);
      } catch (err) { console.warn("CMS presence refresh failed:", err); }
    };
    const pollActivity = async () => {
      if (busyPolling) return;
      busyPolling = true;
      try {
        const rows = await listActivity(session, 15);
        if (!active) return;
        if (!seenActivityInitialized.current) {
          seenActivityIds.current = new Set((rows || []).map(item => String(item.id)));
          seenActivityInitialized.current = true;
          return;
        }
        if (!rows?.length) return;
        const fresh = rows.filter(item => !seenActivityIds.current.has(String(item.id)));
        rows.forEach(item => seenActivityIds.current.add(String(item.id)));
        const otherEvents = fresh.filter(item => item.actor_id !== session.user.id);
        if (otherEvents.length) {
          const latest = otherEvents[0];
          const verb = latest.action === "project_deleted" ? "deleted" : latest.action === "project_created" ? "created" : latest.action === "project_published" ? "published" : latest.action === "project_unpublished" ? "unpublished" : "updated";
          setLiveNotice({ id: String(latest.id), message: `${latest.actor_email || "Another editor"} ${verb} “${latest.project_title}”.` });
          if (liveNoticeTimer.current) clearTimeout(liveNoticeTimer.current);
          liveNoticeTimer.current = setTimeout(() => setLiveNotice(null), 7000);
          try { await refresh(session); } catch (err) { console.warn("CMS live refresh failed:", err); }
        }
      } catch (err) { console.warn("CMS activity polling failed:", err); }
      finally { busyPolling = false; }
    };
    heartbeat(); refreshPresence(); pollActivity();
    const heartbeatTimer = setInterval(heartbeat, 12000);
    const presenceTimer = setInterval(refreshPresence, 5000);
    const activityTimer = setInterval(pollActivity, 5000);
    return () => {
      active = false;
      clearInterval(heartbeatTimer); clearInterval(presenceTimer); clearInterval(activityTimer);
      if (liveNoticeTimer.current) clearTimeout(liveNoticeTimer.current);
      removeCmsPresence(session).catch(() => {});
    };
  }, [session]);

  const editorOpen = Boolean(form);

  // Keep the page behind the editor completely still while the dialog is open.
  useEffect(() => {
    if (!editorOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [editorOpen]);

  useEffect(() => {
    if (!editorOpen || !editorRef.current) return undefined;
    const previousFocus = document.activeElement;
    const focusable = () => Array.from(editorRef.current.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
    )).filter(element => element.offsetParent !== null);
    focusable()[0]?.focus();
    const handleDialogKeys = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busyRef.current) setForm(null);
        return;
      }
      if (event.key === "Tab") {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleDialogKeys);
    return () => {
      window.removeEventListener("keydown", handleDialogKeys);
      if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    };
  }, [editorOpen]);

  const filtered = useMemo(() => projects.filter(p =>
    (filter === "all" || (filter === "published" ? p.published : !p.published)) &&
    `${p.title} ${p.category_title || ""} ${p.client || ""}`.toLowerCase().includes(query.toLowerCase())
  ), [projects, filter, query]);

  const groupedProjects = useMemo(() => {
    const groups = categories.map(([key, title]) => ({
      key, title,
      projects: filtered.filter(project => project.category === key || project.category_title === title)
        .sort((a,b)=>(a.sort_order ?? 0)-(b.sort_order ?? 0) || a.title.localeCompare(b.title)),
    })).filter(group => group.projects.length);
    const unassigned = filtered.filter(project =>
      !categories.some(([key,title]) => project.category === key || project.category_title === title)
    );
    if (unassigned.length) groups.push({
      key:"other",title:"Other projects",
      projects:unassigned.sort((a,b)=>(a.sort_order ?? 0)-(b.sort_order ?? 0) || a.title.localeCompare(b.title)),
    });
    return groups;
  }, [filtered]);

  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [view, setView] = useState("grid");
  function toggleGroup(key) { setCollapsedGroups(current => ({ ...current, [key]: !current[key] })); }
  function update(field, value) { setForm(current => ({ ...current, [field]: value })); }

  function moveGalleryImage(fromIndex, toIndex) {
    if (!form || toIndex < 0 || toIndex >= form.images.length || fromIndex === toIndex) return;
    const images = [...form.images];
    const [moved] = images.splice(fromIndex, 1);
    images.splice(toIndex, 0, moved);
    setForm(current => ({ ...current, images }));
  }

  async function removeGalleryImage(index, permanentlyDelete = false) {
    const image = form?.images?.[index];
    if (!image || busy) return;
    const imageUrl = typeof image === "string" ? image : image.image_url;
    const fileId = typeof image === "string" ? null : image.file_id;
    const nextImages = form.images.filter((_, imageIndex) => imageIndex !== index);
    const nextCover = form.cover_url === imageUrl
      ? (typeof nextImages[0] === "string" ? nextImages[0] : nextImages[0]?.image_url || "")
      : form.cover_url;

    setPendingImageRemoval(null);
    setBusy(true); setError(""); setNotice("Updating project gallery…");
    const nextForm = { ...form, images: nextImages, cover_url: nextCover };
    try {
      const saved = await saveProject(session, {
        ...nextForm,
        slug: nextForm.slug || slugify(nextForm.title),
        description_blocks: (nextForm.description_blocks || []).filter(Boolean),
        sort_order: Number(nextForm.sort_order || 0),
        year: nextForm.year ? Number(nextForm.year) : null,
      });
      const rows = await listProjects(session);
      setProjects(rows);
      setForm(current => current ? {
        ...current, images: nextImages, cover_url: nextCover, version: saved.version,
      } : current);

      if (permanentlyDelete && fileId) {
        setNotice("Gallery updated. Deleting the original ImageKit file…");
        try {
          await deleteImageKitFile(session, fileId, form.id, imageUrl);
          setNotice("Image removed from the project and permanently deleted from ImageKit.");
        } catch (deleteError) {
          setNotice("");
          setError(deleteError.message || "The image was removed from the gallery, but ImageKit could not delete the original file.");
        }
      } else {
        setNotice("Image removed from this project. The original file remains in ImageKit.");
      }
    } catch (err) {
      setNotice("");
      setError(err.message || "Could not remove this image.");
    } finally {
      setBusy(false);
    }
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
        // Each attempt receives a fresh, single-use ImageKit token.
        // Retry once only when ImageKit reports an authentication/expiry failure.
        let result = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
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
          const responseBody = await response.json().catch(() => ({}));
          if (response.ok && responseBody.url) {
            result = responseBody;
            break;
          }

          const message = responseBody.message || responseBody.help || "";
          const authFailure = response.status === 401 ||
            /jwt|token|signature|authenticat|expir/i.test(message);
          if (attempt === 0 && authFailure) continue;

          throw new Error(message || `ImageKit could not upload ${file.name} (HTTP ${response.status}).`);
        }

        if (!result?.url) throw new Error(`ImageKit could not upload ${file.name}.`);
        uploaded.push({ image_url: result.url, file_id: result.fileId || null, alt_text: form.title || result.name });
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
        version: saved.version,
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

  async function addImageFromUrl(event) {
    event.preventDefault();
    const value = imageUrlInput.trim();
    if (!value || !form) return;

    let parsed;
    try {
      parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Use an http or https image URL.");
    } catch (err) {
      setError(err.message || "Enter a valid image URL.");
      return;
    }

    setAddingImageUrl(true);
    setError("");
    setNotice("Checking image URL…");
    try {
      await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("This URL could not be loaded as an image. Check that it is public and points directly to an image."));
        image.src = parsed.href;
      });

      const alreadyAdded = (form.images || []).some(item =>
        (typeof item === "string" ? item : item?.image_url) === parsed.href
      );
      if (alreadyAdded) {
        setError("That image is already in this gallery.");
        setNotice("");
        return;
      }

      const nextImages = [...(form.images || []), { image_url: parsed.href, alt_text: form.title || "Project image" }];
      setForm(current => ({
        ...current,
        images: nextImages,
        cover_url: current.cover_url || parsed.href,
      }));
      setImageUrlInput("");
      setNotice("Image added to the gallery. Save the project to keep this change.");
    } catch (err) {
      setError(err.message || "Could not load that image URL.");
      setNotice("");
    } finally {
      setAddingImageUrl(false);
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
      await deleteProject(session, project.id, project.version);
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

  async function logout() { try { if (session) await removeCmsPresence(session); } catch {} clearCmsSession(); router.replace("/admin/login"); }

  return (
    <>
      <Head><title>Projects CMS | RGB Design</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main className={styles.dashboard}>
        <section className={styles.content}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <a className={styles.brandMark} href="/" aria-label="RGB Design home"><img src={rgbFavicon} alt="" /></a>
              <span className={styles.breadcrumb}><b>/</b><strong>Projects</strong></span>
            </div>
            <div className={styles.topbarRight}>
              <span className={styles.accountBadge} title={role?.email || session?.user?.email}>{role?.email || session?.user?.email || "RGB editor"}</span>
              <div className={styles.presenceGroup} aria-label={`${onlineUsers.length} editors online`}>
                <span className={styles.onlineIndicator}><i />{onlineUsers.length} online</span>
                <div className={styles.presenceAvatars}>
                  {onlineUsers.filter(user => user.user_id !== session?.user?.id).slice(0, 3).map(user => <span key={user.user_id} className={styles.presenceAvatar} title={`${user.email} · ${user.project_title || "Browsing projects"}`}>{(user.email || "?").slice(0, 1).toUpperCase()}</span>)}
                  {onlineUsers.filter(user => user.user_id !== session?.user?.id).length > 3 && <span className={styles.presenceOverflow}>+{onlineUsers.filter(user => user.user_id !== session?.user?.id).length - 3}</span>}
                </div>
              </div>
              <button type="button" className={styles.activityButton} onClick={openActivity}>Activity history</button>
              <button type="button" className={styles.logout} onClick={logout}>Sign out</button>
              <a className={styles.siteLink} href="/" target="_blank" rel="noreferrer">View website <Icon name="arrow" size={13}/></a>
            </div>
          </header>
          <div className={styles.pageIntro}>
            <div><h1>Projects</h1><p>Your portfolio, in progress and in public.</p></div>
            <button type="button" className={styles.primaryButton} onClick={()=>setForm(emptyProject())}><Icon name="plus" size={16}/> Add project</button>
          </div>

          <div className={styles.overviewRow} aria-label="Project overview">
            <div className={styles.overviewLead}><strong>{projects.length}</strong><span>Projects in library</span></div>
            <div><strong>{projects.filter(p=>p.published).length}</strong><span>Live on website</span></div>
            <div><strong>{projects.filter(p=>!p.published).length}</strong><span>Saved as drafts</span></div>
          </div>

          {liveNotice && <div className={styles.liveNotice} role="status"><span className={styles.liveNoticeDot} /><span>{liveNotice.message}</span><button type="button" onClick={() => setLiveNotice(null)} aria-label="Dismiss live update">×</button></div>}
          {notice && <p className={styles.notice} role="status">{notice}</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}

          <section className={styles.librarySection} aria-labelledby="library-title">
            <div className={styles.libraryHeading}>
              <div><h2 id="library-title">Your work</h2><p>Browse, edit and publish portfolio projects.</p></div>
              <div className={styles.libraryCount}>{filtered.length} {filtered.length===1 ? "project" : "projects"}</div>
            </div>
            <div className={styles.libraryToolbar}>
              <label className={styles.searchField}><Icon name="search" size={17}/><span className={styles.srOnly}>Search projects</span><input placeholder="Search by project, client or category" value={query} onChange={e=>setQuery(e.target.value)}/>{query && <button type="button" onClick={()=>setQuery("")} aria-label="Clear search">×</button>}</label>
              <div className={styles.toolbarControls}>
                <div className={styles.filterTabs} role="group" aria-label="Filter projects">
                  {[["all","All"],["published","Published"],["draft","Drafts"]].map(([key,label])=><button type="button" key={key} onClick={()=>setFilter(key)} className={filter===key?styles.filterActive:""} aria-pressed={filter===key}>{label}<span>{key==="all"?projects.length:key==="published"?projects.filter(p=>p.published).length:projects.filter(p=>!p.published).length}</span></button>)}
                </div>
                <div className={styles.viewToggle} role="group" aria-label="Project view">
                  <button type="button" onClick={()=>setView("grid")} className={view==="grid"?styles.viewActive:""} aria-pressed={view==="grid"} aria-label="Grid view"><Icon name="grid" size={16}/></button>
                  <button type="button" onClick={()=>setView("list")} className={view==="list"?styles.viewActive:""} aria-pressed={view==="list"} aria-label="List view">☷</button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingGrid} aria-label="Loading projects">
                {[0,1,2,3].map(index=><div className={styles.projectSkeleton} key={index}><span/><div><b/><i/></div></div>)}
              </div>
            ) : groupedProjects.length ? (
              <div className={styles.projectCategories}>
                {groupedProjects.map(group=>(
                  <section className={styles.projectCategory} key={group.key} aria-labelledby={`category-${group.key}`}>
                    <header className={styles.projectCategoryHeading}>
                      <h3 id={`category-${group.key}`}>{group.title}</h3>
                      <span>{group.projects.length} {group.projects.length===1?"project":"projects"}</span>
                    </header>
                    <div className={view==="grid"?styles.projectGrid:styles.projectList}>
                      {group.projects.map(project=>(
                        <article className={styles.projectCard} key={project.id}>
                          <button type="button" className={styles.projectCardMedia} onClick={()=>setForm({...project,description_blocks:project.description_blocks?.length?project.description_blocks:[""],images:project.images||[]})} aria-label={`Edit ${project.title}`}>
                            {project.cover_url ? <img src={project.cover_url} alt="" loading="lazy"/> : <span className={styles.mediaFallback}>RGB.</span>}
                            <span className={styles.mediaNumber}>{String(project.sort_order ?? 0).padStart(2,"0")}</span>
                          </button>
                          <div className={styles.projectCardBody}>
                            <div className={styles.projectCardTitleRow}><h4>{project.title}</h4><span className={project.published?styles.statusLive:styles.statusDraft}>{project.published?"Published":"Draft"}</span></div>
                            <p>{project.subtitle || project.category_title || group.title}</p>
                            <div className={styles.projectCardDetails}><span>{project.year || "Year not set"}</span><span>{project.client || "No client"}</span><span>{project.images?.length || 0} images</span>{onlineUsers.filter(user => user.project_id === project.id && user.user_id !== session?.user?.id).map(user => <span key={user.user_id} className={styles.editingBadge}>Editing · {user.email?.split("@")[0] || "Teammate"}</span>)}</div>
                            <div className={styles.projectCardActions}>
                              <button type="button" className={styles.textButton} onClick={()=>setForm({...project,description_blocks:project.description_blocks?.length?project.description_blocks:[""],images:project.images||[]})}>Edit project</button>
                              <button type="button" className={styles.textButton} onClick={()=>togglePublish(project)}>{project.published?"Unpublish":"Publish"}</button>
                              <button type="button" className={styles.deleteButton} onClick={()=>handleDelete(project)}>Delete</button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}><h3>{query?"No matching projects":"Your project library is empty"}</h3><p>{query?"Try a different title, client or category.":"Add a project to start building your portfolio."}</p>{!query&&<button type="button" className={styles.primaryButton} onClick={()=>setForm(emptyProject())}>Add your first project</button>}</div>
            )}
          </section>
        </section>
      </main>
      {activityOpen && <div className={styles.modalBackdrop} onMouseDown={event=>{if(event.target===event.currentTarget)setActivityOpen(false);}}>
        <section className={styles.activityDialog} role="dialog" aria-modal="true" aria-labelledby="activity-title">
          <header className={styles.activityHeader}>
            <div><p className={styles.eyebrow}>Workspace history</p><h2 id="activity-title">Activity history</h2><p>Recent changes made by your CMS team.</p></div>
            <button type="button" className={styles.closeButton} aria-label="Close activity history" onClick={()=>setActivityOpen(false)}><Icon name="close" size={19}/></button>
          </header>
          <div className={styles.activityBody}>
            {activityLoading ? <p className={styles.muted}>Loading activity…</p> : activity.length ? activity.map(item=>(
              <article className={styles.activityItem} key={item.id}>
                <span className={styles.activityDot} aria-hidden="true"/>
                <div className={styles.activityCopy}>
                  <strong>{item.actor_email || "CMS user"}</strong>
                  <p>{({
                    project_created:"created", project_updated:"updated", images_added:"added images to",
                    images_removed:"removed images from", project_published:"published",
                    project_unpublished:"unpublished", project_deleted:"deleted",
                  })[item.action] || item.action.replaceAll("_"," ")} <b>{item.project_title || "a project"}</b></p>
                  {item.details?.summary && <small>{item.details.summary}</small>}
                  <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"})}</time>
                </div>
              </article>
            )) : <p className={styles.muted}>No activity has been recorded yet.</p>}
          </div>
          <footer className={styles.activityFooter}><span>Showing the latest {activity.length} events</span><button type="button" className={styles.secondaryButton} onClick={openActivity}>Refresh</button></footer>
        </section>
      </div>}
      {pendingImageRemoval && form && <div className={styles.modalBackdrop} onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setPendingImageRemoval(null);}}>
        <section className={styles.imageDeleteDialog} role="dialog" aria-modal="true" aria-labelledby="image-delete-title" aria-describedby="image-delete-description">
          <div className={styles.imageDeleteIcon} aria-hidden="true"><Icon name="image" size={25}/></div>
          <button type="button" className={styles.imageDeleteClose} aria-label="Close image removal dialog" onClick={()=>setPendingImageRemoval(null)} disabled={busy}><Icon name="close" size={18}/></button>
          <p className={styles.eyebrow}>Gallery management</p>
          <h2 id="image-delete-title">Remove this image?</h2>
          <p id="image-delete-description" className={styles.imageDeleteDescription}>Choose whether to remove this image from <strong>{form.title || "this project"}</strong> only, or permanently delete the original file from ImageKit too.</p>
          <div className={styles.imageDeletePreview}>
            <img src={pendingImageRemoval.imageUrl} alt="" />
            <div><strong>{pendingImageRemoval.imageName || "Project image"}</strong><span>{pendingImageRemoval.image?.file_id ? "ImageKit file · permanent deletion available" : "External or legacy image · no stored ImageKit file ID"}</span></div>
          </div>
          <div className={styles.imageDeleteChoices}>
            <button type="button" className={styles.imageKeepFileButton} disabled={busy} onClick={()=>removeGalleryImage(pendingImageRemoval.index,false)}>
              <span>Remove from project</span><small>Keep the original image safely in ImageKit.</small>
            </button>
            <button type="button" className={styles.imagePermanentButton} disabled={busy || !(typeof pendingImageRemoval.image !== "string" && pendingImageRemoval.image?.file_id)} onClick={()=>removeGalleryImage(pendingImageRemoval.index,true)}>
              <span>Delete permanently</span><small>Remove it from this project and delete the original ImageKit file.</small>
            </button>
          </div>
          {!pendingImageRemoval.image?.file_id && <p className={styles.imageDeleteNote}>Permanent deletion is unavailable for this image because it was added by URL or before ImageKit file IDs were tracked. You can still remove it from this gallery.</p>}
          <button type="button" className={styles.imageDeleteCancel} onClick={()=>setPendingImageRemoval(null)} disabled={busy}>Cancel</button>
        </section>
      </div>}
      {form && <div className={styles.modalBackdrop} onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setForm(null);}}>
        <form ref={editorRef} className={styles.editor} role="dialog" aria-modal="true" aria-labelledby="project-editor-title" onMouseDown={event=>event.stopPropagation()} onSubmit={handleSave}>
          <div className={styles.editorHeader}><div><p className={styles.eyebrow}>{form.id ? "Edit project" : "New project"}</p><h2 id="project-editor-title">{form.title || "Untitled project"}</h2></div><button type="button" className={styles.closeButton} aria-label="Close editor" onClick={()=>setForm(null)}><Icon name="close" size={19} /></button></div>
          <div className={styles.editorBody}>
            <section className={styles.editorSection}>
              <div className={styles.editorSectionTitle}><h3>Project details</h3><p>The essentials visitors see on the portfolio.</p></div>
            <div className={styles.fieldGrid}>
              <label>Project title<input value={form.title} onChange={e=>{const title=e.target.value;setForm(c=>({...c,title,slug:c.id?c.slug:slugify(title)}));}} required /></label>
              <label>URL slug<input value={form.slug} onChange={e=>update("slug",slugify(e.target.value))} required /></label>
              <label>Category<select value={form.category} onChange={e=>{const c=categories.find(x=>x[0]===e.target.value);setForm(f=>({...f,category:c[0],category_title:c[1]}));}}>{categories.map(c=><option key={c[0]} value={c[0]}>{c[1]}</option>)}</select></label>
              <label>Subtitle<input value={form.subtitle || ""} onChange={e=>update("subtitle",e.target.value)} /></label>
              <label>Year<input type="number" value={form.year || ""} onChange={e=>update("year",e.target.value)} /></label>
              <label>Client<input value={form.client || ""} onChange={e=>update("client",e.target.value)} /></label>
              <label>Location<input value={form.location || ""} onChange={e=>update("location",e.target.value)} /></label>
              <label>Legacy folder name<input value={form.dir || ""} onChange={e=>update("dir",e.target.value)} /></label>
              <label className={styles.fullField}>Main project video <span className={styles.optionalLabel}>Optional</span><input type="url" inputMode="url" value={form.video_url || ""} onChange={e=>update("video_url",e.target.value)} placeholder="Paste a YouTube, Vimeo, Google Drive or direct MP4 URL" /><small className={styles.fieldHelp}>This is the featured video for the project detail page. Leave it empty if the project is image-only.</small>{form.video_url && <a className={styles.videoUrlPreview} href={form.video_url} target="_blank" rel="noreferrer">Open current video URL ↗</a>}</label>
            </div>
            </section>
            <section className={styles.editorSection}>
            <div className={styles.editorSectionTitle}><h3>Project description</h3><p>Shape the story behind this work.</p></div>
            {form.description_blocks.map((paragraph,index)=><div className={styles.paragraphRow} key={index}><textarea value={paragraph} onChange={e=>update("description_blocks",form.description_blocks.map((v,i)=>i===index?e.target.value:v))} /><button type="button" onClick={()=>update("description_blocks",form.description_blocks.filter((_,i)=>i!==index))}>Remove</button></div>)}
            <button type="button" className={styles.addParagraph} onClick={()=>update("description_blocks",[...form.description_blocks,""])}>＋ Add paragraph</button>
            </section>
            <section className={styles.editorSection}>
            <div className={styles.editorSectionTitle}><h3>Images and gallery</h3><p>Choose the cover and arrange the project photography.</p></div>
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
              <div className={styles.imageUrlEntry}>
                <label htmlFor="gallery-image-url">Or add an image from a URL</label>
                <div className={styles.imageUrlControls}>
                  <input
                    id="gallery-image-url"
                    type="url"
                    inputMode="url"
                    placeholder="https://example.com/project-image.jpg"
                    value={imageUrlInput}
                    onChange={event => setImageUrlInput(event.target.value)}
                    disabled={busy || addingImageUrl}
                  />
                  <button type="button" onClick={addImageFromUrl} disabled={busy || addingImageUrl || !imageUrlInput.trim()}>
                    {addingImageUrl ? "Checking…" : "Add image URL"}
                  </button>
                </div>
                <p>Use a public, direct image link. The image is previewed and added to the gallery; save the project to persist it.</p>
              </div>
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
                          <button type="button" onClick={()=>setPendingImageRemoval({ index, image, imageUrl, imageName })} disabled={busy} aria-label={`Remove ${imageName}`}>Remove</button>
                        </div>
                      </div>
                      <button type="button" className={isCover ? styles.coverSelectedButton : styles.coverSelectButton} onClick={()=>update("cover_url",imageUrl)}>{isCover ? "Selected cover" : "Use as cover"}</button>
                    </article>;
                  })}
                </div>
              ) : <div className={styles.galleryEmpty}><strong>Your gallery is empty</strong><span>Upload project photography to build the visual story. Your first image can become the cover.</span><button type="button" onClick={()=>galleryFileInput.current?.click()} disabled={busy}>Choose images</button></div>}
            </section>
            <label className={styles.checkbox}><input type="checkbox" checked={!!form.published} onChange={e=>update("published",e.target.checked)} /> Publish immediately after saving</label>
            </section>
          </div>
          <div className={styles.editorFooter}><button type="button" className={styles.secondaryButton} onClick={()=>setForm(null)}>Cancel</button><button className={styles.primaryButton} disabled={busy}>{busy ? "Saving…" : form.published ? "Save & publish" : "Save draft"}</button></div>
        </form>
      </div>}
    </>
  );
}
