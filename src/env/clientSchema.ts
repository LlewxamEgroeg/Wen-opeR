import * as z from "zod";
import { defineEnvValidationSchema } from "wasp/env";

export const clientEnvValidationSchema = defineEnvValidationSchema(
  z.object({
    REACT_APP_API_URL: z.string().url(),
    REACT_APP_WEBSOCKET_URL: z.string().url().optional(),
  })
);