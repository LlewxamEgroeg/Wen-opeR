import { type CreateDeliverable, type UpdateDeliverable, type TransitionDeliverableStatus, type RequestReview, type ApproveDeliverable, type RejectDeliverable, type GetDeliverableWithDetails, type GetUpcomingReviews } from "wasp/server/operations";
import { HttpError } from "wasp/server";
import { recordActivity } from "./activities";
import { notifyUser, notifyInitiativeMembers } from "./notifications";
import { checkDependenciesMet } from "./dependencies";

function generateDeliverableKey(existingKeys: string[]): string { let num = 1; while (existingKeys.includes(`D-${num}`)) num++; return `D-${num}`; }

const VALID_TRANSITIONS: Record<string, string[]> = { DRAFT: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["IN_REVIEW", "BLOCKED", "DRAFT"], IN_REVIEW: ["APPROVED", "REJECTED", "IN_PROGRESS"], APPROVED: ["DONE", "IN_REVIEW"], REJECTED: ["IN_PROGRESS", "DRAFT"], BLOCKED: ["IN_PROGRESS", "DRAFT"], DONE: [], CANCELLED: [] };

type CreateDeliverableInput = { milestoneId: string; name: string; description: string; acceptance: string; type?: string; ownerId?: string; reviewerId?: string; dueDate?: string };

export const createDeliverable: CreateDeliverable<CreateDeliverableInput, { deliverable: any }> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  const milestone = await context.entities.Milestone.findUnique({ where: { id: args.milestoneId }, include: { initiative: true } });
  if (!milestone) throw new HttpError(404);
  const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: milestone.initiativeId, userId: context.user.id } } });
  if (!membership) throw new HttpError(403);
  const existingKeys = (await context.entities.Deliverable.findMany({ where: { milestoneId: args.milestoneId }, select: { key: true } })).map(d => d.key);
  const key = generateDeliverableKey(existingKeys);
  const ownerId = args.ownerId ?? context.user.id;
  const deliverable = await context.entities.Deliverable.create({ data: { key, name: args.name, description: args.description, acceptance: args.acceptance, type: (args.type as any) ?? "DOCUMENT", dueDate: args.dueDate ? new Date(args.dueDate) : null, owner: { connect: { id: ownerId } }, reviewer: args.reviewerId ? { connect: { id: args.reviewerId } } : undefined, milestone: { connect: { id: args.milestoneId } } }, include: { milestone: { include: { initiative: true } }, owner: true, reviewer: true } });
  await recordActivity({ type: "DELIVERABLE_CREATED", initiativeId: milestone.initiativeId, milestoneId: milestone.id, deliverableId: deliverable.id, userId: context.user.id, description: `Created deliverable "${deliverable.name}" (${deliverable.key})`, metadata: { key: deliverable.key, type: deliverable.type, acceptanceLength: deliverable.acceptance.length } }, context);
  if (ownerId !== context.user.id) await notifyUser({ userId: ownerId, type: "ASSIGNED", title: `Assigned as owner of ${deliverable.key}`, message: `You have been assigned as owner of "${deliverable.name}" (${deliverable.key})`, data: { deliverableId: deliverable.id }, context });
  if (args.reviewerId && args.reviewerId !== ownerId && args.reviewerId !== context.user.id) await notifyUser({ userId: args.reviewerId, type: "REVIEW_REQUESTED", title: `Review requested for ${deliverable.key}`, message: `You have been assigned as reviewer for "${deliverable.name}" (${deliverable.key})`, data: { deliverableId: deliverable.id }, context });
  return { deliverable };
};

