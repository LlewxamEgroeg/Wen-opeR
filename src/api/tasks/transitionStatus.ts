import type { TransitionTaskStatusApi } from "wasp/server/api";
import { HttpError } from "wasp/server";

export const transitionTaskStatusApi: TransitionTaskStatusApi<{ id: string; status: string }, any> = async (args, context) => { if (!context.user) throw new HttpError(401); const { transitionTaskStatus } = await import("../../services/operations"); return transitionTaskStatus({ id: args.id, status: args.status }, context); };