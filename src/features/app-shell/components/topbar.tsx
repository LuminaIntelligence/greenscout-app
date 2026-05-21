"use client";

/**
 * T-022 app-shell topbar.
 *
 * Topbar-only navigation pattern for the authenticated `(app)` route
 * group (no sidebar in MVP — we have 2–3 top-level routes). Layout:
 *
 *   [GreenScout logo]   [nav links]   [user dropdown]
 *
 * Sticky to the viewport top, white background, single bottom border.
 *
 * The active nav link is computed from `usePathname()` and styled with
 * `bg-muted` + `text-forest-green`. On viewports <640px the nav block
 * collapses to leave the logo + user menu (the user menu is the only
 * affordance, since "Kunden" is the only route in MVP).
 *
 * The "Abmelden" item triggers `signOutAction` via a nested `<form>`
 * inside the dropdown — Server-Actions-only per DECISIONS T-017 ⑥.
 *
 * @see DECISIONS.md → "T-022 silent decisions per §14 (consolidated)"
 */

import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/actions/sign-out";
import { t } from "@/i18n/de";

interface TopbarProps {
  userEmail: string;
}

const NAV_ITEMS = [{ href: "/customers", labelKey: "app.nav.customers" as const }];

export function Topbar({ userEmail }: TopbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border bg-background">
      <div className="container mx-auto flex h-full items-center justify-between px-4">
        <Link
          href="/customers"
          className="font-heading text-xl text-forest-green transition-colors hover:text-forest-green/80"
        >
          GreenScout
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Hauptnavigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "rounded-md bg-muted px-3 py-2 text-sm font-medium text-forest-green"
                    : "hover:bg-muted/50 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="size-4" />
              <span className="hidden text-sm sm:inline">{userEmail}</span>
              <span className="sr-only sm:hidden">{userEmail}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {userEmail}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <DropdownMenuItem asChild>
                <button type="submit" className="flex w-full items-center gap-2">
                  <LogOut className="size-4" />
                  {t("app.action.sign-out")}
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
