import type { GetInitiativeApi } from "wasp/server/api";
import { HttpError } from "wasp/server";

export const getInitiativeApi: GetInitiativeApi<{ id: string }, any> = async (args, context) => { if (!context.user) throw new HttpError(401); const { getInitiativeWithDetails } = await import("../../services/operations"); return getInitiativeWithDetails({ id: args.id }, context); };