import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import type { Block, Inline } from "@/lib/editorial-mdx";
import { parseInline } from "@/lib/editorial-mdx";
import { ArticleChangeTable } from "@/components/blocks/article/ArticleChangeTable";
import { ArticleFigure } from "@/components/blocks/article/ArticleFigure";
import { ArticleNotice } from "@/components/blocks/article/ArticleNotice";
import { ArticlePriceTable } from "@/components/blocks/article/ArticlePriceTable";
import { ArticleQuote } from "@/components/blocks/article/ArticleQuote";

/**
 * The body of an article, rendered from the tree the parser produced.
 *
 * ---------------------------------------------------------------------------
 * One column — 640 px at 20 px, and 784 px at 24 px from `xl` — `DS-LAYOUT-012`
 * ---------------------------------------------------------------------------
 *
 * Prose and object share a single cap. The article used to have two, 576 px of
 * text and 768 px of object, and the second one was the defect the operator
 * reported on 2026-08-31: the cover announced a width of 768 px and every
 * paragraph under it broke at 576, a 192 px step that reads as a broken page
 * rather than as an object breathing. The wide column is a CEILING in the rule,
 * never an obligation, and nothing this section publishes needs it — the cover
 * is a generated ornament and the two tables carry two short columns each.
 *
 * With one column the old routing question — "is this block read line by line
 * or not?" — has no consequence left, so the `PROSE_COMPONENTS` set that
 * answered it is gone rather than kept as a switch with one position. The
 * defect it existed to prevent (`ArticleNotice`, a paragraph of prose in a box,
 * published at 768 px and 101 characters a line in Italian) cannot come back
 * while there is a single width to inherit.
 *
 * **The body is 20/36 from `md` up and 24/40 from `xl` up** — `prose-xl` and
 * then `prose-2xl`, over `prose-lg` below both. Nobody had chosen the 16/28
 * this started from: it is the default of `@tailwindcss/typography` 0.5.19. The
 * measure is the quotient of width and size, so the width alone never decided
 * anything — the same 576 px carries 77 characters at 16 px and 66 at 18 px,
 * and 640 px at 20 px carries exactly what 576 px at 18 px did.
 *
 * That quotient is the whole reason the column could grow to 784 px on the
 * operator's 70/30 without touching the ceiling: characters per line are
 * `measure ÷ glyph width`, the glyph is a property of the font measured in
 * `em`, so raising width and size together buys pixels and spends no
 * character. 784/24 is **32,67 em**, under the 33 of the rule and with more
 * headroom than the 32,00 em it replaces.
 *
 * The cap sits on the **wrapper**, not on the `prose` element, and that is not
 * a style choice. `@tailwindcss/typography` sets `max-width: 65ch` on `.prose`
 * itself, so `max-w-xl` beside it is two declarations of the same property at
 * the same specificity and the winner is decided by the order Tailwind happens
 * to emit them. Wrapping is deterministic: a child can never render wider than
 * its container, whatever the plugin says. And it means no `max-w-none` here —
 * the utility the legal pages use to cancel the measure, which is exactly what
 * takes their `<article>` to 822 px and 102 characters a line.
 *
 * Consecutive text blocks share one `prose` container so the plugin's vertical
 * rhythm still applies between them.
 *
 * ---------------------------------------------------------------------------
 * The two columns are anchored, not centred — `DS-LAYOUT-013`
 * ---------------------------------------------------------------------------
 *
 * Neither cap carries `mx-auto`. Centring a narrow column inside the rail
 * creates a **second rail**: the body used to start at `left` 432 while the
 * logo of the header started at 112, 320 px of ditch on each side and 53 % of
 * the rail empty. The width of each column is the decision of `DS-LAYOUT-012`
 * and it does not change here; where the column *starts* is this rule's, and
 * it starts on the content edge of `.page-shell`, like everything else on the
 * site. What fills the rest of the rail is the support column the article
 * template renders — never a wider line.
 */

/**
 * The reading column — `DS-LAYOUT-012`. ONE column, and one constant: prose and
 * object share it. The cap and the body size are a single decision, because the
 * measure is their quotient — 640 px at 20 px is the same **32,0 em** the pair
 * 576/18 gave, and the characters per line are a property of the font, not of
 * the size. Measured on the four locales: identical to thirteen decimal places.
 *
 * **Three tiers, and the third one exists because of the rail.** 576/18 below
 * `md`, 640/20 from `md`, and **784/24 from `xl`** — the same breakpoint where
 * the two-column grid opens. The operator asked for 70/30 between the reading
 * and the rail on 2026-08-31, and 70 % of the 1120 px of track the shell leaves
 * after a 96 px gutter is exactly 784. Below `xl` there is no rail, so there is
 * no proportion to honour and nothing changes: a window between 688 px and
 * 768 px can never land on 640 px of 18 px type, which would be 35,6 em, and a
 * 1024 px one never lands on 784 px of 20 px type, which would be 39,2 em.
 */
