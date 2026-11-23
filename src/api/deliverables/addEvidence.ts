import type { AddEvidenceApi } from "wasp/server/api";
import { HttpError } from "wasp/server";

export const addEvidenceApi: AddEvidenceApi<{ id: string; type: string; title: string; description?: string; url?: string; fileKey?: string }, any> = async (args, context) => { if (!context.user) throw new HttpError(401); const { addEvidence } = await import("../../services/operations"); return addEvidence({ deliverableId: args.id, type: args.type, title: args.title, description: args.description, url: args.url, fileKey: args.fileKey }, context); };