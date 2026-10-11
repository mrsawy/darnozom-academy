/** Shared Mongoose populate paths used when loading a user with role + org. */
export const USER_POPULATE = [
  { path: 'role', model: 'Role', localField: 'roleName', foreignField: 'name', select: 'name _id permissions' },
  { path: 'additionalRoleDocs', select: 'name _id permissions' },
  { path: 'organization', select: 'name _id slug' },
] as const;
