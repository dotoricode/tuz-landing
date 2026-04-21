import { getTranslations } from "next-intl/server";
import Image from "next/image";
import type { Locale } from "@/lib/i18n/routing";
import { getGallery } from "@/lib/queries";
import { SectionAnchor } from "@/components/chrome/SectionAnchor";
import { FadeUp } from "@/components/motion/FadeUp";
import { GalleryCarousel } from "./GalleryCarousel";
import type { Media } from "@/payload-types";

export async function Gallery({ locale }: { locale: Locale }) {
  const [items, t] = await Promise.all([
    getGallery(locale),
    getTranslations({ locale, namespace: "sections.gallery" }),
  ]);

  if (items.length === 0) return null;

  return (
    <SectionAnchor id="gallery" aria-labelledby="gallery-heading">
      <div className="container mx-auto max-w-7xl px-5 md:px-8">
        <FadeUp className="mb-10 md:mb-16 max-w-2xl">
          <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
          <h2
            id="gallery-heading"
            className="mt-4 font-display text-display-lg text-tuz-ink"
          >
            {t("title")}
          </h2>
        </FadeUp>

        {/* Desktop: CSS columns masonry */}
        <div className="hidden md:block">
          <div className="columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
            {items.map((g) => {
              const photo =
                typeof g.image === "object" ? (g.image as Media) : null;
              if (!photo?.url) return null;
              return (
                <div
                  key={g.id}
                  className="relative mb-4 break-inside-avoid overflow-hidden rounded-lg bg-tuz-ivory"
                >
                  <Image
                    src={photo.url}
                    alt={g.altText ?? ""}
                    width={photo.width ?? 800}
                    height={photo.height ?? 1000}
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    className="w-full h-auto object-cover"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Embla */}
        <div className="md:hidden">
          <GalleryCarousel items={items} />
        </div>
      </div>
    </SectionAnchor>
  );
}
