"use client";
import { useEffect, useState } from "react";
import type { AttendanceClass } from "@/lib/attendance/types";
import { attendanceApi, errorMessage } from "@/lib/attendance/client";
import styles from "./Attendance.module.css";
import { progressLabels } from '@/lib/attendance/progress';
export default function MyClasses() {
  const [data, setData] = useState<{
    classes: AttendanceClass[];
    instructor: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [progressClasses, setProgressClasses] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    attendanceApi<{ classes: AttendanceClass[]; instructor: boolean }>(
      "classes",
    )
      .then(value => { if (!cancelled) setData(value) })
      .catch((e) => { if (!cancelled) setError(errorMessage(e)) });
    attendanceApi<{ classes: AttendanceClass[] }>('progress')
      .then(value => { if (!cancelled) setProgressClasses(value.classes.map(c => c.id)) })
      .catch(() => { /* Attendance remains available when progress is unavailable. */ });
    return () => { cancelled = true };
  }, []);
  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Loading your classes…</p>}
      {data?.instructor && (
        <a className={styles.button} href="/attendance/instructor">
          Instructor workspace
        </a>
      )}
      {!!data?.classes.length && (
        <section>
          <h2 className={styles.title}>My Classes</h2>
          <div className={styles.grid}>
            {data.classes.map((c) => (
              <article className={styles.card} key={c.id}>
                <span className={styles.eyebrow}>
                  {c.term} {c.year}
                </span>
                <h2>{c.name}</h2>
                <p className={styles.muted}>
                  {c.days
                    .map(
                      (d) =>
                        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d],
                    )
                    .join(" / ")}{" "}
                  · {c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}
                </p>
                <a href={`/attendance/history/${c.id}`}>View attendance →</a>
                {progressClasses.includes(c.id) && c.progress_tool && c.progress_tool !== 'none' && <p><a className={styles.button} href={c.progress_tool === 'archery' ? `/attendance/archery/${c.id}` : `/attendance/progress/${c.id}`}>{progressLabels[c.progress_tool]} progress →</a></p>}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
