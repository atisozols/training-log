"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, ChartIcon, HomeIcon, UserIcon } from "./Icons";

const items = [
  { href: "/", label: "Today", Icon: HomeIcon },
  { href: "/history", label: "Big picture", Icon: ChartIcon },
  { href: "/library", label: "Library", Icon: BookIcon },
  { href: "/me", label: "Me", Icon: UserIcon },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 backdrop-blur pb-safe">
      <div className="mx-auto flex max-w-md items-center justify-between px-5 pt-3">
        {items.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return active ? (
            <Link
              key={href}
              href={href}
              aria-current="page"
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-ink"
            >
              <Icon size={18} />
              {label}
            </Link>
          ) : (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex h-11 w-11 items-center justify-center text-muted hover:text-white"
            >
              <Icon />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
