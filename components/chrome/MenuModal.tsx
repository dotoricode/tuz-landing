"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { MenuItem } from "@/payload-types";

type MenuModalProps = {
  items: MenuItem[];
};

const CATEGORY_ORDER = [
  "COFFEE",
  "NON_COFFEE",
  "BAKERY",
  "DESSERT",
  "SEASONAL",
] as const;

export function MenuModal({ items }: MenuModalProps) {
  const t = useTranslations("sections.menuList");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const checkHash = () => {
      if (typeof window === "undefined") return;
      if (window.location.hash === "#menu") setOpen(true);
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    if (typeof window !== "undefined" && window.location.hash === "#menu") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  if (items.length === 0) return null;

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent p-0 max-w-none max-h-none w-full h-full m-0 backdrop:bg-tuz-ink/70 backdrop:backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-6">
        <div className="relative w-full md:max-w-3xl max-h-[90vh] md:max-h-[85vh] bg-tuz-paper rounded-t-2xl md:rounded-2xl shadow-[var(--shadow-tuz-hover)] overflow-hidden flex flex-col">
          <div className="flex items-start justify-between gap-4 px-5 md:px-8 pt-5 md:pt-7 pb-4 border-b border-tuz-ink/8">
            <div>
              <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
              <h2 className="mt-2 font-body text-2xl md:text-3xl text-tuz-ink">
                {t("title")}
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="inline-flex size-10 items-center justify-center rounded-full text-tuz-ink-3 hover:bg-tuz-ivory hover:text-tuz-ink"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-5 md:px-8 py-6 md:py-8 flex flex-col gap-8">
            {byCategory.map(({ category, items: catItems }) => (
              <div key={category}>
                <h3 className="font-mono text-sm uppercase tracking-[0.18em] text-tuz-ink-3 mb-3 pb-2 border-b border-tuz-ink/10">
                  {t(`categories.${category}`)}
                </h3>
                <ul className="divide-y divide-tuz-ink/8">
                  {catItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-baseline gap-3 py-3"
                    >
                      <div className="flex flex-col gap-0.5 shrink-0 min-w-0">
                        <span className="font-body text-base md:text-lg text-tuz-ink leading-snug">
                          {item.name}
                        </span>
                        {item.nameEn && (
                          <span className="font-body text-xs text-tuz-ink-3 leading-tight">
                            {item.nameEn}
                          </span>
                        )}
                      </div>
                      <span
                        aria-hidden
                        className="flex-1 border-b border-dotted border-tuz-ink/30 mb-1"
                      />
                      <div className="shrink-0 inline-flex items-baseline gap-2">
                        {item.price && (
                          <span className="font-body text-base md:text-lg font-semibold text-tuz-ink-2 tabular-nums">
                            {item.price}
                          </span>
                        )}
                        {item.tag === "NEW" && (
                          <Badge variant="chipFilledRed" className="self-center">
                            NEW
                          </Badge>
                        )}
                        {item.tag === "BEST" && (
                          <Badge variant="chipInk" className="self-center">
                            BEST
                          </Badge>
                        )}
                        {item.tag === "SEASONAL" && (
                          <Badge variant="chipRed" className="self-center">
                            SEASONAL
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
}
