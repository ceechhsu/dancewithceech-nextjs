"use client";
import { signIn } from "next-auth/react";
import { useRef, useState } from "react";
import styles from "./Attendance.module.css";
export default function GoogleLogin({
  returnTo = "/dashboard",
}: {
  returnTo?: string;
}) {
  const starting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function begin() {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setError("");
    try {
      await signIn("google", { redirectTo: returnTo }, { prompt: "select_account" });
    } catch {
      setError("Sign-in could not start. Check your connection and try again.");
    } finally {
      starting.current = false;
      setBusy(false);
    }
  }
  return (
    <section className={styles.card}>
      <h2>Sign in with Google</h2>
      <p className={styles.muted}>
        {returnTo === '/profile' ? 'Use your Google account for your starting name and photo. You can customize them here after signing in.' : returnTo === '/admin' ? 'Choose the verified Google owner account to open the private dashboard.' : returnTo.startsWith('/practice')
          ? 'Sign in to save your scores, edit your profile, and challenge a friend.'
          : 'Use the Google email you gave your instructor. Everyone can use the website; enrolled classes appear automatically.'}
      </p>
      <button
        className={styles.button}
        disabled={busy}
        onClick={begin}
      >
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      <p className={styles.muted}><a href="/privacy">Sign-in records and deletion</a></p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
