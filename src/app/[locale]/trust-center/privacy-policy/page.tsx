import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  const title = t("privacyTitle");
  const description = t("privacyDescription");

  return {
    title,
    description,
    alternates: buildAlternates(locale, "trust-center/privacy-policy"),
    robots: defaultRobots,
    openGraph: buildOpenGraph({ title, description, locale, pagePath: "trust-center/privacy-policy" }),
    twitter: buildTwitterCard({ title, description }),
  };
}

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Legal.Privacy" });

  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600 prose-strong:text-tuggi-dark prose-a:text-tuggi-primary-text">
      <h1>{t("title")}</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-tuggi-slate !mb-8 border-b border-gray-100 pb-4">
        {t("lastUpdated")}
      </p>

      <p>{t("intro")}</p>

      <section>
        <h2>{t("s1Title")}</h2>
        <p>{t("s1Intro")}</p>
        <ul>
          <li>{t.rich("s1Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s1Item2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s1Item3", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          {/* The fourth category, and it ships in the same release as the field
              that collects it — BR-USUARIO-028 item 1: a surface does not
              collect a category the published policy does not declare. What it
              has to say is fixed by BR-USUARIO-029 block (A): the purpose, the
              two channels (the phone call included), the limit of the cycle and
              the way out. Card #294. */}
          <li>{t.rich("s1Item4", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          {/* One item per surface, not one item per subject — BR-USUARIO-028
              item 6, corollary. `s1Item4` above used to open with "the
              partnerships form" and was therefore read as covering all three
              public collections; its scope is now the form on the partnerships
              page of this site, which is what keeps the city/IP negative and
              the 4-attempts cycle of BR-USUARIO-029 attached to the only
              collection they are true for.

              `s1Item5` and `s1Item6` are the CMS proposal form
              (BR-USUARIO-030: the two blocks of data, the four purposes, the
              hashed address of the public door, and the destination of the
              story). `s1Item7` is the acceptance trail (BR-USUARIO-031: the IP
              is kept as it is, and the purpose is probatory).

              `/contact` posts to the same route and is still undeclared — it
              waits on a purpose from `produto` — card #344 names it as the
              next card, and it takes the next free number, `s1Item9`. */}
          <li>{t.rich("s1Item5", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s1Item6", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s1Item7", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          {/* `s1Item8` is the partner attribution capture — card #443, and the
              surface is the partner page (`PartnerHero`, `/download` and
              `/d/[slug]`), not a form. What it declares is measured, not
              estimated: the row in `drive.click_fingerprints`
              (`src/app/api/attribution/route.ts` — IP from the edge, user
              agent, language, timezone, partner and time), the first-party
              cookie `tuggi_attr` of 30 days
              (`ATTRIBUTION_COOKIE_MAX_AGE_SECONDS`, derived from
              `ATTRIBUTION_RETENTION_DAYS`), and the retention of
              `drive.cleanup_stale_fingerprints`: IP and user agent nulled at
              48 h, row gone at 30 days, from the daily pg_cron job. The
              transmission to Google rides in section 3, because that is the
              section a reader goes to for third parties.

              THE ITEM ALSO CARRIES THE GATE, because without it the first
              sentence is false for most of the world. BR-USUARIO-033 item 1:
              the capture runs unasked only in Brazil and the United States,
              and everywhere else it waits for the consent flag
              (`attributionGateOf`) — so the item says the record is created
              only after the visitor accepts, and that until then there is
              neither row nor cookie. The undetermined territory is gated too
              (item 2), which is the safe side of what this text announces.
              BR-USUARIO-032 items 1, 3 and 6 still declare 90 days; that is
              `produto`'s to move, and it does not hold this page. */}
          <li>{t.rich("s1Item8", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s2Title")}</h2>
        <ul>
          <li>{t.rich("s2Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s2Item2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s3Title")}</h2>
        <ul>
          <li>{t.rich("s3Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          {/* `s3Item2` used to say we share data ONLY with infrastructure
              providers. That absolute stopped being true the moment the
              `click_id` started riding in the Play Store link, so it now names
              its own scope inside the clause — the #304 lesson: a negative in
              this policy is read as speaking for the whole domain. */}
          <li>{t("s3Item2")}</li>
          <li>{t.rich("s3Item3", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s4Title")}</h2>
        <ul>
          <li>{t("s4Item1")}</li>
          <li>{t("s4Item2")}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s5Title")}</h2>
        <p>{t("s5Intro")}</p>
        <ul>
          <li>{t("s5Item1")}</li>
          <li>{t("s5Item2")}</li>
          <li>
            {t.rich("s5ItemO1", { strong: (chunks) => <strong>{chunks}</strong> })}
            <Link href="/trust-center/data-deletion">{t("s5ItemO2")}</Link>
            {t("s5ItemO3")}
          </li>
          {/* BR-USUARIO-029 item 6: whoever left a contact in a form on this
              site never had an account, so there is nothing for
              /trust-center/data-deletion to delete — and until this item the
              page pointed there and nowhere else. One key for the address, used
              as both the label and the href, so the two cannot drift apart. */}
          <li>
            {t.rich("s5ItemLead1", { strong: (chunks) => <strong>{chunks}</strong> })}
            <a href={`mailto:${t("s5ItemLeadEmail")}`}>{t("s5ItemLeadEmail")}</a>
            {t("s5ItemLead2")}
          </li>
          {/* BR-USUARIO-030 item 7 and BR-USUARIO-031 item 6: the way out of
              the proposal form is the same address as the item above — one
              owner for it, `s5ItemLeadEmail`, so a new mailbox cannot be
              introduced by copy — and its reach is smaller. Removal reaches
              what the partnership under way does not need; the acceptance
              trail of a signed contract stays, and `s5ItemPartner2` says so
              without the "all your data will be erased" euphemism that
              BR-USUARIO-031 item 6 forbids. */}
          <li>
            {t.rich("s5ItemPartner1", { strong: (chunks) => <strong>{chunks}</strong> })}
            <a href={`mailto:${t("s5ItemLeadEmail")}`}>{t("s5ItemLeadEmail")}</a>
            {t("s5ItemPartner2")}
          </li>
        </ul>
      </section>

      <section>
        <h2>{t("s6Title")}</h2>
        <p>
          {t("s6P1")}
          <Link href="/contact">{t("s6P2")}</Link>
          {t("s6P3")}
        </p>
      </section>

      <section>
        <h2>{t("s7Title")}</h2>
        <p>{t("s7Text")}</p>
      </section>
    </article>
  );
}
