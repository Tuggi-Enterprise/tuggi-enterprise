/**
 * The address behind a CEP — the one piece of the proposal the person does not have to type.
 *
 * WHY IT GOES THROUGH OUR OWN ROUTE AND NOT STRAIGHT FROM THE BROWSER. Three reasons, and the
 * first one is the only one that would be enough:
 *
 *  1. **The visitor's address does not go to a third party.** A `fetch` from the browser tells
 *     ViaCEP the IP of every restaurant owner who fills this form. BR-USUARIO-030 fixes four
 *     purposes for this door and none of them is "tell a third party who is filling it in", and
 *     the proxy costs nothing to avoid it entirely.
 *  2. **The cache is ours.** ViaCEP publishes that mass use blocks the caller indefinitely, and
 *     a CEP is the most cacheable value on earth: the same eight digits answer the same street
 *     for years. One `revalidate` and the second visitor of a neighbourhood never reaches them.
 *  3. **CORS stops being a question.** Whether the browser may call them at all is theirs to
 *     change without telling us; whether it may call us is ours.
 *
 * IT ENRICHES AND NEVER BLOCKS. Every failure — network, 404, malformed answer, a CEP that
 * exists and has no street — resolves to `null`, and the form goes on with empty fields the
 * person fills by hand. A form that stops because an address service is down is a worse form
 * than one that never had the service.
 */

import type { PartnerAnswers } from "./schema";

/** What the site asks of a CEP, and the whole of it. The route below returns nothing else. */
export interface PostalCodeAddress {
  /** `logradouro` — the street, with no number. The number is always typed. */
  street: string;
  /** `bairro`. */
  district: string;
  /** `localidade`. */
  city: string;
  /** `uf`, two letters, upper case — the value `state` stores. */
  state: string;
}

/** The endpoint of this site that answers it. Named once so the route and the caller agree. */
export const POSTAL_CODE_ENDPOINT = "/api/postal-code";

/**
 * A day. A street does not get renamed often enough to justify asking twice, and the window is
 * short enough that a rename reaches the form inside a working week.
 */
export const POSTAL_CODE_CACHE_SECONDS = 86_400;

/**
 * ViaCEP's answer, reduced to the four fields above.
 *
 * A CEP that exists but is "de faixa única" — one code for a whole town — answers with empty
 * `logradouro` and `bairro`, and that is a legitimate answer, not an error: the town and the UF
 * are still worth filling. So the emptiness travels, and the caller decides what to do with it.
 */
export function readViaCepPayload(payload: unknown): PostalCodeAddress | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;
  // ViaCEP answers `{ "erro": "true" }` — a string, not a boolean — for a CEP nobody uses.
  if (body.erro === true || body.erro === "true") return null;

  const city = text(body.localidade);
  const state = text(body.uf).toUpperCase();
  // Without a town there is nothing worth filling, and something else answered.
  if (!city || state.length !== 2) return null;

  return { street: text(body.logradouro), district: text(body.bairro), city, state };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * O QUE O CEP PREENCHE, e as duas regras que decidem isso. Puro, para que as duas regras possam
 * ser quebradas por um teste em vez de por uma revisão.
 *
 * REGRA 1 — SÓ CAMPO VAZIO. Quem digitou a rua antes do CEP fica com o que digitou.
 *
 * REGRA 2 — NUNCA O CAMPO QUE ESTÁ COM O CURSOR, e é ela que faltava. Em 25/08/2026, 2 de 25
 * propostas chegaram com `city = "Cabo FrioCabo Frio"`, e o campo era sempre `city` — nunca
 * `address`, nunca `district`, nunca `state`. Não é acaso: na tela `city` é o campo IMEDIATAMENTE
 * DEPOIS do CEP, é o único input de texto ainda vazio quando a resposta chega, e é o que está com
 * o cursor. A regra 1 não o protege, porque naquele instante ele está vazio de verdade — a pessoa
 * acabou de começar a digitar nele.
 *
 * `busy` é o `name` do elemento em foco, que é o id do campo (`PartnerProposalField` passa
 * `name: field.id`). Quem lê o DOM é o componente; aqui só se decide.
 */
export const POSTAL_CODE_FILLS = ["address", "district", "city", "state"] as const;

export type PostalCodeFilledField = (typeof POSTAL_CODE_FILLS)[number];

export function applyPostalCodeAddress(
  current: PartnerAnswers,
  address: PostalCodeAddress,
  options: { busy?: string | null } = {}
): PartnerAnswers {
  const next: PartnerAnswers = { ...current };
  const incoming: Record<PostalCodeFilledField, string> = {
    address: address.street,
    district: address.district,
    city: address.city,
    state: address.state,
  };

  for (const id of POSTAL_CODE_FILLS) {
    const value = incoming[id];
    if (!value) continue;
    if (id === options.busy) continue;
    if ((next[id] ?? "").trim()) continue;
    next[id] = value;
  }

  return next;
}
