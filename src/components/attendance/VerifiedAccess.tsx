import {auth} from '@/auth'
import GoogleLogin from './GoogleLogin'
export default async function VerifiedAccess({children,returnTo,instructor=false}:{children:React.ReactNode;returnTo:string;instructor?:boolean}){
 const session=await auth();const user=session?.user as {email?:string;googleEmailVerified?:boolean;googleSub?:string}|undefined
 if(!user?.email||!user.googleSub||user.googleEmailVerified!==true)return <GoogleLogin returnTo={returnTo}/>
 if(instructor&&!(process.env.ATTENDANCE_INSTRUCTOR_EMAILS||'').split(',').map(e=>e.trim().toLowerCase()).includes(user.email.toLowerCase()))return <p>Instructor access is required. <a href="/dashboard">Return to your dashboard</a>.</p>
 return children
}
