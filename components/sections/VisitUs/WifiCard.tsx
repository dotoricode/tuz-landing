"use client";

import { useState } from "react";
import { Copy, Check, Wifi } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type WifiCardProps = {
  ssid: string | null | undefined;
  password: string | null | undefined;
  className?: string;
};

export function WifiCard({ ssid, password, className }: WifiCardProps) {
  const t = useTranslations("sections.visit");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      const el = document.createElement("textarea");
      el.value = password;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!ssid && !password) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-tuz-red text-tuz-paper p-6 md:p-7",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 opacity-80">
            <Wifi className="size-4" />
            <span className="eyebrow">{t("wifiTitle")}</span>
          </div>
          <p className="mt-3 font-body text-3xl md:text-4xl leading-none">
            {ssid ?? "—"}
          </p>
          {password && (
            <p className="mt-2 font-mono text-sm opacity-90">{password}</p>
          )}
        </div>
        {password && (
          <button
            type="button"
            onClick={copy}
            aria-label={t("copyPassword")}
            className={cn(
              "shrink-0 inline-flex items-center gap-2 rounded-full border border-tuz-paper/40 px-4 py-2",
              "font-body text-sm transition-colors duration-[var(--duration-fast)]",
              "hover:bg-tuz-paper hover:text-tuz-red",
            )}
          >
            {copied ? (
              <>
                <Check className="size-4" /> {t("copied")}
              </>
            ) : (
              <>
                <Copy className="size-4" /> {t("copyPassword")}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