const READING_COLUMN = "max-w-xl md:max-w-[40rem] xl:max-w-[49rem]";

const PROSE =
  "prose prose-lg md:prose-xl xl:prose-2xl prose-slate prose-headings:text-tuggi-dark prose-headings:font-black prose-p:text-tuggi-slate prose-li:text-tuggi-slate prose-strong:text-tuggi-dark prose-a:text-tuggi-primary-text prose-a:font-semibold";

function renderInline(nodes: Inline[], keyPrefix: string): ReactNode {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.kind) {
      case "text":
        return <Fragment key={key}>{node.value}</Fragment>;
      case "strong":
        return <strong key={key}>{renderInline(node.children, key)}</strong>;
      case "em":
        return <em key={key}>{renderInline(node.children, key)}</em>;
      case "link":
        // Internal links go through `next/link` (client navigation, prefetch);
        // an external one is a plain anchor that opens where it says it does.
        return node.href.startsWith("/") ? (
          <Link key={key} href={node.href}>
            {renderInline(node.children, key)}
          </Link>
        ) : (
          <a key={key} href={node.href} target="_blank" rel="noopener noreferrer">
            {renderInline(node.children, key)}
          </a>
        );
    }
  });
}

/** Text of a component prop, with its inline markup. */
function propNode(props: Record<string, unknown>, name: string, key: string): ReactNode {
  const value = props[name];
  if (typeof value !== "string") return null;
  return renderInline(parseInline(value, "<content>"), key);
}

function propText(props: Record<string, unknown>, name: string): string {
  const value = props[name];
  return typeof value === "string" ? value : "";
}

function renderComponent(block: Extract<Block, { kind: "component" }>, key: string): ReactNode {
  const { props } = block;
  switch (block.name) {
    case "ArticleFigure":
      return (
        <ArticleFigure
          key={key}
          src={propText(props, "src")}
          alt={propText(props, "alt")}
          caption={props.caption ? propNode(props, "caption", key) : undefined}
        />
      );
    case "ArticleQuote":
      return (
        <ArticleQuote
          key={key}
          author={propText(props, "author")}
          role={props.role ? propText(props, "role") : undefined}
        >
          {propNode(props, "quote", key)}
        </ArticleQuote>
      );
    case "ArticleNotice":
      return <ArticleNotice key={key}>{propNode(props, "body", key)}</ArticleNotice>;
    case "ArticleChangeTable":
      return (
        <ArticleChangeTable
          key={key}
          caption={propText(props, "caption")}
          beforeLabel={propText(props, "beforeLabel")}
          afterLabel={propText(props, "afterLabel")}
          rows={props.rows as [string, string][]}
        />
      );
    case "ArticlePriceTable":
      return <ArticlePriceTable key={key} />;
  }
}

function renderTextBlock(block: Block, key: string): ReactNode {
  switch (block.kind) {
    case "heading":
      return block.level === 2 ? (
        <h2 key={key}>{renderInline(block.children, key)}</h2>
      ) : (
        <h3 key={key}>{renderInline(block.children, key)}</h3>
      );
    case "paragraph":
      return <p key={key}>{renderInline(block.children, key)}</p>;
    case "list":
      return block.ordered ? (
        <ol key={key}>
          {block.items.map((item, index) => (
            <li key={`${key}-${index}`}>{renderInline(item, `${key}-${index}`)}</li>
          ))}
        </ol>
      ) : (
        <ul key={key}>
          {block.items.map((item, index) => (
            <li key={`${key}-${index}`}>{renderInline(item, `${key}-${index}`)}</li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

export function ArticleBody({ blocks }: { blocks: Block[] }) {
  const out: ReactNode[] = [];
  let run: Block[] = [];

  const flush = () => {
    if (!run.length) return;
    const start = out.length;
    out.push(
      <div key={`text-${start}`} className={READING_COLUMN}>
        <div className={PROSE}>
          {run.map((block, index) => renderTextBlock(block, `text-${start}-${index}`))}
        </div>
      </div>
    );
    run = [];
  };

  for (const block of blocks) {
    if (block.kind === "component") {
      flush();
      out.push(
        <div key={`block-${out.length}`} className={READING_COLUMN}>
          {renderComponent(block, `block-${out.length}`)}
        </div>
      );
      continue;
    }
    run.push(block);
  }
  flush();

  return <>{out}</>;
}
