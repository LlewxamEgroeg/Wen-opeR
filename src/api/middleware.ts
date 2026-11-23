import type { MiddlewareConfigFn } from "wasp/server";

export const apiMiddleware: MiddlewareConfigFn = (config) => {
  config.use((_req, res, next) => { res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); next(); });
  return config;
};