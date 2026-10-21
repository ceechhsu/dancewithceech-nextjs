/* Full document links preserve private-page isolation. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { Activity, ChevronDown, GraduationCap, LockKeyhole, ShieldCheck, UsersRound } from 'lucide-react'
import { OWNER_CLASSES } from '@/lib/owner-dashboard/classes'
import styles from './Dashboard.module.css'
export default function OwnerSidebar({classId,otherUsers=false}:{classId?:string;otherUsers?:boolean}) {
 return <aside className={styles.rail}><a className={styles.brand} href="/">DANCE<span>WITH CEECH</span></a><p className={styles.eyebrow}>Studio / Owner</p><nav aria-label="Owner navigation"><a href="/admin#accounts" className={!classId&&!otherUsers?styles.current:undefined}><Activity size={17}/>Account activity</a><a href="/admin#coverage"><ShieldCheck size={17}/>Data &amp; privacy</a><details className={styles.classGroup} open={!!classId}><summary><GraduationCap size={17}/><span>Classes</span><ChevronDown size={14}/></summary><div className={styles.classLinks}>{OWNER_CLASSES.map(c=><a key={c.id} href={`/admin/classes/${c.id}`} className={classId===c.id?styles.current:undefined} aria-current={classId===c.id?'page':undefined}>{c.name}</a>)}</div></details><a href="/admin/other-users" className={otherUsers?styles.current:undefined} aria-current={otherUsers?'page':undefined}><UsersRound size={17}/>Other users</a></nav><div className={styles.railFoot}><LockKeyhole size={17}/><p>Private workspace<span>Owner access only</span></p></div></aside>
}
