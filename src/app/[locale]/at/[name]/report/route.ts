import { isPageReportField, reportPublicPage } from "@/lib/public-page";

/**
 * `POST tuggi.app/@nome/report`: "Denunciar este perfil" on a creator's page
 * (BR-USUARIO-051 item 5). `middleware.ts` rewrites `/@nome/...` here like it
 * does the page, so the name is the one in the URL and never an account id.
 * No account and nothing about the person: the body is the field, and only it.
 *
 * The browser gets `received` for every answer about the name, a report taken,
 * a name without a page, an empty bio or the ceiling of the address, so this
 * door tells nothing the page's own 404 does not (BR-B2B-067 item 5). The
 * report id and its count never leave the server. Only a failure to record
 * answers differently, with 503, because trying again can work.
 *
 * JSON only: a form posted from another site cannot send it without a
 * preflight this route does not answer.
 */
export const dynamic = "force-dynamic";

const HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

const answer = (status: number, body: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS });

export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }): Promise<Response> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return answer(415, { status: "invalid" });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return answer(400, { status: "invalid" });
  }
  const field = typeof body === "object" && body !== null ? (body as { field?: unknown }).field : undefined;
  if (!isPageReportField(field)) return answer(400, { status: "invalid" });

  const { name } = await params;
  const outcome = await reportPublicPage(name, field, request.headers);
  return outcome === "received" ? answer(200, { status: "received" }) : answer(503, { status: "failed" });
}
