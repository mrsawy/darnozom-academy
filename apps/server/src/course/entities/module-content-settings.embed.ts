import mongoose from 'mongoose';

/** Shared embedded `settings` for course modules and course contents (discussion flags; extend later). */
export const ModuleContentSettingsSchemaPlain = new mongoose.Schema(
  {
    discussionEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

export interface ModuleContentSettings {
  discussionEnabled?: boolean;
}

/** Missing settings or `discussionEnabled` ⇒ treated as enabled (same as course `settings`). */
export function isDiscussionEnabled(settings?: { discussionEnabled?: boolean } | null): boolean {
  return settings?.discussionEnabled !== false;
}
