/**
 * The 27 Brazilian federative units, in the order they are offered in a select.
 *
 * The canonical list for anything on the site that has to *offer* a UF. It came in with
 * the partnership proposal (#396); `tuggi-cms/lib/constants/brazil-states.ts` is the same
 * list and stays there because the conference screen still renders the value the proposal
 * stored. The two are bound by `docs/contracts/partner-proposal-answers.md`: `state` is a
 * code from this list, and the CMS reads it back without translating it.
 *
 * The name is a label, never a stored value — `answers.state` is always the two-letter code.
 */

export interface BrazilState {
  /** UF code, uppercase — what goes in `answers.state`. */
  code: string;
  /** Full name, for the option label. */
  name: string;
}

export const BRAZIL_STATES: readonly BrazilState[] = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
] as const;

export const BRAZIL_STATE_CODES: readonly string[] = BRAZIL_STATES.map((state) => state.code);
