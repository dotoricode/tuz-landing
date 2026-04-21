import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getGallery } from "@/lib/queries";
import { SectionAnchor } from "@/components/chrome/SectionAnchor";
import { FadeUp } from "@/components/motion/FadeUp";
import { TextReveal } from "@/components/motion/TextReveal";
import { GalleryCarousel } from "./GalleryCarousel";
import { GalleryGrid } from "./GalleryGrid";

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
            className="mt-4 font-body text-display-lg text-tuz-ink"
          >
            <TextReveal text={t("title")} />
          </h2>
        </FadeUp>

        {/* Desktop: CSS columns masonry with lightbox */}
        <div className="hidden md:block">
          <GalleryGrid items={items} />
        </div>

        {/* Mobile: Embla */}
        <div className="md:hidden">
          <GalleryCarousel items={items} />
        </div>
      </div>
    </SectionAnchor>
  );
}
