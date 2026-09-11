"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

export const freeLinks = [
  { label: "Dance Tutorials", href: "/#dance-tutorials" },
  { label: "BeatFirst Rhythm Trainer", href: "/beat-first" },
  { label: "Blog", href: "/blog" },
];

export default function LearnFreeMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [openedPath, setOpenedPath] = useState(pathname);
  const expanded = open && pathname === openedPath;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  if (pathname !== openedPath) {
    setOpenedPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!expanded) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [expanded]);
  return <div ref={root} className="relative" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={(event) => {
    if (event.key === "Escape" && expanded) {
      event.preventDefault(); setOpen(false); trigger.current?.focus();
    }
  }}>
    <button ref={trigger} type="button" aria-expanded={expanded} aria-controls={id}
      className="flex items-center gap-1 hover:text-white" onClick={() => {
        setOpenedPath(pathname); setOpen(!expanded);
      }}>Learn Free <ChevronDown size={14} aria-hidden="true" /></button>
    {expanded && <div id={id} className="absolute left-0 top-full z-10 mt-3 grid w-72 gap-1 whitespace-normal rounded-xl border border-white/15 bg-zinc-950 p-2 shadow-2xl">
      {freeLinks.map(({ label, href }) => <Link key={href} href={href} prefetch={false}
        className="w-full min-w-0 rounded-lg px-4 py-3 text-sm leading-5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white"
        onClick={() => setOpen(false)}>{label}</Link>)}
    </div>}
  </div>;
}
