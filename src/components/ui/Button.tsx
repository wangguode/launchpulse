import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[10px] border border-transparent bg-clip-padding text-[13.5px] font-medium whitespace-nowrap transition-all duration-150 outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'lp-btn-bevel hover:opacity-92',
        outline:
          'lp-frost-pill text-foreground hover:bg-[var(--frost-card-hover)] aria-expanded:bg-[var(--frost-card-hover)]',
        secondary:
          'lp-frost-well text-secondary-foreground hover:bg-[var(--frost-pill)] aria-expanded:bg-[var(--frost-pill)]',
        ghost:
          'hover:bg-[var(--frost-well)] hover:text-foreground aria-expanded:bg-[var(--frost-well)] aria-expanded:text-foreground',
        destructive:
          'bg-destructive/12 text-destructive border-destructive/20 hover:bg-destructive/20 focus-visible:border-destructive/40',
        link: 'text-accent-cobalt underline-offset-4 hover:underline'
      },
      size: {
        default:
          'h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: "h-7 gap-1 rounded-lg px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-[9px] px-3 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-10 gap-2 rounded-[11px] px-4 text-sm',
        icon: 'size-9',
        'icon-xs': "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        'icon-sm': 'size-8 rounded-[9px]',
        'icon-lg': 'size-10 rounded-[11px]'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot='button'
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
