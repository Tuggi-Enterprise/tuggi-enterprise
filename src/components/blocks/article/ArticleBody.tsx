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
 * The two columns — `DS-LAYOUT-012`
 * ---------------------------------------------------------------------------
 *
 * Running text is capped at **576 px** and a figure, a table or a quotation at
 * **768 px**, on the same axis: a figure breathes, text does not stretch.
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
 */

const TEXT_COLUMN = "mx-auto max-w-xl";
const FIGURE_COLUMN = "mx-auto max-w-3xl";
const PROSE =
  "prose prose-slate prose-headings:text-tuggi-dark prose-headings:font-black prose-p:text-tuggi-slate prose-li:text-tuggi-slate prose-strong:text-tuggi-dark prose-a:text-tuggi-primary-text prose-a:font-semibold";

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
      <div key={`text-${start}`} className={TEXT_COLUMN}>
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
        <div key={`block-${out.length}`} className={FIGURE_COLUMN}>
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
