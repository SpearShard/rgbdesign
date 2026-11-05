import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { signIn, getMyCmsRole, clearCmsSession } from "@/lib/cmsClient";
import styles from "@/styles/Cms.module.scss";

export default function CmsLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const session = await signIn(email.trim(), password);
      const role = await getMyCmsRole(session);
      if (!role) {
        clearCmsSession();
        throw new Error("This account has not been granted RGB CMS access yet.");
      }
      router.replace("/admin/projects");
    } catch (err) { setError(err.message || "Unable to sign in."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <Head><title>CMS Login | RGB Design</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main className={styles.loginPage}>
        <div className={styles.loginPanel}>
          <a className={styles.wordmark} href="/">RGB<span>.</span></a>
          <p className={styles.eyebrow}>PRIVATE WORKSPACE</p>
          <h1>Welcome back.</h1>
          <p className={styles.muted}>Sign in to manage RGB projects.</p>
          <form onSubmit={handleSubmit} className={styles.form}>
            <label>Email address<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
            <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
            {error && <p className={styles.error}>{error}</p>}
            <button disabled={busy}>{busy ? "Signing in…" : "Sign in"} <span>↗</span></button>
          </form>
          <a className={styles.backLink} href="/">← Back to RGB Design</a>
        </div>
        <div className={styles.loginAside}><span>RGB DESIGN / CMS</span><p>Ideas become<br/><i>spaces.</i></p><small>PROJECT MANAGEMENT</small></div>
      </main>
    </>
  );
}
