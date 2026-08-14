import type { Page } from "@playwright/test";

/**
 * What the page actually publishes: its title, its head metadata, its JSON-LD
 * and its text.
 *
 * **Never `page.content()` in this repository.** next-intl ships the whole
 * message file down inside the RSC payload, so the raw HTML of any page
 * contains every source string of every other page — including the sentence a
 * guard is asserting is gone. A sweep over `page.content()` is green when the
 * copy is wrong and red when it is right; it says nothing either way. The
 * `<script>` removal below is the whole point of this helper.
 *
 * The clone is detached, so `innerText` falls back to text-content semantics:
 * copy inside a `md:hidden` bar (the sticky CTA) counts as published here even
 * on a desktop viewport. That is deliberate for a claim guard — a false promise
 * hidden behind a media query is still shipped to the visitor holding a phone.
 *
 * Two twins of this function predate it, inside `product-facts.spec.ts` and
 * `partner-claims.spec.ts`. They are not converted here: those are long guards
 * that `qa` writes against in parallel, and this card had no reason to touch
 * them. New specs import this one — noted on card #309 so the collapse can be
 * scheduled by whoever owns those files.
 */
export async function publishedText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const body = document.body.cloneNode(true) as HTMLElement;
    body.querySelectorAll("script, template, noscript").forEach((node) => node.remove());

    const meta = [...document.querySelectorAll("meta")]
      .map((tag) => tag.getAttribute("content") ?? "")
      .join("\n");
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((tag) => tag.textContent ?? "")
      .join("\n");

    return [document.title, meta, jsonLd, body.innerText].join("\n");
  });
}
