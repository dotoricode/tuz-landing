import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-[var(--duration-fast)] [transition-timing-function:var(--ease-tuz-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-tuz-red text-tuz-paper hover:bg-tuz-red-deep active:scale-[0.98] shadow-sm",
        ghost:
          "border border-tuz-ink/10 bg-transparent text-tuz-ink hover:bg-tuz-ivory",
        link:
          "text-tuz-red-deep underline-offset-4 hover:underline hover:text-tuz-red px-0",
        outline:
          "border-2 border-tuz-red text-tuz-red bg-transparent hover:bg-tuz-red hover:text-tuz-paper",
        subtle:
          "bg-tuz-ivory text-tuz-ink hover:bg-tuz-ink/5",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-sm",
        md: "h-11 px-5 text-sm rounded-md",
        lg: "h-14 px-8 text-base rounded-lg",
        icon: "size-11 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
