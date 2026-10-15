"use client"

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useState } from "react"
import { EstablishmentDialog } from "@/components/establishment/establishment-dialog"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { SearchPanel } from "@/components/search/search-panel"
import { SuperAdminSetup } from "@/components/setup/super-admin-setup"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { api, errorMessage } from "@/lib/api"
import type { Category, EstablishmentSummary } from "@/lib/types"

// MapLibre touches `window`/WebGL at import time.
const EstablishmentMap = dynamic(() => import("@/components/map/establishment-map").then((m) => m.EstablishmentMap), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />,
})

export function MapDashboard() {
  const [all, setAll] = useState<EstablishmentSummary[]>([])
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<Category | null>(null)
  const [search, setSearch] = useState<{ key: string; data?: EstablishmentSummary[]; error?: string } | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const debouncedQuery = useDebouncedValue(query.trim(), 200)
  const { resolvedTheme } = useTheme()

  // All establishments render as subtle base dots.
  useEffect(() => {
    const ctrl = new AbortController()
    api
      .searchEstablishments({ limit: 200 }, ctrl.signal)
      .then(setAll)
      .catch(() => {})
    return () => ctrl.abort()
  }, [])

  // Active search → red pins. Stale requests are aborted; results are tagged with their query key.
  const searchActive = debouncedQuery !== "" || category !== null
  const searchKey = `${debouncedQuery}\u0000${category ?? ""}\u0000${retryKey}`
  useEffect(() => {
    if (!searchActive) return
    const ctrl = new AbortController()
    api
      .searchEstablishments({ q: debouncedQuery || undefined, category: category ?? undefined, limit: 100 }, ctrl.signal)
      .then((data) => setSearch({ key: searchKey, data }))
      .catch((err) => !ctrl.signal.aborted && setSearch({ key: searchKey, error: errorMessage(err) }))
    return () => ctrl.abort()
  }, [searchActive, searchKey, debouncedQuery, category])

  const fresh = search?.key === searchKey
  // While a new query loads, keep showing the previous results to avoid flicker.
  const results = searchActive ? (search?.data ?? null) : null
  const error = searchActive && fresh ? (search?.error ?? null) : null
  const loading = searchActive && (!fresh || query.trim() !== debouncedQuery)

  const select = useCallback((id: string) => setSelectedId(id), [])

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-muted">
      <EstablishmentMap
        all={all}
        results={results}
        highlightedId={highlightedId}
        focusedId={selectedId}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onSelect={select}
        onHighlight={setHighlightedId}
      />

      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3 md:inset-x-4 md:top-4">
        <div className="min-w-0 flex-1 md:flex-none">
          <SearchPanel
            query={query}
            onQueryChange={setQuery}
            category={category}
            onCategoryChange={setCategory}
            results={results}
            loading={loading}
            error={error}
            onRetry={() => setRetryKey((k) => k + 1)}
            totalCount={all.length}
            highlightedId={highlightedId}
            onHighlight={setHighlightedId}
            onSelect={select}
          />
        </div>
        <nav aria-label="Account and display" className="pointer-events-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </nav>
      </div>

      <EstablishmentDialog establishmentId={selectedId} onClose={() => setSelectedId(null)} />
      <SuperAdminSetup />
    </main>
  )
}