export const updateDeliverable: UpdateDeliverable<{ id: string; name?: string; description?: string; acceptance?: string; type?: string; dueDate?: string | null; ownerId?: string; reviewerId?: string | null }, { deliverable: any }> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  const { id, ...data } = args;
  const deliverable = await context.entities.Deliverable.findUnique({ where: { id }, include: { milestone: { include: { initiative: true } } } });
  if (!deliverable) throw new HttpError(404);
  const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: deliverable.milestone.initiativeId, userId: context.user.id } } });
  const isOwner = deliverable.ownerId === context.user.id; const isReviewer = deliverable.reviewerId === context.user.id; const isLead = membership && ["OWNER", "LEAD"].includes(membership.role);
  if (!membership || !(isOwner || isReviewer || isLead)) throw new HttpError(403);
  const updated = await context.entities.Deliverable.update({ where: { id }, data: { ...(data.name && { name: data.name }), ...(data.description !== undefined && { description: data.description }), ...(data.acceptance && { acceptance: data.acceptance }), ...(data.type && { type: data.type as any }), ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }), ...(data.ownerId && { ownerId: data.ownerId }), ...(data.reviewerId !== undefined && { reviewerId: data.reviewerId }) }, include: { owner: true, reviewer: true, milestone: { include: { initiative: true } } } });
  await recordActivity({ type: "DELIVERABLE_STATUS_CHANGED", initiativeId: deliverable.milestone.initiativeId, milestoneId: deliverable.milestoneId, deliverableId: id, userId: context.user.id, description: `Updated deliverable "${updated.name}"`, metadata: { changes: Object.keys(data) } }, context);
  return { deliverable: updated };
};

async function canUserTransitionDeliverable(userId: string, deliverable: any, newStatus: string, context: { entities: any }): Promise<boolean> {
  if (deliverable.ownerId === userId) return true;
  if (deliverable.reviewerId === userId && ["APPROVED", "REJECTED"].includes(newStatus)) return true;
  const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: deliverable.milestone.initiativeId, userId } } });
  if (membership && ["OWNER", "LEAD"].includes(membership.role)) return true;
  return false;
}

export const transitionDeliverableStatus: TransitionDeliverableStatus<{ id: string; status: string; comment?: string }, { deliverable: any }> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  const deliverable = await context.entities.Deliverable.findUnique({ where: { id: args.id }, include: { milestone: { include: { initiative: true } } } });
  if (!deliverable) throw new HttpError(404);
  const canTransition = await canUserTransitionDeliverable(context.user.id, deliverable, args.status, context);
  if (!canTransition) throw new HttpError(403, "Not authorized for this transition");
  if (args.status === "IN_REVIEW") { if (!deliverable.reviewerId) throw new HttpError(400, "Reviewer must be assigned before review"); if (!(await checkDependenciesMet(deliverable.id, context))) throw new HttpError(400, "All blocking dependencies must be DONE before review"); }
  if (!VALID_TRANSITIONS[deliverable.status]?.includes(args.status)) throw new HttpError(400, `Cannot transition from ${deliverable.status} to ${args.status}`);
  const updated = await context.entities.Deliverable.update({ where: { id: args.id }, data: { status: args.status as any, ...(args.status === "DONE" && { completedAt: new Date() }), ...(args.status === "APPROVED" && { completedAt: new Date() }) }, include: { milestone: { include: { initiative: true } }, owner: true, reviewer: true } });
  await recordActivity({ type: "DELIVERABLE_STATUS_CHANGED", initiativeId: deliverable.milestone.initiativeId, milestoneId: deliverable.milestoneId, deliverableId: args.id, userId: context.user.id, description: `Changed deliverable "${deliverable.name}" status: ${deliverable.status} → ${args.status}`, metadata: { from: deliverable.status, to: args.status, comment: args.comment } }, context);
  if (args.status === "IN_REVIEW" && deliverable.reviewerId) await notifyUser({ userId: deliverable.reviewerId, type: "REVIEW_REQUESTED", title: `Review requested: ${deliverable.name}`, message: `${context.user.name || context.user.email} requested your review of "${deliverable.name}" (${deliverable.key})`, data: { deliverableId: args.id }, context });
  if (args.status === "APPROVED" && deliverable.ownerId) await notifyUser({ userId: deliverable.ownerId, type: "STATUS_CHANGED", title: `Deliverable approved: ${deliverable.name}`, message: `Your deliverable "${deliverable.name}" (${deliverable.key}) has been approved`, data: { deliverableId: args.id }, context });
  if (args.status === "REJECTED" && deliverable.ownerId) await notifyUser({ userId: deliverable.ownerId, type: "STATUS_CHANGED", title: `Deliverable rejected: ${deliverable.name}`, message: `Your deliverable "${deliverable.name}" (${deliverable.key}) was rejected: ${args.comment || "No reason provided"}`, data: { deliverableId: args.id, reason: args.comment }, context });
  return { deliverable: updated };
};

