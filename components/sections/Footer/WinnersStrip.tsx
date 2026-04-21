import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getWinners } from "@/lib/queries";

export async function WinnersStrip({ locale }: { locale: Locale }) {
  const [winners, t] = await Promise.all([
    getWinners(),
    getTranslations({ locale, namespace: "sections.footer" }),
  ]);

  if (winners.length === 0) return null;

  return (
    <div className="border-y border-tuz-ink/8 py-6 md:py-7">
      <div className="container mx-auto max-w-7xl px-5 md:px-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <p className="eyebrow text-tuz-red shrink-0">{t("winnersTitle")}</p>
        <ul className="flex flex-wrap gap-x-8 gap-y-3">
          {winners.map((w) => (
            <li
              key={w.id}
              className="inline-flex items-baseline gap-2 font-body"
            >
              <span className="font-mono text-xs uppercase tracking-widest text-tuz-ink-3">
                {w.period}
              </span>
              <span className="text-tuz-ink">{w.nick}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
