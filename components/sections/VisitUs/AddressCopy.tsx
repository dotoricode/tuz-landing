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
      className="inline-flex items-center gap-2 text-sm font-body text-tuz-ink-2 hover:text-tuz-red-deep"
    >
      {copied ? (
        <>
          <Check className="size-4" /> {t("copied")}
        </>
      ) : (
        <>
          <Copy className="size-4" /> {t("copyAddress")}
        </>
      )}
    </button>
  );
}
