import type { GetInitiativesList } from "wasp/server/api";
import { HttpError } from "wasp/server";

export const getInitiativesList: GetInitiativesList<{ cursor?: string; limit?: number }, any> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  const limit = Math.min(args.limit ?? 20, 100);
  const cursor = args.cursor;
  const memberships = await context.entities.InitiativeMember.findMany({ where: { userId: context.user.id }, include: { initiative: { include: { owner: true, milestones: { include: { deliverables: true } } } }, orderBy: { joinedAt: "desc" }, take: limit + 1, ...(cursor && { cursor: { id: cursor }, skip: 1 }) });
  const hasMore = memberships.length > limit;
  const items = hasMore ? memberships.slice(0, -1) : memberships;
  return { items: items.map(m => ({ initiative: m.initiative, myRole: m.role, joinedAt: m.joinedAt, milestonesCount: m.initiative.milestones.length, activeDeliverables: m.initiative.milestones.flatMap((ms: any) => ms.deliverables).filter((d: any) => ["IN_PROGRESS", "IN_REVIEW", "BLOCKED"].includes(d.status)).length })), nextCursor: hasMore ? items[items.length - 1].initiative.id : null };
};