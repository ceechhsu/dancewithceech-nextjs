"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function RainbowBorderButton({ children, href, onClick, className = "" }: Props) {
  const inner = (
    <div className="rainbow-wrapper">
      <button
        onClick={onClick}
        className={`relative flex items-center justify-center px-8 py-4 rounded-full border-none text-white cursor-pointer font-semibold transition-opacity hover:opacity-90 ${className}`}
        style={{ backgroundColor: "#0A0A0A" }}
      >
        {children}
      </button>
    </div>
  );

  if (href) {
    return <a href={href}>{inner}</a>;
  }

  return inner;
}
