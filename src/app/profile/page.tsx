/* Full document navigation keeps account settings separate from marketing scripts. */
/* eslint-disable @next/next/no-html-link-for-pages */
import Image from 'next/image'
import { LockKeyhole } from 'lucide-react'
import { auth } from '@/auth'
import { trainerIdentity } from '@/lib/trainer/session'
import { readAccountProfile } from '@/lib/trainer/api'
import GoogleLogin from '@/components/attendance/GoogleLogin'
import ProfileEditor from '@/components/profile/ProfileEditor'
import styles from '@/components/profile/Profile.module.css'
export const dynamic='force-dynamic'
export const metadata={title:'My profile | Dance With Ceech',robots:{index:false,follow:false}}
export default async function ProfilePage() {
 const who=trainerIdentity(await auth())
 let profile
 if(who){try{profile=await readAccountProfile(who)}catch{/* No fabricated settings or save controls during a storage outage. */}}
 return <main className={styles.shell}><header className={styles.top}><a href="/" aria-label="Dance With Ceech homepage"><Image src="/logo-mark.png" alt="Dance With Ceech" width={52} height={52} className={styles.logo}/></a><span><LockKeyhole size={14}/>Your private profile</span></header>{profile?<ProfileEditor initial={profile}/>:<section className={styles.accessLost}><h1>{who?'Profile temporarily unavailable':'Your profile starts here'}</h1><p>{who?'Your saved settings could not be loaded. Please try again shortly.':'Sign in with Google to choose your name, nickname and profile photo.'}</p>{who?<a href="/profile">Try again</a>:<GoogleLogin returnTo="/profile"/>}</section>}</main>
}
