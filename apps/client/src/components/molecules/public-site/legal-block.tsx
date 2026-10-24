import type { ReactNode } from 'react';

interface LegalBlockProps {
  title: string;
  /** Plain text, or rich content when the clause needs an inline link. */
  children: ReactNode;
}

/** One clause of a policy page — every legal page is a stack of these. */
function LegalBlock({ title, children }: LegalBlockProps) {
  return (
    <article className="bg-dz-paper-raised border-dz-line rounded-2xl border p-6">
      <h2 className="font-display m-0 mb-2 text-xl font-bold">{title}</h2>
      <p className="text-dz-ink-soft m-0 leading-7">{children}</p>
    </article>
  );
}

export default LegalBlock;
