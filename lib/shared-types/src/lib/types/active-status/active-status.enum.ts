export enum ActiveStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/** String-union equivalent of the ActiveStatus enum, safe to use with JSON payloads. */
export type ActiveStatusType = `${ActiveStatus}`;
