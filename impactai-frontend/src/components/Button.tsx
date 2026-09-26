import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-clay text-white hover:bg-clay-hover disabled:bg-clay/50',
  secondary: 'bg-surface text-ink border border-border-strong hover:border-clay hover:text-clay',
  ghost: 'text-ink-muted hover:text-ink hover:bg-black/5',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-50',
};

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium
        transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
