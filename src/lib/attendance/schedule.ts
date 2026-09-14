type Scheduled = {
  timezone: string;
  start_date: string;
  end_date: string;
  days: number[];
  start_time: string;
  end_time: string;
  archived: boolean;
};
export function scheduledClasses<T extends Scheduled>(
  classes: T[],
  now = new Date(),
): T[] {
  return classes.filter((c) => {
    if (c.archived) return false;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: c.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const p = Object.fromEntries(parts.map((v) => [v.type, v.value]));
    const date = `${p.year}-${p.month}-${p.day}`,
      time = `${p.hour}:${p.minute}`;
    return (
      date >= c.start_date &&
      date <= c.end_date &&
      c.days.includes(
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday),
      ) &&
      time >= c.start_time.slice(0, 5) &&
      time < c.end_time.slice(0, 5)
    );
  });
}
