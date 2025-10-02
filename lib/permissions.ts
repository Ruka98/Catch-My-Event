// Permission system utilities

export type Permission =
  // Event permissions
  | "events:view"
  | "events:create"
  | "events:update_own"
  | "events:update_any"
  | "events:delete_own"
  | "events:delete_any"
  | "events:moderate"
  | "events:feature"
  // Comment permissions
  | "comments:create"
  | "comments:update_own"
  | "comments:update_any"
  | "comments:delete_own"
  | "comments:delete_any"
  | "comments:moderate"
  // Profile permissions
  | "profile:update_own"
  | "profile:update_any"
  | "profile:view_any"
  // Attendance permissions
  | "attendance:manage_own"
  | "attendance:view_any"
  // User management permissions
  | "users:manage"
  | "users:moderate"
  // Role permissions
  | "roles:manage"
  // Analytics permissions
  | "analytics:view"
  // System permissions
  | "system:manage"

export type UserRole = "user" | "moderator" | "admin" | "super_admin"

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: [
    "events:view",
    "events:create",
    "events:update_own",
    "events:delete_own",
    "comments:create",
    "comments:update_own",
    "comments:delete_own",
    "profile:update_own",
    "attendance:manage_own",
  ],
  moderator: [
    "events:view",
    "events:create",
    "events:update_own",
    "events:update_any",
    "events:delete_own",
    "events:moderate",
    "comments:create",
    "comments:update_own",
    "comments:update_any",
    "comments:delete_own",
    "comments:delete_any",
    "comments:moderate",
    "profile:update_own",
    "profile:view_any",
    "attendance:manage_own",
    "users:moderate",
  ],
  admin: [
    "events:view",
    "events:create",
    "events:update_own",
    "events:update_any",
    "events:delete_own",
    "events:delete_any",
    "events:moderate",
    "events:feature",
    "comments:create",
    "comments:update_own",
    "comments:update_any",
    "comments:delete_own",
    "comments:delete_any",
    "comments:moderate",
    "profile:update_own",
    "profile:update_any",
    "profile:view_any",
    "attendance:manage_own",
    "attendance:view_any",
    "users:manage",
    "users:moderate",
    "analytics:view",
  ],
  super_admin: [
    "events:view",
    "events:create",
    "events:update_own",
    "events:update_any",
    "events:delete_own",
    "events:delete_any",
    "events:moderate",
    "events:feature",
    "comments:create",
    "comments:update_own",
    "comments:update_any",
    "comments:delete_own",
    "comments:delete_any",
    "comments:moderate",
    "profile:update_own",
    "profile:update_any",
    "profile:view_any",
    "attendance:manage_own",
    "attendance:view_any",
    "users:manage",
    "users:moderate",
    "roles:manage",
    "analytics:view",
    "system:manage",
  ],
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.user

  // Check for exact permission match
  if (rolePermissions.includes(permission)) {
    return true
  }

  // Check for wildcard permissions (e.g., 'events:*' covers all event permissions)
  const [category] = permission.split(":")
  const wildcardPermission = `${category}:*` as Permission

  return rolePermissions.includes(wildcardPermission)
}

export function canAccessAdminPanel(userRole: UserRole): boolean {
  return ["moderator", "admin", "super_admin"].includes(userRole)
}

export function canManageUsers(userRole: UserRole): boolean {
  return hasPermission(userRole, "users:manage")
}

export function canModerateContent(userRole: UserRole): boolean {
  return hasPermission(userRole, "events:moderate") || hasPermission(userRole, "comments:moderate")
}

export function canFeatureEvents(userRole: UserRole): boolean {
  return hasPermission(userRole, "events:feature")
}

export function canViewAnalytics(userRole: UserRole): boolean {
  return hasPermission(userRole, "analytics:view")
}
