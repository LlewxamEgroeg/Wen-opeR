import type { WebhookReceiver } from "wasp/server/api";

export const webhookReceiver = async (req: any, res: any) => {
  try {
    const source = req.params.source;
    const event = req.headers["x-github-event"] || req.headers["x-gitlab-event"] || req.headers["x-figma-event"] || req.headers["x-vercel-event"] || req.headers["x-linear-event"] || "unknown";
    console.log(`Webhook received: ${source}/${event}`);
    const { syncExternalWebhook } = await import("../services/jobs/webhookSync");
    await syncExternalWebhook({ source: source as any, event, payload: req.body });
    res.status(200).json({ received: true });
  } catch (error) { console.error("Webhook processing failed:", error); res.status(500).json({ error: "Webhook processing failed" }); }
};