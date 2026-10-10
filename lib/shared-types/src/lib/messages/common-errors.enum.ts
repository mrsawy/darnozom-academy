/**
 * Common error message keys. Use these values as translation keys on both
 * backend (e.g. in exception messages) and frontend (e.g. t(`Errors.${code}`)).
 */
export enum CommonErrors {
  SOMETHING_WENT_WRONG = 'somethingWentWrong',
  NOT_FOUND = 'notFound',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  BAD_REQUEST = 'badRequest',
  CONFLICT = 'conflict',
  INTERNAL_SERVER_ERROR = 'internalServerError',
  /** Wire: `tooManyRequests|30` → `{seconds}` */
  TOO_MANY_REQUESTS = 'tooManyRequests',
}
