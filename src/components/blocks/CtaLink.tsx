import type { AnchorHTMLAttributes, ComponentProps } from "react";
import { Link } from "@/i18n/routing";

/**
 * A call to action that goes either to a declared route or to an anchor on the
 * page it is already on.
 *
 * The `/partners` hub made the distinction load-bearing: after
 * `docs/design/spec-lp-parcerias-2026-08.md` §0.1 the page has **one**
 * destination, and the hero, the six cards of the grid and the band under the
 * mechanism all point at `#lead-form`. The same three places may point at a
 * route the day a segment publishes.
 *
 * The two are not interchangeable in this codebase and the difference is not
 * cosmetic: `Link` from `@/i18n/routing` localizes its `href` against the route
 * map, which is what makes a destination that is not declared a compile error
 * instead of a 404 — and what would turn `"#lead-form"` into `/pt/#lead-form`,
 * a full navigation to the home of the locale. An in-page anchor has to be a
 * plain `<a>`.
 *
 * One component rather than the same ternary in three blocks (CLAUDE.md §6).
 */

/** A declared internal route, or a hash on the current page. */
export type CtaHref = ComponentProps<typeof Link>["href"] | `#${string}`;

type CtaLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: CtaHref;
};

/** `true` when the destination is an anchor on the current page. */
export function isPageAnchor(href: CtaHref): href is `#${string}` {
  return typeof href === "string" && href.startsWith("#");
}

export function CtaLink({ href, children, ...rest }: CtaLinkProps) {
  if (isPageAnchor(href)) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
