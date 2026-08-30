import { useTranslations } from "next-intl";
import type { UpdateType } from "@/lib/updates";

/**
 * The type of an editorial piece — release note or news.
 *
 * `DS-A11Y-003`: the two types are told apart **by the word**, never by colour.
 * Same treatment for both, so nothing here carries information a reader who
 * does not see colour would lose — and so no third colour is born inside a
 * section (`DS-COR-001`; the orange is reserved by `DS-COR-003`).
 */
export function UpdateTypeBadge({ type }: { type: UpdateType }) {
  const t = useTranslations("Updates.type");

  return (
    <span className="text-xs font-bold uppercase tracking-wider text-tuggi-primary-text">
      {t(type)}
    </span>
  );
}
