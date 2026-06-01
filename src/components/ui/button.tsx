import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Button system — premium EdTech aesthetic.
 *
 *   default    — Orange pill. The one moment of "look here" on a screen.
 *   secondary  — Navy pill. For workspace/identity actions ("Sign in", "Continue").
 *   outline    — Quiet supportive action. White, slate border.
 *   ghost      — Lowest visual weight; for table-row actions, "Skip", dismiss.
 *   destructive — Red pill. Used sparingly (delete, revoke).
 *   link       — Inline text link, hover→orange.
 *
 * All buttons are rounded-full by default (pill-shape per design brief).
 * Size `sm` uses rounded-lg for compact contexts (filter bars, table actions).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'rounded-full bg-orange text-white shadow-sm hover:bg-orange/90 active:translate-y-px',
        secondary:
          'rounded-full bg-navy text-white shadow-sm hover:bg-navy/90 active:translate-y-px',
        outline:
          'rounded-full border border-slate-200 bg-white text-navy hover:border-slate-300 hover:bg-slate-50',
        ghost: 'rounded-full text-slate-500 hover:bg-slate-100 hover:text-navy',
        destructive:
          'rounded-full bg-red-600 text-white shadow-sm hover:bg-red-700 active:translate-y-px',
        link: 'text-orange underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 px-7 text-[15px]',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
