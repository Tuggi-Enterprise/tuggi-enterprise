import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";
import { DEFAULT_LOCALE, LOCALES } from "./locales";
import { pathnames } from "./pathnames";

/**
 * Declaring `pathnames` makes the map in ./pathnames.ts the single source of
 * route truth: next-intl rewrites the localized URL to the internal pathname,
 * and the `href` of every `<Link>` below is typed against the map's keys, so a
 * route that is not declared is a compile error rather than a 404 found in
 * production.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  pathnames,
});

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
