'use client';

import * as React from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/index';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLocale } from 'next-intl';

const buttonVariants = cva(
  'ring-offset-background focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 relative overflow-hidden before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.5)_50%,transparent_75%,transparent_100%)] before:bg-[length:250%_250%,100%_100%] before:bg-[position:200%_0,0_0] before:bg-no-repeat before:transition-[background-position_0s_ease] before:duration-1000 hover:before:bg-[position:-100%_0,0_0]',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border-input bg-background hover:bg-accent hover:text-accent-foreground border',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        text: 'text-primary hover:text-primary/80',
        link: 'text-primary hover:text-primary/80',
      },
      effect: {
        expandIcon:
          'group hover:ring-primary/90 relative gap-0 transition-all duration-300 hover:ring-2 hover:ring-offset-2',
        ringHover:
          'hover:ring-primary/90 transition-all duration-300 hover:ring-2 hover:ring-offset-2',
        shine:
          'before:animate-shine background-position_0s_ease relative overflow-hidden before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.5)_50%,transparent_75%,transparent_100%)] before:bg-[length:250%_250%,100%_100%] before:bg-no-repeat',
        shineHover:
          'relative overflow-hidden before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.5)_50%,transparent_75%,transparent_100%)] before:bg-[length:250%_250%,100%_100%] before:bg-[position:200%_0,0_0] before:bg-no-repeat before:transition-[background-position_0s_ease] before:duration-1000 hover:before:bg-[position:-100%_0,0_0]',
        gooeyRight:
          'relative z-0 overflow-hidden from-white/40 transition-all duration-500 before:absolute before:inset-0 before:-z-10 before:translate-x-[150%] before:translate-y-[150%] before:scale-[2.5] before:rounded-[100%] before:bg-gradient-to-r before:transition-transform before:duration-1000 hover:before:translate-x-[0%] hover:before:translate-y-[0%]',
        gooeyLeft:
          'relative z-0 overflow-hidden from-white/40 transition-all duration-500 after:absolute after:inset-0 after:-z-10 after:translate-x-[-150%] after:translate-y-[150%] after:scale-[2.5] after:rounded-[100%] after:bg-gradient-to-l after:transition-transform after:duration-1000 hover:after:translate-x-[0%] hover:after:translate-y-[0%]',
        underline:
          'after:bg-primary relative !no-underline after:absolute after:bottom-2 after:h-[1px] after:w-2/3 after:origin-bottom-left after:scale-x-100 after:transition-transform after:duration-300 after:ease-in-out hover:after:origin-bottom-right hover:after:scale-x-0',
        hoverUnderline:
          'after:bg-primary relative !no-underline after:absolute after:bottom-2 after:h-[1px] after:w-2/3 after:origin-bottom-right after:scale-x-0 after:transition-transform after:duration-300 after:ease-in-out hover:after:origin-bottom-left hover:after:scale-x-100',
        gradientSlideShow:
          'animate-gradient-flow bg-[linear-gradient(-45deg,var(--gradient-lime),var(--gradient-ocean),var(--gradient-wine),var(--gradient-rust))] bg-[size:400%]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface IconProps {
  icon?: React.ComponentType | React.ReactNode;
  iconPlacement?: 'left' | 'right';
}

interface IconRefProps {
  icon?: never;
  iconPlacement?: undefined;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export type ButtonIconProps = IconProps | IconRefProps;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps & ButtonIconProps>(
  (
    {
      className,
      variant,
      effect,
      size,
      icon,
      iconPlacement: iconPlacementProp,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = props.disabled;
    const locale = useLocale();
    const isRTL = locale === 'ar';
    const Icon = icon ?? (isRTL ? ArrowLeft : ArrowRight);
    const iconPlacement = iconPlacementProp ?? (isRTL ? 'left' : 'right');

    // Helper to render icon - handles both ElementType and ReactNode
    const renderIcon = () => {
      // If it's already a rendered element (JSX   like <Loader2 />), return it directly
      if (React.isValidElement(Icon)) {
        return Icon;
      }
      // If it's a component type (function, class, or ForwardRef), render it
      if (typeof Icon === 'function' || (Icon && typeof Icon === 'object' && '$$typeof' in Icon)) {
        const IconComponent = Icon as React.ElementType;
        return <IconComponent />;
      }
      return null;
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, effect, size, className }), 'rtl:flex-row-reverse')}
        ref={ref}
        {...props}>
        {Icon && iconPlacement === 'left' && effect === 'expandIcon' ? (
          <div
            className={cn(
              'transition-all duration-200',
              isDisabled
                ? 'w-5 translate-x-0 pr-2 opacity-100'
                : 'w-0 translate-x-[0%] pr-0 opacity-0 group-hover:w-5 group-hover:pr-2 group-hover:opacity-100'
            )}>
            {renderIcon()}
          </div>
        ) : null}
        {/* Slottable is only valid under Slot (asChild). Text/null children must be wrapped. */}
        {asChild ? (
          React.isValidElement(props.children) ? (
            <Slottable>{props.children}</Slottable>
          ) : props.children != null && props.children !== false ? (
            <Slottable>
              <span>{props.children}</span>
            </Slottable>
          ) : null
        ) : (
          props.children
        )}
        {Icon && iconPlacement === 'right' && effect === 'expandIcon' ? (
          <div
            className={cn(
              'transition-all duration-200',
              isDisabled
                ? 'w-5 translate-x-0 pl-2 opacity-100'
                : 'w-0 translate-x-full pl-0 opacity-0 group-hover:w-5 group-hover:translate-x-0 group-hover:pl-2 group-hover:opacity-100'
            )}>
            {renderIcon()}
          </div>
        ) : null}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
