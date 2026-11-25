import { NextResponse } from "next/server";
import { DOWNLOAD_TAP_MAX_BODY_BYTES, parseDownloadTap } from "@/lib/download-tap";
import { recordDownloadTap } from "@/lib/public-page";

/**
 * One tap on the download button of `tuggi.app/@nome` or `/d/{slug}`
 * (BR-B2B-068 item 2.f), posted by the page as a beacon (`sendDownloadTap`).
 * The store link never waits for this answer.
 *
 * Public and writing with `service_role`, so this route is the only barrier:
 * the body is a closed shape (a client uuid, `at_name` or `d_slug`, three UTM
 * strings), a declared robot is not counted, and an address counts at most
 * `DOWNLOAD_TAP_LIMIT_PER_WINDOW` taps per page and hour. Nothing about the
 * person reaches the database (item 11).
 *
 * Answers: 204 counted, or not counted on purpose (a robot, the ceiling); 400
 * not a tap; 404 the client does not exist; 503 nothing could be counted.
 */
export async function POST(req: Request) {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > DOWNLOAD_TAP_MAX_BODY_BYTES) {
    return NextResponse.json({ error: "invalid_tap" }, { status: 400 });
  }
  const tap = parseDownloadTap(await req.text());
  if (!tap) return NextResponse.json({ error: "invalid_tap" }, { status: 400 });

  const outcome = await recordDownloadTap(tap, req.headers);
  if (outcome === "unknown_client") return NextResponse.json({ error: "unknown_client" }, { status: 404 });
  if (outcome === "failed") return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return new NextResponse(null, { status: 204 });
}
