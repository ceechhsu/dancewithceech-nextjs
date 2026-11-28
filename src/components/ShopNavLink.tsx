"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SHOP_PATH } from "@/lib/shop-publication";

export default function ShopNavLink() {
  const isCurrentPage = usePathname() === SHOP_PATH;
  return (
    <Link
      href={SHOP_PATH}
      prefetch={false}
      aria-current={isCurrentPage ? "page" : undefined}
      className="shrink-0 transition-colors hover:text-white"
    >
      Shop
    </Link>
  );
}
