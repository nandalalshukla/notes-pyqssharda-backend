export const USER_ROLES = ["user", "mod", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];
