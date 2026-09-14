"use client";
/* Full document navigation isolates attendance from marketing scripts. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  attendanceApi,
  AttendanceApiError,
  errorMessage,
  locate,
} from "@/lib/attendance/client";
import GoogleLogin from "./GoogleLogin";
import s from "./Attendance.module.css";
export default function CheckIn({ token, email }: { token: string; email: string }) {
  const started = useRef(false),
    [error, setError] = useState(""),
    [login, setLogin] = useState(false),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState<{
      name: string;
      className: string;
      record: { updated_at: string; checked_in_at?: string | null };
    } | null>(null);
  const check = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const location = await locate();
      setSuccess(await attendanceApi("check-in", { token, location }));
    } catch (e) {
      if (e instanceof AttendanceApiError && e.status === 401) setLogin(true);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [token]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!started.current) {
        started.current = true;
        void check();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [check]);
  return (
    <>
      <p className={s.eyebrow}>Class attendance</p>
      <h1 className={s.title}>{success ? "You’re checked in" : "Check in"}</h1>
      {login ? (
        <GoogleLogin
          returnTo={`/attendance/checkin/${encodeURIComponent(token)}`}
        />
      ) : success ? (
        <section className={s.card}>
          <p className={s.success} role="status">
            {email}: Present
          </p>
          <h2>{success.className}</h2>
          {success.record.checked_in_at && <p>{new Date(success.record.checked_in_at).toLocaleString()}</p>}
          <a className={s.button} href="/attendance/history">
            View my attendance
          </a>
        </section>
      ) : error ? (
        <section className={s.card}>
          <p className={s.error} role="alert">
            {error}
          </p>
          <p>For an expired code, scan your instructor’s current QR code.</p>
          <button disabled={busy} className={s.button} onClick={check}>
            Retry location check
          </button>
          <a href="/dashboard">Return to dashboard</a>
        </section>
      ) : (
        <p role="status">
          Checking your enrollment and location. Allow location access when your
          browser asks.
        </p>
      )}
    </>
  );
}
