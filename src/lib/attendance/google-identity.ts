type GoogleUser = { email?: string | null; googleSub?: string; googleEmailVerified?: boolean }
export function googleAttendanceIdentity(user: GoogleUser | undefined, instructors: string) {
  if (!user?.email || !user.googleSub || user.googleEmailVerified !== true) return null
  const email = user.email.trim().toLowerCase()
  return { email, sub: `google:${user.googleSub}`, instructor: instructors.split(',').some(value => value.trim().toLowerCase() === email) }
}
