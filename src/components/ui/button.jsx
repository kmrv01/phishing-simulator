import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white hover:bg-slate-800",
        outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        destructive: "bg-red-600 text-white hover:bg-red-700"
      },
      size: {
        default: "h-10 px-4 py-2",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }), "rounded-xl")} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
