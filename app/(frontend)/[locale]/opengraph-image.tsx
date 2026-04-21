import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { routing } from "@/lib/i18n/routing";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const taglines: Record<string, string> = {
  ko: "Have a Tuz day!",
  en: "Have a Tuz day!",
};

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const fontPath = path.join(process.cwd(), "public", "fonts", "PuradakGentleGothic.otf");
  const fontData = await readFile(fontPath);

  const tagline = taglines[locale] ?? taglines.ko;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "#ffffff",
          padding: "72px 80px",
          fontFamily: "Puradak",
        }}
      >
        {/* Top: wordmark */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <span
            style={{
              fontSize: 160,
              fontFamily: "Puradak",
              color: "#1a1612",
              lineHeight: 0.9,
              letterSpacing: "-0.02em",
            }}
          >
            Tuz
          </span>
          <span
            style={{
              fontSize: 36,
              fontFamily: "Puradak",
              color: "#6b625b",
              letterSpacing: "0.01em",
            }}
          >
            {tagline}
          </span>
        </div>

        {/* Bottom: since + url */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 20,
              color: "#6b625b",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Since 2026 · Ulsan
          </span>
          <span
            style={{
              fontSize: 20,
              color: "#a52a1a",
              letterSpacing: "0.05em",
            }}
          >
            tuz.kr
          </span>
        </div>

        {/* Accent rule */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 6,
            background: "#a52a1a",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Puradak",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
