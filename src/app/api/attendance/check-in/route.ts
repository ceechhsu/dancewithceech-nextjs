import { attendanceRequest } from '@/lib/attendance/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request: Request) { return attendanceRequest(request, 'check-in') }
export async function POST(request: Request) { return attendanceRequest(request, 'check-in') }
