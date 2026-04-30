import { UserRole } from '../types';

/**
 * Централізована утиліта для перевірки прав доступу.
 * Позбавляє від "інлайнів" типу role === 'DIRECTOR' по всьому коду.
 */
export const permissions = {
  // Проекти та структура компанії
  canManageProjects: (role: UserRole) => role === 'DIRECTOR',
  canViewReports: (role: UserRole) => role === 'DIRECTOR',
  
  // Завдання (Tasks)
  canCreateTask: (role: UserRole) => role === 'DIRECTOR',
  canDeleteTask: (role: UserRole) => role === 'DIRECTOR',
  canEditTask: (role: UserRole) => role === 'DIRECTOR',
  
  // Сервіс (Service)
  canCreateServiceRecord: (role: UserRole) => role === 'DIRECTOR',
  canDeleteServiceRecord: (role: UserRole) => role === 'DIRECTOR',
  canToggleServiceStatus: (role: UserRole) => role === 'DIRECTOR',
  
  // Користувачі (Users)
  canManageUsers: (role: UserRole) => role === 'DIRECTOR',
  
  // Відпустки (Vacations)
  canApproveVacation: (role: UserRole) => role === 'DIRECTOR',
  
  // Оголошення (Announcements)
  canPostAnnouncement: (role: UserRole) => role === 'DIRECTOR',
  canDeleteAnnouncement: (role: UserRole) => role === 'DIRECTOR',
  
  // Документація (Docs)
  canManageDocs: (role: UserRole) => role === 'DIRECTOR',
  
  // Проблеми та Запити
  canSeeAllReports: (role: UserRole) => role === 'DIRECTOR',
  canSeeAllRequests: (role: UserRole) => role === 'DIRECTOR',
};

export default permissions;
