import type { ApproveDeliverableApi } from "wasp/server/api";
import { HttpError } from "wasp/server";

export const approveDeliverableApi: ApproveDeliverableApi<{ id: string; comment?: string }, any> = async (args, context) => { if (!context.user) throw new HttpError(401); const { approveDeliverable } = await import("../../services/operations"); return approveDeliverable({ id: args.id, comment: args.comment }, context); };