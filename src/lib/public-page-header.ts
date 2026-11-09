/**
 * The name typed after the @ in `tuggi.app/@nome`, handed by the middleware to
 * the page's not-found view (which receives no params) so it can say which
 * name it did not find. The middleware always overwrites it on that path, so a
 * value sent by the caller never reaches the page.
 *
 * A file of its own: the middleware and the page both read it, and neither may
 * pull the other's dependencies in.
 */
export const PUBLIC_NAME_HEADER = "x-tuggi-public-name";
