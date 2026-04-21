"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MenuCard } from "./MenuCard";
import type { MenuItem } from "@/payload-types";

type MenuCarouselProps = {
  items: MenuItem[];
  className?: string;
};

export function MenuCarousel({ items, className }: MenuCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    containScroll: "trimSnaps",
    dragFree: false,
  });
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    setCount(emblaApi.scrollSnapList().length);
    setSelected(emblaApi.selectedScrollSnap());
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (items.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <div ref={emblaRef} className="overflow-hidden -mx-5 px-5">
        <div className="flex gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="shrink-0 basis-[80%] sm:basis-[55%]"
            >
              <MenuCard item={item} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={cn(
                "h-1 rounded-full transition-all duration-[var(--duration-fast)]",
                i === selected ? "w-6 bg-tuz-red" : "w-2 bg-tuz-ink/20",
              )}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={scrollPrev}
            aria-label="Previous"
            className="inline-flex size-10 items-center justify-center rounded-full border border-tuz-ink/15 text-tuz-ink hover:bg-tuz-ivory"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            aria-label="Next"
            className="inline-flex size-10 items-center justify-center rounded-full border border-tuz-ink/15 text-tuz-ink hover:bg-tuz-ivory"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
