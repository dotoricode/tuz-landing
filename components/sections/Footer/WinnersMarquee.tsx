"use client";

import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import type { Winner } from "@/payload-types";

type WinnersMarqueeProps = {
  winners: Winner[];
  direction?: "leftToRight" | "rightToLeft";
};

export function WinnersMarquee({
  winners,
  direction = "leftToRight",
}: WinnersMarqueeProps) {
  const reduce = useReducedMotion();

  const items = winners.map((w) => (
    <span
      key={w.id}
      className="inline-flex items-baseline gap-3 mx-8 whitespace-nowrap font-body"
    >
      <span className="font-mono text-xs uppercase tracking-widest text-tuz-ink-3">
        {w.period}
      </span>
      <span className="text-base md:text-lg text-tuz-ink">{w.nick}</span>
    </span>
  ));

  if (reduce || winners.length === 0) {
    return (
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 px-5">
        {items}
      </div>
    );
  }

  // Single copy, animates fully across viewport with a gap between loops —
  // duplicate names never appear simultaneously.
  const xFrames =
    direction === "leftToRight" ? ["-100%", "100vw"] : ["100vw", "-100%"];

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="flex w-max"
        initial={{ x: xFrames[0] }}
        animate={{ x: xFrames[1] }}
        transition={{
          duration: 22,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        }}
      >
        {items}
      </motion.div>
    </div>
  );
}
