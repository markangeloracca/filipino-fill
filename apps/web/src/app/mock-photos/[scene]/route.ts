import type { NextRequest } from "next/server"
import { z } from "zod"
import { MOCK_SCENES, renderMockPhoto } from "@/lib/mock-photo"

const querySchema = z.object({
  c: z.string().regex(/^[a-z]{2,20}$/).default("restaurant"),
  n: z.string().trim().min(1).max(120).default("Filipino Fill"),
  s: z.coerce.number().int().min(0).max(1_000_000).default(1),
})

/** GET /mock-photos/:scene?c=<category>&n=<name>&s=<seed> → deterministic SVG. */
export async function GET(request: NextRequest, ctx: RouteContext<"/mock-photos/[scene]">) {
  const { scene } = await ctx.params
  const sceneResult = z.enum(MOCK_SCENES).safeParse(scene)
  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))

  if (!sceneResult.success || !query.success) {
    return Response.json({ error: { code: "BAD_REQUEST", message: "Invalid mock photo parameters" } }, { status: 400 })
  }

  const svg = renderMockPhoto(sceneResult.data, query.data.c, query.data.n, query.data.s)
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Output is a pure function of the URL.
      "Cache-Control": "public, max-age=31536000, immutable",
      "CDN-Cache-Control": "public, s-maxage=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
