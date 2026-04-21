"use client";

import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { motionDuration, motionEase } from "@/lib/motion-tokens";

type TextRevealProps = {
  text: string;
  className?: string;
  delay?: number;
};

/**
 * Editorial text reveal via clip-path inset.
 * Respects reduced-motion — falls back to plain text.
 */
export function TextReveal({ text, className, delay = 0 }: TextRevealProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <span className={className}>{text}</span>;
  }
  return (
    <motion.span
      className={cn("inline-block", className)}
      initial={{ clipPath: "inset(100% 0 0 0)" }}
      animate={{ clipPath: "inset(0 0 0 0)" }}
      transition={{ duration: motionDuration.slow, ease: motionEase.out, delay }}
    >
      {text}
    </motion.span>
  );
}
