export enum PublishStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

/** String-union equivalent of the PublishStatus enum, safe to use with JSON payloads. */
export type PublishStatusType = `${PublishStatus}`;
