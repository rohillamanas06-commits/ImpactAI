import type { ReactNode } from 'react';

type Tone = 'neutral' | 'moss' | 'slate' | 'clay';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-black/5 text-ink-muted',
  moss: 'bg-moss-soft text-moss',
  slate: 'bg-slate-soft text-slate',
  clay: 'bg-clay-soft text-clay-hover',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>{children}</span>
  );
}
