/**
 * editorial-mdx.ts — the strict MDX subset the editorial content is written in.
 *
 * ---------------------------------------------------------------------------
 * Why a parser of ours and not the MDX toolchain
 * ---------------------------------------------------------------------------
 *
 * `DS-COMPONENTE-054` closes the block set: the author composes with the eight
 * declared blocks and nothing else — no arbitrary JSX, no `style`, no utility
 * class inside content. Real MDX gives the opposite guarantee by design (it
 * evaluates whatever JSX it is handed), so honouring the rule with `@next/mdx`
 * would mean shipping the toolchain AND a second sweep to forbid what it just
 * allowed.
 *
 * And the spec asks for a **tree** anyway, twice: criterion 14 compares the
 * heading sequence and the block counts of the four locales of one article,
 * and criterion 21 breaks the build on a `#` in the body. Parsing once and
 * rendering from the same tree is one implementation of one decision; parsing
 * for validation beside a separate renderer is two (CLAUDE.md §6).
 *
 * What this accepts, and nothing else:
 *
 *   - `## ` and `### ` headings. `# ` throws — the `h1` is the template's
 *     (`DS-A11Y-011`).
 *   - paragraphs, separated by a blank line
 *   - `- ` / `* ` unordered and `1. ` ordered lists
 *   - inline `[label](href)`, `**strong**` and `_em_`
 *   - the five authorable block components, self-closing, with attributes
 *     written as `name="text"` or `name={<json>}`
 *
 * Anything else — a bare `<div>`, `<ArticleFigure>` with children, `style=`,
 * `className=`, an unknown component — is a parse error, and a parse error at
 * build time is criterion 22's "quebra o build".
 */

export type Inline =
  | { kind: "text"; value: string }
  | { kind: "strong"; children: Inline[] }
  | { kind: "em"; children: Inline[] }
  | { kind: "link"; href: string; children: Inline[] };

/** The five blocks an author may place in the body (spec §5.2). */
export const AUTHORABLE_BLOCKS = [
  "ArticleFigure",
  "ArticleQuote",
  "ArticleNotice",
  "ArticleChangeTable",
  "ArticlePriceTable",
] as const;

export type AuthorableBlock = (typeof AUTHORABLE_BLOCKS)[number];

export type Block =
  | { kind: "heading"; level: 2 | 3; children: Inline[] }
  | { kind: "paragraph"; children: Inline[] }
  | { kind: "list"; ordered: boolean; items: Inline[][] }
  | { kind: "component"; name: AuthorableBlock; props: Record<string, unknown> };

export interface EditorialDocument {
  frontmatter: Record<string, unknown>;
  blocks: Block[];
}

/** A defect in a content file. Thrown, never returned: it has to stop a build. */
export class EditorialContentError extends Error {
  constructor(file: string, message: string) {
    super(`${file}: ${message}`);
    this.name = "EditorialContentError";
  }
}

/* ---------------------------------------------------------------------------
 * Frontmatter — a deliberate YAML subset
 * -------------------------------------------------------------------------
 * Scalars and one shape of list: `key:` followed by `- ` items whose own
 * `key: value` lines are indented under them. That is exactly the `waiver`
 * contract of §10 and nothing more, because nothing more is declared.
 * ------------------------------------------------------------------------- */

function unquote(raw: string): string {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
    (value.startsWith("'") && value.endsWith("'") && value.length > 1)
  ) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return value;
}

function parseFrontmatter(lines: string[], file: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let listKey: string | null = null;
  let listItems: Record<string, string>[] = [];

  const closeList = () => {
    if (listKey) out[listKey] = listItems;
    listKey = null;
    listItems = [];
  };

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const item = /^\s+-\s+([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (item) {
      if (!listKey) throw new EditorialContentError(file, `frontmatter list item outside a list: ${line.trim()}`);
      listItems.push({ [item[1]]: unquote(item[2]) });
      continue;
    }

    const subEntry = /^\s{4,}([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (subEntry) {
      const current = listItems[listItems.length - 1];
      if (!current) throw new EditorialContentError(file, `frontmatter continuation with no item: ${line.trim()}`);
      current[subEntry[1]] = unquote(subEntry[2]);
      continue;
    }

    const entry = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!entry) throw new EditorialContentError(file, `frontmatter line is not "key: value": ${line.trim()}`);
    closeList();
    if (entry[2].trim() === "") {
      listKey = entry[1];
      continue;
    }
    out[entry[1]] = unquote(entry[2]);
  }
  closeList();
  return out;
}

/* ---------------------------------------------------------------------------
 * Inline
 * ------------------------------------------------------------------------- */

const INLINE = /(\[[^\]]+\]\([^)\s]+\))|(\*\*[^*]+\*\*)|(_[^_]+_)/;

