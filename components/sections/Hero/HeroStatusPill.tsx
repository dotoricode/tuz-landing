"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { isOpenNow } from "@/lib/hours";

type HeroStatusPillProps = {
  weekday: string | null | undefined;
  weekend: string | null | undefined;
  className?: string;
};

export function HeroStatusPill({ weekday, weekend, className }: HeroStatusPillProps) {
  const t = useTranslations("sections.hero");
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const compute = () => setOpen(isOpenNow({ weekdayRange: weekday, weekendRange: weekend }));
    compute();
    const id = window.setInterval(compute, 60_000);
    return () => window.clearInterval(id);
  }, [weekday, weekend]);

  // Server render: render neutrally to avoid hydration mismatch
  if (open === null) {
    return (
      <span className={cn("inline-flex items-center gap-2 text-xs text-tuz-ink-3 font-body", className)}>
        <span aria-hidden className="inline-block size-1.5 rounded-full bg-tuz-ink/30" />
        {weekday ? `${weekday}` : ""}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-body",
        open ? "text-tuz-ink" : "text-tuz-ink-3",
        className,
      )}
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-1.5 rounded-full",
          open ? "bg-tuz-green animate-pulse" : "bg-tuz-ink/30",
        )}
      />
      {open ? t("statusOpen") : t("statusClosed")}
    </span>
  );
}
