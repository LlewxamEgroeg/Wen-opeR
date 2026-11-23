import { type CreateInitiative, type UpdateInitiative, type GetMyInitiatives, type GetInitiativeWithDetails } from "wasp/server/operations";
import { HttpError } from "wasp/server";
import { recordActivity } from "./activities";
import { notifyInitiativeMembers } from "./notifications";

function generateKey(prefix: string): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${year}-${random}`;
}

type CreateInitiativeInput = { name: string; description: string; targetDate?: string; startDate?: string };

export const createInitiative: CreateInitiative<CreateInitiativeInput, { initiative: any }> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  const key = generateKey("GS");
  const initiative = await context.entities.Initiative.create({
    data: { key, name: args.name, description: args.description, targetDate: args.targetDate ? new Date(args.targetDate) : null, startDate: args.startDate ? new Date(args.startDate) : null, owner: { connect: { id: context.user.id } }, members: { create: { userId: context.user.id, role: "OWNER" } } },
    include: { members: { include: { user: true } }, milestones: true },
  });
  await recordActivity({ type: "INITIATIVE_CREATED", initiativeId: initiative.id, userId: context.user.id, description: `Created initiative "${initiative.name}" (${initiative.key})`, metadata: { key: initiative.key } }, context);
  return { initiative };
};

export const updateInitiative: UpdateInitiative<{ id: string; name?: string; description?: string; targetDate?: string | null; startDate?: string | null; status?: string }, { initiative: any }> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  const { id, ...data } = args;
  const initiative = await context.entities.Initiative.findUnique({ where: { id } });
  if (!initiative) throw new HttpError(404);
  const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: id, userId: context.user.id } } });
  if (!membership || !["OWNER", "LEAD"].includes(membership.role)) throw new HttpError(403);
  const updated = await context.entities.Initiative.update({ where: { id }, data: { ...(data.name && { name: data.name }), ...(data.description !== undefined && { description: data.description }), ...(data.targetDate !== undefined && { targetDate: data.targetDate ? new Date(data.targetDate) : null }), ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }), ...(data.status && { status: data.status as any }) } });
  await recordActivity({ type: "INITIATIVE_STATUS_CHANGED", initiativeId: id, userId: context.user.id, description: `Updated initiative "${updated.name}"`, metadata: { changes: data } }, context);
  return { initiative: updated };
};

export const getMyInitiatives: GetMyInitiatives<{}, any[]> = async (_args, context) => {
  if (!context.user) throw new HttpError(401);
  const memberships = await context.entities.InitiativeMember.findMany({ where: { userId: context.user.id }, include: { initiative: { include: { milestones: { include: { deliverables: true } }, owner: true } } }, orderBy: { joinedAt: "desc" } });
  return memberships.map(m => ({ initiative: m.initiative, myRole: m.role, joinedAt: m.joinedAt, milestonesCount: m.initiative.milestones.length, activeDeliverables: m.initiative.milestones.flatMap((ms: any) => ms.deliverables).filter((d: any) => ["IN_PROGRESS", "IN_REVIEW", "BLOCKED"].includes(d.status)).length }));
};

export const getInitiativeWithDetails: GetInitiativeWithDetails<{ id: string }, any> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: args.id, userId: context.user.id } } });
  if (!membership) throw new HttpError(403);
  const initiative = await context.entities.Initiative.findUnique({ where: { id: args.id }, include: { owner: true, members: { include: { user: true } }, milestones: { orderBy: { createdAt: "asc" }, include: { deliverables: { orderBy: { createdAt: "asc" }, include: { owner: true, reviewer: true, tasks: { include: { assignee: true, reviewer: true } }, evidence: { include: { user: true } }, comments: { include: { user: true } }, dependencies: { include: { dependency: true } }, dependents: { include: { dependent: true } } } } } } });
  if (!initiative) throw new HttpError(404);
  const allDeliverables = initiative.milestones.flatMap((m: any) => m.deliverables);
  const statusCounts = allDeliverables.reduce((acc: Record<string, number>, d: any) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {});
  const overdue = allDeliverables.filter((d: any) => d.dueDate && new Date(d.dueDate) < new Date() && !["DONE", "CANCELLED"].includes(d.status)).length;
  const atRisk = allDeliverables.filter((d: any) => d.status === "AT_RISK" || d.status === "BLOCKED").length;
  return { initiative, milestones: initiative.milestones, summary: { totalDeliverables: allDeliverables.length, byStatus: statusCounts, overdue, atRisk } };
};