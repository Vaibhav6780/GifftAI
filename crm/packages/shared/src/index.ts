// Explicit named re-exports (not `export *`) — TypeScript compiles `export *` to a
// runtime __exportStar helper that Rollup's static analyzer can't see through, which
// silently breaks named-import resolution in the production Vite build of apps/web.

export { PERMISSIONS, ROLES } from "./constants/permissions.js";
export type { PermissionKey, RoleName } from "./constants/permissions.js";

export type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  PaginationQuery,
  PaginatedResult,
} from "./types/api.js";

export type { AuthUser, AuthTokens, LoginResult } from "./types/auth.js";

export { passwordSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "./schemas/auth.schema.js";
export type { LoginInput, ForgotPasswordInput, ResetPasswordInput } from "./schemas/auth.schema.js";

export type { UserStatus, UserRoleRef, UserSummary, UserDetail, UserTaskCounts } from "./types/users.js";
export type { RoleSummary, RoleDetail, PermissionCatalogItem, PermissionCatalogGroup } from "./types/roles.js";
export type { DepartmentNode, DepartmentChildRef, DepartmentDetail } from "./types/departments.js";

export {
  userStatusSchema,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  setUserRolesSchema,
  setUserPasswordSchema,
  listUsersQuerySchema,
} from "./schemas/users.schema.js";
export type {
  UserStatusInput,
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  SetUserRolesInput,
  SetUserPasswordInput,
  ListUsersQuery,
} from "./schemas/users.schema.js";

export {
  permissionKeySchema,
  createRoleSchema,
  updateRoleSchema,
  setRolePermissionsSchema,
} from "./schemas/roles.schema.js";
export type { CreateRoleInput, UpdateRoleInput, SetRolePermissionsInput } from "./schemas/roles.schema.js";

export { createDepartmentSchema, updateDepartmentSchema } from "./schemas/departments.schema.js";
export type { CreateDepartmentInput, UpdateDepartmentInput } from "./schemas/departments.schema.js";

export type {
  LeadStatus,
  LeadBrand,
  LeadSourceOption,
  LeadSummary,
  LeadDetail,
  LeadNote,
  LeadActivityEntry,
  LeadStatusCounts,
  LeadContactedSummary,
  LeadFollowupSummary,
} from "./types/leads.js";

export {
  leadStatusSchema,
  leadBrandSchema,
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  bulkAssignLeadsSchema,
  createLeadNoteSchema,
  markLeadContactedSchema,
  listLeadsQuerySchema,
  exportLeadsQuerySchema,
  leadsStatsQuerySchema,
  contactedLeadsQuerySchema,
  listLeadFollowupsQuerySchema,
} from "./schemas/leads.schema.js";
export type {
  LeadStatusInput,
  LeadBrandInput,
  CreateLeadInput,
  UpdateLeadInput,
  AssignLeadInput,
  BulkAssignLeadsInput,
  CreateLeadNoteInput,
  MarkLeadContactedInput,
  ListLeadsQuery,
  ExportLeadsQuery,
  LeadsStatsQuery,
  ContactedLeadsQuery,
  ListLeadFollowupsQuery,
} from "./schemas/leads.schema.js";

export type {
  IntegrationChannelType,
  IntegrationStatus,
  IntegrationConnectionSummary,
  LinkedInImportResult,
  LeadTimelineEntry,
  WhatsappAccountInfo,
  WhatsappSyncContactsResult,
  WhatsappSyncConversationResult,
  WhatsappHistoryImportStatus,
  WhatsappHistoryImportProgress,
  WhatsappInboxConversation,
  TelegramInboxConversation,
  MailAccountInfo,
  MailInboxConversation,
  MailMessageDetail,
  MailSentMessage,
  MailComposeResult,
} from "./types/integrations.js";

export { MAILBOX_ADDRESS, MAILBOX_ALIASES, MAILBOX_ALL_ADDRESSES } from "./constants/mail.js";
export type { MailboxAddress } from "./constants/mail.js";

export type {
  AttendanceStatus,
  AttendanceLocation,
  AttendanceSessionSummary,
  CurrentAttendanceStatus,
} from "./types/attendance.js";
export { listAttendanceQuerySchema, exportAttendanceQuerySchema } from "./schemas/attendance.schema.js";
export type { ListAttendanceQuery, ExportAttendanceQuery } from "./schemas/attendance.schema.js";

export type { AttendanceRequestType, AttendanceRequestStatus, AttendanceRequestSummary } from "./types/attendanceRequests.js";
export {
  attendanceRequestTypeSchema,
  attendanceRequestStatusSchema,
  createAttendanceRequestSchema,
  reviewAttendanceRequestSchema,
  listAttendanceRequestsQuerySchema,
  listMyAttendanceRequestsQuerySchema,
  exportAttendanceRequestsQuerySchema,
} from "./schemas/attendanceRequests.schema.js";
export type {
  AttendanceRequestTypeInput,
  AttendanceRequestStatusInput,
  CreateAttendanceRequestInput,
  ReviewAttendanceRequestInput,
  ListAttendanceRequestsQuery,
  ListMyAttendanceRequestsQuery,
  ExportAttendanceRequestsQuery,
} from "./schemas/attendanceRequests.schema.js";

export type { DailyReportSummary } from "./types/dailyReports.js";
export {
  submitDailyReportSchema,
  listDailyReportsQuerySchema,
  listMyDailyReportsQuerySchema,
} from "./schemas/dailyReports.schema.js";
export type {
  SubmitDailyReportInput,
  ListDailyReportsQuery,
  ListMyDailyReportsQuery,
} from "./schemas/dailyReports.schema.js";

export type { DashboardStatusCount, DashboardSourceCount, DashboardSummary } from "./types/dashboard.js";

export type { AuditLogEntry } from "./types/audit.js";
export { listAuditLogQuerySchema } from "./schemas/audit.schema.js";
export type { ListAuditLogQuery } from "./schemas/audit.schema.js";

export type { CompanySummary, CompanyDetail, CompanyOption } from "./types/companies.js";
export {
  createCompanySchema,
  updateCompanySchema,
  listCompaniesQuerySchema,
} from "./schemas/companies.schema.js";
export type { CreateCompanyInput, UpdateCompanyInput, ListCompaniesQuery } from "./schemas/companies.schema.js";

export type {
  TicketStatus,
  TicketPriority,
  TicketCategoryOption,
  TicketSummary,
  TicketDetail,
  TicketAttachment,
} from "./types/tickets.js";
export {
  ticketStatusSchema,
  ticketPrioritySchema,
  createTicketSchema,
  updateTicketSchema,
  assignTicketSchema,
  listTicketsQuerySchema,
} from "./schemas/tickets.schema.js";
export type {
  TicketStatusInput,
  TicketPriorityInput,
  CreateTicketInput,
  UpdateTicketInput,
  AssignTicketInput,
  ListTicketsQuery,
} from "./schemas/tickets.schema.js";

export type { KycStatus, ContactSummary, ContactDetail } from "./types/contacts.js";

export type {
  RmFundingRequestSummary,
  RmManualRequestSummary,
  RmEntry,
  RmRequestsConnectionStatus,
} from "./types/rmRequests.js";
export {
  rmFundingRequestStatusSchema,
  rmManualRequestStatusSchema,
  listRmFundingRequestsQuerySchema,
  listRmManualRequestsQuerySchema,
  rejectRmFundingRequestSchema,
  setRmManualRequestStatusSchema,
  assignRmUserSchema,
} from "./schemas/rmRequests.schema.js";
export type {
  RmFundingRequestStatus,
  RmManualRequestStatus,
  ListRmFundingRequestsQuery,
  ListRmManualRequestsQuery,
  RejectRmFundingRequestInput,
  SetRmManualRequestStatusInput,
  AssignRmUserInput,
} from "./schemas/rmRequests.schema.js";

export type {
  BlogPostStatus,
  BlogPostListItem,
  BlogPostDetail,
  BlogPostListResult,
  BlogSlugCheck,
  BlogImageUploadResult,
  BlogConnectionStatus,
} from "./types/blog.js";
export {
  blogPostStatusSchema,
  blogPostInputSchema,
  listBlogPostsQuerySchema,
  blogSlugCheckQuerySchema,
} from "./schemas/blog.schema.js";
export type {
  BlogPostStatusInput,
  BlogPostInput,
  ListBlogPostsQuery,
  BlogSlugCheckQuery,
} from "./schemas/blog.schema.js";

export type { TaskType, TaskPriority, TaskStatus, TaskSummary, TaskDetail, TaskComment, TaskActivityEntry } from "./types/tasks.js";
export {
  taskTypeSchema,
  taskPrioritySchema,
  taskStatusSchema,
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  bulkCreateTaskItemSchema,
  bulkCreateTasksSchema,
  createTaskCommentSchema,
} from "./schemas/tasks.schema.js";
export type {
  TaskTypeInput,
  TaskPriorityInput,
  TaskStatusInput,
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksQuery,
  BulkCreateTaskItemInput,
  BulkCreateTasksInput,
  CreateTaskCommentInput,
} from "./schemas/tasks.schema.js";
export {
  kycStatusSchema,
  createContactSchema,
  updateContactSchema,
  listContactsQuerySchema,
} from "./schemas/contacts.schema.js";
export type {
  KycStatusInput,
  CreateContactInput,
  UpdateContactInput,
  ListContactsQuery,
} from "./schemas/contacts.schema.js";

export {
  websiteContactFormSchema,
  websiteSupportTicketSchema,
  whatsappConnectSchema,
  whatsappReplySchema,
  telegramConnectSchema,
  integrationChannelTypeSchema,
  whatsappInboxQuerySchema,
  telegramInboxQuerySchema,
  telegramReplySchema,
  mailConnectSchema,
  mailInboxQuerySchema,
  mailSentQuerySchema,
  mailComposeSchema,
  mailReplySchema,
} from "./schemas/integrations.schema.js";
export { isBeforeAttendanceRequestCutoff } from "./lib/attendanceRequestCutoff.js";
export { isHalfDayLogin } from "./lib/halfDay.js";
export {
  computeOvertimeMinutes,
  formatOvertimeMinutes,
  isPastOvertimeCutoff,
  combineIstTime,
  getOvertimeCutoff,
} from "./lib/overtime.js";

export type {
  WebsiteContactFormInput,
  WebsiteSupportTicketInput,
  WhatsappConnectInput,
  WhatsappReplyInput,
  TelegramConnectInput,
  IntegrationChannelTypeInput,
  WhatsappInboxQuery,
  TelegramInboxQuery,
  TelegramReplyInput,
  MailConnectInput,
  MailInboxQuery,
  MailSentQuery,
  MailComposeInput,
  MailReplyInput,
} from "./schemas/integrations.schema.js";
