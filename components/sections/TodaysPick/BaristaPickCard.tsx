import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TodayPick, Media } from "@/payload-types";

type BaristaPickCardProps = {
  pick: TodayPick;
  baristaLabel: string;
  locale: "ko" | "en";
};

export function BaristaPickCard({
  pick,
  baristaLabel,
  locale,
}: BaristaPickCardProps) {
  const photo = typeof pick.photo === "object" ? (pick.photo as Media) : null;
  const src = photo?.url;
  const alt = photo?.alt ?? pick.name ?? "";
  const dateLabel = pick.date
    ? new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
        month: "long",
        day: "numeric",
      }).format(new Date(pick.date))
    : null;

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-5",
        "rounded-xl overflow-hidden",
      )}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-tuz-ivory">
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(min-width: 768px) 40vw, 90vw"
            className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-tuz-ink-3 font-body text-2xl">
            {pick.name}
          </div>
        )}
        <div className="absolute top-4 left-4">
          <Badge variant="chipFilledRed">{baristaLabel}</Badge>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {dateLabel && (
          <span className="font-mono text-xs uppercase tracking-widest text-tuz-ink-3">
            {dateLabel}
          </span>
        )}
        <h3 className="font-body text-3xl md:text-4xl text-tuz-ink leading-tight">
          {pick.name}
        </h3>
        {pick.note && (
          <p className="font-body italic text-lg md:text-xl text-tuz-ink-2 leading-snug mt-1">
            &ldquo;{pick.note}&rdquo;
          </p>
        )}
        {pick.price && (
          <span className="mt-3 font-body text-base text-tuz-ink">
            ₩{pick.price}
          </span>
        )}
      </div>
    </article>
  );
}
