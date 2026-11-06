import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { signIn, getMyCmsRole, clearCmsSession } from "@/lib/cmsClient";
import styles from "@/styles/Cms.module.scss";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <path d="m5 7 7 5.5L19 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v2.5" />
    </svg>
  );
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3 21 21" />
      <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
      <path d="M9.9 5.3A10.8 10.8 0 0 1 12 5c5.2 0 8.7 4.5 9.5 6-.4.8-1.5 2.3-3.2 3.8" />
      <path d="M6.2 6.3C4.2 7.7 2.9 9.7 2.5 11c.8 1.5 4.3 6 9.5 6 1 0 1.9-.2 2.8-.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export default function CmsLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await signIn(email.trim(), password);
      const role = await getMyCmsRole(session);
      if (!role) {
        clearCmsSession();
        throw new Error("This account has not been granted RGB CMS access yet.");
      }
      router.replace("/admin/projects");
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>CMS Login | RGB Design</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main className={styles.loginPage}>
        <div className={styles.loginPanel}>
          <a className={styles.wordmark} href="/">RGB<span>.</span></a>
          <p className={styles.eyebrow}>PRIVATE WORKSPACE</p>
          <h1>Welcome back.</h1>
          <p className={styles.muted}>Sign in to manage RGB projects.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label>
              Email address
              <span className={styles.inputWrap}>
                <span className={styles.inputIcon}><MailIcon /></span>
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </span>
            </label>

            <label>
              Password
              <span className={styles.inputWrap}>
                <span className={styles.inputIcon}><LockIcon /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </span>
            </label>

            {error && <p className={styles.error} role="alert">{error}</p>}

            <button type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
              <ArrowIcon />
            </button>
          </form>

          <a className={styles.backLink} href="/">← Back to RGB Design</a>
        </div>

        <div className={styles.loginAside}>
          <span>RGB DESIGN / CMS</span>
          <p>Ideas become<br /><i>spaces.</i></p>
          <small>PROJECT MANAGEMENT</small>
        </div>
      </main>
    </>
  );
}
