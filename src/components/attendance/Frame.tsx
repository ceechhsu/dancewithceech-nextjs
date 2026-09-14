'use client';
import styles from "./Attendance.module.css";
import { usePathname } from 'next/navigation';
import InstructorHeader from './InstructorHeader';
import type { HeaderUser } from './InstructorHeader';
export default function Frame({ children, user }: { children: React.ReactNode; user?: HeaderUser | null }) {
  const pathname = usePathname();
  const instructor = pathname.startsWith('/attendance/instructor');
  return (
    <main className={styles.shell}>
      <InstructorHeader student={!instructor} user={user} />
      {children}
    </main>
  );
}
