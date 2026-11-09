/**
 * Which store a visitor can install from, read from the user agent on the
 * server — the route page (#946, spec §0.2) and the app preview of the invite
 * and partner pages (DS-COMPONENTE-117, #1135).
 *
 * It decides what a page SHOWS, and nothing else. What goes to the pasteboard
 * follows the destination of the button that was tapped, never this guess
 * (contract `atribuicao-de-parceiro.md` §5): an iPad on iPadOS 13+ announces
 * itself as a Mac and lands on "other", and it must still get its token.
 */
export type StorePlatform = "ios" | "android" | "other";

export function storePlatformOf(userAgent: string | null): StorePlatform {
  const ua = userAgent ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}
