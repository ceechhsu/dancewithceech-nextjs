import inventory from "@/content/approved-pages/dance-lessons.json";

export const lessonFilters = ["All", "Rhythm", "Footwork", "Isolations"] as const;
export type LessonFilter = typeof lessonFilters[number];
export type DanceLesson = typeof inventory[number];

// Only confirmed public releases enter the library. A future date never means live.
export function publicLessons(items: DanceLesson[], now = Date.now()) {
  const seen = new Set<string>();
  return items.filter(lesson => lesson.status === "public" && Date.parse(lesson.publishedAt) <= now)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .filter(lesson => {
      const key = `${lesson.sourceID}:${Math.floor(lesson.timestamp)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
export const danceLessons = publicLessons(inventory);

export function searchLessons(items: DanceLesson[], query: string, filter: LessonFilter) {
  const words = query.trim().toLowerCase().replace(/[-–]/g, " ").split(/\s+/).filter(Boolean);
  return items.filter(lesson => {
    const text = `${lesson.title} ${lesson.tags.join(" ")} ${lesson.practiceCue}`.toLowerCase().replace(/[-–]/g, " ");
    return (filter === "All" || lesson.tags.includes(filter)) && words.every(word => text.includes(word));
  });
}

export function lessonTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
export function sourceURL(lesson: DanceLesson) {
  return `https://www.youtube.com/watch?v=${lesson.sourceID}&t=${Math.floor(lesson.timestamp)}s`;
}
