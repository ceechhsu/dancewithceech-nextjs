import type { AttendanceClass, AttendanceStatus, Enrollment } from './types'

export type ProgressTool = 'none' | 'archery' | 'weight_training'
export const progressLabels: Record<ProgressTool, string> = { none: 'Attendance only', archery: 'Archery', weight_training: 'Weight training' }
export interface ProgressEntry {
  id: string; class_id: string; enrollment_id: string; subject: Exclude<ProgressTool, 'none'>;
  entry_date: string; activity: string; result: string; notes: string; created_at: string; student_name?: string;
}
export interface ProgressResponse { class: AttendanceClass; entries: ProgressEntry[]; instructor: boolean; today: string; earliestDate: string }
export interface ClassWorkspace {
  class: AttendanceClass; today: string; roster: Enrollment[];
  meetings: { id: string; meeting_date: string; status: 'open' | 'closed' | 'cancelled'; opened_at: string }[];
  records: { meeting_id: string; enrollment_id: string; status: AttendanceStatus; source: string; checked_in_at: string | null; meeting_date: string; name: string }[];
}
// Parse a date-only value locally, avoiding a UTC shift to the previous day.
export function progressDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
