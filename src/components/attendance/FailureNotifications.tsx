'use client'
import {useState} from 'react'
import {attendanceApi,errorMessage} from '@/lib/attendance/client'
import s from './Attendance.module.css'
export default function FailureNotifications(){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 async function enable(){setBusy(true);try{if(!('serviceWorker'in navigator)||!('PushManager'in window))throw new Error('Push is not supported here. Use Check-in issues below instead.');const settings=await attendanceApi<{enabled:boolean;publicKey:string}>('push');if(!settings.enabled)throw new Error('Notifications are not configured yet. Check-in issues are still available below.');const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Notifications were not enabled. You can still review Check-in issues.');const registration=await navigator.serviceWorker.register('/attendance/sw.js',{scope:'/attendance/'});await navigator.serviceWorker.ready;const subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:settings.publicKey});await attendanceApi('push',{subscription:subscription.toJSON()});setMessage('Notifications enabled on this device. Delivery depends on browser support and connectivity.')}catch(e){setMessage(errorMessage(e))}finally{setBusy(false)}}
 return <section className={s.card}><h2>Check-in issue alerts</h2><p>Optional, private alerts on your phone. On iPhone, you may need to add this site to your Home Screen first.</p><button className={`${s.button} ${s.secondary}`} disabled={busy} onClick={enable}>{busy?'Setting up…':'Enable notifications'}</button>{message&&<p role="status">{message}</p>}</section>
}
