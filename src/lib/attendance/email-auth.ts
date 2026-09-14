import 'server-only'
import { createHmac, randomInt, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { attendanceDb, AttendanceError } from './server'

const cookieName='attendance_device'
const secret=()=>process.env.ATTENDANCE_DEVICE_SECRET || process.env.AUTH_SECRET || 'local-attendance-secret'
const codeSecret=()=>process.env.ATTENDANCE_CODE_SECRET || secret()
export const normalizeEmail=(value:string)=>value.trim().toLowerCase()
const digest=(value:string)=>createHmac('sha256',codeSecret()).update(value).digest('hex')
const sign=(value:string)=>createHmac('sha256',secret()).update(value).digest('base64url')
const encode=(value:object)=>{const body=Buffer.from(JSON.stringify(value)).toString('base64url');return `${body}.${sign(body)}`}
const decode=(value:string|undefined)=>{if(!value)return null;const [body,signature]=value.split('.');if(!body||!signature)return null;const expected=sign(body);if(expected.length!==signature.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(signature)))return null;try{return JSON.parse(Buffer.from(body,'base64url').toString()) as {email:string;identity:string;expires:number}}catch{return null}}
export async function studentDeviceIdentity(){const data=decode((await cookies()).get(cookieName)?.value);if(!data||data.expires<Date.now()||!data.email||!data.identity)return null;return {email:data.email,sub:data.identity,instructor:false}}
export async function requestEmailCode(rawEmail:string){const email=normalizeEmail(rawEmail);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AttendanceError('Enter a valid email address.');const code=String(randomInt(0,10000)).padStart(4,'0');const {error}=await attendanceDb().rpc('attendance_email_code',{p_action:'request',p_email:email,p_code_hash:digest(`${email}:${code}`)});if(error)throw new AttendanceError('Unable to send a code. Please try again.',503);if(process.env.ATTENDANCE_TEST_MAILBOX==='true')return {ok:true,testCode:code};
 // Email delivery is deliberately separate from verification; production requires a configured sender.
 if(!process.env.RESEND_API_KEY||!process.env.ATTENDANCE_EMAIL_FROM)throw new AttendanceError('Email verification is not configured yet.',503);
 const {Resend}=await import('resend');const sent=await new Resend(process.env.RESEND_API_KEY).emails.send({from:process.env.ATTENDANCE_EMAIL_FROM,to:email,subject:'Your Dance With Ceech attendance code',html:`<p>Your attendance code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`});if(sent.error)throw new AttendanceError('Unable to send a code. Please try again.',503);return {ok:true};}
export async function verifyEmailCode(rawEmail:string,code:string){const email=normalizeEmail(rawEmail);if(!/^\d{4}$/.test(code))throw new AttendanceError('Enter the four-digit code.');const {data,error}=await attendanceDb().rpc('attendance_email_code',{p_action:'verify',p_email:email,p_code_hash:digest(`${email}:${code}`)});if(error)throw new AttendanceError('Unable to verify that code. Please try again.',503);if(!data?.ok)throw new AttendanceError('That code is incorrect, expired, or this email is not on an active roster.',401);const identity=`email:${digest(email)}`;const semesterEnd=Date.parse(`${data.expiresOn||''}T23:59:59.999`);const expires=Math.min(Date.now()+365*24*60*60*1000,Number.isFinite(semesterEnd)?semesterEnd:Date.now()+365*24*60*60*1000);(await cookies()).set(cookieName,encode({email,identity,expires}),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',expires:new Date(expires)});return {ok:true};}
