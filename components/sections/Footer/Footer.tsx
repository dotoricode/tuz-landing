import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/routing";
import { getSettings, getLocation, getStoreHours } from "@/lib/queries";
import { LocaleSwitcher } from "@/components/chrome/LocaleSwitcher";
import { WinnersStrip } from "./WinnersStrip";

export async function Footer({ locale }: { locale: Locale }) {
  const [settings, location, hours, t, brandT] = await Promise.all([
    getSettings(locale),
    getLocation(locale),
    getStoreHours(locale),
    getTranslations({ locale, namespace: "sections.footer" }),
    getTranslations({ locale, namespace: "brand" }),
  ]);

  const instagramUrl = settings.social?.instagram
    ? `https://instagram.com/${settings.social.instagram.replace(/^@/, "")}`
    : null;
  const youtubeUrl = settings.social?.youtube
    ? `https://youtube.com/@${settings.social.youtube.replace(/^@/, "")}`
    : null;

  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 md:mt-32 bg-tuz-paper">
      <WinnersStrip locale={locale} />

      <div className="container mx-auto max-w-7xl px-5 md:px-8 py-14 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 md:gap-12">
          <div>
            <p className="font-body text-5xl md:text-6xl leading-none text-tuz-ink">
              Tuz
            </p>
            <p className="mt-3 font-mono text-xs uppercase tracking-widest text-tuz-ink-3">
              {brandT("since")}
            </p>
          </div>

          <div>
            <p className="eyebrow text-tuz-ink-3 mb-4">{t("followUs")}</p>
            <ul className="flex flex-col gap-2">
              {instagramUrl && (
                <li>
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 font-body text-sm text-tuz-ink hover:text-tuz-red-deep"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-widest text-tuz-ink-3 group-hover:text-tuz-red-deep">IG</span>
                    {settings.social?.instagram}
                    <ArrowUpRight className="size-3.5 opacity-50 group-hover:opacity-100" />
                  </a>
                </li>
              )}
              {youtubeUrl && (
                <li>
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 font-body text-sm text-tuz-ink hover:text-tuz-red-deep"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-widest text-tuz-ink-3 group-hover:text-tuz-red-deep">YT</span>
                    {settings.social?.youtube}
                    <ArrowUpRight className="size-3.5 opacity-50 group-hover:opacity-100" />
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <p className="eyebrow text-tuz-ink-3 mb-4">{t("address")}</p>
            <p className="font-body text-sm text-tuz-ink leading-relaxed max-w-[20ch]">
              {location.address}
            </p>
          </div>

          <div>
            <p className="eyebrow text-tuz-ink-3 mb-4">{t("hours")}</p>
            <ul className="flex flex-col gap-1 font-body text-sm text-tuz-ink">
              <li>평일 {hours.weekday}</li>
              <li>주말 {hours.weekend}</li>
              {hours.regularClosure && (
                <li className="text-tuz-ink-3">{hours.regularClosure}</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-tuz-ink/8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="font-mono text-xs text-tuz-ink-3">
            © {year} Tuz. {t("rights")}
          </p>
          <LocaleSwitcher variant="footer" />
        </div>
      </div>
    </footer>
  );
}
