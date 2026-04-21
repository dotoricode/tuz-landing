"use client";

import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type NoticeMarqueeProps = {
  label: string;
  text: string;
};

export function NoticeMarquee({ label, text }: NoticeMarqueeProps) {
  const reduce = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const segment = `${label}  ·  ${text}  ·  `;
  const loop = Array.from({ length: 6 }).map((_, i) => (
    <span key={i} className="mx-6 whitespace-nowrap">
      {segment}
    </span>
  ));

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden bg-tuz-red text-tuz-paper"
    >
      <div className="container mx-auto max-w-7xl px-5 md:px-8 flex items-center gap-4">
        <div className="flex-1 overflow-hidden py-3">
          {reduce ? (
            <span className="font-mono text-sm">{segment}</span>
          ) : (
            <motion.div
              className="flex whitespace-nowrap font-mono text-sm"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 28, ease: "linear", repeat: Infinity }}
            >
              {loop}
              {loop}
            </motion.div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss notice"
          className={cn(
            "inline-flex items-center justify-center size-8 rounded-full",
            "hover:bg-tuz-red-deep transition-colors",
          )}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
