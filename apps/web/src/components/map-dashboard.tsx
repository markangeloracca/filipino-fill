"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Search } from "lucide-react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { EstablishmentDialog } from "@/components/establishment/establishment-dialog"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { BrandMark, SearchPanel } from "@/components/search/search-panel"
import { SuperAdminSetup } from "@/components/setup/super-admin-setup"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
  const [panelOpen, setPanelOpen] = useState(true)
  const reduceMotion = useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)
  const sidebarSearchRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  // Where focus should land once the panel's visibility change has committed (inert must be lifted first).
  const pendingFocus = useRef<"input" | "sidebar" | null>(null)

  const showPanel = useCallback(() => {
    pendingFocus.current = "input"
    setPanelOpen(true)
  }, [])
  const hidePanel = useCallback(() => {
    pendingFocus.current = "sidebar"
    setPanelOpen(false)
  }, [])

  useEffect(() => {
    const target = pendingFocus.current
    pendingFocus.current = null
    if (target === "input") inputRef.current?.focus()
    else if (target === "sidebar") sidebarSearchRef.current?.focus()
  }, [panelOpen])

  // "/" opens (if hidden) and focuses search from anywhere, unless typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      e.preventDefault()
      if (panelOpen) inputRef.current?.focus()
      else showPanel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [panelOpen, showPanel])

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

  const panelTransition = reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }

  return (
    <main className="flex h-dvh w-full overflow-hidden bg-muted">
      <aside
        aria-label="Sidebar"
        className="z-20 flex w-14 shrink-0 flex-col items-center gap-3 border-r border-border bg-card py-3 shadow-[1px_0_2px_0_rgb(0_0_0/0.04)] md:w-16 md:py-4"
      >
        <BrandMark className="size-9 md:size-10" />
        <nav aria-label="Panels" className="flex flex-col items-center">
          <AnimatePresence initial={false}>
            {!panelOpen && (
              <motion.div
                key="sidebar-search"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={panelTransition}
              >
                <Tooltip>
                  <TooltipTrigger
                    ref={sidebarSearchRef}
                    onClick={showPanel}
                    aria-label={searchActive ? "Show search panel (search active)" : "Show search panel"}
                    aria-expanded={false}
                    aria-controls={panelId}
                    className="relative flex size-11 items-center justify-center rounded-xl text-foreground/80 transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none active:scale-95"
                  >
                    <Search className="size-5" aria-hidden />
                    {searchActive && <span className="absolute top-2 right-2 size-2 rounded-full bg-red-600 ring-2 ring-card dark:bg-red-400" aria-hidden />}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    Show search <kbd data-slot="kbd" className="rounded-sm bg-background/20 px-1 font-mono">/</kbd>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </aside>

      <div className="relative min-w-0 flex-1">
        <EstablishmentMap
          all={all}
          results={results}
          highlightedId={highlightedId}
          focusedId={selectedId}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          onSelect={select}
          onHighlight={setHighlightedId}
          panelOpen={panelOpen}
        />

        {/* Phones: account controls sit above a full-width panel; md+: side by side. */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col-reverse gap-2 md:inset-x-4 md:top-4 md:flex-row md:items-start md:justify-between md:gap-3">
          <motion.div
            className="min-w-0 md:flex-none"
            initial={false}
            animate={panelOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: -24 }}
            transition={panelTransition}
            inert={!panelOpen}
          >
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
              inputRef={inputRef}
              onCollapse={hidePanel}
              panelId={panelId}
            />
          </motion.div>
          <nav aria-label="Account and display" className="pointer-events-auto flex shrink-0 items-center gap-2 self-end md:self-auto">
            <ThemeToggle />
            <UserMenu />
          </nav>
        </div>
      </div>

      <EstablishmentDialog establishmentId={selectedId} onClose={() => setSelectedId(null)} />
      <SuperAdminSetup />
    </main>
  )
}
