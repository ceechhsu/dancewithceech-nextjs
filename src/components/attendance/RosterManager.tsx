"use client";
import { useCallback, useEffect, useState } from "react";
import { attendanceApi, errorMessage } from "@/lib/attendance/client";
import { readRoster, type RosterRow } from "@/lib/attendance/roster-import";
import type { Enrollment } from "@/lib/attendance/types";
import s from "./Attendance.module.css";
export default function RosterManager({ classId }: { classId: string }) {
  const [rows, setRows] = useState<Enrollment[]>([]),
    [preview, setPreview] = useState<RosterRow[]>([]),
    [errors, setErrors] = useState<string[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState<Enrollment | null>(null);
  const load = useCallback(async () => {
    try {
      setRows(
        (
          await attendanceApi<{ enrollments: Enrollment[] }>(
            `enrollments?classId=${classId}`,
          )
        ).enrollments,
      );
    } catch (e) {
      setErrors([errorMessage(e)]);
    }
  }, [classId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function mutate(body: object) {
    setBusy(true);
    setErrors([]);
    setMessage("");
    try {
      await attendanceApi("enrollments", { classId, ...body });
      await load();
      setMessage("Roster saved.");
      return true;
    } catch (e) {
      setErrors([errorMessage(e)]);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const fullName = [data.first_name, data.last_name].map(v => String(v || '').trim()).filter(Boolean).join(' ');
    if (fullName) data.name = fullName;
    const ok = await mutate(
      edit
        ? { action: "update", enrollmentId: edit.id, ...data }
        : { action: "import", rows: [data] },
    );
    if (ok) {
      setEdit(null);
      form.reset();
    }
  }
  return (
    <>
      <a href="/attendance/instructor/classes">← All classes</a>
      <h1 className={s.title}>Manage roster</h1>
      <p>
        Use the Google email each student will sign in with. Missing emails can
        be added later.
      </p>
      {errors.length > 0 && (
        <div role="alert" className={s.error}>
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}
      {message && (
        <p role="status" className={s.success}>
          {message}
        </p>
      )}
      <section className={s.card}>
        <h2>Current roster · {rows.length}</h2>
        <ul className={s.list}>
          {rows.map((row) => (
            <li key={row.id}>
              <div className={s.spread}>
                <div>
                  <strong>{row.name}</strong>
                  <p>
                    {row.email || "Needs Google email"} · ID {row.college_id}
                  </p>
                  {row.effective_to && (
                    <small>Dropped {row.effective_to}</small>
                  )}
                </div>
                <div className={s.row}>
                  <button
                    className={`${s.button} ${s.secondary}`}
                    onClick={() => setEdit(row)}
                  >
                    Edit
                  </button>
                  {!row.effective_to && (
                    <button
                      className={`${s.button} ${s.secondary}`}
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm(`Drop ${row.name}? Past attendance is kept.`)
                        )
                          void mutate({ action: "drop", enrollmentId: row.id });
                      }}
                    >
                      Drop
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <form className={s.card} onSubmit={save} key={edit?.id || "new"}>
        <h2>{edit ? "Edit student" : "Add one student"}</h2>
        <label className={s.field}>
          First name
          <input name="first_name" defaultValue={edit?.first_name || ''} />
        </label>
        <label className={s.field}>
          Last name
          <input name="last_name" defaultValue={edit?.last_name || ''} />
        </label>
        <label className={s.field}>
          Display name (used when separate names are unavailable)
          <input name="name" defaultValue={edit?.name} />
        </label>
        <label className={s.field}>
          College ID (optional)
          <input
            name="college_id"
            defaultValue={edit?.college_id || ""}
          />
        </label>
        <label className={s.field}>
          Google email (optional)
          <input name="email" type="email" defaultValue={edit?.email || ""} />
        </label>
        <button disabled={busy} className={s.button}>
          {edit ? "Save changes" : "Add student"}
        </button>
        {edit && (
          <button
            type="button"
            className={`${s.button} ${s.secondary}`}
            onClick={() => setEdit(null)}
          >
            Cancel
          </button>
        )}
      </form>
      <section className={s.card}>
        <h2>Append a roster spreadsheet</h2>
        <label className={s.field}>
          Choose CSV, XLS or XLSX
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setPreview([]);
              setErrors([]);
              if (file)
                try {
                  const result = await readRoster(file);
                  setPreview(result.rows);
                  setErrors(result.errors);
                } catch (err) {
                  setErrors([errorMessage(err)]);
                }
            }}
          />
        </label>
        {preview.length > 0 && (
          <>
            <p>
              Preview: {preview.length} students. Existing students are not
              replaced.
            </p>
            <div className={s.table}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Google email</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>{r.college_id}</td>
                      <td>{r.email || "Add later"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className={s.button}
              disabled={busy || errors.length > 0}
              onClick={async () => {
                if (await mutate({ action: "import", rows: preview }))
                  setPreview([]);
              }}
            >
              {busy ? "Importing…" : "Import roster"}
            </button>
          </>
        )}
      </section>
    </>
  );
}
