import approvedStyles from "@/components/approved-pages/PageScope.module.css";
import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/approved-pages/Nav";
import Footer from "@/components/approved-pages/Footer";
import DanceLessonLibrary from "@/components/approved-pages/DanceLessonLibrary";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Free Dance Lesson Library | Dance With Ceech",
  description: "Find a short dance lesson by move, rhythm, footwork or isolation. Practice with Ceech and jump to the full Live lesson.",
  alternates: { canonical: "https://dancewithceech.com/dance-tutorials" },
  robots: { index: true, follow: true },
};

export default function DanceTutorialsPage() {
  return <div className={approvedStyles.scope}><a href="#main-content" className={approvedStyles.skipLink}>Skip to content</a><Nav /><main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-20 pt-32">
    <Link href="/#dance-tutorials" className="lesson-control mb-8 inline-block rounded py-2 text-sm text-accent-primary-accessible hover:underline">← See how I teach</Link>
    <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent-primary-accessible">Learn free · Dance with Ceech</p>
    <h1 className="text-4xl font-bold md:text-5xl">Your next move starts here.</h1>
    <p className="mb-10 mt-5 max-w-2xl text-lg leading-relaxed text-muted">Pick one skill, watch a short lesson, and give it a try. Each clip links to the full Live so you can practice in context.</p>
    <DanceLessonLibrary articles={getAllPosts().filter(post => post.category !== "general").map(post => ({ slug: post.slug, title: post.title, description: post.description ?? "", category: post.category, hasImage: Boolean(post.hasImage) }))} />
  </main><Footer /></div>;
}
