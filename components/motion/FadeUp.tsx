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
  eager?: boolean;
}>;

export function FadeUp({
  children,
  className,
  delay = 0,
  distance = 12,
  as = "div",
  eager = false,
}: FadeUpProps) {
  const reduce = useReducedMotion();
  const Cmp = motion[as];
  const initial = reduce ? false : { opacity: 0, y: distance };
  const target = { opacity: 1, y: 0 };
  const transition = {
    duration: reduce ? 0 : motionDuration.base,
    ease: motionEase.out,
    delay,
  };

  if (eager) {
    return (
      <Cmp
        className={cn(className)}
        initial={initial}
        animate={target}
        transition={transition}
      >
        {children}
      </Cmp>
    );
  }

  return (
    <Cmp
      className={cn(className)}
      initial={initial}
      whileInView={target}
      viewport={{ once: false, amount: 0.3, margin: "50px 0px 50px 0px" }}
      transition={transition}
    >
      {children}
    </Cmp>
  );
}
