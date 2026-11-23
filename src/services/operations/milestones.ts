import { type CreateMilestone, type UpdateMilestone, type GetMilestoneWithDetails } from "wasp/server/operations";
import { HttpError } from "wasp/server";
import { recordActivity } from "./activities";
import { notifyInitiativeMembers } from "./notifications";

function generateMilestoneKey(existingKeys: string[]): string {
  let num = 1; while (existingKeys.includes(`M${num}`)) num++; return `M${num}`;
}

type CreateMilestoneInput = { initiativeId: string; name: string; description?: string; targetDate?: string; leadId?: string };

export const createMilestone: CreateMilestone<CreateMilestoneInput, { milestone: any }> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: args.initiativeId, userId: context.user.id } } });
  if (!membership || !["OWNER", "LEAD"].includes(membership.role)) throw new HttpError(403);
  const initiative = await context.entities.Initiative.findUnique({ where: { id: args.initiativeId }, include: { milestones: true } });
  if (!initiative) throw new HttpError(404);
  const key = generateMilestoneKey(initiative.milestones.map((m: any) => m.key));
  const milestone = await context.entities.Milestone.create({ data: { key, name: args.name, description: args.description ?? null, targetDate: args.targetDate ? new Date(args.targetDate) : null, leadId: args.leadId ?? null, initiative: { connect: { id: args.initiativeId } } }, include: { deliverables: true, lead: true } });
  await recordActivity({ type: "MILESTONE_CREATED", initiativeId: args.initiativeId, milestoneId: milestone.id, userId: context.user.id, description: `Created milestone "${milestone.name}" (${milestone.key}) in initiative "${initiative.name}"`, metadata: { key: milestone.key, initiativeKey: initiative.key } }, context);
  return { milestone };
};

export const updateMilestone: UpdateMilestone<{ id: string; name?: string; description?: string | null; targetDate?: string | null; status?: string; leadId?: string | null }, { milestone: any }> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  const { id, ...data } = args;
  const milestone = await context.entities.Milestone.findUnique({ where: { id }, include: { initiative: true } });
  if (!milestone) throw new HttpError(404);
  const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: milestone.initiativeId, userId: context.user.id } } });
  const isLead = milestone.leadId === context.user.id;
  if (!membership || (!["OWNER", "LEAD"].includes(membership.role) && !isLead)) throw new HttpError(403);
  const updated = await context.entities.Milestone.update({ where: { id }, data: { ...(data.name && { name: data.name }), ...(data.description !== undefined && { description: data.description }), ...(data.targetDate !== undefined && { targetDate: data.targetDate ? new Date(data.targetDate) : null }), ...(data.status && { status: data.status as any }), ...(data.leadId !== undefined && { leadId: data.leadId }) }, include: { lead: true } });
  await recordActivity({ type: "MILESTONE_STATUS_CHANGED", initiativeId: milestone.initiativeId, milestoneId: id, userId: context.user.id, description: `Updated milestone "${updated.name}"`, metadata: { changes: data } }, context);
  return { milestone: updated };
};

export const getMilestoneWithDetails: GetMilestoneWithDetails<{ id: string }, any> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  const milestone = await context.entities.Milestone.findUnique({ where: { id: args.id }, include: { initiative: { include: { owner: true, members: { include: { user: true } } } }, deliverables: { orderBy: { createdAt: "asc" }, include: { owner: true, reviewer: true, tasks: { include: { assignee: true, reviewer: true } }, evidence: { include: { user: true } }, comments: { include: { user: true } }, dependencies: { include: { dependency: true } }, dependents: { include: { dependent: true } } } }, lead: true } });
  if (!milestone) throw new HttpError(404);
  const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: milestone.initiativeId, userId: context.user.id } } });
  if (!membership) throw new HttpError(403);
  return milestone;
};