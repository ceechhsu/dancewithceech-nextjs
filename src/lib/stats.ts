// Semester index: Spring 2002 = 0, Fall 2002 = 1, Spring 2003 = 2, ...
function semesterIndex(year: number, isFall: boolean): number {
  return (year - 2002) * 2 + (isFall ? 1 : 0);
}

function currentSemesterIndex(now: Date): number {
  const month = now.getMonth() + 1; // 1–12
  const year = now.getFullYear();
  if (month === 1) return semesterIndex(year - 1, true); // Jan is still Fall of prev year
  if (month <= 8) return semesterIndex(year, false);     // Feb–Aug: Spring
  return semesterIndex(year, true);                      // Sept–Dec: Fall
}

function semestersActive(startYear: number, startIsFall: boolean, now: Date): number {
  const start = semesterIndex(startYear, startIsFall);
  const current = currentSemesterIndex(now);
  return Math.max(0, current - start + 1);
}

function privateStudents(now: Date): number {
  const start = new Date(2026, 3, 1); // April 1, 2026
  if (now < start) return 0;

  const completeMonths = (now.getFullYear() - 2026) * 12 + (now.getMonth() - 3);
  let count = completeMonths * 2;
  count += 1;                      // 1st of current month always counts (start IS April 1)
  if (now.getDate() >= 15) count += 1; // 15th of current month
  return count;
}

export function getYearsTeaching(now: Date = new Date()): number {
  const start = new Date(2002, 1, 1); // Feb 1, 2002
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export function getStudentCount(now: Date = new Date()): number {
  // 2 classes @ Mission (Spring 2002), 1 @ West Valley (Spring 2002),
  // 1 @ Cabrillo (Fall 2015), 2 @ Gavilan (Fall 2018). 30 students/class.
  const college =
    semestersActive(2002, false, now) * 2 * 30 + // Mission
    semestersActive(2002, false, now) * 1 * 30 + // West Valley
    semestersActive(2015, true,  now) * 1 * 30 + // Cabrillo
    semestersActive(2018, true,  now) * 2 * 30;  // Gavilan

  return college + privateStudents(now);
}
