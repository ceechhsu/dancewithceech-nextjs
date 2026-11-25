import Link from "next/link";

export const lessonNavLinks = [
  { href: "/dance-floor-ready", label: "Online Lessons" },
  { href: "/private-lessons/san-jose", label: "In-Person Lessons" },
] as const;

export default function LessonNavLinks({ className }: { className?: string }) {
  return lessonNavLinks.map(({ href, label }) => (
    <Link key={href} href={href} prefetch={false} className={className}>{label}</Link>
  ));
}
