import { attendanceProgressRequest } from '@/lib/attendance/progress-server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request: Request) { return attendanceProgressRequest(request) }
export async function POST(request: Request) { return attendanceProgressRequest(request) }
