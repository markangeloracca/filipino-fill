import { z } from "zod"

// NEXT_PUBLIC_* values are inlined at build time, so they must be referenced literally.
const parsed = z
  .object({
    // Absolute URL locally; "/api" in production, where Vercel Services serves the API on the same origin.
    NEXT_PUBLIC_API_URL: z.union([z.url(), z.string().regex(/^\/[\w/-]*[^/]$/, "must be an absolute URL or a path like /api")]),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
    NEXT_PUBLIC_DEV_MAILBOX_URL: z.url().optional(),
  })
  .safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_DEV_MAILBOX_URL: process.env.NEXT_PUBLIC_DEV_MAILBOX_URL || undefined,
  })

if (!parsed.success) {
  throw new Error(
    `Invalid public environment. Copy apps/web/.env.example to .env.local.\n${parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n")}`
  )
}

export const env = parsed.data
