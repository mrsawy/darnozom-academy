export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING_UPDATE = 'PENDING_UPDATE',
}

/** String-union equivalent of the ApprovalStatus enum, safe to use with JSON payloads. */
export type ApprovalStatusType = `${ApprovalStatus}`;