export function parseInline(source: string, file: string): Inline[] {
  const out: Inline[] = [];
  let rest = source;

  while (rest) {
    const match = INLINE.exec(rest);
    if (!match || match.index === undefined) {
      out.push({ kind: "text", value: rest });
      break;
    }
    if (match.index > 0) out.push({ kind: "text", value: rest.slice(0, match.index) });
    const token = match[0];

    if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)!;
      out.push({ kind: "link", href: link[2], children: parseInline(link[1], file) });
    } else if (token.startsWith("**")) {
      out.push({ kind: "strong", children: parseInline(token.slice(2, -2), file) });
    } else {
      out.push({ kind: "em", children: parseInline(token.slice(1, -1), file) });
    }
    rest = rest.slice(match.index + token.length);
  }

  return out.filter((node) => node.kind !== "text" || node.value !== "");
}

/** The reading text of an inline tree — what a copy ruler measures. */
export function inlineText(nodes: Inline[]): string {
  return nodes
    .map((node) => (node.kind === "text" ? node.value : inlineText(node.children)))
    .join("");
}

/** The reading text of a block, for the copy rulers of `DS-COPY-046`. */
export function blockText(block: Block): string {
  switch (block.kind) {
    case "heading":
    case "paragraph":
      return inlineText(block.children);
    case "list":
      return block.items.map(inlineText).join("\n");
    case "component":
      return Object.values(block.props)
        .filter((value): value is string => typeof value === "string")
        .join("\n");
  }
}

/* ---------------------------------------------------------------------------
 * Component blocks
 * ------------------------------------------------------------------------- */

const ATTRIBUTE = /([A-Za-z][\w-]*)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|\{([\s\S]*?)\})/g;
const FORBIDDEN_ATTRIBUTES = ["style", "className", "class"];

