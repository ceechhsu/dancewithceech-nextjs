export const programA = {
  name: "Program A",
  path: "/private-lessons/online",
  price: "$1,247",
  seats: 4,
  days: 30,
  refundDays: 7,
} as const;

export function isProgramAPreview(env: Record<string, string | undefined> = process.env) {
  return env.PROGRAM_A_PREVIEW === "1"
    && (env.VERCEL_ENV === "preview" || (!env.VERCEL_ENV && env.NODE_ENV === "development"));
}
