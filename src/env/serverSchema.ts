import * as z from "zod";
import { defineEnvValidationSchema } from "wasp/env";

export const serverEnvValidationSchema = defineEnvValidationSchema(
  z.object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    WASP_SERVER_URL: z.string().url(),
    WASP_WEB_CLIENT_URL: z.string().url(),
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USERNAME: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    GITLAB_WEBHOOK_SECRET: z.string().optional(),
    FIGMA_WEBHOOK_SECRET: z.string().optional(),
    VERCEL_WEBHOOK_SECRET: z.string().optional(),
    LINEAR_WEBHOOK_SECRET: z.string().optional(),
    JIRA_WEBHOOK_SECRET: z.string().optional(),
    PG_BOSS_NEW_OPTIONS: z.string().optional(),
    PORT: z.coerce.number().default(3001),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  })
);