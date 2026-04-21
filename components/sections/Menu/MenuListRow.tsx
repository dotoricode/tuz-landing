import { Badge } from "@/components/ui/badge";
import type { MenuItem } from "@/payload-types";

type MenuListRowProps = {
  item: MenuItem;
};

export function MenuListRow({ item }: MenuListRowProps) {
  return (
    <li className="flex items-baseline gap-3 py-4">
      <div className="flex flex-col gap-0.5 shrink-0 min-w-0">
        <span className="font-body text-lg md:text-xl text-tuz-ink leading-snug">
          {item.name}
        </span>
        {item.nameEn && (
          <span className="font-body text-sm text-tuz-ink-3 leading-tight">
            {item.nameEn}
          </span>
        )}
      </div>
      <span
        aria-hidden
        className="flex-1 border-b border-dotted border-tuz-ink/30 mb-1"
      />
      <div className="shrink-0 inline-flex items-baseline gap-2">
        {item.price && (
          <span className="font-body text-lg md:text-xl font-semibold text-tuz-ink-2 tabular-nums">
            {item.price}
          </span>
        )}
        {item.tag === "NEW" && (
          <Badge variant="chipFilledRed" className="self-center">
            NEW
          </Badge>
        )}
        {item.tag === "BEST" && (
          <Badge variant="chipInk" className="self-center">
            BEST
          </Badge>
        )}
        {item.tag === "SEASONAL" && (
          <Badge variant="chipRed" className="self-center">
            SEASONAL
          </Badge>
        )}
      </div>
    </li>
  );
}
