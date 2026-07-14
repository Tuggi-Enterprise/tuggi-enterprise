/**
 * Edge geo lookup for local pricing. Reads Vercel's geo header and returns the
 * country code. Falls back to "US" when the header is absent (e.g. local dev),
 * so the client always gets a usable answer. This keeps /drive statically
 * generated — only this tiny endpoint is request-time.
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const country = request.headers.get("x-vercel-ip-country") || "US";
  return Response.json(
    { country },
    { headers: { "cache-control": "no-store" } }
  );
}
