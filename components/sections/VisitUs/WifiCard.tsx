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
        "relative overflow-hidden rounded-xl bg-tuz-red text-tuz-paper p-4",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.1] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div className="relative flex flex-col gap-2">
        <div className="flex items-center gap-1.5 opacity-90">
          <Wifi className="size-3.5" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-widest">
            {t("wifiTitle")}
          </span>
        </div>
        <p className="font-body text-xl font-semibold leading-tight truncate">
          {ssid ?? "—"}
        </p>
        {password && (
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="font-mono text-xs opacity-85 truncate">
              {password}
            </span>
            <button
              type="button"
              onClick={copy}
              aria-label={t("copyPassword")}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full border border-tuz-paper/40 h-8 px-3",
                "font-body text-xs font-semibold transition-colors",
                "hover:bg-tuz-paper hover:text-tuz-red",
              )}
            >
              {copied ? (
                <>
                  <Check className="size-3.5" aria-hidden />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden />
                  {t("copyPassword")}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
