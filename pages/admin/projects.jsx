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

const rgbFavicon = "data:image/x-icon;base64,AAABAAEAICAAAAEAIACoEAAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAABAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAArFZBAKZTPwK3W0Miu1xDRLlcRDCyWUIItltDAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AK9XQQClUz4DvF1Eab9eRd7AX0X4wF9F7b1eRJe1WkMTuFxDAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvF1EALhb
Qz2/XkXswV9E/8FfRf/BX0X/wF9F/rxdRHrebU0Ao1E9ALCxsAD8/PwA9/f3
LPr6+mj19fUQ9fb1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOvs7ADm5uYD
+fn5VPn5+U3c29sB7e3tAAAAAAAAAAAAAAAAAG08MQDIYkcAvF1Ee8FfRf/B
X0T/wV9F/8FfRf/BX0X/vl5Evq1WQAmtVkAAsLGwAP///wD6+vpq/f394ff4
9y34+PgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7u/vAO7u7gr8/Py4/Pz8
revr6wbu7u4AAAAAAAAAAAAAAAAAazowAMZiRgC8XUR4wV9E/8FfRP/BX0T/
wV9E/8FfRf++XkS6q1ZACKxWQAAAAAAA9/f3APX19RH39/ct8vPzBfLz8gAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAADo6OgAZ2ZgAPb29iL29vYf////AOPj
4wAAAAAAAAAAAAAAAAAAAAAAu11EALhbQzS/XkTjwV9E/8FfRP/BX0T/wF9F
+rxdRGzNZUgAoVA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAACsV0EAjEo8AbpcRFC+XkTHv15E6b9eRNi8XUR7tFpCDLdb
QwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAACfUT4AbTw0ALVaQhG4XEMot1tDGqtWQAKvV0EAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAABNxmoAS8NoA1DMbjxRzm9/Us5vfVDMbjdJwGQCTMVoAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASsJn
AHD4jwBRzG9fU89x61PQcf9T0HH/U89x51HMbldd4H0ASL9kAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALCysQD3
9/cA9fX1FPf39zby8/IH8vPyAAAAAAAAAAAAAAAAAAAAAABPym0AT8lsG1PP
cdVU0HH/U9Bx/1PQcf9T0HH/Us9wzk7JaxZPyWsAAAAAAAAAAAAAAAAAAAAA
APLz8gDx8vIJ9/f3OPX29RH39/cAAAAAAAAAAAAAAAAAra+wAP///wD6+vpt
/f395ff39y74+PgAAAAAAAAAAAAAAAAAAAAAAFHNbwBQzG44U9Bx8lTQcf9T
0HH/U9Bx/1PQcf9Tz3DtUMttMFDMbQAAAAAAAAAAAAAAAAAAAAAA+Pn5APb3
9zn9/f3p+vr6X/7//wAAAAAAAAAAAAAAAACtr7AA/Pz8APf4+Cn6+vph9fX1
D/X29gAAAAAAAAAAAAAAAAAAAAAAUMttAE/LbSVTz3HiVNBx/1PQcf9T0HH/
U9Bx/1LPcNtPymwfT8psAAAAAAAAAAAAAAAAAAAAAAD29vYA9fX1E/r6+mL3
+Pci+vr6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAABMxWkARrxiA1LNcINT0HH6U9Bx/1PQcf9T0HH4Uc1v
eDWgSwFKw2YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAABPym0ATshrDFHNb2ZSz3CxUs9wr1HNb2BNyGoJTspsAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAA1oEgAKZA5AEi/YwVIv2IFCGcUADWgSgAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADZAAEB3wADAugA
AwHpAAIA5QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAABkY/gAXFv0bGBf9dRgX/aAYF/15Fxb8
HxkZ/wAQEPYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAFhX8HBkX/rcZGP7/GRj+/xkY/v8YGP7AFhX8HRcW
/QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAYF/1zGRj+/BkY/v8ZGP7/GRj+/xkY/v8YF/1yGxr/AA0N9AAA
AAAAAAAAAAAAAADq6+wA3+DhAfn5+T75+fk5jpGUAO7u7wAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAD19fUA9PX1Dvn6+lH39/cc+fn5AAAAAAAAAAAAAAAA
ABgX/pYZGP7/GRj+/xkY/v8ZGP7/GRj+/xgY/pEgH/8ADg71AAAAAAAAAAAA
AAAAAO/v8ADu7u8K/Pz8vPz8/LDt7u4G8PDxAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAPn6+gD4+Pg4/f396vr6+mH///8AAAAAAAAAAAAAAAAAGBf+ZhkY
/vgZGP7/GRj+/xkY/v8ZGP78GBf9ZBoZ/gANDfUAAAAAAAAAAAAAAAAA6uvr
AN3e3gH3+Pgz+Pj4LwAAAADq6+sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
9fX1APT09Av5+flD9/f3Fvn5+QAAAAAAAAAAAAAAAAAWFfwRGBf9nBkY/vgZ
GP7/GRj+9xgY/qEWFf0SFxb9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABcW/QAWFfwQGBf9WxgX/oQYF/5a
Fhb9EBcX/QAMDfkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAA/////////wf///4D///+A8f4fgHH+H4Bx/z+
A////gP///+H////////////////////////////8D////A//8fgH4/H4B+P
x+Afj//gH///8D////z//////////////////4P///8B////Afj/jwH4f48B
+P+PAf///4P///8=
";

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
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedFilesLabel, setSelectedFilesLabel] = useState("");
  const galleryFileInput = useRef(null);
  const editorRef = useRef(null);

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
        setSession(active); setRole(currentRole); setProjects(rows); setLoading(false);
      } catch {
        setLoading(false);
        clearCmsSession();
        router.replace("/admin/login");
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  useEffect(() => {
    if (!form || !editorRef.current) return undefined;
    const previousFocus = document.activeElement;
    const focusable = () => Array.from(editorRef.current.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
    )).filter(element => element.offsetParent !== null);
    focusable()[0]?.focus();
    const handleDialogKeys = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busy) setForm(null);
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
  }, [form, busy]);

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
        <section className={styles.content}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <a className={styles.brandMark} href="/" aria-label="RGB Design home"><img src={rgbFavicon} alt="" /></a>
              <span className={styles.breadcrumb}><b>/</b><strong>Projects</strong></span>
            </div>
            <div className={styles.topbarRight}>
              <span className={styles.accountBadge} title={role?.email || session?.user?.email}>{role?.email || session?.user?.email || "RGB editor"}</span>
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
                            <div className={styles.projectCardDetails}><span>{project.year || "Year not set"}</span><span>{project.client || "No client"}</span><span>{project.images?.length || 0} images</span></div>
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
              <label className={styles.fullField}>Video URL<input value={form.video_url || ""} onChange={e=>update("video_url",e.target.value)} placeholder="Vimeo / YouTube / video URL" /></label>
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
            </section>
          </div>
          <div className={styles.editorFooter}><button type="button" className={styles.secondaryButton} onClick={()=>setForm(null)}>Cancel</button><button className={styles.primaryButton} disabled={busy}>{busy ? "Saving…" : form.published ? "Save & publish" : "Save draft"}</button></div>
        </form>
      </div>}
    </>
  );
}
