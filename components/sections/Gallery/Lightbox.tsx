"use client";

import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";
import * as motion from "motion/react-client";
import { AnimatePresence } from "motion/react";
import type { Gallery, Media } from "@/payload-types";

type LightboxProps = {
  items: Gallery[];
  index: number | null;
  onClose: () => void;
  onNav: (index: number) => void;
};

export function Lightbox({ items, index, onClose, onNav }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpen = index !== null;
  const item = index !== null ? items[index] : null;
  const photo = item && typeof item.image === "object" ? (item.image as Media) : null;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const prev = useCallback(() => {
    if (index === null) return;
    onNav((index - 1 + items.length) % items.length);
  }, [index, items.length, onNav]);

  const next = useCallback(() => {
    if (index === null) return;
    onNav((index + 1) % items.length);
  }, [index, items.length, onNav]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, prev, next]);

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent p-0 max-w-none max-h-none w-full h-full m-0 backdrop:bg-tuz-ink/85 backdrop:backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <AnimatePresence>
        {isOpen && photo?.url && (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 flex items-center justify-center p-4 md:p-10"
          >
            <div className="relative max-w-5xl w-full">
              <Image
                src={photo.url}
                alt={item?.altText ?? ""}
                width={photo.width ?? 1200}
                height={photo.height ?? 900}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
                priority
              />
              {item?.caption && (
                <p className="mt-3 text-center font-editorial text-tuz-ivory/80 text-sm">
                  {typeof item.caption === "string" ? item.caption : ""}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close gallery"
        className="fixed top-4 right-4 inline-flex size-10 items-center justify-center rounded-full bg-tuz-paper/10 text-tuz-paper hover:bg-tuz-paper/20 transition-colors"
      >
        <X className="size-5" />
      </button>
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous image"
            className="fixed left-4 top-1/2 -translate-y-1/2 inline-flex size-11 items-center justify-center rounded-full bg-tuz-paper/10 text-tuz-paper hover:bg-tuz-paper/20 transition-colors"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next image"
            className="fixed right-4 top-1/2 -translate-y-1/2 inline-flex size-11 items-center justify-center rounded-full bg-tuz-paper/10 text-tuz-paper hover:bg-tuz-paper/20 transition-colors"
          >
            <ChevronRight className="size-5" />
          </button>
          <p className="fixed bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs text-tuz-paper/60">
            {index !== null ? index + 1 : "—"} / {items.length}
          </p>
        </>
      )}
    </dialog>
  );
}
