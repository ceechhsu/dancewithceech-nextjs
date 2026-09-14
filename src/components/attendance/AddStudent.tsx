'use client'
import { useRef, useState } from 'react'
import { attendanceApi, errorMessage } from '@/lib/attendance/client'
import s from './Attendance.module.css'

export default function AddStudent({ classId, className, onAdded }: { classId: string; className: string; onAdded: () => void }) {
 const [open,setOpen]=useState(false), [busy,setBusy]=useState(false), [error,setError]=useState(''), [message,setMessage]=useState('')
 const trigger=useRef<HTMLButtonElement>(null)
 const submitting=useRef(false)
 function close(){setOpen(false);setError('');trigger.current?.focus()}
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault()
  if(submitting.current)return
  submitting.current=true;setBusy(true);setError('');setMessage('')
  const values=Object.fromEntries(new FormData(event.currentTarget))
  const email=String(values.email).trim().toLowerCase()
  try {
   const result=await attendanceApi<{alreadyEnrolled:boolean}>('enrollments',{action:'add',classId,...values,email})
   setMessage(result.alreadyEnrolled?`${email} is already on this roster.`:`${email} added to ${className}. They can now sign in with Google and scan the current QR during an open session.`)
   close();onAdded()
  }catch(err){setError(errorMessage(err))}
  finally{submitting.current=false;setBusy(false)}
 }
 return <div className={s.addStudent}>
  <div className={s.spread}><h2>{className} · Roster</h2><button ref={trigger} type="button" className={s.button} aria-expanded={open} aria-controls={open?`add-student-${classId}`:undefined} disabled={busy} onClick={()=>{if(open)close();else{setMessage('');setOpen(true)}}}>+ Add student</button></div>
  {message&&<p className={s.success} role="status">{message}</p>}
  {open&&<form id={`add-student-${classId}`} className={s.addStudentForm} onSubmit={save} aria-label={`Add student to ${className}`}>
   <h3>Add student to {className}</h3>
   <p className={s.muted}>Use the email they sign in to Google with. Adding them does not mark them present.</p>
   <label className={s.field}>Google sign-in email<input autoFocus name="email" type="email" required maxLength={200} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="student@gmail.com" disabled={busy}/></label>
   <p className={s.muted}>Their name and photo will update after Google sign-in. Earlier classes will not count as absences.</p>
   {error&&<p className={s.error} role="alert">{error}</p>}
   <div className={s.row}><button className={s.button} disabled={busy}>{busy?'Adding…':`Add to ${className}`}</button><button className={`${s.button} ${s.secondary}`} type="button" disabled={busy} onClick={close}>Cancel</button></div>
  </form>}
 </div>
}
