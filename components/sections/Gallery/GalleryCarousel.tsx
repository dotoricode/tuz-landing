"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Lightbox } from "./Lightbox";
import type { Gallery, Media } from "@/payload-types";

type GalleryCarouselProps = {
  items: Gallery[];
  className?: string;
};

export function GalleryCarousel({ items, className }: GalleryCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    dragFree: true,
    align: "start",
  });
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  useEffect(() => {
    if (!emblaApi) return;
    setCount(emblaApi.scrollSnapList().length);
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (items.length === 0) return null;

  return (
    <>
      <div className={cn("relative", className)}>
        <div ref={emblaRef} className="overflow-hidden -mx-5 px-5">
          <div className="flex gap-3">
            {items.map((g, i) => {
              const photo = typeof g.image === "object" ? (g.image as Media) : null;
              if (!photo?.url) return null;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="shrink-0 basis-[80%] relative aspect-[4/5] overflow-hidden rounded-lg bg-tuz-ivory group focus-visible:ring-2 focus-visible:ring-tuz-red focus-visible:ring-offset-2"
                  aria-label={g.altText ?? `Gallery image ${i + 1}`}
                >
                  <Image
                    src={photo.url}
                    alt={g.altText ?? ""}
                    fill
                    sizes="90vw"
                    className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.02]"
                  />
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: count }).map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={cn(
                  "h-1 rounded-full transition-all",
                  i === selected ? "w-6 bg-tuz-red" : "w-2 bg-tuz-ink/20",
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous"
              className="inline-flex size-10 items-center justify-center rounded-full border border-tuz-ink/15 hover:bg-tuz-ivory transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="inline-flex size-10 items-center justify-center rounded-full border border-tuz-ink/15 hover:bg-tuz-ivory transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <Lightbox items={items} index={lightboxIndex} onClose={closeLightbox} onNav={setLightboxIndex} />
    </>
  );
}
