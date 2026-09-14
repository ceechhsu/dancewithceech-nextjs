"use client";
import { useEffect, useState } from "react";
import { attendanceApi, errorMessage } from "@/lib/attendance/client";
import type { AttendanceClass } from "@/lib/attendance/types";
import s from "./Attendance.module.css";
import ScheduleManager from './ScheduleManager';
export default function ClassSetup() {
  const [classes, setClasses] = useState<AttendanceClass[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing,setEditing]=useState<AttendanceClass|null>(null);
  async function load() {
    try {
      setClasses(
        (await attendanceApi<{ classes: AttendanceClass[] }>("classes"))
          .classes,
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const d = new FormData(form);
    try {
      await attendanceApi("classes", {
        action: editing ? "update" : "create",
        classId: editing?.id,
        ...Object.fromEntries(d),
        year: Number(d.get("year")),
        ...(!editing ? {days: d.getAll("days").map(Number)} : {}),
      });
      form.reset();
      setEditing(null);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1 className={s.title}>Manage classes</h1>
      <p>Each class has its own roster. Add classes from any college.</p>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <div className={s.grid}>
        <section className={s.card}>
          <h2>Your classes</h2>
          {classes.map((c) => (
            <div key={c.id}>
              <h3>{c.name}</h3>
              <p>
                {c.college} · {c.term} {c.year}
                {c.archived ? " · Archived" : ""}
              </p>
              <a href={`/attendance/instructor/classes/${c.id}/roster`}>
                Manage roster
              </a>
              <button className={`${s.button} ${s.secondary}`} onClick={()=>setEditing(c)}>Edit class and schedule</button>
            </div>
          ))}
        </section>
        <form className={s.card} onSubmit={save} key={editing?.id||'new'}>
          <h2>{editing?'Edit class':'Create class'}</h2>
          {[
            ["name", "Class name"],
            ["college", "College"],
            ["location_label", "Room or location"],
          ].map(([name, label]) => (
            <label className={s.field} key={name}>
              {label}
              <input name={name} required defaultValue={editing?.[name as 'name'|'college'|'location_label']||''} />
            </label>
          ))}
          <label className={s.field}>
            Semester
            <select name="term" defaultValue={editing?.term||'Fall'}>
              {["Fall", "Winter", "Spring", "Summer"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            Year
            <input
              name="year"
              type="number"
              min="2020"
              max="2100"
              defaultValue={editing?.year||new Date().getFullYear()}
              required
            />
          </label>
          {!editing && <><label className={s.field}>
            First day
            <input name="start_date" type="date" required/>
          </label>
          <label className={s.field}>
            Last day
            <input name="end_date" type="date" required/>
          </label>
          <fieldset>
            <legend>Class days</legend>
            <div className={s.days}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day, i) => (
                  <label key={day}>
                    <input type="checkbox" name="days" value={i}/>
                    {day}
                  </label>
                ),
              )}
            </div>
          </fieldset></>}
          <label className={s.field}>
            Start time
            <input name="start_time" type="time" required defaultValue={editing?.start_time.slice(0,5)}/>
          </label>
          <label className={s.field}>
            End time
            <input name="end_time" type="time" required defaultValue={editing?.end_time.slice(0,5)}/>
          </label>
          <label className={s.field}>
            Time zone
            <select name="timezone">
              <option value="America/Los_Angeles">Pacific time</option>
            </select>
          </label>
          <button disabled={busy} className={s.button}>
            {busy ? "Saving…" : editing?'Save class details':'Create class'}
          </button>
          {editing&&<button type="button" className={`${s.button} ${s.secondary}`} onClick={()=>setEditing(null)}>Cancel edit</button>}
        </form>
      </div>
      {editing && <ScheduleManager key={editing.id} classId={editing.id} onChanged={()=>{void load();}} />}
    </>
  );
}
