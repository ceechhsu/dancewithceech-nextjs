export const lessonStyleLabels = {
  "hip-hop-dance-moves": "Hip-Hop",
  "locking-dance-moves": "Locking",
  "breaking-dance-moves": "Breaking",
  "funk-style-dance-moves": "Funk",
  popping: "Popping",
  "house-dance": "House",
} as const;

export type LessonStyle = keyof typeof lessonStyleLabels;
export type LessonStyleFilter = "All" | LessonStyle;

export function isLessonStyleFilter(value: unknown): value is LessonStyleFilter {
  return typeof value === "string" && (value === "All" || Object.hasOwn(lessonStyleLabels, value));
}
