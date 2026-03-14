"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  MessageCircle,
  Map,
  BookOpen,
  FlaskConical,
  FileText,
  Clock,
  Menu,
  X,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/chat", label: "AI Chat", icon: MessageCircle },
  { href: "/landscape", label: "Cure Map", icon: Map },
  { href: "/research", label: "Research", icon: BookOpen },
  { href: "/trials", label: "Trials", icon: FlaskConical },
  { href: "/papers", label: "Papers", icon: FileText },
  { href: "/timeline", label: "Timeline", icon: Clock },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">
            <span className="gradient-text">CT1D</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface-light text-primary-light"
                    : "text-muted hover:bg-surface-light hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-muted hover:bg-surface-light md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t border-border bg-surface px-4 py-3 md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface-light text-primary-light"
                    : "text-muted hover:bg-surface-light hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
