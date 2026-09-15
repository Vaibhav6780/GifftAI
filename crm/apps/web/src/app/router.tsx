
import { Navigate, Route, Routes } from "react-router-dom";
import { PublicRoute } from "../routes/PublicRoute";
import { ProtectedRoute } from "../routes/ProtectedRoute";
import { RequirePermission } from "../routes/RequirePermission";
import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../pages/auth/LoginPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { LeadsListPage } from "../pages/leads/LeadsListPage";
import { LeadCreatePage } from "../pages/leads/LeadCreatePage";
import { LeadEditPage } from "../pages/leads/LeadEditPage";
import { LeadFollowupsDuePage } from "../pages/leads/LeadFollowupsDuePage";
import { LeadContactedTodayPage } from "../pages/leads/LeadContactedTodayPage";
import { WhatsappInboxPage } from "../pages/whatsapp/WhatsappInboxPage";
import { TelegramInboxPage } from "../pages/telegram/TelegramInboxPage";
import { MailInboxPage } from "../pages/mail/MailInboxPage";
import { ContactsListPage } from "../pages/contacts/ContactsListPage";
import { ContactCreatePage } from "../pages/contacts/ContactCreatePage";
import { ContactEditPage } from "../pages/contacts/ContactEditPage";
import { CompaniesListPage } from "../pages/companies/CompaniesListPage";
import { CompanyCreatePage } from "../pages/companies/CompanyCreatePage";
import { CompanyEditPage } from "../pages/companies/CompanyEditPage";
import { ConvertedUsersPage } from "../pages/converted-users/ConvertedUsersPage";
import { TasksListPage } from "../pages/tasks/TasksListPage";
import { TaskCreatePage } from "../pages/tasks/TaskCreatePage";
import { TaskBulkAssignPage } from "../pages/tasks/TaskBulkAssignPage";
import { TaskEditPage } from "../pages/tasks/TaskEditPage";
import { TasksTeamStatusPage } from "../pages/tasks/TasksTeamStatusPage";
import { DayReportPage } from "../pages/tasks/DayReportPage";
import { TeamDayReportsPage } from "../pages/tasks/TeamDayReportsPage";
import { UsersListPage } from "../pages/users/UsersListPage";
import { UserCreatePage } from "../pages/users/UserCreatePage";
import { UserEditPage } from "../pages/users/UserEditPage";
import { RolesListPage } from "../pages/roles/RolesListPage";
import { RoleCreatePage } from "../pages/roles/RoleCreatePage";
import { RoleEditPage } from "../pages/roles/RoleEditPage";
import { DepartmentsListPage } from "../pages/departments/DepartmentsListPage";
import { DepartmentCreatePage } from "../pages/departments/DepartmentCreatePage";
import { DepartmentEditPage } from "../pages/departments/DepartmentEditPage";
import { IntegrationsPage } from "../pages/settings/IntegrationsPage";
import { AttendancePage } from "../pages/attendance/AttendancePage";
import { MyAttendanceRequestsPage } from "../pages/attendance-requests/MyAttendanceRequestsPage";
import { AttendanceRequestApprovalsPage } from "../pages/attendance-requests/AttendanceRequestApprovalsPage";
import { AuditLogPage } from "../pages/audit/AuditLogPage";
import { TicketsListPage } from "../pages/tickets/TicketsListPage";
import { TicketCreatePage } from "../pages/tickets/TicketCreatePage";
import { TicketEditPage } from "../pages/tickets/TicketEditPage";
import { RmFundingRequestsPage } from "../pages/rm-requests/RmFundingRequestsPage";
import { RmManualRequestsPage } from "../pages/rm-requests/RmManualRequestsPage";
import { BlogListPage } from "../pages/blog/BlogListPage";
import { NotFoundPage } from "../pages/NotFoundPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route element={<RequirePermission permissions={["leads:read"]} />}>
            {/* Registered before "/leads/:id" so "followups"/"contacted" are never captured as a lead id. */}
            <Route path="/leads/followups" element={<LeadFollowupsDuePage />} />
            <Route path="/leads/contacted" element={<LeadContactedTodayPage />} />
            <Route path="/leads" element={<LeadsListPage />} />
            <Route path="/leads/:id" element={<LeadEditPage />} />
          </Route>
          <Route element={<RequirePermission permissions={["leads:create"]} />}>
            <Route path="/leads/new" element={<LeadCreatePage />} />
          </Route>

          <Route element={<RequirePermission permissions={["leads:read"]} />}>
            <Route path="/whatsapp/inbox" element={<WhatsappInboxPage />} />
            <Route path="/telegram/inbox" element={<TelegramInboxPage />} />
          </Route>

          <Route element={<RequirePermission permissions={["mail:read"]} />}>
            <Route path="/mail" element={<MailInboxPage />} />
          </Route>

          <Route element={<RequirePermission permissions={["contacts:read"]} />}>
            <Route path="/contacts" element={<ContactsListPage />} />
            <Route path="/contacts/:id" element={<ContactEditPage />} />
          </Route>
          <Route element={<RequirePermission permissions={["contacts:create"]} />}>
            <Route path="/contacts/new" element={<ContactCreatePage />} />
          </Route>

          <Route element={<RequirePermission permissions={["companies:read"]} />}>
            <Route path="/companies" element={<CompaniesListPage />} />
            <Route path="/companies/:id" element={<CompanyEditPage />} />
          </Route>
          <Route element={<RequirePermission permissions={["companies:create"]} />}>
            <Route path="/companies/new" element={<CompanyCreatePage />} />
          </Route>

          <Route element={<RequirePermission permissions={["leads:read"]} />}>
            <Route path="/converted-users" element={<ConvertedUsersPage />} />
          </Route>

          <Route element={<RequirePermission permissions={["tasks:read"]} />}>
            <Route path="/tasks" element={<TasksListPage />} />
            <Route path="/tasks/:id" element={<TaskEditPage />} />
            {/* Nested so both tasks:read AND users:read are required (RequirePermission
                itself is an OR across its own list) — this view is a Users-list variant. */}
            <Route element={<RequirePermission permissions={["users:read"]} />}>
              <Route path="/tasks/team" element={<TasksTeamStatusPage />} />
            </Route>
            {/* Reachable only from the Tasks page (TasksListPage's "Day Report" button) —
                deliberately no sidebar entry. Submitting/viewing your own report needs
                nothing beyond tasks:read; viewing everyone's is Super-Admin-only. */}
            <Route path="/tasks/day-report" element={<DayReportPage />} />
            <Route element={<RequirePermission permissions={["daily_reports:read"]} />}>
              <Route path="/tasks/day-report/team" element={<TeamDayReportsPage />} />
            </Route>
          </Route>
          <Route element={<RequirePermission permissions={["tasks:create"]} />}>
            <Route path="/tasks/new" element={<TaskCreatePage />} />
            <Route path="/tasks/bulk-assign" element={<TaskBulkAssignPage />} />
          </Route>

          <Route element={<RequirePermission permissions={["users:read"]} />}>
            <Route path="/users" element={<UsersListPage />} />
            <Route path="/users/:id" element={<UserEditPage />} />
          </Route>
          <Route element={<RequirePermission permissions={["users:create"]} />}>
            <Route path="/users/new" element={<UserCreatePage />} />
          </Route>

          <Route element={<RequirePermission permissions={["roles:read"]} />}>
            <Route path="/roles" element={<RolesListPage />} />
            <Route path="/roles/:id" element={<RoleEditPage />} />
          </Route>
          <Route element={<RequirePermission permissions={["roles:create"]} />}>
            <Route path="/roles/new" element={<RoleCreatePage />} />
          </Route>

          <Route element={<RequirePermission permissions={["departments:read"]} />}>
            <Route path="/departments" element={<DepartmentsListPage />} />
            <Route path="/departments/:id" element={<DepartmentEditPage />} />
          </Route>
          <Route element={<RequirePermission permissions={["departments:create"]} />}>
            <Route path="/departments/new" element={<DepartmentCreatePage />} />
          </Route>

          <Route element={<RequirePermission permissions={["settings:manage_integrations"]} />}>
            <Route path="/settings/integrations" element={<IntegrationsPage />} />
          </Route>

          <Route element={<RequirePermission permissions={["attendance:read"]} />}>
            <Route path="/attendance" element={<AttendancePage />} />
          </Route>

          <Route path="/attendance-requests" element={<MyAttendanceRequestsPage />} />
          <Route element={<RequirePermission permissions={["attendance_requests:approve"]} />}>
            <Route path="/attendance-requests/review" element={<AttendanceRequestApprovalsPage />} />
          </Route>

          <Route element={<RequirePermission permissions={["audit:read"]} />}>
            <Route path="/audit" element={<AuditLogPage />} />
          </Route>

          <Route element={<RequirePermission permissions={["tickets:read"]} />}>
            <Route path="/tickets" element={<TicketsListPage />} />
            <Route path="/tickets/:id" element={<TicketEditPage />} />
          </Route>
          <Route element={<RequirePermission permissions={["tickets:create"]} />}>
            <Route path="/tickets/new" element={<TicketCreatePage />} />
          </Route>

          <Route element={<RequirePermission permissions={["rm_requests:read"]} />}>
            <Route path="/rm-requests/funding" element={<RmFundingRequestsPage />} />
            <Route path="/rm-requests/manual" element={<RmManualRequestsPage />} />
          </Route>

          <Route element={<RequirePermission permissions={["blog:read"]} />}>
            <Route path="/blog" element={<BlogListPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
