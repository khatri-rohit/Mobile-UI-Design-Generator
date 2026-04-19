"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

import { ThemeProvider } from "@/components/theme-provider";

const THEME_ENABLED_PREFIXES = ["/sign-in", "/sign-up", "/forgot-password"];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function canUseThemeOnRoute(
  pathname: string,
  isSignedIn: boolean,
  isAuthLoaded: boolean,
) {
  if (
    THEME_ENABLED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
  ) {
    return true;
  }

  if (pathname !== "/") {
    return false;
  }

  if (!isAuthLoaded) {
    return false;
  }

  return !isSignedIn;
}

export function ScopedThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  const allowTheme = useMemo(() => {
    if (!pathname) {
      return false;
    }

    return canUseThemeOnRoute(pathname, Boolean(isSignedIn), isLoaded);
  }, [isLoaded, isSignedIn, pathname]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={allowTheme ? undefined : "light"}
      storageKey="logic-theme"
    >
      {children}
    </ThemeProvider>
  );
}
