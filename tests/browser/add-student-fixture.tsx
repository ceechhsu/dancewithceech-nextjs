// Local-only interactive fixture: never imported by the app; no live API calls.
import React from 'react'
import {createRoot} from 'react-dom/client'
import AddStudent from '../../src/components/attendance/AddStudent'
import s from '../../src/components/attendance/Attendance.module.css'
const students:Record<string,unknown>[]=[]
window.fetch=async(_input,init)=>{
 if(init?.body){const body=JSON.parse(String(init.body));const exists=students.some(student=>student.email===body.email);if(!exists)students.push({id:String(students.length),name:body.email,email:body.email,first_name:body.first_name,last_name:body.last_name,present:0,absent:0});return Response.json({alreadyEnrolled:exists})}
 return Response.json({classId:'fixture',students})
}
createRoot(document.getElementById('root')!).render(<main className={s.shell}><p>Visual test · Fictional roster · No live changes</p><section className={s.card}><AddStudent classId="fixture" className="Cabrillo Hip Hop" onAdded={()=>{}}/></section></main>)
