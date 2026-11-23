import { type Activity, type ActivityType } from "wasp/entities";

type RecordActivityInput = {
  type: ActivityType;
  description: string;
  userId: string;
  initiativeId?: string;
  milestoneId?: string;
  deliverableId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
};

export async function recordActivity(input: RecordActivityInput, context: { entities: { Activity: any; User: any } }): Promise<Activity> {
  const { Activity } = context.entities;
  return Activity.create({
    data: {
      type: input.type,
      description: input.description,
      metadata: input.metadata ?? null,
      user: { connect: { id: input.userId } },
      ...(input.initiativeId && { initiative: { connect: { id: input.initiativeId } } }),
      ...(input.milestoneId && { milestone: { connect: { id: input.milestoneId } } }),
      ...(input.deliverableId && { deliverable: { connect: { id: input.deliverableId } } }),
      ...(input.taskId && { task: { connect: { id: input.taskId } } }),
    },
  });
}

export async function getActivityFeed(input: { initiativeId?: string; milestoneId?: string; deliverableId?: string; taskId?: string; userId?: string; limit?: number; offset?: number }, context: { entities: { Activity: any } }): Promise<Activity[]> {
  const { Activity } = context.entities;
  const where: Record<string, unknown> = {};
  if (input.initiativeId) where.initiativeId = input.initiativeId;
  if (input.milestoneId) where.milestoneId = input.milestoneId;
  if (input.deliverableId) where.deliverableId = input.deliverableId;
  if (input.taskId) where.taskId = input.taskId;
  if (input.userId) where.userId = input.userId;
  return Activity.findMany({ where, orderBy: { createdAt: "desc" }, take: input.limit ?? 50, skip: input.offset ?? 0, include: { user: true } });
}