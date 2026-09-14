/**
 * Shared Mongoose populate paths used when loading a user with role + org.
 * `organization.approvalStatus` is selected because IUser/IOrganization
 * (lib/shared-types) declare it as a required field the client reads to
 * gate the dashboard vs. the organization-verification screen.
 */
export const USER_POPULATE = [
  { path: 'role', model: 'Role', localField: 'roleName', foreignField: 'name', select: 'name _id permissions' },
  { path: 'organization', select: 'name _id slug approvalStatus' },
] as const;
