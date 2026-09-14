"use client";
import { signIn } from "next-auth/react";
import styles from "./Attendance.module.css";
export default function GoogleLogin({
  returnTo = "/dashboard",
}: {
  returnTo?: string;
}) {
  return (
    <section className={styles.card}>
      <h2>Sign in with Google</h2>
      <p className={styles.muted}>
        Use the Google email you gave your instructor. Everyone can use the
        website; enrolled classes appear automatically.
      </p>
      <button
        className={styles.button}
        onClick={() =>
          signIn(
            "google",
            { redirectTo: returnTo },
            { prompt: "select_account" },
          )
        }
      >
        Continue with Google
      </button>
    </section>
  );
}
