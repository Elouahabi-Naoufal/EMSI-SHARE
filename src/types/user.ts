export interface User {
  id: number | string;
  username: string;
  first_name: string;
  last_name: string;
  email?: string;
  role?: string;
  staff_title?: string;
  department?: string;
  avatar?: string;
  profile_picture_data?: string;
}

export const STAFF_ROLES = ['teacher', 'librarian', 'counselor', 'coordinator', 'staff'] as const;
export const ADMIN_ROLES = ['admin', 'administration'] as const;
export const ALL_ROLES = ['student', 'parent', ...STAFF_ROLES, ...ADMIN_ROLES] as const;
export type UserRole = typeof ALL_ROLES[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  parent: 'Parent/Guardian',
  teacher: 'Teacher',
  librarian: 'Librarian',
  counselor: 'Counselor',
  coordinator: 'Coordinator',
  staff: 'Staff',
  admin: 'Admin',
  administration: 'Administration',
};

export const isStaff = (role?: string) => STAFF_ROLES.includes(role as any);
export const isAdmin = (role?: string) => ADMIN_ROLES.includes(role as any);
export const isPrivileged = (role?: string) => isStaff(role) || isAdmin(role);