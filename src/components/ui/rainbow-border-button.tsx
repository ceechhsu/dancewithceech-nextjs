"use client";

import React from "react";
import Link from "next/link";

interface Props {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function RainbowBorderButton({ children, href, onClick, className = "" }: Props) {
  const controlClassName = `relative flex min-h-11 items-center justify-center px-8 py-4 rounded-full border-none text-white cursor-pointer font-semibold transition-opacity hover:opacity-90 ${className}`;

  if (href) {
    return (
      <div className="rainbow-wrapper">
        <Link href={href} className={controlClassName} style={{ backgroundColor: "#0A0A0A" }}>
          {children}
        </Link>
      </div>
    );
  }

  return (
    <div className="rainbow-wrapper">
      <button
        onClick={onClick}
        className={controlClassName}
        style={{ backgroundColor: "#0A0A0A" }}
      >
        {children}
      </button>
    </div>
  );
}
