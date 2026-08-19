import { NextResponse } from "next/server";
import {
  POSTAL_CODE_CACHE_SECONDS,
  readViaCepPayload,
} from "@/lib/partner-proposal/postal-code-lookup";

/**
 * The address behind a CEP, so the proposal fills four fields the person would have typed.
 *
 * A READ-ONLY PROXY, AND THAT IS THE WHOLE OF IT. No database, no `service_role`, no key of any
 * kind, nothing written anywhere and nothing logged about the caller. The reasoning for the
 * proxy existing at all — the visitor's address not going to a third party, the cache being
 * ours, CORS not being someone else's decision — is in `postal-code-lookup.ts`.
 *
 * WHY IT NEEDS NO RATE LIMIT, and this is the question a reviewer should ask. The two doors that
 * carry `registerAttempt` are anonymous WRITES with a `service_role` key behind them; this one
 * writes nothing and holds nothing. What it could still do is spend somebody else's quota at
 * ViaCEP, and the answer to that is the cache: eight digits are the whole input, the answer is
 * revalidated once a day, and a flood of the same CEP costs one upstream call. A flood of
 * DIFFERENT CEPs is bounded by the ~1 million that exist, which is the enumeration of a public
 * postal database and not of anything of ours.
 *
 * `{ address: null }` with a 200 is the answer to every failure — unknown CEP, upstream down,
 * malformed body. The form treats a null as "type it yourself" and never shows an error, so
 * there is nothing for a status code to tell it that the body does not.
 */
// A LITERAL, and it has to be one: Next reads segment config exports statically, and a value
// imported from another module fails the build with "invalid segment configuration export". It
// is `POSTAL_CODE_CACHE_SECONDS`, and the assertion below is what keeps the two honest instead
// of a comment promising it.
export const revalidate = 86_400;

const VIACEP = "https://viacep.com.br/ws";

if (revalidate !== POSTAL_CODE_CACHE_SECONDS) {
  throw new Error("postal-code: `revalidate` drifted from POSTAL_CODE_CACHE_SECONDS");
}

export async function GET(request: Request) {
  const cep = (new URL(request.url).searchParams.get("cep") ?? "").replace(/\D/g, "");
  // Eight digits or nothing: the upstream answers 400 to anything else, and asking it to tell us
  // what we can see ourselves is a round trip for no information.
  if (cep.length !== 8) return NextResponse.json({ address: null });

  try {
    const response = await fetch(`${VIACEP}/${cep}/json/`, {
      // Next's own cache, keyed by the URL — which is keyed by the CEP.
      next: { revalidate: POSTAL_CODE_CACHE_SECONDS },
      headers: { accept: "application/json" },
    });
    if (!response.ok) return NextResponse.json({ address: null });
    return NextResponse.json({ address: readViaCepPayload(await response.json()) });
  } catch {
    // Deliberately silent: an address service that is down is not an incident of this site, and
    // a log line per keystroke of a flood is noise that hides the incidents that are.
    return NextResponse.json({ address: null });
  }
}
