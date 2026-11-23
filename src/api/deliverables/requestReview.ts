import type { RequestReviewApi } from "wasp/server/api";
import { HttpError } from "wasp/server";

export const requestReviewApi: RequestReviewApi<{ id: string; reviewerId: string; note?: string }, any> = async (args, context) => { if (!context.user) throw new HttpError(401); const { requestReview } = await import("../../services/operations"); return requestReview({ id: args.id, reviewerId: args.reviewerId, note: args.note }, context); };