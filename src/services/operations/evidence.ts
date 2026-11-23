import { type AddEvidence } from "wasp/server/operations";
import { HttpError } from "wasp/server";
import { recordActivity } from "./activities";
import { notifyUser } from "./notifications";

type AddEvidenceInput = { deliverableId?: string; taskId?: string; type: string; title: string; description?: string; url?: string; fileKey?: string; mimeType?: string; sizeBytes?: number };

export const addEvidence: AddEvidence<AddEvidenceInput, { evidence: any }> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  if (!args.deliverableId && !args.taskId) throw new HttpError(400, "Must provide deliverableId or taskId");
  let deliverable: any = null; let task: any = null; let initiativeId: string | null = null; let milestoneId: string | null = null;
  if (args.deliverableId) { deliverable = await context.entities.Deliverable.findUnique({ where: { id: args.deliverableId }, include: { milestone: { include: { initiative: true } } } }); if (!deliverable) throw new HttpError(404, "Deliverable not found"); initiativeId = deliverable.milestone.initiativeId; milestoneId = deliverable.milestoneId; }
  if (args.taskId) { task = await context.entities.Task.findUnique({ where: { id: args.taskId }, include: { deliverable: { include: { milestone: { include: { initiative: true } } } } } }); if (!task) throw new HttpError(404, "Task not found"); if (!initiativeId) { initiativeId = task.deliverable.milestone.initiativeId; milestoneId = task.deliverable.milestoneId; deliverable = task.deliverable; } }
  const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: initiativeId!, userId: context.user.id } } }); if (!membership) throw new HttpError(403);
  const evidence = await context.entities.Evidence.create({ data: { type: args.type as any, title: args.title, description: args.description ?? null, url: args.url ?? null, fileKey: args.fileKey ?? null, mimeType: args.mimeType ?? null, sizeBytes: args.sizeBytes ?? null, user: { connect: { id: context.user.id } }, ...(args.deliverableId && { deliverable: { connect: { id: args.deliverableId } } }), ...(args.taskId && { task: { connect: { id: args.taskId } } }) }, include: { user: true, deliverable: true, task: true } });
  await recordActivity({ type: "EVIDENCE_ADDED", initiativeId: initiativeId!, milestoneId: milestoneId ?? undefined, deliverableId: args.deliverableId ?? undefined, taskId: args.taskId ?? undefined, userId: context.user.id, description: `Added ${args.type} evidence: "${args.title}"`, metadata: { evidenceType: args.type, deliverableId: args.deliverableId, taskId: args.taskId } }, context);
  if (deliverable) { if (deliverable.ownerId !== context.user.id) await notifyUser({ userId: deliverable.ownerId, type: "EVIDENCE_ADDED", title: `Evidence added to ${deliverable.key}`, message: `${context.user.name || context.user.email} added ${args.type} evidence "${args.title}" to ${deliverable.key}`, data: { evidenceId: evidence.id, deliverableId: deliverable.id }, context }); if (deliverable.reviewerId && deliverable.reviewerId !== context.user.id && deliverable.reviewerId !== deliverable.ownerId) await notifyUser({ userId: deliverable.reviewerId, type: "EVIDENCE_ADDED", title: `Evidence added to ${deliverable.key} (in review)`, message: `${context.user.name || context.user.email} added ${args.type} evidence "${args.title}" to ${deliverable.key}`, data: { evidenceId: evidence.id, deliverableId: deliverable.id }, context }); }
  return { evidence };
};