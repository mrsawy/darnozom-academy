export enum RoleErrors {
  ROLE_NOT_FOUND = 'roleNotFound',
  ROLE_ALREADY_EXISTS = 'roleAlreadyExists',
  ROLE_PROTECTED_CANNOT_DELETE = 'roleProtectedCannotDelete',
  ROLE_IN_USE_CANNOT_DELETE = 'roleInUseCannotDelete',
}

export enum RoleSuccessMessages {
  ROLE_CREATED = 'roleCreatedSuccessfully',
  ROLE_UPDATED = 'roleUpdatedSuccessfully',
  ROLE_DELETED = 'roleDeletedSuccessfully',
}
