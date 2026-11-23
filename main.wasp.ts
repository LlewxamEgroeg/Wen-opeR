import {
  app,
  page,
  route,
  query,
  action,
  job,
  crud,
  api,
  apiNamespace,
  ref,
} from "@wasp.sh/spec";

// Pages
import { LandingPage } from "./src/pages/LandingPage" with { type: "ref" };
import { LoginPage } from "./src/pages/auth/LoginPage" with { type: "ref" };
import { SignupPage } from "./src/pages/auth/SignupPage" with { type: "ref" };
import { EmailVerificationPage } from "./src/pages/auth/EmailVerificationPage" with { type: "ref" };
import { PasswordResetPage } from "./src/pages/auth/PasswordResetPage" with { type: "ref" };
import { DashboardPage } from "./src/pages/DashboardPage" with { type: "ref" };
import { InitiativeDetailPage } from "./src/pages/initiatives/InitiativeDetailPage" with { type: "ref" };
import { MilestoneDetailPage } from "./src/pages/milestones/MilestoneDetailPage" with { type: "ref" };
import { DeliverableDetailPage } from "./src/pages/deliverables/DeliverableDetailPage" with { type: "ref" };
import { TaskDetailPage } from "./src/pages/tasks/TaskDetailPage" with { type: "ref" };
import { SettingsPage } from "./src/pages/SettingsPage" with { type: "ref" };
import { AdminPage } from "./src/pages/admin/AdminPage" with { type: "ref" };

// Auth hooks
import { onAfterSignup } from "./src/auth/hooks" with { type: "ref" };
import { onAfterLogin } from "./src/auth/hooks" with { type: "ref" };
import { userSignupFields } from "./src/auth/signupFields" with { type: "ref" };

// Operations (services)
import {
  getMyInitiatives,
  getInitiativeWithDetails,
  getMilestoneWithDetails,
  getDeliverableWithDetails,
  getTaskWithDetails,
  createInitiative,
  updateInitiative,
  createMilestone,
  updateMilestone,
  createDeliverable,
  updateDeliverable,
  transitionDeliverableStatus,
  requestReview,
  approveDeliverable,
  rejectDeliverable,
  createTask,
  updateTask,
  transitionTaskStatus,
  addEvidence,
  addComment,
  addDependency,
  getMyAssignments,
  getUpcomingReviews,
  getInitiativeActivity,
} from "./src/services/operations" with { type: "ref" };

// Jobs
import {
  rollupInitiativeStatus,
  sendDailyDigest,
  checkOverdueDeliverables,
  generateWeeklyReport,
  syncExternalWebhook,
} from "./src/services/jobs" with { type: "ref" };

// API routes
import { mcpToolsHandler } from "./src/mcp/tools" with { type: "ref" };
import { webhookReceiver } from "./src/api/webhooks" with { type: "ref" };

