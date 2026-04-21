import type { Transition, Variants } from "motion/react";

export const motionDuration = {
  fast: 0.18,
  base: 0.34,
  slow: 0.6,
  cinematic: 0.9,
} as const;

export const motionEase = {
  out: [0.22, 1, 0.36, 1],
  gentle: [0.4, 0, 0.2, 1],
} as const;

export const springGentle: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
};

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDuration.base, ease: motionEase.out },
  },
};

export const reveal: Variants = {
  initial: { clipPath: "inset(100% 0 0 0)" },
  animate: {
    clipPath: "inset(0 0 0 0)",
    transition: { duration: motionDuration.slow, ease: motionEase.out },
  },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
