import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div className={`rounded-lg border border-border bg-surface ${className}`} {...rest}>
      {children}
    </div>
  );
}
