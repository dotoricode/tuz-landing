"use client";

import Image from "next/image";
import { useState, useCallback } from "react";
import { FadeUp } from "@/components/motion/FadeUp";
import { Lightbox } from "./Lightbox";
import type { Gallery, Media } from "@/payload-types";

type GalleryGridProps = {
  items: Gallery[];
};

export function GalleryGrid({ items }: GalleryGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const close = useCallback(() => setLightboxIndex(null), []);

  return (
    <>
      <div className="columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
        {items.map((g, i) => {
          const photo = typeof g.image === "object" ? (g.image as Media) : null;
          if (!photo?.url) return null;
          return (
            <FadeUp key={g.id} delay={0.04 * Math.min(i, 5)}>
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="relative mb-4 break-inside-avoid overflow-hidden rounded-lg bg-tuz-ivory w-full block group focus-visible:ring-2 focus-visible:ring-tuz-red focus-visible:ring-offset-2"
                aria-label={g.altText ?? `Gallery image ${i + 1}`}
              >
                <Image
                  src={photo.url}
                  alt={g.altText ?? ""}
                  width={photo.width ?? 800}
                  height={photo.height ?? 1000}
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  className="w-full h-auto object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]"
                />
                <span className="absolute inset-0 bg-tuz-ink/0 group-hover:bg-tuz-ink/10 transition-colors duration-[var(--duration-base)]" />
              </button>
            </FadeUp>
          );
        })}
      </div>
      <Lightbox items={items} index={lightboxIndex} onClose={close} onNav={setLightboxIndex} />
    </>
  );
}
