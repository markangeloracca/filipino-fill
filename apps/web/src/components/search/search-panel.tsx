"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ChevronLeft, MapPinned, Search, SearchX, Star, X } from "lucide-react"
import { useId, useRef, useState, type KeyboardEvent, type RefObject } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { CATEGORY_META, SEARCH_SUGGESTIONS } from "@/lib/categories"
import { cn } from "@/lib/utils"
import { CATEGORIES, type Category, type EstablishmentSummary } from "@/lib/types"

interface SearchPanelProps {
  query: string
  onQueryChange: (q: string) => void
  category: Category | null
  onCategoryChange: (c: Category | null) => void
  results: EstablishmentSummary[] | null
  loading: boolean
  error: string | null
  onRetry: () => void
  totalCount: number
  highlightedId: string | null
  onHighlight: (id: string | null) => void
  onSelect: (id: string) => void
  /** Owned by the dashboard so the sidebar and the "/" shortcut can focus the input. */
  inputRef: RefObject<HTMLInputElement | null>
  onCollapse: () => void
  panelId: string
}

export function SearchPanel(props: SearchPanelProps) {
  const { query, onQueryChange, category, onCategoryChange, results, loading, error, onRetry, totalCount, highlightedId, onHighlight, onSelect, inputRef, onCollapse, panelId } = props
  const listRef = useRef<HTMLUListElement>(null)
  const [activeState, setActiveState] = useState<{ results: EstablishmentSummary[] | null; index: number }>({ results: null, index: -1 })
  // A new result list resets keyboard focus without an effect.
  const activeIndex = activeState.results === results ? activeState.index : -1
  const listId = useId()
  const statusId = useId()
  const active = query.trim().length > 0 || category !== null

  function moveActive(next: number) {
    if (!results?.length) return
    const i = (next + results.length) % results.length
    setActiveState({ results, index: i })
    onHighlight(results[i].id)
    listRef.current?.querySelectorAll<HTMLElement>("[data-result]")[i]?.scrollIntoView({ block: "nearest" })
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      moveActive(activeIndex + 1)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      moveActive(activeIndex - 1)
    } else if (e.key === "Enter" && results?.length) {
      e.preventDefault()
      onSelect(results[Math.max(activeIndex, 0)].id)
    } else if (e.key === "Escape" && query) {
      e.preventDefault()
      onQueryChange("")
    }
  }

  const activeDescendant = activeIndex >= 0 && results?.[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined

  return (
    <section
      id={panelId}
      aria-label="Search Filipino establishments"
      className="pointer-events-auto flex max-h-[60dvh] w-full md:max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_1px_2px_0_rgb(0_0_0/0.05),0_8px_24px_-6px_rgb(0_0_0/0.12)] backdrop-blur-md md:w-[400px]"
    >
      <header className="flex items-center gap-3 pt-5 pr-3 pb-4 pl-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-[clamp(1.05rem,1rem+0.3vw,1.2rem)] leading-tight font-semibold tracking-tight text-foreground">Filipino Fill</h1>
          <p className="text-xs text-muted-foreground">Filipino food, shops &amp; services in Calgary</p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-controls={panelId}
          aria-expanded
          aria-label="Hide search panel"
          title="Hide search panel"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none active:scale-95"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      </header>

      <div className="px-4">
        <div className="group relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={!!results?.length}
            aria-controls={listId}
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
            aria-describedby={statusId}
            placeholder="Search adobo, pandesal, remittance…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onInputKeyDown}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full rounded-xl border border-input bg-muted/60 pr-16 pl-10 text-base text-foreground transition-[border-color,box-shadow,background-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] outline-none placeholder:text-muted-foreground hover:border-foreground/30 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-ring/30 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1">
            {query ? (
              <button
                type="button"
                onClick={() => {
                  onQueryChange("")
                  inputRef.current?.focus()
                }}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none active:scale-95"
                aria-label="Clear search"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : (
              <kbd className="hidden rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">/</kbd>
            )}
          </div>
        </div>
      </div>

      <nav aria-label="Filter by category" className="relative mt-3">
        <ul className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => {
            const { label, icon: Icon } = CATEGORY_META[c]
            const selected = category === c
            return (
              <li key={c} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onCategoryChange(selected ? null : c)}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.97]",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted/60"
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border">
        <p id={statusId} className="sr-only" aria-live="polite">
          {loading ? "Searching" : results ? `${results.length} result${results.length === 1 ? "" : "s"}` : ""}
        </p>

        {!active ? (
          <IdleState totalCount={totalCount} onPick={onQueryChange} />
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
            <AlertCircle className="size-6 text-red-600" aria-hidden />
            <p className="text-sm text-foreground/80">{error}</p>
            <button onClick={onRetry} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none">
              Try again
            </button>
          </div>
        ) : loading && !results ? (
          <ResultSkeleton />
        ) : results && results.length === 0 ? (
          <EmptyState query={query} category={category} onPick={onQueryChange} onClear={() => { onQueryChange(""); onCategoryChange(null) }} />
        ) : results ? (
          <>
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {results.length} {results.length === 1 ? "place" : "places"}
              </p>
              {loading && <span className="size-1.5 animate-pulse rounded-full bg-red-600" aria-hidden />}
            </div>
            <ul ref={listRef} id={listId} role="listbox" aria-label="Search results" className="px-2 pb-3">
              <AnimatePresence initial={false}>
                {results.map((e, i) => (
                  <motion.li
                    key={e.id}
                    id={`${listId}-${e.id}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    data-result
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.025, duration: 0.18 } }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  >
                    <ResultRow
                      e={e}
                      active={i === activeIndex || highlightedId === e.id}
                      onSelect={() => onSelect(e.id)}
                      onHover={(on) => onHighlight(on ? e.id : null)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </>
        ) : null}
      </div>
    </section>
  )
}

function ResultRow({ e, active, onSelect, onHover }: { e: EstablishmentSummary; active: boolean; onSelect: () => void; onHover: (on: boolean) => void }) {
  const { label, icon: Icon } = CATEGORY_META[e.category]
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none active:bg-muted",
        active ? "bg-muted" : "hover:bg-muted/60"
      )}
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
        {e.coverPhotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- generated SVG mock photos
          <img src={e.coverPhotoUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight text-foreground">{e.name}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <Icon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            {label} · {e.neighbourhood}
          </span>
        </p>
        {e.rating !== null && (
          <p className="mt-1 flex items-center gap-1 text-xs text-foreground/80">
            <Star className="size-3 fill-amber-400 text-amber-500" aria-hidden />
            <span className="font-medium">{e.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({e.reviewCount})</span>
          </p>
        )}
      </div>
      <span className={cn("size-2 shrink-0 rounded-full bg-red-600 transition-opacity", active ? "opacity-100" : "opacity-0")} aria-hidden />
    </button>
  )
}

function ResultSkeleton() {
  return (
    <div className="px-2 pt-4 pb-3" aria-hidden>
      <Skeleton className="mx-3 mb-3 h-3 w-20" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="size-14 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SuggestionChips({ onPick }: { onPick: (q: string) => void }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {SEARCH_SUGGESTIONS.map((s) => (
        <li key={s}>
          <button
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full border border-dashed border-input px-3 py-1 text-xs text-foreground/80 transition-colors hover:border-foreground/40 hover:bg-muted/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.97]"
          >
            {s}
          </button>
        </li>
      ))}
    </ul>
  )
}

function IdleState({ totalCount, onPick }: { totalCount: number; onPick: (q: string) => void }) {
  return (
    <div className="space-y-4 px-5 py-5">
      <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4 ring-1 ring-foreground/10">
        <MapPinned className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
        <p className="text-sm leading-relaxed text-foreground/80">
          {totalCount > 0 ? (
            <>
              <span className="font-semibold text-foreground">{totalCount} Filipino places</span> are on the map. Search or pick a category to light them up.
            </>
          ) : (
            "Search or pick a category to find Filipino places across Calgary."
          )}
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Try searching</p>
        <SuggestionChips onPick={onPick} />
      </div>
    </div>
  )
}

function EmptyState({ query, category, onPick, onClear }: { query: string; category: Category | null; onPick: (q: string) => void; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Walang nahanap — nothing found</p>
        <p className="text-sm text-muted-foreground">
          No matches for {query ? <span className="font-medium text-foreground">“{query}”</span> : "this filter"}
          {category ? ` in ${CATEGORY_META[category].label.toLowerCase()}` : ""}.
        </p>
      </div>
      <SuggestionChips onPick={onPick} />
      <button onClick={onClear} className="text-xs font-medium text-foreground/80 underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none">
        Clear search &amp; filters
      </button>
    </div>
  )
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 shadow-sm ring-1 ring-white/10", className)} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-6">
        <g fill="#fcd116">
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x="11.2" y="2.5" width="1.6" height="4.5" rx="0.8" transform={`rotate(${i * 45} 12 12)`} />
          ))}
          <circle cx="12" cy="12" r="3.6" />
        </g>
      </svg>
    </div>
  )
}
