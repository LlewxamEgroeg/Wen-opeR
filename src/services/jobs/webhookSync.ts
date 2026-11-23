import { type SyncExternalWebhook } from "wasp/server/jobs";
import { recordActivity } from "../operations/activities";

type WebhookPayload = { source: "github" | "gitlab" | "figma" | "vercel" | "linear" | "jira"; event: string; payload: any };

export const syncExternalWebhook: SyncExternalWebhook<WebhookPayload, { synced: boolean }> = async (args, context) => {
  const { source, event, payload } = args;
  try {
    switch (source) {
      case "github": await handleGitHubWebhook(event, payload, context); break;
      case "gitlab": await handleGitLabWebhook(event, payload, context); break;
      case "figma": await handleFigmaWebhook(event, payload, context); break;
      case "vercel": await handleVercelWebhook(event, payload, context); break;
      case "linear": await handleLinearWebhook(event, payload, context); break;
      case "jira": await handleJiraWebhook(event, payload, context); break;
      default: console.warn(`Unknown webhook source: ${source}`);
    }
    return { synced: true };
  } catch (error) { console.error(`Webhook sync failed for ${source}/${event}:`, error); return { synced: false }; }
};

async function handleGitHubWebhook(event: string, payload: any, context: { entities: any }) {
  if (event === "pull_request.opened" || event === "pull_request.synchronize" || event === "pull_request.closed") {
    const pr = payload.pull_request; const repo = payload.repository;
    const deliverableKey = extractDeliverableKey(pr.title) || extractDeliverableKey(pr.head.ref);
    if (deliverableKey) { const deliverable = await context.entities.Deliverable.findFirst({ where: { key: deliverableKey }, include: { milestone: { include: { initiative: true } } } }); if (deliverable) { const action = event === "pull_request.closed" && pr.merged ? "merged" : event === "pull_request.closed" ? "closed" : "updated"; await context.entities.Evidence.create({ data: { type: "PR_LINK", title: `PR #${pr.number}: ${pr.title} (${action})`, description: pr.body ?? null, url: pr.html_url, userId: await getBotUserId(context), deliverableId: deliverable.id } }); await recordActivity({ type: "EVIDENCE_ADDED", initiativeId: deliverable.milestone.initiativeId, milestoneId: deliverable.milestoneId, deliverableId: deliverable.id, userId: "system", description: `GitHub PR #${pr.number} ${action}: ${pr.title}`, metadata: { source: "github", prNumber: pr.number, action, repo: repo.full_name } }, { entities: context.entities }); } }
  }
  if (event === "push") { const repo = payload.repository; const commits = payload.commits; for (const commit of commits) { const deliverableKey = extractDeliverableKey(commit.message); if (deliverableKey) { const deliverable = await context.entities.Deliverable.findFirst({ where: { key: deliverableKey }, include: { milestone: { include: { initiative: true } } } }); if (deliverable) { await context.entities.Evidence.create({ data: { type: "PR_LINK", title: `Commit: ${commit.message.split("\n")[0]}`, description: commit.message, url: commit.url, userId: await getBotUserId(context), deliverableId: deliverable.id } }); } } } }
}

async function handleGitLabWebhook(event: string, payload: any, context: { entities: any }) {
  if (event === "Merge Request Hook") { const mr = payload.object_attributes; const project = payload.project; const deliverableKey = extractDeliverableKey(mr.title) || extractDeliverableKey(mr.source_branch); if (deliverableKey) { const deliverable = await context.entities.Deliverable.findFirst({ where: { key: deliverableKey }, include: { milestone: { include: { initiative: true } } } }); if (deliverable) { const action = mr.state === "merged" ? "merged" : mr.state === "closed" ? "closed" : "updated"; await context.entities.Evidence.create({ data: { type: "PR_LINK", title: `MR !${mr.iid}: ${mr.title} (${action})`, description: mr.description ?? null, url: mr.url, userId: await getBotUserId(context), deliverableId: deliverable.id } }); await recordActivity({ type: "EVIDENCE_ADDED", initiativeId: deliverable.milestone.initiativeId, milestoneId: deliverable.milestoneId, deliverableId: deliverable.id, userId: "system", description: `GitLab MR !${mr.iid} ${action}: ${mr.title}`, metadata: { source: "gitlab", mrIid: mr.iid, action, project: project.path_with_namespace } }, { entities: context.entities }); } } }
}

async function handleFigmaWebhook(event: string, payload: any, context: { entities: any }) {
  if (event === "FILE_UPDATE" || event === "COMMENT_POSTED") { const fileKey = payload.file_key; }
}

async function handleVercelWebhook(event: string, payload: any, context: { entities: any }) {
  if (event === "deployment.created" || event === "deployment.succeeded" || event === "deployment.failed") { const deployment = payload.deployment; const projectName = deployment.project; const deliverable = await context.entities.Deliverable.findFirst({ where: { OR: [{ name: { contains: projectName } }, { key: { contains: projectName } }] }, include: { milestone: { include: { initiative: true } } } }); if (deliverable) { await context.entities.Evidence.create({ data: { type: "DEPLOYMENT_LOG", title: `Vercel deployment ${deployment.state}: ${deployment.url}`, description: `Deployment ${deployment.uid} for ${projectName}`, url: deployment.url, userId: await getBotUserId(context), deliverableId: deliverable.id } }); } }
}

async function handleLinearWebhook(event: string, payload: any, context: { entities: any }) {
  if (event === "Issue" || event === "Comment") { const issue = payload.data; const deliverableKey = extractDeliverableKey(issue.title) || extractDeliverableKey(issue.identifier); if (deliverableKey) { const deliverable = await context.entities.Deliverable.findFirst({ where: { key: deliverableKey }, include: { milestone: { include: { initiative: true } } } }); if (deliverable) { await context.entities.Evidence.create({ data: { type: "DOCUMENT_LINK", title: `Linear ${issue.identifier}: ${issue.title}`, description: issue.description ?? null, url: issue.url, userId: await getBotUserId(context), deliverableId: deliverable.id } }); } } }
}

async function handleJiraWebhook(event: string, payload: any, context: { entities: any }) {
  if (event === "jira:issue_created" || event === "jira:issue_updated" || event === "comment_created") { const issue = payload.issue; const deliverableKey = extractDeliverableKey(issue.fields.summary) || issue.key; if (deliverableKey) { const deliverable = await context.entities.Deliverable.findFirst({ where: { key: deliverableKey }, include: { milestone: { include: { initiative: true } } } }); if (deliverable) { await context.entities.Evidence.create({ data: { type: "DOCUMENT_LINK", title: `Jira ${issue.key}: ${issue.fields.summary}`, description: issue.fields.description ?? null, url: `${payload.webhookEvent ? "" : "https://your-jira-instance"}/browse/${issue.key}`, userId: await getBotUserId(context), deliverableId: deliverable.id } }); } } }
}

function extractDeliverableKey(text: string): string | null { if (!text) return null; const match = text.match(/\bD-\d+\b/); return match ? match[0] : null; }

async function getBotUserId(context: { entities: any }): Promise<string> { let botUser = await context.entities.User.findFirst({ where: { email: "bot@greatspring.io" } }); if (!botUser) { botUser = await context.entities.User.create({ data: { email: "bot@greatspring.io", name: "Great Spring Bot", role: "OBSERVER", hashedPassword: null, identities: null } }); } return botUser.id; }