import { env } from "./env"
import type {
  Comment,
  EstablishmentDetail,
  EstablishmentInput,
  EstablishmentSummary,
  Category,
  Me,
  PlatformStats,
} from "./types"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  token?: string | null
  signal?: AbortSignal
}

async function request<T>(path: string, { method = "GET", body, token, signal }: RequestOptions = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach the Filipino Fill API. Is it running?")
  }

  if (res.status === 204) return undefined as T

  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const error = (json as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error
    throw new ApiError(res.status, error?.code ?? "HTTP_ERROR", error?.message ?? res.statusText, error?.details)
  }
  return (json as { data: T }).data
}

/** Human-friendly message for any error thrown by `api.*`. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "VALIDATION_FAILED" && Array.isArray(err.details)) return err.details.join(". ")
    return err.message
  }
  return err instanceof Error ? err.message : "Something went wrong"
}

export const api = {
  searchEstablishments(params: { q?: string; category?: Category; limit?: number }, signal?: AbortSignal) {
    const qs = new URLSearchParams()
    if (params.q) qs.set("q", params.q)
    if (params.category) qs.set("category", params.category)
    qs.set("limit", String(params.limit ?? 100))
    return request<EstablishmentSummary[]>(`/establishments?${qs}`, { signal })
  },
  getEstablishment: (id: string, signal?: AbortSignal) => request<EstablishmentDetail>(`/establishments/${id}`, { signal }),
  listComments: (id: string, signal?: AbortSignal) => request<Comment[]>(`/establishments/${id}/comments`, { signal }),
  createComment: (id: string, body: string, token: string) =>
    request<Comment>(`/establishments/${id}/comments`, { method: "POST", body: { body }, token }),
  deleteComment: (id: string, token: string) => request<void>(`/comments/${id}`, { method: "DELETE", token }),

  me: (token: string) => request<Me>("/me", { token }),
  updateMe: (displayName: string, token: string) => request<Me>("/me", { method: "PATCH", body: { displayName }, token }),

  setupStatus: () => request<{ superAdminExists: boolean }>("/setup/status"),
  claimSuperAdmin: (token: string) => request<Me>("/setup/super-admin", { method: "POST", token }),

  adminStats: (token: string) => request<PlatformStats>("/admin/stats", { token }),
  createEstablishment: (input: EstablishmentInput, token: string) =>
    request<EstablishmentDetail>("/admin/establishments", { method: "POST", body: input, token }),
  updateEstablishment: (id: string, input: Partial<EstablishmentInput>, token: string) =>
    request<EstablishmentDetail>(`/admin/establishments/${id}`, { method: "PATCH", body: input, token }),
  deleteEstablishment: (id: string, token: string) =>
    request<void>(`/admin/establishments/${id}`, { method: "DELETE", token }),
}
