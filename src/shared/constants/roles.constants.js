// src/shared/constants/roles.constants.js

export const WORKSPACE_ROLES = {
  OWNER:  "OWNER",
  ADMIN:  "ADMIN",
  MEMBER: "MEMBER",
};

export const PROJECT_ROLES = {
  ADMIN:  "ADMIN",
  MEMBER: "MEMBER",
  VIEWER: "VIEWER",
};

/**
 * Permission hierarchy for workspace roles.
 * Higher number = more permissions.
 * Used to compare roles: can this user perform this action?
 */
export const WORKSPACE_ROLE_HIERARCHY = {
  [WORKSPACE_ROLES.OWNER]:  3,
  [WORKSPACE_ROLES.ADMIN]:  2,
  [WORKSPACE_ROLES.MEMBER]: 1,
};

export const PROJECT_ROLE_HIERARCHY = {
  [PROJECT_ROLES.ADMIN]:  3,
  [PROJECT_ROLES.MEMBER]: 2,
  [PROJECT_ROLES.VIEWER]: 1,
};