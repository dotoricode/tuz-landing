import localFont from "next/font/local";
import { Fraunces } from "next/font/google";

/**
 * Puradak Gentle Gothic — Korean display face.
 * Used for hero wordmark and section titles only.
 * License: permits commercial use (confirmed 2026-04-21).
 *
 * `adjustFontFallback: false` prevents Next from injecting a metric-adjusted
 * synthetic fallback that made the hero appear as a serif during load.
 */
export const puradak = localFont({
  src: [
    {
      path: "../public/fonts/PuradakGentleGothic.otf",
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
 * Pretendard Variable — body + UI type.
 * Loaded from local woff2 via next/font/local (self-hosted, no CDN dependency).
 * weight "45 920" covers the full variable axis range.
 */
export const pretendard = localFont({
  src: [
    {
      path: "../fonts/Pretendard-1.3.9/web/variable/woff2/PretendardVariable.woff2",
      weight: "45 920",
      style: "normal",
    },
  ],
  variable: "--font-pretendard",
  display: "swap",
  preload: true,
});

/**
 * Fraunces — editorial italic accents (Today's Pick quote, About story).
 * Kept to italic 400 only to stay inside the font budget.
 */
export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic", "normal"],
  variable: "--font-fraunces",
  display: "swap",
});

export const fontClassNames = [
  puradak.variable,
  pretendard.variable,
  fraunces.variable,
].join(" ");
