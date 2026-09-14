"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { attendanceApi, errorMessage, locate } from "@/lib/attendance/client";
import { scheduledClasses } from "@/lib/attendance/schedule";
import type {
  AttendanceClass,
  AttendanceMeeting,
  AttendanceStatus,
  MeetingResponse,
} from "@/lib/attendance/types";
import {
  cacheMeeting,
  queueCorrection,
  registerOfflineShell,
  syncQueued,
} from "@/lib/attendance/offline";
import OfflineStatus from "./OfflineStatus";
import FailureNotifications from './FailureNotifications';
import ClassRosterSummary from './ClassRosterSummary';
import ScheduleManager from './ScheduleManager';
import CorrectionRequests from './CorrectionRequests';
import s from "./Attendance.module.css";
export default function InstructorConsole({ owner }: { owner: string }) {
  const [classes, setClasses] = useState<AttendanceClass[]>([]),
    [classId, setClassId] = useState(""),
    [data, setData] = useState<MeetingResponse | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [qr, setQr] = useState<{ token: string; expiresAt: string } | null>(null),
    [now, setNow] = useState(Date.now()),
    [message, setMessage] = useState("");
  const requestGeneration=useRef(0);
  const [filter,setFilter]=useState<'all'|'present'|'absent'>('all');
  const selected = classes.find((c) => c.id === classId),
    meeting = data?.meeting?.class_id===classId?data.meeting:null;
  const meetingId=meeting?.id;
  useEffect(() => {
    void registerOfflineShell().catch(()=>setMessage('Offline setup unavailable. Keep a separate manual record if needed.'));
    attendanceApi<{ classes: AttendanceClass[] }>("classes")
      .then((r) => {
        const active = r.classes.filter((c) => !c.archived);
        setClasses(active);
        const matches = scheduledClasses(active);
        if (matches.length === 1) setClassId(matches[0].id);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  const load = useCallback(async () => {
    if (!classId) return;
    const generation=++requestGeneration.current;
    try {
      const value = await attendanceApi<MeetingResponse>(
        `meetings?classId=${classId}`,
      );
      if(generation!==requestGeneration.current)return;
      setData(value);
      await cacheMeeting(owner, selected?.name || "Class", value);
    } catch (e) {
      if(generation===requestGeneration.current)setError(errorMessage(e));
    }
  }, [classId, owner, selected?.name]);
  useEffect(() => {
    setData(null);
    setQr(null);
    void load();
  }, [load]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const open =
    !!meeting &&
    meeting.status === "open" &&
    new Date(meeting.expires_at).getTime() > now;
  useEffect(() => {
    if (!open || !meetingId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const location = await locate();
        const token = await attendanceApi<{
          token: string;
          expiresAt: string;
          meeting: AttendanceMeeting;
        }>("meetings", {
          action: "token",
          classId,
          meetingId,
          location,
        });
        if (cancelled) return;
        setQr(token);
        timer = setTimeout(
          refresh,
          Math.max(
            1000,
            new Date(token.expiresAt).getTime() - Date.now() + 100,
          ),
        );
      } catch (e) {
        if (cancelled) return;
        setQr(null);
        setError(errorMessage(e));
        timer = setTimeout(refresh, 5000);
      }
    }
    void refresh();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, meetingId, classId]);
  async function action(action: string) {
    setBusy(true);
    setError("");
    try {
      const location = action === "open" ? await locate() : undefined;
      const value = await attendanceApi<MeetingResponse>("meetings", {
        action,
        classId,
        meetingId: action==='open'?undefined:meeting?.id,
        location,
      });
      setData(value);
      await cacheMeeting(owner, selected?.name || "Class", value);
      if (action === "close"||action==='cancel') setQr(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function correct(enrollmentId: string, status: AttendanceStatus) {
    if (!meeting) return;
    const note = prompt("Optional note for this attendance correction:");
    if (note === null) return;
    const operation = {
      operationId: crypto.randomUUID(),
      meetingId: meeting.id,
      enrollmentId,
      status,
      expectedRevision:
        data?.records.find((r) => r.enrollment_id === enrollmentId)?.revision ||
        0,
      note,
    };
    try {
      await queueCorrection(owner, operation);
      if(navigator.onLine){const remaining=await syncQueued(owner);setMessage(remaining.length?'Some changes need review in Offline changes.':'Attendance saved.');await load()}
      else setMessage('Change saved on this device. It will sync when the connection returns.');
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  const seconds = meeting
    ? Math.max(
        0,
        Math.floor((new Date(meeting.expires_at).getTime() - now) / 1000),
      )
    : 600;
  return (
    <>
      <p className={s.eyebrow}>Instructor workspace</p>
      <h1 className={s.title}>Take attendance</h1>
      <a href="/attendance/instructor/classes">
        Set up classes and manage rosters
      </a>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={s.success}>
          {message}
        </p>
      )}
      <section className={s.card}>
        <label className={s.field}>
          Class
          <select
            aria-label="Class"
            value={classId}
            disabled={open || busy}
            onChange={(e) => {requestGeneration.current++;setData(null);setQr(null);setClassId(e.target.value)}}
          >
            <option value="">Choose a class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.college}
              </option>
            ))}
          </select>
        </label>
        {open && <p>End this attendance window before changing classes.</p>}
        {selected && (
          <p>
            {selected.location_label} · {selected.start_time.slice(0, 5)}–
            {selected.end_time.slice(0, 5)}
          </p>
        )}
        {!open ? (
          <button
            className={s.button}
            disabled={!classId || busy}
            onClick={() => void action("open")}
          >
            Take attendance · 10 minutes
          </button>
        ) : (
          <>
            <div className={s.clock}>
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </div>
            {qr && new Date(qr.expiresAt).getTime() > now ? (
              <div className={s.qr}>
                <QRCodeSVG
                  value={`${window.location.origin}/attendance/checkin/${qr.token}`}
                  size={280}
                  title="Scan to check in to this class"
                />
              </div>
            ) : (
              <p role="status">Getting a fresh location and QR code…</p>
            )}
            <p>
              QR is valid for up to 10 minutes, until this attendance window ends. Students must allow location access
              within 50 meters. This discourages sharing; it does not prove
              physical presence.
            </p>
            <div className={s.row}>
              <button
                className={s.button}
                disabled={busy}
                onClick={() => void action("close")}
              >
                End now
              </button>
              <button
                className={`${s.button} ${s.secondary}`}
                disabled={busy || meeting?.extended}
                onClick={() => void action("extend")}
              >
                +5 minutes
              </button>
            </div>
          </>
        )}
      </section>
      {selected && <ClassRosterSummary key={classId} classId={classId} className={selected.name} revision={data} />}
      {selected && <ScheduleManager key={`schedule-${classId}`} classId={classId} onChanged={updated=>{setClasses(current=>current.map(item=>item.id===updated.id?updated:item));void load();}} />}
      {selected && <CorrectionRequests key={`requests-${classId}`} classId={classId} onChanged={()=>{void load();}} />}
      {data && meeting && (
        <section className={s.card}>
          <div className={s.spread}>
            <h2>Attendance · {meeting.meeting_date}</h2>
            <button
              className={`${s.button} ${s.secondary}`}
              onClick={() => void load()}
            >
              Refresh roster
            </button>
          </div>
          <p>
            {meeting.status === "open"
              ? "Not checked in yet is provisional until the window closes."
              : `Meeting ${meeting.status}.`}
          </p>
          <div className={s.row} aria-label="Attendance filter">{(['all','present','absent'] as const).map(value=><button key={value} className={`${s.button} ${s.secondary}`} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==='all'?'All students':value==='present'?'Present':open?'Not yet checked in':'Absent'}</button>)}</div>
          <ul className={s.list}>
            {data.roster.filter(person=>filter==='all'||(data.records.find(r=>r.enrollment_id===person.enrollment_id)?.status||'absent')===filter).map((person) => {
              const record = data.records.find(
                (r) => r.enrollment_id === person.enrollment_id,
              );
              return (
                <li key={person.enrollment_id}>
                  <div className={s.spread}>
                    <div>
                      <strong>{person.name}</strong>
                      <p>
                        {meeting.status==='cancelled'?'Canceled — not counted':record?.status === "present"
                          ? "Present"
                          : open
                            ? "Not checked in yet"
                            : record?.status === 'absent' ? "Absent" : "Pending — no attendance record"}
                      </p>
                    </div>
                    <div className={s.row}>
                      <button
                        disabled={meeting.status === "cancelled"}
                        className={`${s.button} ${s.secondary}`}
                        onClick={() =>
                          void correct(person.enrollment_id, "present")
                        }
                      >
                        Present
                      </button>
                      <button
                        disabled={meeting.status === "cancelled"}
                        className={`${s.button} ${s.secondary}`}
                        onClick={() =>
                          void correct(person.enrollment_id, "absent")
                        }
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <details>
            <summary>Correction history</summary>
            {data.corrections.map((c) => (
              <p key={c.id}>
                {c.created_at} · {c.actor_email}: {c.old_status || "No record"}{" "}
                → {c.new_status}
                {c.note && ` · ${c.note}`}
              </p>
            ))}
          </details>
          <details><summary>Check-in issues</summary><p>Refresh the roster to retrieve the latest issues. A location failure is not proof of cheating.</p>{data.failures?.length?data.failures.map(f=><p key={f.id}>{f.created_at} · {f.reason}</p>):<p>No recorded issues for this meeting.</p>}</details>
        </section>
      )}
      <OfflineStatus owner={owner} onSynced={()=>{void load()}}/>
      <FailureNotifications/>
    </>
  );
}
