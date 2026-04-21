"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";

type AboutBubbleProps = {
  paragraphs: string[];
  signatureName?: string | null;
};

export function AboutBubble({ paragraphs, signatureName }: AboutBubbleProps) {
  const t = useTranslations("sections.about");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

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
      setOpen(false);
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  if (paragraphs.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("title")}
        className="group relative inline-flex items-center gap-2.5 min-h-[44px] pl-3 pr-4 rounded-full bg-tuz-paper border border-tuz-ink/15 shadow-[var(--shadow-tuz-card)] hover:border-tuz-red/40 hover:-translate-y-0.5 transition-all duration-[var(--duration-base)]"
      >
        <span
          aria-hidden
          className="inline-flex size-8 items-center justify-center rounded-full bg-tuz-red text-tuz-paper"
        >
          <MessageCircle className="size-4" />
        </span>
        <span className="flex flex-col items-start leading-none">
          <span className="font-mono text-[10px] uppercase tracking-widest text-tuz-ink-3">
            {t("eyebrow")}
          </span>
          <span className="font-body text-sm md:text-base font-semibold text-tuz-ink mt-0.5">
            {t("title")}
          </span>
        </span>
        <span
          aria-hidden
          className="absolute -bottom-1.5 left-6 size-3 rotate-45 bg-tuz-paper border-r border-b border-tuz-ink/15"
        />
      </button>

      <dialog
        ref={dialogRef}
        className="bg-transparent p-0 max-w-none max-h-none w-full h-full m-0 backdrop:bg-tuz-ink/70 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="fixed inset-0 flex items-end md:items-center justify-center p-4 md:p-10">
          <div className="relative max-w-xl w-full rounded-2xl bg-tuz-paper shadow-[var(--shadow-tuz-hover)] p-6 md:p-10">
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-full text-tuz-ink-3 hover:bg-tuz-ivory hover:text-tuz-ink"
            >
              <X className="size-5" aria-hidden />
            </button>
            <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
            <h2 className="mt-2 font-body text-2xl md:text-3xl text-tuz-ink leading-snug">
              {t("title")}
            </h2>
            <div className="mt-5 flex flex-col gap-4">
              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="font-body italic text-base md:text-lg text-tuz-ink-2 leading-relaxed"
                >
                  {p}
                </p>
              ))}
            </div>
            {signatureName && (
              <p className="mt-6 font-body text-tuz-ink-3">— {signatureName}</p>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
