import type { TransitionDeliverableStatusApi } from "wasp/server/api";
import { HttpError } from "wasp/server";

export const transitionDeliverableStatusApi: TransitionDeliverableStatusApi<{ id: string; status: string; comment?: string }, any> = async (args, context) => { if (!context.user) throw new HttpError(401); const { transitionDeliverableStatus } = await import("../../services/operations"); return transitionDeliverableStatus({ id: args.id, status: args.status, comment: args.comment }, context); };