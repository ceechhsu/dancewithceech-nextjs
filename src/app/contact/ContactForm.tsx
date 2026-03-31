"use client";

import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const subject = (form.elements.namedItem("subject") as HTMLSelectElement).value;
    const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value;

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message }),
    });

    if (res.ok) {
      setStatus("success");
      form.reset();
    } else {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
          Your Name
        </label>
        <input
          type="text"
          name="name"
          required
          placeholder="First and last name"
          className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-600 transition"
          style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
          Email Address
        </label>
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-600 transition"
          style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
          What are you interested in?
        </label>
        <select
          name="subject"
          className="w-full px-4 py-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-600 transition"
          style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f", color: "var(--foreground)" }}
        >
          <option value="General question">General question</option>
          <option value="Private lessons">Private lessons</option>
          <option value="Online academy">Online academy</option>
          <option value="Community college classes">Community college classes</option>
          <option value="Something else">Something else</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
          Message
        </label>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Tell me what's on your mind..."
          className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-600 transition resize-none"
          style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}
        />
      </div>

      {status === "success" && (
        <p className="text-sm text-green-400">Message sent! I'll get back to you soon.</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-400">Something went wrong. Please try again or email me directly.</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-4 rounded-full text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "var(--accent-primary)" }}
      >
        {status === "sending" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
