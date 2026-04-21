import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getNotices, getPinnedNotice } from "@/lib/queries";
import { SectionAnchor } from "@/components/chrome/SectionAnchor";
import { FadeUp } from "@/components/motion/FadeUp";
import { Badge } from "@/components/ui/badge";
import { NoticeMarquee } from "./NoticeMarquee";

export async function Notice({ locale }: { locale: Locale }) {
  const [notices, pinned, t] = await Promise.all([
    getNotices(locale),
    getPinnedNotice(locale),
    getTranslations({ locale, namespace: "sections.notice" }),
  ]);

  if (notices.length === 0 && !pinned) return null;

  const list = notices
    .filter((n) => !pinned || n.id !== pinned.id)
    .slice(0, 6);

  const dateFmt = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <>
      {pinned ? (
        <NoticeMarquee label={pinned.tag ?? "NOTICE"} text={pinned.title ?? ""} />
      ) : null}
      <SectionAnchor id="notice" aria-labelledby="notice-heading">
        <div className="container mx-auto max-w-7xl px-5 md:px-8">
          <FadeUp className="mb-10 md:mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
              <h2
                id="notice-heading"
                className="mt-4 font-display text-display-lg text-tuz-ink"
              >
                {t("title")}
              </h2>
            </div>
          </FadeUp>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {list.map((n, i) => (
              <FadeUp key={n.id} delay={0.04 * i}>
                <li className="group relative flex flex-col gap-3 rounded-lg border border-tuz-ink/8 bg-tuz-paper p-6 md:p-7 transition-all duration-[var(--duration-base)] hover:border-tuz-red/30 hover:-translate-y-0.5 hover:shadow-[var(--shadow-tuz-card)]">
                  <div className="flex items-center gap-2">
                    <Badge variant="chip">{n.tag ?? "NOTICE"}</Badge>
                    <span className="font-mono text-xs text-tuz-ink-3">
                      {n.date ? dateFmt.format(new Date(n.date)) : ""}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl text-tuz-ink leading-snug">
                    {n.title}
                  </h3>
                </li>
              </FadeUp>
            ))}
          </ul>
        </div>
      </SectionAnchor>
    </>
  );
}
