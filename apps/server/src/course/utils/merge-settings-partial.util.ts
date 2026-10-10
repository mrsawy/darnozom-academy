/** Shallow-merge `settings` on PATCH-style updates so partial payloads do not wipe nested fields. */
export function mergeModuleContentSettingsPatch(existing: Record<string, unknown> | undefined, patch: unknown): Record<string, unknown> {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return existing ?? {};
  }
  return { ...existing, ...(patch as Record<string, unknown>) };
}
