import Image from "next/image";
import type { AboutStory as AboutStoryType, Media } from "@/payload-types";

type AboutStoryProps = {
  about: AboutStoryType;
};

export function AboutStory({ about }: AboutStoryProps) {
  if (!about.published) return null;

  const portrait =
    typeof about.portrait === "object" ? (about.portrait as Media) : null;

  // Extract plain text from Lexical rich text (minimal — full renderer later)
  const plainText = extractPlainText(about.body);

  if (!plainText && !portrait) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 md:gap-12 items-start">
      {portrait?.url ? (
        <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-tuz-ivory">
          <Image
            src={portrait.url}
            alt={portrait.alt ?? "Owner portrait"}
            fill
            sizes="(min-width: 768px) 280px, 90vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {plainText && (
          <p className="font-body italic text-xl md:text-2xl leading-snug text-tuz-ink">
            {plainText}
          </p>
        )}
        {about.signatureName && (
          <p className="mt-4 font-body text-tuz-ink-3">
            — {about.signatureName}
          </p>
        )}
      </div>
    </div>
  );
}

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
