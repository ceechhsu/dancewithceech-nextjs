"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

const links = [
  { label: "BeatFirst", href: "/beat-first" },
  { label: "Blog", href: "/blog" },
  { label: "Academy", href: "/academy" },
  { label: "Private Lessons", href: "/private-lessons" },
  { label: "Contact", href: "/contact" },
]

export default function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        style={{ color: "var(--foreground)" }}
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {open && (
        <div
          className="fixed left-0 right-0 z-40 flex flex-col"
          style={{ top: "57px", backgroundColor: "var(--background)", borderBottom: "1px solid #1f1f1f" }}
        >
          {links.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="px-6 py-4 text-sm hover:text-white transition-colors"
              style={{ color: "var(--muted)", borderTop: "1px solid #1f1f1f" }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
