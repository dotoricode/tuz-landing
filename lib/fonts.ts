import localFont from "next/font/local";
import { Fraunces } from "next/font/google";

/**
 * Puradak Gentle Gothic — Korean display face.
 * Used for hero wordmark and section titles only.
 * License: permits commercial use (confirmed 2026-04-21).
 *
 * `adjustFontFallback: false` stops Next from injecting a metric-adjusted
 * synthetic fallback that made the hero appear as a serif during load.
 */
export const puradak = localFont({
  src: [
    {
      path: "../public/fonts/PuradakGentleGothic.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-puradak",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
});

/**
 * Fraunces — editorial italic accents (Today's Pick quote, About story, &).
 * Kept to italic 400 only to stay inside the font budget.
 */
export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic", "normal"],
  variable: "--font-fraunces",
  display: "swap",
});

/**
 * Pretendard Variable — body type.
 * Loaded as CSS import (`app/(frontend)/styles/fonts-pretendard.css`) from the
 * npm package `pretendard`. next/font/google does NOT host Pretendard.
 * CSS variable wiring happens directly in globals.css.
 */

export const fontClassNames = [puradak.variable, fraunces.variable].join(" ");
