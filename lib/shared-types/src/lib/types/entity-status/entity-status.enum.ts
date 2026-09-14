export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

/** String-union equivalent of the EntityStatus enum, safe to use with JSON payloads. */
export type EntityStatusType = `${EntityStatus}`;
