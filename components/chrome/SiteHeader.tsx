"use client";

import { useEffect, useState } from "react";
import { Menu, X, Phone, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { cn } from "@/lib/utils";

const NAV_IDS = ["notice", "pick", "visit", "faq", "gallery", "hours"] as const;

type SiteHeaderProps = {
  phone?: string | null;
  address?: string | null;
};

export function SiteHeader({ phone, address }: SiteHeaderProps) {
  const t = useTranslations("nav");
  const brandT = useTranslations("brand");
  const [scrolled, setScrolled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  const close = () => setSheetOpen(false);
  const telHref = phone ? `tel:${phone.replace(/\s+/g, "")}` : null;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "bg-tuz-paper/90 border-b border-tuz-ink/10 backdrop-blur supports-[backdrop-filter]:bg-tuz-paper/70"
          : "bg-transparent border-b border-transparent",
      )}
      style={{ "--header-offset": "72px" } as React.CSSProperties}
    >
      <div className="container mx-auto max-w-7xl px-5 md:px-8 h-[72px] flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-3xl md:text-4xl text-tuz-ink leading-none tracking-tight hover:text-tuz-red-deep transition-colors"
          aria-label={brandT("name")}
        >
          {brandT("name")}
        </Link>

        <nav aria-label="Primary" className="hidden lg:flex items-center gap-0.5">
          {NAV_IDS.map((id) => (
            <a
              key={id}
              href={`/#${id}`}
              className="font-body text-sm text-tuz-ink-2 hover:text-tuz-red-deep transition-colors duration-[var(--duration-fast)] px-2.5 py-2 rounded whitespace-nowrap"
            >
              {t(id)}
            </a>
          ))}
        </nav>

        <div className="hidden lg:block">
          <LocaleSwitcher />
        </div>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={t("openMenu")}
          className="lg:hidden inline-flex items-center gap-2 h-11 px-3 rounded-md text-tuz-ink hover:bg-tuz-ivory"
        >
          <Menu className="size-5" aria-hidden />
          <span className="font-body text-base">{t("menu")}</span>
        </button>
      </div>

      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("openMenu")}
          className="fixed inset-0 z-50 bg-tuz-paper lg:hidden overflow-y-auto"
        >
          <div className="container mx-auto max-w-7xl px-5 h-[72px] flex items-center justify-between">
            <span className="font-display text-3xl text-tuz-ink">
              {brandT("name")}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label={t("closeMenu")}
              className="inline-flex items-center justify-center size-11 rounded-md hover:bg-tuz-ivory"
            >
              <X className="size-5" />
            </button>
          </div>

          {(telHref || address) && (
            <div className="container mx-auto max-w-7xl px-5 pb-4">
              <div className="rounded-lg border border-tuz-ink/10 bg-tuz-ivory p-5 flex flex-col gap-3">
                {telHref && (
                  <a
                    href={telHref}
                    onClick={close}
                    className="inline-flex items-center gap-3 font-body text-xl text-tuz-ink active:text-tuz-red-deep"
                  >
                    <Phone className="size-5 text-tuz-red" aria-hidden />
                    <span className="font-semibold">{phone}</span>
                  </a>
                )}
                {address && (
                  <p className="inline-flex items-start gap-3 font-body text-base text-tuz-ink-2 leading-relaxed">
                    <MapPin
                      className="size-5 mt-0.5 text-tuz-red shrink-0"
                      aria-hidden
                    />
                    <span>{address}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          <nav
            aria-label="Primary mobile"
            className="container mx-auto max-w-7xl px-5 pt-2 pb-12 flex flex-col gap-1"
          >
            {NAV_IDS.map((id) => (
              <a
                key={id}
                href={`/#${id}`}
                onClick={close}
                className="font-body text-3xl text-tuz-ink py-4 border-b border-tuz-ink/5 hover:text-tuz-red-deep"
              >
                {t(id)}
              </a>
            ))}
            <div className="mt-8">
              <LocaleSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
