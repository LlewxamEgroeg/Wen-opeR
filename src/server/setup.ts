import type { ServerSetupFn } from "wasp/server";
import { type Application } from "express";

export const setupFn: ServerSetupFn = async ({ app }) => {
  app.get("/health", (_req, res) => { res.json({ status: "ok", timestamp: new Date().toISOString() }); });
  app.get("/metrics", (_req, res) => { res.json({ uptime: process.uptime(), memory: process.memoryUsage(), timestamp: new Date().toISOString() }); });
  console.log("Server setup complete");
};