function parseComponent(source: string, file: string): Block {
  const open = /^<([A-Za-z][\w]*)\b([\s\S]*)\/>$/.exec(source.trim());
  if (!open) {
    throw new EditorialContentError(
      file,
      `a block component has to be a single self-closing tag; got: ${source.trim().slice(0, 80)}`
    );
  }
  const name = open[1];
  if (!(AUTHORABLE_BLOCKS as readonly string[]).includes(name)) {
    throw new EditorialContentError(
      file,
      `<${name}> is not one of the declared blocks (DS-COMPONENTE-054). Allowed: ${AUTHORABLE_BLOCKS.join(", ")}`
    );
  }

  const props: Record<string, unknown> = {};
  const body = open[2];
  let remainder = body;
  for (const attribute of body.matchAll(ATTRIBUTE)) {
    const [whole, key, quoted, braced] = attribute;
    remainder = remainder.replace(whole, "");
    if (FORBIDDEN_ATTRIBUTES.includes(key)) {
      throw new EditorialContentError(
        file,
        `\`${key}\` inside content is forbidden (DS-COMPONENTE-054, DS-COR-001): a colour or a width born in a content file has no owner`
      );
    }
    if (quoted !== undefined) {
      props[key] = quoted.replace(/\\"/g, '"');
      continue;
    }
    try {
      props[key] = JSON.parse(braced);
    } catch {
      throw new EditorialContentError(file, `\`${key}={…}\` on <${name}> is not valid JSON`);
    }
  }

  // Everything that is not an attribute has to be whitespace: an unparsed
  // remainder means an attribute shape this subset does not accept, and
  // silently dropping it is how content stops matching what is published.
  if (remainder.trim() !== "") {
    throw new EditorialContentError(
      file,
      `<${name}> carries something this subset does not parse — attributes are \`name="text"\` or \`name={json}\``
    );
  }

  return { kind: "component", name: name as AuthorableBlock, props };
}

/* ---------------------------------------------------------------------------
 * The document
 * ------------------------------------------------------------------------- */

/** Splits a body into blocks: blank line separated, with tags kept whole. */
function chunk(body: string): string[] {
  const chunks: string[] = [];
  let current: string[] = [];
  let inTag = false;

  for (const line of body.split("\n")) {
    if (!inTag && !line.trim()) {
      if (current.length) chunks.push(current.join("\n"));
      current = [];
      continue;
    }
    if (!inTag && line.trim().startsWith("<")) inTag = true;
    current.push(line);
    if (inTag && line.trim().endsWith("/>")) {
      chunks.push(current.join("\n"));
      current = [];
      inTag = false;
    }
  }
  if (current.length) chunks.push(current.join("\n"));
  return chunks;
}

export function parseEditorialDocument(raw: string, file: string): EditorialDocument {
  const normalized = raw.replace(/\r\n/g, "\n");
  const fenced = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(normalized);
  if (!fenced) throw new EditorialContentError(file, "no frontmatter block (--- … ---)");

  const frontmatter = parseFrontmatter(fenced[1].split("\n"), file);
  const body = fenced[2];

  for (const [index, line] of body.split("\n").entries()) {
    if (/^#(?!#)/.test(line)) {
      throw new EditorialContentError(
        file,
        `line ${index + 1} opens an \`h1\`. The \`h1\` belongs to the template (DS-A11Y-011); the body writes \`##\` and \`###\`.`
      );
    }
  }

  const blocks: Block[] = [];
  for (const piece of chunk(body)) {
    const text = piece.trim();
    if (!text) continue;

    if (text.startsWith("<")) {
      blocks.push(parseComponent(text, file));
      continue;
    }

    const heading = /^(#{2,6})\s+(.*)$/.exec(text);
    if (heading) {
      const level = heading[1].length;
      if (level > 3) {
        throw new EditorialContentError(
          file,
          `\`${heading[1]}\` is deeper than the template allows: sections are \`##\`, subsections \`###\` (DS-A11Y-011)`
        );
      }
      blocks.push({ kind: "heading", level: level as 2 | 3, children: parseInline(heading[2], file) });
      continue;
    }

    const lines = text.split("\n").map((line) => line.trim());
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      blocks.push({
        kind: "list",
        ordered: false,
        items: lines.map((line) => parseInline(line.replace(/^[-*]\s+/, ""), file)),
      });
      continue;
    }
    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      blocks.push({
        kind: "list",
        ordered: true,
        items: lines.map((line) => parseInline(line.replace(/^\d+\.\s+/, ""), file)),
      });
      continue;
    }

    if (text.includes("<")) {
      throw new EditorialContentError(
        file,
        `a paragraph carries a tag. Only the declared blocks are markup, and each one stands alone between blank lines (DS-COMPONENTE-054)`
      );
    }

    blocks.push({ kind: "paragraph", children: parseInline(lines.join(" "), file) });
  }

  const firstHeading = blocks.find((block) => block.kind === "heading");
  if (firstHeading && firstHeading.kind === "heading" && firstHeading.level !== 2) {
    throw new EditorialContentError(file, "the first heading of the body is an `h3` with no `h2` above it (DS-A11Y-011)");
  }
  let previous = 2;
  for (const block of blocks) {
    if (block.kind !== "heading") continue;
    if (block.level > previous + 1) {
      throw new EditorialContentError(file, `heading level jumps from h${previous} to h${block.level} (DS-A11Y-011)`);
    }
    previous = block.level;
  }

  return { frontmatter, blocks };
}

/**
 * The shape of a document, as a comparable string per block.
 *
 * This is what criterion 14 compares between the four locales of one article:
 * the tree, never the text. Four translations that answer different questions
 * are four promises, and only one of them was authorised (`DS-COPY-047`).
 */
export function documentShape(blocks: Block[]): string[] {
  return blocks.map((block) => {
    switch (block.kind) {
      case "heading":
        return `h${block.level}`;
      case "paragraph":
        return "p";
      case "list":
        return `${block.ordered ? "ol" : "ul"}:${block.items.length}`;
      case "component":
        return block.name;
    }
  });
}