export const requestReview: RequestReview<{ id: string; reviewerId: string; note?: string }, { deliverable: any }> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  const deliverable = await context.entities.Deliverable.findUnique({ where: { id: args.id }, include: { milestone: { include: { initiative: true } } } });
  if (!deliverable) throw new HttpError(404);
  const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: deliverable.milestone.initiativeId, userId: context.user.id } } });
  const isOwner = deliverable.ownerId === context.user.id; const isLead = membership && ["OWNER", "LEAD"].includes(membership.role);
  if (!membership || !(isOwner || isLead)) throw new HttpError(403);
  if (!(await checkDependenciesMet(args.id, context))) throw new HttpError(400, "All blocking dependencies must be DONE before review");
  const updated = await context.entities.Deliverable.update({ where: { id: args.id }, data: { reviewerId: args.reviewerId, status: "IN_REVIEW" }, include: { milestone: { include: { initiative: true } }, owner: true, reviewer: true } });
  await recordActivity({ type: "DELIVERABLE_REVIEW_REQUESTED", initiativeId: deliverable.milestone.initiativeId, milestoneId: deliverable.milestoneId, deliverableId: args.id, userId: context.user.id, description: `Requested review for "${deliverable.name}" from ${(await context.entities.User.findUnique({ where: { id: args.reviewerId } }))?.name || args.reviewerId}`, metadata: { reviewerId: args.reviewerId, note: args.note } }, context);
  await notifyUser({ userId: args.reviewerId, type: "REVIEW_REQUESTED", title: `Review requested: ${deliverable.name}`, message: `${context.user.name || context.user.email} requested your review of "${deliverable.name}" (${deliverable.key})`, data: { deliverableId: args.id, note: args.note }, context });
  return { deliverable: updated };
};

export const approveDeliverable: ApproveDeliverable<{ id: string; comment?: string }, { deliverable: any }> = async (args, context) => { if (!context.user) throw new HttpError(401); const deliverable = await context.entities.Deliverable.findUnique({ where: { id: args.id }, include: { milestone: { include: { initiative: true } } } }); if (!deliverable) throw new HttpError(404); if (deliverable.reviewerId !== context.user.id) throw new HttpError(403, "Only the assigned reviewer can approve"); if (deliverable.status !== "IN_REVIEW") throw new HttpError(400, "Can only approve deliverables in IN_REVIEW status"); return transitionDeliverableStatus({ id: args.id, status: "APPROVED", comment: args.comment }, context); };

export const rejectDeliverable: RejectDeliverable<{ id: string; reason: string }, { deliverable: any }> = async (args, context) => { if (!context.user) throw new HttpError(401); const deliverable = await context.entities.Deliverable.findUnique({ where: { id: args.id }, include: { milestone: { include: { initiative: true } } } }); if (!deliverable) throw new HttpError(404); if (deliverable.reviewerId !== context.user.id) throw new HttpError(403, "Only the assigned reviewer can reject"); if (deliverable.status !== "IN_REVIEW") throw new HttpError(400, "Can only reject deliverables in IN_REVIEW status"); return transitionDeliverableStatus({ id: args.id, status: "REJECTED", comment: args.reason }, context); };

export const getDeliverableWithDetails: GetDeliverableWithDetails<{ id: string }, any> = async (args, context) => { if (!context.user) throw new HttpError(401); const deliverable = await context.entities.Deliverable.findUnique({ where: { id: args.id }, include: { milestone: { include: { initiative: true } }, owner: true, reviewer: true, tasks: { include: { assignee: true, reviewer: true, evidence: true, comments: { include: { user: true } } } }, evidence: { include: { user: true } }, comments: { include: { user: true, replies: { include: { user: true } } } }, dependencies: { include: { dependency: { include: { owner: true, reviewer: true } } } }, dependents: { include: { dependent: { include: { owner: true, reviewer: true } } } } } }); if (!deliverable) throw new HttpError(404); const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: deliverable.milestone.initiativeId, userId: context.user.id } } }); if (!membership) throw new HttpError(403); return deliverable; };

export const getUpcomingReviews: GetUpcomingReviews<{ daysAhead?: number }, any[]> = async (args, context) => { if (!context.user) throw new HttpError(401); const daysAhead = args.daysAhead ?? 14; const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() + daysAhead); return context.entities.Deliverable.findMany({ where: { reviewerId: context.user.id, status: "IN_REVIEW", dueDate: { lte: cutoffDate } }, include: { milestone: { include: { initiative: true } }, owner: true }, orderBy: { dueDate: "asc" } }); };