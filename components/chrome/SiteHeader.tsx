"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { cn } from "@/lib/utils";

const NAV_IDS = ["menu", "pick", "notice", "gallery", "visit", "store"] as const;

export function SiteHeader() {
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

        <nav aria-label="Primary" className="hidden md:flex items-center gap-7">
          {NAV_IDS.map((id) => (
            <a
              key={id}
              href={`/#${id}`}
              className="font-body text-sm text-tuz-ink-2 hover:text-tuz-red-deep transition-colors duration-[var(--duration-fast)]"
            >
              {t(id)}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <LocaleSwitcher />
        </div>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={t("openMenu")}
          className="md:hidden inline-flex items-center justify-center size-11 rounded-md text-tuz-ink hover:bg-tuz-ivory"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("openMenu")}
          className="fixed inset-0 z-50 bg-tuz-paper md:hidden"
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
          <nav
            aria-label="Primary mobile"
            className="container mx-auto max-w-7xl px-5 pt-6 flex flex-col gap-1"
          >
            {NAV_IDS.map((id) => (
              <a
                key={id}
                href={`/#${id}`}
                onClick={close}
                className="font-display text-4xl text-tuz-ink py-3 border-b border-tuz-ink/5 hover:text-tuz-red-deep"
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
