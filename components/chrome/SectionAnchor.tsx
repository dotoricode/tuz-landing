import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type SectionAnchorProps = PropsWithChildren<{
  id: string;
  className?: string;
  dense?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}>;

/**
 * Wraps a landmark section with the canonical spacing + scroll offset so
 * deep-links like `/#menu` land under the sticky header without guessing.
 */
export function SectionAnchor({
  id,
  className,
  dense = false,
  children,
  ...aria
}: SectionAnchorProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-[var(--header-offset,72px)]",
        dense ? "section-dense" : "section",
        className,
      )}
      {...aria}
    >
      {children}
    </section>
  );
}
