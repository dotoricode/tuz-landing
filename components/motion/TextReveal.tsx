"use client";

import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { motionDuration, motionEase } from "@/lib/motion-tokens";

type TextRevealProps = {
  text: string;
  className?: string;
  delay?: number;
  /** "immediate" fires on mount (hero); "inView" fires on scroll (section titles). Default: "inView" */
  trigger?: "immediate" | "inView";
};

export function TextReveal({ text, className, delay = 0, trigger = "inView" }: TextRevealProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <span className={className}>{text}</span>;
  }

  const initial = { clipPath: "inset(100% 0 0 0)" };
  const revealed = { clipPath: "inset(0% 0 0 0)" };
  const transition = { duration: motionDuration.slow, ease: motionEase.out, delay };

  if (trigger === "immediate") {
    return (
      <motion.span
        className={cn("inline-block", className)}
        initial={initial}
        animate={revealed}
        transition={transition}
      >
        {text}
      </motion.span>
    );
  }

  return (
    <motion.span
      className={cn("inline-block", className)}
      initial={initial}
      whileInView={revealed}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={transition}
    >
      {text}
    </motion.span>
  );
}
