import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'group/badge inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'lp-btn-bevel text-primary-foreground',
        secondary: 'lp-frost-well text-secondary-foreground',
        success:
          'border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/16 dark:text-emerald-300',
        warning:
          'border-amber-500/22 bg-amber-500/12 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/16 dark:text-amber-300',
        info:
          'border-blue-500/20 bg-blue-500/11 text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/16 dark:text-blue-300',
        neutral:
          'lp-frost-well text-muted-foreground',
        destructive:
          'border-rose-500/20 bg-rose-500/12 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/20 dark:text-rose-300',
        outline: 'lp-frost-pill text-foreground',
        ghost: 'hover:bg-[var(--frost-well)] text-muted-foreground',
        link: 'text-accent-cobalt underline-offset-4 hover:underline'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className)
      },
      props
    ),
    render,
    state: {
      slot: 'badge',
      variant
    }
  });
}

export { Badge, badgeVariants };
