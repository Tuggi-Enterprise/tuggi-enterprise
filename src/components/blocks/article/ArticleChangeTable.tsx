/**
 * Before / after — `DS-COMPONENTE-055`.
 *
 * **One `<table>` with a `<caption>` and two `<th scope="col">`**, never two
 * lists side by side and never two cards: the relation between the two sides is
 * the data (SC 1.3.1, *Info and Relationships*), and two lists do not express
 * it — they are exactly the reading this block exists to prevent.
 *
 * It stays a real table at every width, and that is the answer to the small
 * screen too: the two cells of a row are adjacent in the DOM and stay adjacent
 * on screen, wrapping their text instead of splitting into two stacks. A
 * `display: block` "responsive table" would deliver the very separation the
 * rule forbids, and would drop the header association on the way.
 *
 * Every cell carries a word — the parser rejects a blank one, because an
 * absence declared with white space is an absence nobody reads.
 */
export function ArticleChangeTable({
  caption,
  beforeLabel,
  afterLabel,
  rows,
}: {
  caption: string;
  beforeLabel: string;
  afterLabel: string;
  rows: [string, string][];
}) {
  return (
    <div className="my-10" data-block="article-change-table">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <caption className="caption-top pb-3 text-left text-sm font-bold text-tuggi-dark">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th
              scope="col"
              className="w-1/2 py-3 pr-4 align-top text-xs font-bold uppercase tracking-wider text-tuggi-slate"
            >
              {beforeLabel}
            </th>
            <th
              scope="col"
              className="w-1/2 py-3 pl-4 align-top text-xs font-bold uppercase tracking-wider text-tuggi-slate"
            >
              {afterLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([before, after]) => (
            <tr key={`${before}|${after}`} className="border-b border-gray-100 align-top">
              <td className="py-3 pr-4 text-tuggi-slate">{before}</td>
              <td className="py-3 pl-4 text-tuggi-dark">{after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
