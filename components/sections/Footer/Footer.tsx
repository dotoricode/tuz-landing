import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Phone } from "lucide-react";
import type { Locale } from "@/lib/i18n/routing";
import { getSettings, getLocation, getStoreHours } from "@/lib/queries";
import { LocaleSwitcher } from "@/components/chrome/LocaleSwitcher";

export async function Footer({ locale }: { locale: Locale }) {
  const [settings, location, hours, t, storeT, brandT] = await Promise.all([
    getSettings(locale),
    getLocation(locale),
    getStoreHours(locale),
    getTranslations({ locale, namespace: "sections.footer" }),
    getTranslations({ locale, namespace: "sections.store" }),
    getTranslations({ locale, namespace: "brand" }),
  ]);

  const instagramUrl = settings.social?.instagram
    ? `https://instagram.com/${settings.social.instagram.replace(/^@/, "")}`
    : null;
  const youtubeUrl = settings.social?.youtube
    ? `https://youtube.com/@${settings.social.youtube.replace(/^@/, "")}`
    : null;

  const telHref = location.phone ? `tel:${location.phone.replace(/\s+/g, "")}` : null;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 md:mt-32 bg-tuz-paper border-t border-tuz-ink/8">
      <div className="container mx-auto max-w-7xl px-5 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10">
          <div>
            <p className="font-display text-5xl md:text-6xl leading-none text-tuz-ink">
              Tuz
            </p>
            <p className="mt-3 font-mono text-xs uppercase tracking-widest text-tuz-ink-3">
              {brandT("since")}
            </p>

            {telHref && location.phone && (
              <div className="mt-6">
                <p className="eyebrow text-tuz-ink-3 mb-3">{t("phone")}</p>
                <a
                  href={telHref}
                  className="inline-flex items-center gap-2 font-body text-xl md:text-2xl font-semibold text-tuz-ink hover:text-tuz-red-deep"
                >
                  <Phone className="size-5 text-tuz-red" aria-hidden />
                  <span>{location.phone}</span>
                </a>
              </div>
            )}
          </div>

          <div>
            <p className="eyebrow text-tuz-ink-3 mb-4">{t("followUs")}</p>
            <ul className="flex flex-col gap-3">
              {instagramUrl && (
                <li>
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 font-body text-base text-tuz-ink-2 hover:text-tuz-red-deep"
                  >
                    <span>{t("instagramLabel")}</span>
                    <span className="text-tuz-ink-3 group-hover:text-tuz-red-deep">
                      {settings.social?.instagram}
                    </span>
                    <ArrowUpRight className="size-4 opacity-60 group-hover:opacity-100" aria-hidden />
                  </a>
                </li>
              )}
              {youtubeUrl && (
                <li>
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 font-body text-base text-tuz-ink-2 hover:text-tuz-red-deep"
                  >
                    <span>{t("youtubeLabel")}</span>
                    <span className="text-tuz-ink-3 group-hover:text-tuz-red-deep">
                      {settings.social?.youtube}
                    </span>
                    <ArrowUpRight className="size-4 opacity-60 group-hover:opacity-100" aria-hidden />
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <p className="eyebrow text-tuz-ink-3 mb-4">{t("address")}</p>
            <p className="font-body text-base text-tuz-ink-2 leading-relaxed max-w-[22ch]">
              {location.address}
            </p>
          </div>

          <div
            id="hours"
            className="scroll-mt-[var(--header-offset,72px)]"
          >
            <p className="eyebrow text-tuz-ink-3 mb-4">{storeT("title")}</p>
            <ul className="flex flex-col gap-2 font-body">
              <li>
                <span className="font-mono text-xs uppercase tracking-widest text-tuz-ink-3 mr-2">
                  {storeT("weekday")}
                </span>
                <span className="text-base text-tuz-ink-2 tabular-nums">
                  {hours.weekday ?? "—"}
                </span>
              </li>
              <li>
                <span className="font-mono text-xs uppercase tracking-widest text-tuz-ink-3 mr-2">
                  {storeT("weekend")}
                </span>
                <span className="text-base text-tuz-ink-2 tabular-nums">
                  {hours.weekend ?? "—"}
                </span>
              </li>
              {hours.regularClosure && (
                <li className="text-sm text-tuz-ink-3 mt-1">
                  {hours.regularClosure}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-tuz-ink/8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="font-mono text-xs text-tuz-ink-3">
            © {year} Tuz. {t("rights")}
          </p>
          <LocaleSwitcher variant="footer" />
        </div>
      </div>
    </footer>
  );
}
