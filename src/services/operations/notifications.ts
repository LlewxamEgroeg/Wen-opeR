import { emailSender } from "wasp/server/email";

export type NotificationType = "ASSIGNED" | "MENTIONED" | "REVIEW_REQUESTED" | "STATUS_CHANGED" | "COMMENT_ADDED" | "EVIDENCE_ADDED";

type NotifyInput = { userId: string; type: NotificationType; title: string; message: string; data?: Record<string, unknown>; context: { entities: { User: any; Notification: any } } };

export async function notifyUser(input: NotifyInput): Promise<void> {
  const { Notification, User } = input.context.entities;
  await Notification.create({ data: { type: input.type, title: input.title, message: input.message, data: input.data ?? null, user: { connect: { id: input.userId } }, read: false } });
  const user = await User.findUnique({ where: { id: input.userId } });
  if (!user || !user.email) return;
  const prefs = await input.context.entities.UserPreferences.findUnique({ where: { userId: input.userId } });
  const notifyOn = (prefs?.notifyOn as Record<string, boolean>) ?? {};
  if (!(notifyOn[input.type.toLowerCase()] ?? true)) return;
  try {
    await emailSender.send({ from: { name: "Great Spring", email: "noreply@greatspring.io" }, to: user.email, subject: input.title, text: input.message, html: `<h2>${input.title}</h2><p>${input.message}</p><hr><p><a href="${process.env.WASP_WEB_CLIENT_URL}/dashboard">View in Great Spring Solutions</a></p>` });
  } catch (error) { console.error("Notification email failed:", error); }
}

export async function notifyInitiativeMembers(initiativeId: string, actorId: string, type: NotificationType, title: string, message: string, context: { entities: any }): Promise<void> {
  const memberships = await context.entities.InitiativeMember.findMany({ where: { initiativeId }, include: { user: true } });
  for (const m of memberships) { if (m.userId !== actorId) await notifyUser({ userId: m.userId, type, title, message, context }); }
}