import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import type { Locale } from "@/lib/i18n/routing";
import { getFaqs } from "@/lib/queries";
import { SectionAnchor } from "@/components/chrome/SectionAnchor";
import { FadeUp } from "@/components/motion/FadeUp";
import { TextReveal } from "@/components/motion/TextReveal";

type LexicalNode = {
  type?: string;
  text?: string;
  children?: LexicalNode[];
};

type LexicalBody = { root?: { children?: LexicalNode[] } } | null | undefined;

function extractPlainText(body: LexicalBody): string {
  const root = body?.root;
  if (!root?.children) return "";
  const walk = (nodes: LexicalNode[]): string =>
    nodes
      .map((n) => (n.text ? n.text : n.children ? walk(n.children) : ""))
      .join(" ");
  return walk(root.children).trim();
}

export async function Faq({ locale }: { locale: Locale }) {
  const [faqs, t] = await Promise.all([
    getFaqs(locale),
    getTranslations({ locale, namespace: "sections.faq" }),
  ]);

  if (faqs.length === 0) return null;

  return (
    <SectionAnchor id="faq" aria-labelledby="faq-heading">
      <div className="container mx-auto max-w-3xl px-5 md:px-8">
        <FadeUp className="mb-10 md:mb-14">
          <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
          <h2
            id="faq-heading"
            className="mt-3 font-body text-display-md text-tuz-ink"
          >
            <TextReveal text={t("title")} />
          </h2>
        </FadeUp>

        <FadeUp delay={0.06}>
          <ul className="divide-y divide-tuz-ink/10 border-y border-tuz-ink/10">
            {faqs.map((faq) => {
              const answer = extractPlainText(
                faq.answer as unknown as LexicalBody,
              );
              return (
                <li key={faq.id}>
                  <details className="group">
                    <summary className="flex items-start justify-between gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <span className="font-body text-lg md:text-xl text-tuz-ink leading-snug">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className="size-5 shrink-0 mt-1 text-tuz-ink-3 transition-transform duration-[var(--duration-fast)] group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    {answer && (
                      <p className="pb-5 pr-9 font-body text-base text-tuz-ink-2 leading-relaxed">
                        {answer}
                      </p>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
        </FadeUp>
      </div>
    </SectionAnchor>
  );
}
