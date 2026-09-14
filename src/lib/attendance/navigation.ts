// Navigation visibility only. Attendance APIs enforce authorization separately.
export function canSeeAttendance(user?: { email?: string | null; googleEmailVerified?: boolean } | null) {
  return user?.googleEmailVerified === true && user.email?.trim().toLowerCase() === 'dancewithceech@gmail.com'
}
