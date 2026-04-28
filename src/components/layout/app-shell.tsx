"use client";

import {
  Activity,
  CalendarDays,
  CircleDollarSign,
  Home,
  NotebookPen,
  Settings,
  SquareCheckBig,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type AppShellProps = {
  children: ReactNode;
};

type NavItem = {
  description: string;
  exact?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
};

const navItems = [
  {
    description: "Operating overview",
    exact: true,
    href: "/",
    icon: Home,
    label: "Home",
  },
  {
    description: "Daily command view",
    href: "/today",
    icon: SquareCheckBig,
    label: "Today",
  },
  {
    description: "Accounts and ledger",
    href: "/finance",
    icon: CircleDollarSign,
    label: "Finance",
  },
  {
    description: "Daily notes and capture",
    href: "/notes",
    icon: NotebookPen,
    label: "Notes",
  },
  {
    description: "Agenda and planning",
    href: "/calendar",
    icon: CalendarDays,
    label: "Calendar",
  },
  {
    description: "Habits and activity",
    href: "/progress",
    icon: Activity,
    label: "Progress",
  },
  {
    description: "Profile and integrations",
    href: "/settings",
    icon: Settings,
    label: "Settings",
  },
] satisfies NavItem[];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="hidden border-r border-[var(--line)] bg-[var(--panel)] lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:px-4 lg:py-5">
        <Link className="mb-7 block rounded-2xl px-3 py-2" href="/">
          <p className="allme-kicker text-[var(--accent)]">AllMe</p>
          <p className="mt-2 text-xl font-semibold tracking-[-0.04em]">
            Personal OS
          </p>
        </Link>

        <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              isActive={isActivePath({
                exact: item.exact,
                href: item.href,
                pathname,
              })}
              item={item}
              key={item.href}
            />
          ))}
        </nav>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-3">
          <p className="text-sm font-semibold">Current focus</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Shell first, then Today, Notes, Calendar, Finance hardening, and
            Progress.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--panel)]/95 px-4 py-3 pr-16 backdrop-blur lg:hidden">
          <Link className="allme-kicker text-[var(--accent)]" href="/">
            AllMe
          </Link>
          <nav
            aria-label="Primary navigation"
            className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
          >
            {navItems.map((item) => (
              <MobileNavLink
                isActive={isActivePath({
                  exact: item.exact,
                  href: item.href,
                  pathname,
                })}
                item={item}
                key={item.href}
              />
            ))}
          </nav>
        </header>

        {children}
      </div>
    </div>
  );
}

function NavLink({ isActive, item }: { isActive: boolean; item: NavItem }) {
  const Icon = item.icon;

  return (
    <Link
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-sm transition",
        isActive
          ? "border-[var(--accent)] bg-[var(--empty)] text-[var(--foreground)]"
          : "text-[var(--muted)] hover:border-[var(--line)] hover:bg-[var(--empty)] hover:text-[var(--foreground)]",
      )}
      href={item.href as Route}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "h-5 w-5 shrink-0",
          isActive ? "text-[var(--accent)]" : "text-[var(--muted)]",
        )}
      />
      <span className="min-w-0">
        <span className="block font-semibold">{item.label}</span>
        <span className="block truncate text-xs text-[var(--muted)]">
          {item.description}
        </span>
      </span>
    </Link>
  );
}

function MobileNavLink({
  isActive,
  item,
}: {
  isActive: boolean;
  item: NavItem;
}) {
  const Icon = item.icon;

  return (
    <Link
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition",
        isActive
          ? "border-[var(--accent)] bg-[var(--empty)] text-[var(--foreground)]"
          : "border-[var(--line)] text-[var(--muted)]",
      )}
      href={item.href as Route}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function isActivePath({
  exact,
  href,
  pathname,
}: {
  exact?: boolean;
  href: string;
  pathname: string;
}) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
