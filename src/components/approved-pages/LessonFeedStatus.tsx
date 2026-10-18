"use client";
export default function LessonFeedStatus({ loading, failed, count, retry }: { loading: boolean; failed: boolean; count: number; retry: () => Promise<void> }) {
  if (loading) return <p role="status" className="my-4 text-sm text-muted">Loading short lessons…</p>;
  if (failed) return <div role="status" className="my-4 text-sm text-muted"><p>{count ? "Showing the last available lessons. Updates are temporarily unavailable." : "Short lessons are temporarily unavailable."}</p><button type="button" className="lesson-control mt-2 rounded py-2 text-accent-primary-accessible hover:underline" onClick={() => void retry()}>Try loading lessons again</button></div>;
  if (!count) return <p role="status" className="my-4 text-sm text-muted">New short lessons will appear here when they are published.</p>;
  return null;
}
