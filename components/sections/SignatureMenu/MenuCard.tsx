import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { MenuItem, Media } from "@/payload-types";

type MenuCardProps = {
  item: MenuItem;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const tagClassMap = {
  NEW: "chipRed",
  BEST: "chipInk",
  SEASONAL: "chipFilledRed",
} as const;

export function MenuCard({ item, size = "md", className }: MenuCardProps) {
  const photo = typeof item.photo === "object" ? (item.photo as Media) : null;
  const src = photo?.url;
  const alt = photo?.alt ?? item.name ?? "";
  const tagKey =
    item.tag && item.tag in tagClassMap
      ? (item.tag as keyof typeof tagClassMap)
      : null;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg bg-tuz-ivory/40 transition-all duration-[var(--duration-base)] [transition-timing-function:var(--ease-tuz-out)] hover:bg-tuz-ivory hover:shadow-[var(--shadow-tuz-card)]",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden bg-tuz-ink/5",
          size === "lg" ? "aspect-[4/5]" : "aspect-[4/5]",
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
            className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-tuz-ink-3 font-editorial text-lg">
            {item.name?.slice(0, 8) ?? "menu"}
          </div>
        )}
        {tagKey && (
          <Badge
            variant={tagClassMap[tagKey]}
            className="absolute top-3 left-3"
          >
            {tagKey}
          </Badge>
        )}
      </div>
      <div className="p-4 md:p-5 flex flex-col gap-1">
        <h3
          className={cn(
            "font-display text-tuz-ink",
            size === "lg" ? "text-3xl" : "text-2xl",
          )}
        >
          {item.name}
        </h3>
        {item.description && (
          <p className="font-editorial text-tuz-ink-3 text-sm line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="mt-2 flex items-baseline justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-tuz-ink-3">
            {item.category?.replaceAll("_", " ")}
          </span>
          {item.price && (
            <span className="font-body text-base text-tuz-ink">
              ₩{item.price}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
