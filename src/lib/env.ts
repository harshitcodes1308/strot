/**
 * Environment variable validation - loaded once at app startup.
 * Throws with all missing variables listed if validation fails.
 * @module
 */

import { z } from "zod";

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  SERP_API_KEY: z.string().min(1, "SERP_API_KEY is required"),
  GOOGLE_PLACES_API_KEY: z.string().min(1, "GOOGLE_PLACES_API_KEY is required"),

  // Clerk (optional - dev mode if absent)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),

  // Optional Phase 5 API keys
  GITHUB_TOKEN: z.string().optional(),
  PRODUCT_HUNT_TOKEN: z.string().optional(),
  X_BEARER_TOKEN: z.string().optional(),
  CRUNCHBASE_API_KEY: z.string().optional(),
  INDIAMART_API_KEY: z.string().optional(),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");

    throw new Error(
      `\n❌ Invalid environment variables:\n${missing}\n\n` +
        `Copy .env.example to .env and fill in the required values.\n`
    );
  }

  // Warn if Clerk isn't configured
  if (!result.data.CLERK_SECRET_KEY) {
    console.warn(
      "[Strot] ⚠ CLERK_SECRET_KEY not set - running in dev-mode auth (simulated users)"
    );
  }

  return result.data;
}

/** Validated, typed environment variables */
export const env = validateEnv();
