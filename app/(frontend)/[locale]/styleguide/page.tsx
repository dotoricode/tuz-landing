import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-static";

const swatches: { name: string; className: string; hex: string }[] = [
  { name: "tuz-red", className: "bg-tuz-red", hex: "#a52a1a" },
  { name: "tuz-red-deep", className: "bg-tuz-red-deep", hex: "#7a1d10" },
  { name: "tuz-ink", className: "bg-tuz-ink", hex: "#1a1612" },
  { name: "tuz-ivory", className: "bg-tuz-ivory", hex: "#faf6ef" },
  { name: "tuz-green", className: "bg-tuz-green", hex: "#1f7a32" },
  { name: "tuz-paper", className: "bg-tuz-paper border border-tuz-ink/10", hex: "#ffffff" },
];

export default async function StyleguidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <main className="min-h-screen container mx-auto max-w-6xl px-5 md:px-8 py-16 space-y-20">
      <header className="space-y-3">
        <p className="eyebrow text-tuz-red">Styleguide · dev-only</p>
        <h1 className="font-display text-display-lg text-tuz-ink">
          Tuz design tokens
        </h1>
        <p className="font-editorial text-xl text-tuz-ink-2">
          deep red & white · editorial · mobile-first
        </p>
      </header>

      <Section title="Colors">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {swatches.map((s) => (
            <div key={s.name} className="flex items-center gap-4">
              <div
                className={`${s.className} size-14 rounded-md shadow-[var(--shadow-tuz-card)]`}
                aria-hidden
              />
              <div>
                <p className="font-mono text-sm">{s.name}</p>
                <p className="font-mono text-xs text-tuz-ink-3">{s.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-6">
          <div>
            <p className="eyebrow text-tuz-red-deep mb-2">Display · Puradak</p>
            <p className="font-display text-display-xl leading-none text-tuz-ink">
              Tuz
            </p>
          </div>
          <div>
            <p className="eyebrow text-tuz-red-deep mb-2">Editorial · Fraunces</p>
            <p className="font-editorial text-3xl text-tuz-ink-2">
              A room worth a second cup.
            </p>
          </div>
          <div>
            <p className="eyebrow text-tuz-red-deep mb-2">Body · Pretendard</p>
            <p className="text-lg text-tuz-ink leading-relaxed max-w-xl">
              울산 중구 염포로의 조용한 카페. 따뜻한 커피와 한 편의 공간.
              The signature of the senior and junior owners.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="eyebrow text-tuz-ink-2">eyebrow · 0.75rem 0.18em</span>
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="md">Primary</Button>
          <Button variant="ghost" size="md">Ghost</Button>
          <Button variant="outline" size="md">Outline</Button>
          <Button variant="subtle" size="md">Subtle</Button>
          <Button variant="link" size="md">Link button →</Button>
        </div>
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge variant="chip">Notice</Badge>
          <Badge variant="chipInk">Event</Badge>
          <Badge variant="chipRed">New</Badge>
          <Badge variant="chipFilledRed">Season</Badge>
          <Badge variant="status">
            <span className="inline-block size-2 rounded-full bg-tuz-green" aria-hidden />
            Open now
          </Badge>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-5 md:grid-cols-2">
          <Card variant="editorial" padding="lg">
            <CardHeader>
              <Badge variant="chip">NOTICE</Badge>
              <CardTitle>겨울 시즌 메뉴 공개</CardTitle>
              <CardDescription>2026.05.01 · Tuz</CardDescription>
            </CardHeader>
            <CardContent className="mt-4 font-editorial text-tuz-ink-2">
              따뜻한 계절을 위해 준비한 세 가지 시그니처 음료.
            </CardContent>
            <CardFooter>
              <Button variant="link" size="sm">자세히 보기 →</Button>
            </CardFooter>
          </Card>

          <Card variant="filledRed" padding="lg">
            <CardHeader>
              <p className="eyebrow opacity-80">Wi-Fi</p>
              <CardTitle className="text-tuz-paper">Tuz_Guest</CardTitle>
            </CardHeader>
            <CardContent className="mt-2 font-mono text-sm">tuz12345</CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="border-tuz-paper text-tuz-paper hover:bg-tuz-paper hover:text-tuz-red">
                비밀번호 복사
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      <Section title="Motion tokens (reference)">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-sm">
          <div><dt className="text-tuz-ink-3">duration.fast</dt><dd>180ms</dd></div>
          <div><dt className="text-tuz-ink-3">duration.base</dt><dd>340ms</dd></div>
          <div><dt className="text-tuz-ink-3">duration.slow</dt><dd>600ms</dd></div>
          <div><dt className="text-tuz-ink-3">ease.out</dt><dd>0.22, 1, 0.36, 1</dd></div>
        </dl>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <h2 className="font-display text-display-md text-tuz-ink">{title}</h2>
      {children}
    </section>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