export default app({
  name: "great_spring_solutions",
  wasp: { version: "^0.26" },
  title: "Great Spring Solutions",
  head: [
    "<link rel='icon' href='/favicon.ico' />",
    "<meta name='description' content='Agentic delivery workspace for outcome-oriented teams' />",
  ],

  auth: {
    userEntity: "User",
    methods: {
      email: {
        userSignupFields,
        fromField: "email",
        emailVerification: { mode: "email" as const },
        passwordReset: { mode: "email" as const },
      },
      google: {},
      gitHub: {},
    },
    onAuthFailedRedirectTo: "/login",
    onAfterSignup,
    onAfterLogin,
  },

  emailSender: {
    provider: process.env.NODE_ENV === "production" ? "Resend" : "Dummy",
    defaultFrom: { name: "Great Spring", email: "noreply@greatspring.io" },
  },

  webSocket: {
    fn: (await import("./src/websocket")).webSocketFn,
    autoConnect: true,
  },

  server: {
    setupFn: ref({ importDefault: "setupFn", from: "./src/server/setup" }),
    middlewareConfigFn: ref({ importDefault: "middlewareConfigFn", from: "./src/server/middleware" }),
    envValidationSchema: ref({ importDefault: "serverEnvValidationSchema", from: "./src/env/serverSchema" }),
  },

  client: {
    envValidationSchema: ref({ importDefault: "clientEnvValidationSchema", from: "./src/env/clientSchema" }),
  },

  spec: [
    route("LandingRoute", "/", page(LandingPage)),
    route("LoginRoute", "/login", page(LoginPage)),
    route("SignupRoute", "/signup", page(SignupPage)),
    route("EmailVerificationRoute", "/verify-email", page(EmailVerificationPage)),
    route("PasswordResetRoute", "/reset-password", page(PasswordResetPage)),

    route("DashboardRoute", "/dashboard", page(DashboardPage, { authRequired: true })),
    route("InitiativeDetailRoute", "/initiatives/:initiativeId", page(InitiativeDetailPage, { authRequired: true })),
    route("MilestoneDetailRoute", "/initiatives/:initiativeId/milestones/:milestoneId", page(MilestoneDetailPage, { authRequired: true })),
    route("DeliverableDetailRoute", "/initiatives/:initiativeId/milestones/:milestoneId/deliverables/:deliverableId", page(DeliverableDetailPage, { authRequired: true })),
    route("TaskDetailRoute", "/initiatives/:initiativeId/milestones/:milestoneId/deliverables/:deliverableId/tasks/:taskId", page(TaskDetailPage, { authRequired: true })),
    route("SettingsRoute", "/settings", page(SettingsPage, { authRequired: true })),
    route("AdminRoute", "/admin", page(AdminPage, { authRequired: true })),

    query(getMyInitiatives, { entities: ["Initiative", "User", "Milestone", "Deliverable", "Task"] }),
    query(getInitiativeWithDetails, { entities: ["Initiative", "Milestone", "Deliverable", "Task", "User", "Activity", "Comment", "Evidence"] }),
    query(getMilestoneWithDetails, { entities: ["Milestone", "Deliverable", "Task", "User", "Activity", "Comment", "Evidence"] }),
    query(getDeliverableWithDetails, { entities: ["Deliverable", "Task", "User", "Activity", "Comment", "Evidence", "DeliverableDependency"] }),
    query(getTaskWithDetails, { entities: ["Task", "User", "Activity", "Comment", "Evidence"] }),
    query(getMyAssignments, { entities: ["Task", "Deliverable", "Milestone", "Initiative", "User"] }),
    query(getUpcomingReviews, { entities: ["Deliverable", "User", "Milestone", "Initiative"] }),
    query(getInitiativeActivity, { entities: ["Activity", "User"] }),

    action(createInitiative, { entities: ["Initiative", "User", "InitiativeMember", "Activity"] }),
    action(updateInitiative, { entities: ["Initiative", "Activity"] }),
    action(createMilestone, { entities: ["Milestone", "Initiative", "Activity"] }),
    action(updateMilestone, { entities: ["Milestone", "Activity"] }),
    action(createDeliverable, { entities: ["Deliverable", "Milestone", "Activity"] }),
    action(updateDeliverable, { entities: ["Deliverable", "Activity"] }),
    action(transitionDeliverableStatus, { entities: ["Deliverable", "Activity", "User"] }),
    action(requestReview, { entities: ["Deliverable", "Activity", "User"] }),
    action(approveDeliverable, { entities: ["Deliverable", "Activity", "User"] }),
    action(rejectDeliverable, { entities: ["Deliverable", "Activity", "User"] }),
    action(createTask, { entities: ["Task", "Deliverable", "Activity", "User"] }),
    action(updateTask, { entities: ["Task", "Activity"] }),
    action(transitionTaskStatus, { entities: ["Task", "Activity", "User"] }),
    action(addEvidence, { entities: ["Evidence", "Deliverable", "Task", "Activity", "User"] }),
    action(addComment, { entities: ["Comment", "Deliverable", "Task", "Activity", "User"] }),
    action(addDependency, { entities: ["DeliverableDependency", "Deliverable", "Activity"] }),

    crud("InitiativeMembers", "InitiativeMember", { getAll: {}, get: {}, create: {}, update: {}, delete: {} }),
    crud("UserPreferences", "UserPreferences", { get: {}, update: {} }),

    job(rollupInitiativeStatus, { executor: "PgBoss", entities: ["Initiative", "Milestone", "Deliverable", "Task", "Activity"], schedule: { cron: "*/15 * * * *", args: {} } }),
    job(sendDailyDigest, { executor: "PgBoss", entities: ["User", "Initiative", "Milestone", "Deliverable", "Task", "Activity"], schedule: { cron: "0 7 * * *", args: {} } }),
    job(checkOverdueDeliverables, { executor: "PgBoss", entities: ["Deliverable", "User", "Activity"], schedule: { cron: "0 9 * * *", args: {} } }),
    job(generateWeeklyReport, { executor: "PgBoss", entities: ["Initiative", "Milestone", "Deliverable", "Task", "User", "Activity"], schedule: { cron: "0 8 * * 1", args: {} } }),
    job(syncExternalWebhook, { executor: "PgBoss", entities: ["Deliverable", "Task", "Evidence", "Activity"] }),

    apiNamespace("/api/v1", { middlewareConfigFn: ref({ importDefault: "apiMiddleware", from: "./src/api/middleware" }) }),
    api("GET", "/api/v1/initiatives", ref({ importDefault: "getInitiativesList", from: "./src/api/initiatives/list" }), { entities: ["Initiative"] }),
    api("POST", "/api/v1/initiatives", ref({ importDefault: "createInitiativeApi", from: "./src/api/initiatives/create" }), { entities: ["Initiative", "User", "InitiativeMember", "Activity"] }),
    api("GET", "/api/v1/initiatives/:id", ref({ importDefault: "getInitiativeApi", from: "./src/api/initiatives/get" }), { entities: ["Initiative", "Milestone", "Deliverable", "Task"] }),
    api("PATCH", "/api/v1/initiatives/:id", ref({ importDefault: "updateInitiativeApi", from: "./src/api/initiatives/update" }), { entities: ["Initiative", "Activity"] }),
    api("GET", "/api/v1/deliverables/:id", ref({ importDefault: "getDeliverableApi", from: "./src/api/deliverables/get" }), { entities: ["Deliverable", "Task", "Evidence", "User"] }),
    api("PATCH", "/api/v1/deliverables/:id/status", ref({ importDefault: "transitionDeliverableStatusApi", from: "./src/api/deliverables/transitionStatus" }), { entities: ["Deliverable", "Activity", "User"] }),
    api("POST", "/api/v1/deliverables/:id/review", ref({ importDefault: "requestReviewApi", from: "./src/api/deliverables/requestReview" }), { entities: ["Deliverable", "Activity", "User"] }),
    api("POST", "/api/v1/deliverables/:id/approve", ref({ importDefault: "approveDeliverableApi", from: "./src/api/deliverables/approve" }), { entities: ["Deliverable", "Activity", "User"] }),
    api("POST", "/api/v1/deliverables/:id/reject", ref({ importDefault: "rejectDeliverableApi", from: "./src/api/deliverables/reject" }), { entities: ["Deliverable", "Activity", "User"] }),
    api("POST", "/api/v1/deliverables/:id/evidence", ref({ importDefault: "addEvidenceApi", from: "./src/api/deliverables/addEvidence" }), { entities: ["Evidence", "Deliverable", "Activity", "User"] }),
    api("GET", "/api/v1/tasks/:id", ref({ importDefault: "getTaskApi", from: "./src/api/tasks/get" }), { entities: ["Task", "User", "Evidence"] }),
    api("PATCH", "/api/v1/tasks/:id/status", ref({ importDefault: "transitionTaskStatusApi", from: "./src/api/tasks/transitionStatus" }), { entities: ["Task", "Activity", "User"] }),
    api("POST", "/api/v1/webhooks/:source", webhookReceiver, { entities: ["Deliverable", "Task", "Evidence", "Activity"] }),

    api("POST", "/mcp", mcpToolsHandler),
  ],

  client: {
    envValidationSchema: ref({ importDefault: "clientEnvValidationSchema", from: "./src/env/clientSchema" }),
  },
  server: {
    setupFn: ref({ importDefault: "setupFn", from: "./src/server/setup" }),
    middlewareConfigFn: ref({ importDefault: "middlewareConfigFn", from: "./src/server/middleware" }),
    envValidationSchema: ref({ importDefault: "serverEnvValidationSchema", from: "./src/env/serverSchema" }),
  },
});