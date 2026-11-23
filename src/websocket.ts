import { type WebSocketDefinition, type WaspSocketData } from "wasp/server/webSocket";

interface ServerToClientEvents {
  deliverableUpdated: (data: { deliverableId: string; status: string; updatedBy: string }) => void;
  taskUpdated: (data: { taskId: string; status: string; assigneeId?: string }) => void;
  commentAdded: (data: { comment: any }) => void;
  evidenceAdded: (data: { evidence: any }) => void;
  reviewRequested: (data: { deliverableId: string; reviewerId: string }) => void;
  notification: (data: { type: string; title: string; message: string }) => void;
  activityFeed: (data: { activity: any }) => void;
  userPresence: (data: { userId: string; userName: string; page: string; entityId?: string }) => void;
}

interface ClientToServerEvents {
  subscribe: (filters: { initiativeId?: string; milestoneId?: string; deliverableId?: string; taskId?: string }) => void;
  unsubscribe: (filters: { initiativeId?: string; milestoneId?: string; deliverableId?: string; taskId?: string }) => void;
  presence: (data: { page: string; entityId?: string }) => void;
}

interface SocketData extends WaspSocketData {}

export const webSocketFn: WebSocketDefinition<ClientToServerEvents, ServerToClientEvents, {}, SocketData> = (io, context) => {
  io.on("connection", (socket) => {
    const userId = socket.data.user?.id;
    if (!userId) return socket.disconnect();
    socket.join(`user:${userId}`);
    socket.on("subscribe", (filters) => { if (filters.initiativeId) socket.join(`initiative:${filters.initiativeId}`); if (filters.milestoneId) socket.join(`milestone:${filters.milestoneId}`); if (filters.deliverableId) socket.join(`deliverable:${filters.deliverableId}`); if (filters.taskId) socket.join(`task:${filters.taskId}`); });
    socket.on("unsubscribe", (filters) => { if (filters.initiativeId) socket.leave(`initiative:${filters.initiativeId}`); if (filters.milestoneId) socket.leave(`milestone:${filters.milestoneId}`); if (filters.deliverableId) socket.leave(`deliverable:${filters.deliverableId}`); if (filters.taskId) socket.leave(`task:${filters.taskId}`); });
    socket.on("presence", (data) => { if (data.entityId) socket.to(`deliverable:${data.entityId}`).emit("userPresence", { userId, userName: socket.data.user?.name, page: data.page }); });
  });
  return {
    emitDeliverableUpdate: (initiativeId: string, deliverableId: string, status: string, updatedBy: string) => { io.to(`initiative:${initiativeId}`).emit("deliverableUpdated", { deliverableId, status, updatedBy }); io.to(`deliverable:${deliverableId}`).emit("deliverableUpdated", { deliverableId, status, updatedBy }); },
    emitTaskUpdate: (deliverableId: string, taskId: string, status: string, assigneeId?: string) => { io.to(`deliverable:${deliverableId}`).emit("taskUpdated", { taskId, status, assigneeId }); io.to(`task:${taskId}`).emit("taskUpdated", { taskId, status, assigneeId }); },
    emitCommentAdded: (comment: any) => { if (comment.deliverableId) io.to(`deliverable:${comment.deliverableId}`).emit("commentAdded", { comment }); if (comment.taskId) io.to(`task:${comment.taskId}`).emit("commentAdded", { comment }); },
    emitEvidenceAdded: (evidence: any) => { if (evidence.deliverableId) io.to(`deliverable:${evidence.deliverableId}`).emit("evidenceAdded", { evidence }); if (evidence.taskId) io.to(`task:${evidence.taskId}`).emit("evidenceAdded", { evidence }); },
    emitReviewRequested: (deliverableId: string, reviewerId: string) => { io.to(`deliverable:${deliverableId}`).emit("reviewRequested", { deliverableId, reviewerId }); io.to(`user:${reviewerId}`).emit("notification", { type: "REVIEW_REQUESTED", title: "Review requested", message: "A deliverable has been assigned to you for review" }); },
    emitActivity: (activity: any) => { if (activity.initiativeId) io.to(`initiative:${activity.initiativeId}`).emit("activityFeed", { activity }); },
    emitNotification: (userId: string, notification: { type: string; title: string; message: string }) => { io.to(`user:${userId}`).emit("notification", notification); },
  };
};