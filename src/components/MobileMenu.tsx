"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { freeLinks } from "./LearnFreeMenu";
import SignInButton from "./SignInButton";
import UserMenu from "./UserMenu";
import styles from "./Navigation.module.css";

const links = [
  { label: "Running Man", href: "/running-man-method" },
  { label: "About Ceech", href: "/about" },
];
type Props = { user?: { name?: string | null; email?: string | null; image?: string | null } | null };

export default function MobileMenu({ user }: Props) {
  const [requestedOpen, setOpen] = useState(false);
  const pathname = usePathname();
  const [openedPath, setOpenedPath] = useState(pathname);
  const open = requestedOpen && pathname === openedPath;
  const [top, setTop] = useState(69);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  if (pathname !== openedPath) {
    setOpenedPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const nav = root.current?.closest("nav");
    const measure = () => {
      if (nav) setTop(nav.getBoundingClientRect().bottom);
      if (window.matchMedia("(min-width: 1280px)").matches) setOpen(false);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (nav) observer.observe(nav);
    window.addEventListener("resize", measure);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a")?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault(); setOpen(false); trigger.current?.focus();
      }
      if (event.key === "Tab") {
        const items = [...(root.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])].filter(item => item.getClientRects().length);
        const first = items[0]; const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", keyboard);
    return () => {
      observer.disconnect(); window.removeEventListener("resize", measure);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", keyboard);
    };
  }, [open]);

  return <div ref={root} className="xl:hidden">
    <button ref={trigger} type="button" aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open} aria-controls="mobile-navigation"
      onClick={() => { setOpenedPath(pathname); setOpen(!open); }}
      className="flex min-h-11 min-w-11 items-center justify-center text-white">
      {open ? <X size={24} /> : <Menu size={24} />}
    </button>
    {open && <div ref={panel} id="mobile-navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-1 overflow-y-auto bg-zinc-950 px-6 py-5 text-sm text-zinc-300"
      style={{ top }} onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) { setOpen(false); trigger.current?.focus(); }
      }}>
      <Link href="/private-lessons#booking" prefetch={false} className={`${styles.booking} mb-3 shrink-0`}>Book a Free Call</Link>
      <Link href="/private-lessons" prefetch={false}>Private Lessons</Link>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Learn Free</p>
      {freeLinks.map(({ label, href }) => <Link key={href} href={href} prefetch={false} className="shrink-0 pl-3">{label}</Link>)}
      {links.map(({ label, href }) => <Link key={href} href={href} prefetch={false} className="shrink-0">{label}</Link>)}
      <div className="mt-3 border-t border-white/10 pt-3 pb-32 text-xs">
        {user ? <UserMenu name={user.name} email={user.email} image={user.image} /> : <SignInButton />}
      </div>
    </div>}
  </div>;
}
