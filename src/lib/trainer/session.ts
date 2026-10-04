import type { TrainerIdentity } from './validation'
export function trainerIdentity(session: unknown, ownerEmail = process.env.TRAINER_OWNER_EMAIL ?? ''): TrainerIdentity | null {
 const user = (session as {user?: Record<string, unknown>} | null)?.user
 if (!user || user.googleEmailVerified !== true || typeof user.googleSub !== 'string' || !/^[a-zA-Z0-9_-]{1,255}$/.test(user.googleSub) || typeof user.email !== 'string') return null
 const text = (value: unknown) => typeof value === 'string' ? value : ''
 return {account:'google:'+user.googleSub,email:user.email,name:text(user.name),firstName:text(user.googleGivenName),lastName:text(user.googleFamilyName),photo:text(user.image),owner:!!ownerEmail && user.email.toLowerCase() === ownerEmail.trim().toLowerCase()}
}
export function trainerReturnPath(input: string | null): string {
 if (!input || /[\\\x00-\x20]/.test(input)) return '/practice/'
 try {
  const url = new URL(input,'https://trainer.invalid')
  const path = decodeURIComponent(url.pathname)
  if(url.origin !== 'https://trainer.invalid' || !path.startsWith('/practice/') || path.includes('..') || path.includes('\\') || /^\/practice\/(?:api|auth|login|logout)(?:\/|$)/.test(path)) return '/practice/'
  return url.pathname+url.search+url.hash
 } catch { return '/practice/' }
}
