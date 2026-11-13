/**
 * Role-Based Access Control (RBAC) Module for HALDER
 * Defines distinct authorization boundaries for 'customer', 'farmer', and 'admin'.
 */

export type Role = 'customer' | 'farmer' | 'admin';

export type Permission =
  | 'product:view'
  | 'product:create'
  | 'product:update_own'
  | 'product:delete_own'
  | 'order:create'
  | 'order:view_own'
  | 'order:update_status_seller'
  | 'farmer:view_earnings'
  | 'farmer:withdraw_earnings'
  | 'farmer:update_kyc'
  | 'admin:access_dashboard'
  | 'admin:review_kyc'
  | 'admin:manage_users'
  | 'admin:toggle_killswitch'
  | 'admin:view_audit_logs'
  | 'admin:execute_payout';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  customer: [
    'product:view',
    'order:create',
    'order:view_own',
  ],
  farmer: [
    'product:view',
    'product:create',
    'product:update_own',
    'product:delete_own',
    'order:view_own',
    'order:update_status_seller',
    'farmer:view_earnings',
    'farmer:withdraw_earnings',
    'farmer:update_kyc',
  ],
  admin: [
    'product:view',
    'product:create',
    'product:update_own',
    'product:delete_own',
    'order:create',
    'order:view_own',
    'order:update_status_seller',
    'farmer:view_earnings',
    'farmer:withdraw_earnings',
    'farmer:update_kyc',
    'admin:access_dashboard',
    'admin:review_kyc',
    'admin:manage_users',
    'admin:toggle_killswitch',
    'admin:view_audit_logs',
    'admin:execute_payout',
  ],
};

/**
 * Checks if a specific role is authorized for a permission.
 */
export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * Checks if a user can transition directly into a target role.
 * Admins can access all consoles; non-admins cannot jump into the admin role without credentials.
 */
export function canSwitchRole(currentRole: Role | undefined | null, targetRole: Role): boolean {
  if (targetRole === 'customer' || targetRole === 'farmer') return true;
  return currentRole === 'admin';
}
