"use client";

import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { useLocale } from "next-intl";
import { routing } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  className?: string;
  variant?: "header" | "footer";
};

export function LocaleSwitcher({
  className,
  variant = "header",
}: LocaleSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className={cn(
        "inline-flex items-center gap-0 font-mono text-xs",
        variant === "footer" && "text-tuz-ink-3",
        className,
      )}
    >
      {routing.locales.map((loc, i) => {
        const active = loc === locale;
        return (
          <div key={loc} className="flex items-center">
            {i > 0 && (
              <span aria-hidden className="mx-2 text-tuz-ink/20">·</span>
            )}
            <button
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => router.replace(pathname, { locale: loc })}
              className={cn(
                "uppercase tracking-widest transition-colors duration-[var(--duration-fast)]",
                active
                  ? "text-tuz-red-deep font-semibold"
                  : "text-tuz-ink-3 hover:text-tuz-ink",
              )}
            >
              {loc === "ko" ? "KO" : "EN"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
