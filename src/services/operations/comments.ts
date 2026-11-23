import { type AddComment } from "wasp/server/operations";
import { HttpError } from "wasp/server";
import { recordActivity } from "./activities";
import { notifyUser } from "./notifications";

type AddCommentInput = { deliverableId?: string; taskId?: string; content: string; parentId?: string };

export const addComment: AddComment<AddCommentInput, { comment: any }> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  if (!args.deliverableId && !args.taskId) throw new HttpError(400, "Must provide deliverableId or taskId");
  let deliverable: any = null; let task: any = null; let initiativeId: string | null = null; let milestoneId: string | null = null;
  if (args.deliverableId) { deliverable = await context.entities.Deliverable.findUnique({ where: { id: args.deliverableId }, include: { milestone: { include: { initiative: true } } } }); if (!deliverable) throw new HttpError(404, "Deliverable not found"); initiativeId = deliverable.milestone.initiativeId; milestoneId = deliverable.milestoneId; }
  if (args.taskId) { task = await context.entities.Task.findUnique({ where: { id: args.taskId }, include: { deliverable: { include: { milestone: { include: { initiative: true } } } } } }); if (!task) throw new HttpError(404, "Task not found"); if (!initiativeId) { initiativeId = task.deliverable.milestone.initiativeId; milestoneId = task.deliverable.milestoneId; deliverable = task.deliverable; } }
  const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: initiativeId!, userId: context.user.id } } }); if (!membership) throw new HttpError(403);
  if (args.parentId) { const parent = await context.entities.Comment.findUnique({ where: { id: args.parentId } }); if (!parent) throw new HttpError(404, "Parent comment not found"); const parentDeliverableId = parent.deliverableId ?? (await context.entities.Task.findUnique({ where: { id: parent.taskId } }))?.deliverableId; const expectedDeliverableId = args.deliverableId ?? (await context.entities.Task.findUnique({ where: { id: args.taskId } }))?.deliverableId; if (parentDeliverableId !== expectedDeliverableId) throw new HttpError(400, "Parent comment is not in the same deliverable/task"); }
  const comment = await context.entities.Comment.create({ data: { content: args.content, user: { connect: { id: context.user.id } }, ...(args.deliverableId && { deliverable: { connect: { id: args.deliverableId } } }), ...(args.taskId && { task: { connect: { id: args.taskId } } }), ...(args.parentId && { parent: { connect: { id: args.parentId } } }) }, include: { user: true, replies: { include: { user: true } } } });
  await recordActivity({ type: "COMMENT_ADDED", initiativeId: deliverable?.milestone?.initiativeId ?? task?.deliverable?.milestone?.initiativeId, milestoneId: deliverable?.milestoneId ?? task?.deliverable?.milestoneId, deliverableId: args.deliverableId ?? undefined, taskId: args.taskId ?? undefined, userId: context.user.id, description: `Added comment on ${args.deliverableId ? "deliverable" : "task"}`, metadata: { commentId: comment.id, parentId: args.parentId, deliverableId: args.deliverableId, taskId: args.taskId } }, context);
  const notifyUsers = new Set<string>();
  if (deliverable) { if (deliverable.ownerId !== context.user.id) notifyUsers.add(deliverable.ownerId); if (deliverable.reviewerId) notifyUsers.add(deliverable.reviewerId); }
  if (task) { if (task.assigneeId) notifyUsers.add(task.assigneeId); if (task.reviewerId) notifyUsers.add(task.reviewerId); }
  if (args.parentId) { const parentComment = await context.entities.Comment.findUnique({ where: { id: args.parentId }, include: { user: true } }); if (parentComment && parentComment.userId !== context.user.id) notifyUsers.add(parentComment.userId); }
  for (const userId of notifyUsers) { if (userId === context.user.id) continue; await context.entities.User.findUnique({ where: { id: userId } }).then(u => { if (u) notifyUser({ userId, type: "COMMENT_ADDED", title: `New comment on ${deliverable?.key || task?.key}`, message: `${context.user.name || context.user.email} commented: "${args.content.substring(0, 100)}${args.content.length > 100 ? "..." : ""}"`, data: { commentId: comment.id, deliverableId: args.deliverableId, taskId: args.taskId }, context }); }); }
  return { comment };
};