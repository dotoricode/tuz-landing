import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TodayPick, Media } from "@/payload-types";

type BaristaPickCardProps = {
  pick: TodayPick;
  baristaLabel: string;
  locale: "ko" | "en";
  labelVariant?: "filled" | "outline";
};

export function BaristaPickCard({
  pick,
  baristaLabel,
  locale,
  labelVariant = "filled",
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
        "group relative flex flex-col gap-4 md:gap-5",
        "rounded-xl overflow-hidden",
      )}
    >
      {src ? (
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-tuz-ivory">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(min-width: 768px) 40vw, 90vw"
            className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.02]"
          />
          <div className="absolute top-4 left-4">
            <Badge
              variant={labelVariant === "outline" ? "chipOutlineInk" : "chipFilledRed"}
              className="text-xs px-3 py-1"
            >
              {baristaLabel}
            </Badge>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-lg p-6 md:p-8 flex flex-col gap-3 min-h-[200px] md:min-h-[280px] justify-end",
            labelVariant === "outline"
              ? "bg-tuz-ivory border border-tuz-ink/10"
              : "bg-tuz-red text-tuz-paper",
          )}
        >
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 opacity-[0.08]",
              labelVariant === "filled" && "mix-blend-multiply",
            )}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            }}
          />
          <div className="relative">
            <Badge
              variant={labelVariant === "outline" ? "chipOutlineInk" : "chipFilledRed"}
              className={cn(
                "text-xs px-3 py-1",
                labelVariant === "filled" && "bg-tuz-paper text-tuz-red",
              )}
            >
              {baristaLabel}
            </Badge>
          </div>
          <p
            className={cn(
              "relative font-body text-3xl md:text-4xl leading-tight font-semibold",
              labelVariant === "outline" ? "text-tuz-ink" : "text-tuz-paper",
            )}
          >
            {pick.name}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {dateLabel && (
          <span className="font-mono text-xs uppercase tracking-widest text-tuz-ink-3">
            {dateLabel}
          </span>
        )}
        <h3 className="font-body text-2xl md:text-3xl text-tuz-ink leading-tight">
          {pick.name}
        </h3>
        {pick.note && (
          <p className="font-body italic text-base md:text-lg text-tuz-ink-2 leading-snug mt-1">
            &ldquo;{pick.note}&rdquo;
          </p>
        )}
        {pick.price && (
          <span className="mt-2 font-body text-base md:text-lg text-tuz-ink">
            ₩{pick.price}
          </span>
        )}
      </div>
    </article>
  );
}
