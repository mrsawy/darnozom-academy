export enum ShariaStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Written as the review comment when a newer edit replaces a version still awaiting review. */
export const SHARIA_SUPERSEDED_COMMENT = 'SUPERSEDED';
/** Written as the review comment on the version the one-time migration creates for existing content. */
export const SHARIA_MIGRATED_COMMENT = 'MIGRATED';
