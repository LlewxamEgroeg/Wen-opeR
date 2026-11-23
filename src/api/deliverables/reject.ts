import type { RejectDeliverableApi } from "wasp/server/api";
import { HttpError } from "wasp/server";

export const rejectDeliverableApi: RejectDeliverableApi<{ id: string; reason: string }, any> = async (args, context) => { if (!context.user) throw new HttpError(401); const { rejectDeliverable } = await import("../../services/operations"); return rejectDeliverable({ id: args.id, reason: args.reason }, context); };