"use client";

import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";
import { motionDuration, motionEase } from "@/lib/motion-tokens";

type FadeUpProps = PropsWithChildren<{
  className?: string;
  delay?: number;
  distance?: number;
  as?: "div" | "section" | "article" | "header" | "footer";
}>;

export function FadeUp({
  children,
  className,
  delay = 0,
  distance = 24,
  as = "div",
}: FadeUpProps) {
  const reduce = useReducedMotion();
  const Cmp = motion[as];
  return (
    <Cmp
      className={cn(className)}
      initial={reduce ? false : { opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      transition={{
        duration: reduce ? 0 : motionDuration.base,
        ease: motionEase.out,
        delay,
      }}
    >
      {children}
    </Cmp>
  );
}
