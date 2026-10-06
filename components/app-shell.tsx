"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { CalendarRange, House, Moon, Scale, Settings, Sun, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Today", icon: House },
  { href: "/log", label: "Weigh", icon: Scale },
  { href: "/food", label: "Food", icon: Utensils },
  { href: "/history", label: "History", icon: CalendarRange },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div>
            <p className="text-sm font-semibold tracking-tight">Fit Log</p>
            <p className="text-xs text-muted-foreground">Los Angeles time</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle color theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg px-4 pt-4 pb-nav">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
        <div
          className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1"
          style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
        >
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
