/**
 * Whether what the partner wrote says anything the page does not already say
 * in its name (DS-COMPONENTE-110: a block without content does not appear).
 *
 * The two texts are compared folded: lower case, accents dropped, punctuation
 * and repeated blanks gone. A description that is the name, or only a piece of
 * it ("Escritório do Chef" for "Escritório do Chef Cabo Frio"), adds nothing,
 * and "About the place" is not drawn for it (#1254, design validation).
 */
export function descriptionAddsToName(description: string | null | undefined, name: string | null | undefined): boolean {
  const text = fold(description);
  if (!text) return false;
  return !fold(name).includes(text);
}

function fold(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
