import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium uppercase tracking-[0.14em] whitespace-nowrap rounded-sm",
  {
    variants: {
      variant: {
        chip:
          "bg-transparent border border-tuz-ink/15 text-tuz-ink-2 px-2 py-0.5 text-[11px]",
        chipInk:
          "bg-tuz-ink text-tuz-paper px-2 py-0.5 text-[11px]",
        chipRed:
          "border border-tuz-red text-tuz-red px-2 py-0.5 text-[11px]",
        chipFilledRed:
          "bg-tuz-red text-tuz-paper px-2 py-0.5 text-[11px]",
        chipOutlineInk:
          "border border-tuz-ink/50 bg-tuz-paper text-tuz-ink px-2 py-0.5 text-[11px]",
        status:
          "bg-tuz-ivory text-tuz-ink px-3 py-1 text-xs tracking-normal normal-case rounded-full",
      },
    },
    defaultVariants: {
      variant: "chip",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
