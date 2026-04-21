"use client";

import { Phone, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

type MobileStickyCTAProps = {
  phone: string | null | undefined;
  mapHref: string | null | undefined;
};

export function MobileStickyCTA({ phone, mapHref }: MobileStickyCTAProps) {
  const t = useTranslations("mobileCta");

  if (!phone && !mapHref) return null;

  return (
    <div
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-tuz-ink/10 bg-tuz-paper/95 backdrop-blur supports-[backdrop-filter]:bg-tuz-paper/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex">
        {phone && (
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[56px] px-3 font-body text-base font-semibold text-tuz-paper bg-tuz-red-deep active:bg-tuz-red whitespace-nowrap"
            aria-label={`${t("call")} ${phone}`}
          >
            <Phone className="size-5 shrink-0" aria-hidden />
            <span>{t("call")}</span>
          </a>
        )}
        {mapHref && (
          <a
            href={mapHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[56px] px-3 font-body text-base font-semibold text-tuz-ink border-l border-tuz-ink/10 bg-tuz-paper active:bg-tuz-ivory whitespace-nowrap"
          >
            <MapPin className="size-5 shrink-0" aria-hidden />
            <span>{t("directions")}</span>
          </a>
        )}
      </div>
    </div>
  );
}
