const CLASSROOM_ORIGIN = 'https://dancewithceech.com'

// Deployed classroom QR codes must share the Google sign-in callback's origin.
export function attendanceCheckInUrl(token: string, developmentOrigin?: string): string {
  return `${developmentOrigin ?? CLASSROOM_ORIGIN}/attendance/checkin/${encodeURIComponent(token)}`
}
