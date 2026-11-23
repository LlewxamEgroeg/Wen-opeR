import type { CreateInitiativeApi } from "wasp/server/api";
import { HttpError } from "wasp/server";

export const createInitiativeApi: CreateInitiativeApi<{ name: string; description: string; targetDate?: string; startDate?: string }, any> = async (args, context) => { if (!context.user) throw new HttpError(401); const { createInitiative } = await import("../../services/operations"); return createInitiative({ name: args.name, description: args.description, targetDate: args.targetDate, startDate: args.startDate }, context); };