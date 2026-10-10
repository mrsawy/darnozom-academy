import type { ReturnPolicyBlockProps } from './return-policy-block.types';

export default function ReturnPolicyBlock({ title, description }: ReturnPolicyBlockProps) {
  return (
    <article className="bg-card rounded-xl border p-6">
      <h2 className="mb-2 text-xl font-medium">{title}</h2>
      <p className="text-muted-foreground leading-7">{description}</p>
    </article>
  );
}
