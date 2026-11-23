import { type CheckOverdueDeliverables } from "wasp/server/jobs";
import { emailSender } from "wasp/server/email";

export const checkOverdueDeliverables: CheckOverdueDeliverables<{}, { notified: number }> = async (_args, context) => {
  const now = new Date();
  const overdueDeliverables = await context.entities.Deliverable.findMany({ where: { dueDate: { lt: now }, status: { notIn: ["DONE", "CANCELLED"] } }, include: { owner: true, reviewer: true, milestone: { include: { initiative: true } } } });
  let notified = 0;
  for (const deliverable of overdueDeliverables) {
    const recentActivity = await context.entities.Activity.findFirst({ where: { deliverableId: deliverable.id, type: "RISK_FLAGGED", createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, metadata: { path: ["autoOverdue"], equals: true } } });
    if (recentActivity) continue;
    if (deliverable.owner) { try { await emailSender.send({ to: deliverable.owner.email, from: { name: "Great Spring", email: "noreply@greatspring.io" }, subject: `⚠️ Overdue: ${deliverable.key} — ${deliverable.name}`, text: `Your deliverable "${deliverable.name}" (${deliverable.key}) was due on ${deliverable.dueDate ? new Date(deliverable.dueDate).toLocaleDateString() : "unknown"} and is now overdue.\n\nStatus: ${deliverable.status}\nInitiative: ${deliverable.milestone.initiative.name}\nMilestone: ${deliverable.milestone.name}\n\nView: ${process.env.WASP_WEB_CLIENT_URL}/initiatives/${deliverable.milestone.initiativeId}/milestones/${deliverable.milestoneId}/deliverables/${deliverable.id}`, html: `<h2>⚠️ Overdue Deliverable</h2><p><strong>${deliverable.key}</strong>: ${deliverable.name}</p><p>Due: ${deliverable.dueDate ? new Date(deliverable.dueDate).toLocaleDateString() : "unknown"}</p><p>Status: ${deliverable.status}</p><p>Initiative: ${deliverable.milestone.initiative.name}</p><p>Milestone: ${deliverable.milestone.name}</p><p><a href="${process.env.WASP_WEB_CLIENT_URL}/initiatives/${deliverable.milestone.initiativeId}/milestones/${deliverable.milestoneId}/deliverables/${deliverable.id}">View in Great Spring Solutions</a></p>` }); notified++; } catch (error) { console.error(`Failed to send overdue notification for ${deliverable.key}:`, error); } }
    await context.entities.Activity.create({ data: { type: "RISK_FLAGGED", initiativeId: deliverable.milestone.initiativeId, milestoneId: deliverable.milestoneId, deliverableId: deliverable.id, userId: "system", description: `Deliverable "${deliverable.name}" (${deliverable.key}) is overdue`, metadata: { autoOverdue: true, daysOverdue: Math.floor((now.getTime() - new Date(deliverable.dueDate!).getTime()) / (1000 * 60 * 60 * 24)) } } });
  }
  return { notified };
};