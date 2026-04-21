"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { isOpenNow } from "@/lib/hours";

type HoursTableProps = {
  weekday: string | null | undefined;
  weekend: string | null | undefined;
  regularClosure: string | null | undefined;
};

export function HoursTable({ weekday, weekend, regularClosure }: HoursTableProps) {
  const t = useTranslations("sections.store");
  const heroT = useTranslations("sections.hero");
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const compute = () =>
      setOpen(isOpenNow({ weekdayRange: weekday, weekendRange: weekend }));
    compute();
    const id = window.setInterval(compute, 60_000);
    return () => window.clearInterval(id);
  }, [weekday, weekend]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "inline-block size-2.5 rounded-full",
            open ? "bg-tuz-green animate-pulse" : "bg-tuz-ink/30",
          )}
        />
        <span
          className="font-body text-tuz-ink text-lg"
          aria-live="polite"
        >
          {open === null ? "..." : open ? heroT("statusOpen") : heroT("statusClosed")}
        </span>
      </div>

      <table className="w-full text-left font-body">
        <tbody>
          <Row label={t("weekday")} value={weekday ?? "—"} />
          <Row label={t("weekend")} value={weekend ?? "—"} />
          <Row label={t("regularClosure")} value={regularClosure ?? "—"} />
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t border-tuz-ink/8">
      <th
        scope="row"
        className="py-4 pr-6 font-body font-normal text-sm text-tuz-ink-3 uppercase tracking-widest align-top w-[40%] whitespace-nowrap"
      >
        {label}
      </th>
      <td className="py-4 font-body text-xl md:text-2xl text-tuz-ink">
        {value}
      </td>
    </tr>
  );
}
