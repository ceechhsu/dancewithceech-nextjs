"use client";

import { useState } from "react";

export default function VideoEvalForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const youtubeUrl = (form.elements.namedItem("youtubeUrl") as HTMLInputElement).value;
    const notes = (form.elements.namedItem("notes") as HTMLTextAreaElement).value;

    const res = await fetch("/api/video-eval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, youtubeUrl, notes }),
    });

    if (res.ok) {
      setStatus("success");
      form.reset();
    } else {
      setStatus("error");
    }
  }

  return (
    <section id="video-eval" className="py-24 px-6" style={{ backgroundColor: "var(--surface)", borderTop: "1px solid #1f1f1f" }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
            Free Offer
          </div>
          <h2 className="text-3xl font-bold mb-4">Get a Free Video Evaluation</h2>
          <p className="leading-relaxed" style={{ color: "var(--muted)" }}>
            Record a 30-second dance video, upload it to YouTube as <strong style={{ color: "var(--foreground)" }}>unlisted</strong>, and paste the link below.
            Ceech will personally break down exactly what to improve and send you a detailed analysis — free.
          </p>
          <p className="text-sm mt-3" style={{ color: "var(--accent-gold)" }}>
            Book a session package same-day after your eval and get a special discount. Ask Ceech directly.
          </p>
        </div>

        {status === "success" ? (
          <div className="text-center p-8 rounded-2xl" style={{ backgroundColor: "var(--background)", border: "1px solid #22c55e44" }}>
            <div className="text-2xl mb-3">✓</div>
            <div className="font-bold text-lg mb-2">Video received!</div>
            <p style={{ color: "var(--muted)" }}>Ceech will review your video and send the evaluation to your email within a few days.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>Your Email</label>
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-600 transition"
                style={{ backgroundColor: "var(--background)", border: "1px solid #1f1f1f" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>YouTube Link (unlisted)</label>
              <input
                type="url"
                name="youtubeUrl"
                required
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-600 transition"
                style={{ backgroundColor: "var(--background)", border: "1px solid #1f1f1f" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
                Anything you want Ceech to focus on? <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                name="notes"
                rows={3}
                placeholder="e.g. my timing feels off, I can't find the groove..."
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-600 transition resize-none"
                style={{ backgroundColor: "var(--background)", border: "1px solid #1f1f1f" }}
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full py-4 rounded-full text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--accent-primary)" }}
            >
              {status === "sending" ? "Submitting..." : "Submit My Video for Free Eval"}
            </button>
            <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
              Make sure your YouTube video is set to <strong>Unlisted</strong> so only Ceech can view it. One free evaluation per person.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
