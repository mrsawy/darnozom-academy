import type { Data } from '@puckeditor/core';

function generatePuckId(type: string): string {
  return `${type}-${Math.random().toString(36).slice(2, 11)}`;
}

function isPuckComponentNode(v: unknown): v is { type: string; props: Record<string, unknown> } {
  if (v === null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.type === 'string' &&
    typeof o.props === 'object' &&
    o.props !== null &&
    !Array.isArray(o.props)
  );
}

function normalizeItem(item: unknown): { type: string; props: Record<string, unknown> } {
  if (!isPuckComponentNode(item)) {
    return { type: 'Unknown', props: { id: generatePuckId('Unknown') } };
  }
  const { type, props: rawProps } = item;
  const props = { ...rawProps };
  if (typeof props.id !== 'string' || props.id.length === 0) {
    props.id = generatePuckId(type);
  }
  for (const [k, v] of Object.entries(props)) {
    if (k === 'id' || !Array.isArray(v)) continue;
    props[k] = v.map((el: unknown) => (isPuckComponentNode(el) ? normalizeItem(el) : el));
  }
  return { type, props };
}

/**
 * Puck uses `props.id` as React keys for blocks. Corrupt or legacy data can store a
 * non-string id (e.g. object), which stringifies to `[object Object]` and triggers
 * duplicate-key warnings. Ensures every component node has a unique string id.
 */
export function normalizePuckData(data: Data): Data {
  const content = Array.isArray(data.content)
    ? data.content.map((item) => normalizeItem(item))
    : [];
  return { ...data, content };
}
