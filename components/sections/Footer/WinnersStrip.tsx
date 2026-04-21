import { getTranslations } from "next-intl/server";
import { Trophy } from "lucide-react";
import type { Locale } from "@/lib/i18n/routing";
import { getWinners } from "@/lib/queries";
import { WinnersMarquee } from "./WinnersMarquee";

export async function WinnersStrip({ locale }: { locale: Locale }) {
  const [winners, t] = await Promise.all([
    getWinners(),
    getTranslations({ locale, namespace: "sections.footer" }),
  ]);

  if (winners.length === 0) return null;

  return (
    <section
      aria-label={t("winnersTitle")}
      className="relative border-y border-tuz-ink/8 bg-tuz-ivory py-4 md:py-6 overflow-hidden"
    >
      {/* Mobile: label above, marquee below */}
      <div className="md:hidden">
        <div className="inline-flex items-center gap-1.5 px-5 mb-2">
          <Trophy className="size-3.5 text-tuz-red" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-widest text-tuz-red">
            {t("winnersTitle")}
          </span>
        </div>
        <WinnersMarquee winners={winners} direction="leftToRight" />
      </div>

      {/* Desktop: label on left, marquee on right */}
      <div className="hidden md:flex items-center">
        <div className="shrink-0 inline-flex items-center gap-2 pl-8 pr-6 py-1.5 border-r border-tuz-ink/10">
          <Trophy className="size-4 text-tuz-red" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-widest text-tuz-red">
            {t("winnersTitle")}
          </span>
        </div>
        <div className="flex-1 min-w-0 py-1">
          <WinnersMarquee winners={winners} direction="leftToRight" />
        </div>
      </div>
    </section>
  );
}
