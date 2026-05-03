import { UserRole } from '../types';

export const permissions = {
  canManageProjects: (role: UserRole) => role === 'DIRECTOR',
  canViewReports: (role: UserRole) => role === 'DIRECTOR',

  canCreateTask: (role: UserRole) => role === 'DIRECTOR',
  canDeleteTask: (role: UserRole) => role === 'DIRECTOR',
  canEditTask: (role: UserRole) => role === 'DIRECTOR',

  canCreateServiceRecord: (role: UserRole) => role === 'DIRECTOR',
  canDeleteServiceRecord: (role: UserRole) => role === 'DIRECTOR',
  canToggleServiceStatus: (role: UserRole) => role === 'DIRECTOR' || role === 'EMPLOYEE',

  canManageUsers: (role: UserRole) => role === 'DIRECTOR',

  canApproveVacation: (role: UserRole) => role === 'DIRECTOR',

  canPostAnnouncement: (role: UserRole) => role === 'DIRECTOR',
  canDeleteAnnouncement: (role: UserRole) => role === 'DIRECTOR',

  canManageDocs: (role: UserRole) => role === 'DIRECTOR',

  canSeeAllReports: (role: UserRole) => role === 'DIRECTOR',
  canSeeAllRequests: (role: UserRole) => role === 'DIRECTOR',
};

export default permissions;
