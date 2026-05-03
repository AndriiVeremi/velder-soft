import { Project } from '../types';

export type RootStackParamList = {
  Home: undefined;
  Tasks: undefined;
  Dashboard: undefined;
  Service: undefined;
  Users: undefined;
  Vacations: { isAdminView?: boolean } | undefined;
  Reminders: undefined;
  Announcements: undefined;
  Profile: undefined;
  LiniaDoSzefa: undefined;
  AddProject:
    | {
        hospitalId?: string;
        departmentId?: string;
        hospitalName?: string;
        departmentName?: string;
      }
    | undefined;
  ProjectDetails: { project: Project };
  Login: undefined;
  Register: undefined;
  PendingApproval: undefined;
  ReportProblem: undefined;
  DirectorReports: undefined;
  About: undefined;
  Docs: undefined;
  Alarm: { reminderId: string; title: string };
};
