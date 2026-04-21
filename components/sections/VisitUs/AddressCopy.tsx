"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useTranslations } from "next-intl";

export function AddressCopy({ address }: { address: string }) {
  const t = useTranslations("sections.visit");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      const el = document.createElement("textarea");
      el.value = address;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-md border border-tuz-ink/15 font-body text-base text-tuz-ink-2 hover:text-tuz-red-deep hover:border-tuz-red-deep transition-colors"
    >
      {copied ? (
        <>
          <Check className="size-5 text-tuz-green" aria-hidden /> {t("copied")}
        </>
      ) : (
        <>
          <Copy className="size-5" aria-hidden /> {t("copyAddress")}
        </>
      )}
    </button>
  );
}
