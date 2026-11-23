import type { GetDeliverableApi } from "wasp/server/api";
import { HttpError } from "wasp/server";

export const getDeliverableApi: GetDeliverableApi<{ id: string }, any> = async (args, context) => { if (!context.user) throw new HttpError(401); const { getDeliverableWithDetails } = await import("../../services/operations"); return getDeliverableWithDetails({ id: args.id }, context); };