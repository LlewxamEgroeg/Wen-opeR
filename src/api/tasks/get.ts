import type { GetTaskApi } from "wasp/server/api";
import { HttpError } from "wasp/server";

export const getTaskApi: GetTaskApi<{ id: string }, any> = async (args, context) => { if (!context.user) throw new HttpError(401); const { getTaskWithDetails } = await import("../../services/operations"); return getTaskWithDetails({ id: args.id }, context); };