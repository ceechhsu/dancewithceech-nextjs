import { attendanceCalendarRequest } from '@/lib/attendance/calendar-server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request: Request) { return attendanceCalendarRequest(request, 'schedule') }
export async function POST(request: Request) { return attendanceCalendarRequest(request, 'schedule') }
