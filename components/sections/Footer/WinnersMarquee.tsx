"use client";

import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import type { Winner } from "@/payload-types";

type WinnersMarqueeProps = {
  winners: Winner[];
};

export function WinnersMarquee({ winners }: WinnersMarqueeProps) {
  const reduce = useReducedMotion();

  const items = winners.map((w) => (
    <span key={w.id} className="inline-flex items-baseline gap-2 mx-6 whitespace-nowrap font-body">
      <span className="font-mono text-xs uppercase tracking-widest text-tuz-ink-3">{w.period}</span>
      <span className="text-tuz-ink">{w.nick}</span>
    </span>
  ));

  if (reduce || winners.length === 0) {
    return (
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-5">
        {items}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 20, ease: "linear", repeat: Infinity }}
      >
        {items}
        {items}
      </motion.div>
    </div>
  );
}
