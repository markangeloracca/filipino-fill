"use client"

import { BadgeCheck, CalendarDays, Clock, Globe, Mail, MapPin, Phone, Star } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { api, errorMessage } from "@/lib/api"
import { CATEGORY_META } from "@/lib/categories"
import { calgaryNow, formatRange, isOpenNow, priceLabel, WEEKDAY_LABELS } from "@/lib/format"
import { cn } from "@/lib/utils"
import { WEEKDAYS, type EstablishmentDetail } from "@/lib/types"
import { CommentsSection } from "./comments-section"
import { PhotoCarousel } from "./photo-carousel"

interface EstablishmentDialogProps {
  establishmentId: string | null
  onClose: () => void
}

export function EstablishmentDialog({ establishmentId, onClose }: EstablishmentDialogProps) {
  // Results are tagged with the id they belong to, so a stale result never shows for a new id.
  const [result, setResult] = useState<{ id: string; detail?: EstablishmentDetail; error?: string } | null>(null)
  // Keep the last id while the close animation runs.
  const [shownId, setShownId] = useState<string | null>(establishmentId)
  if (establishmentId && establishmentId !== shownId) setShownId(establishmentId)

  useEffect(() => {
    if (!establishmentId) return
    const ctrl = new AbortController()
    api
      .getEstablishment(establishmentId, ctrl.signal)
      .then((detail) => setResult({ id: establishmentId, detail }))
      .catch((err) => !ctrl.signal.aborted && setResult({ id: establishmentId, error: errorMessage(err) }))
    return () => ctrl.abort()
  }, [establishmentId])

  const current = result?.id === shownId ? result : null
  const detail = current?.detail ?? null
  const error = current?.error ?? null

  return (
    <Dialog open={establishmentId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton
        // Close button sits over photos: give it a light chip so it stays legible on dark images.
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-3xl [&>[data-slot=dialog-close]]:top-3 [&>[data-slot=dialog-close]]:right-3 [&>[data-slot=dialog-close]]:z-10 [&>[data-slot=dialog-close]]:size-8 [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:bg-white/90 [&>[data-slot=dialog-close]]:text-zinc-900 [&>[data-slot=dialog-close]]:shadow-sm [&>[data-slot=dialog-close]]:backdrop-blur [&>[data-slot=dialog-close]]:hover:bg-white"
      >
        {error ? (
          <div className="p-8">
            <DialogTitle>Couldn&apos;t load this place</DialogTitle>
            <DialogDescription className="mt-2">{error}</DialogDescription>
          </div>
        ) : !detail ? (
          <DetailSkeleton />
        ) : (
          <DetailBody detail={detail} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DetailBody({ detail: d }: { detail: EstablishmentDetail }) {
  const { label, icon: CategoryIcon } = CATEGORY_META[d.category]
  const now = calgaryNow()
  const open = isOpenNow(d.hours, now)
  const hasHours = Object.keys(d.hours).length > 0

  return (
    <article>
      <PhotoCarousel photos={d.photos} name={d.name} />

      <div className="space-y-8 p-6 sm:p-8">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground/80">
              <CategoryIcon className="size-3.5" aria-hidden />
              {label}
            </span>
            {d.isFilipinoOwned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 text-xs font-medium text-blue-800 dark:text-blue-200 ring-1 ring-blue-200 dark:ring-blue-800/70">
                <BadgeCheck className="size-3.5" aria-hidden /> Filipino-owned
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 text-xs font-medium text-amber-900 dark:text-amber-200 ring-1 ring-amber-200 dark:ring-amber-800/70">
                Caters to Filipinos
              </span>
            )}
            {open !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
                  open ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 ring-emerald-200 dark:ring-emerald-800/70" : "bg-muted text-foreground/80 ring-border"
                )}
              >
                <span className={cn("size-1.5 rounded-full", open ? "bg-emerald-600 dark:bg-emerald-400" : "bg-muted-foreground")} aria-hidden />
                {open ? "Open now" : "Closed now"}
              </span>
            )}
          </div>
          <DialogTitle className="text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] leading-tight font-semibold tracking-tight text-foreground">{d.name}</DialogTitle>
          {d.tagline && <DialogDescription className="text-base text-muted-foreground">{d.tagline}</DialogDescription>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/80">
            {d.rating !== null && (
              <span className="flex items-center gap-1">
                <Star className="size-4 fill-amber-400 text-amber-500" aria-hidden />
                <span className="font-semibold">{d.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({d.reviewCount} reviews)</span>
              </span>
            )}
            {priceLabel(d.priceLevel) && <span aria-label={`Price level ${d.priceLevel} of 4`}>{priceLabel(d.priceLevel)}</span>}
            <span>{d.neighbourhood}</span>
          </div>
        </header>

        <p className="max-w-prose text-[15px] leading-relaxed text-foreground/80">{d.description}</p>

        <div className="grid gap-6 sm:grid-cols-2">
          <section aria-label="Contact and location" className="space-y-3">
            <InfoRow icon={<MapPin aria-hidden />} label="Address">
              {d.address}, {d.city}
              {d.postalCode && ` ${d.postalCode}`}
            </InfoRow>
            {d.phone && (
              <InfoRow icon={<Phone aria-hidden />} label="Phone">
                <a href={`tel:${d.phone.replace(/[^\d+]/g, "")}`} className="link">
                  {d.phone}
                </a>
              </InfoRow>
            )}
            {d.email && (
              <InfoRow icon={<Mail aria-hidden />} label="Email">
                <a href={`mailto:${d.email}`} className="link break-all">
                  {d.email}
                </a>
              </InfoRow>
            )}
            {d.website && (
              <InfoRow icon={<Globe aria-hidden />} label="Website">
                <a href={d.website} target="_blank" rel="noreferrer noopener" className="link break-all">
                  {d.website.replace(/^https?:\/\//, "")}
                </a>
              </InfoRow>
            )}
            {d.establishedYear && (
              <InfoRow icon={<CalendarDays aria-hidden />} label="Established">
                Since {d.establishedYear}
              </InfoRow>
            )}
          </section>

          {hasHours && (
            <section aria-labelledby="hours-heading" className="rounded-xl border border-border p-4">
              <h3 id="hours-heading" className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="size-4" aria-hidden /> Hours
              </h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                {WEEKDAYS.map((day) => (
                  <div key={day} className={cn("contents", day === now.day ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    <dt>{WEEKDAY_LABELS[day]}</dt>
                    <dd className="text-right tabular-nums">{formatRange(d.hours[day])}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        {d.tags.length > 0 && (
          <section aria-label="Specialties">
            <ul className="flex flex-wrap gap-2">
              {d.tags
                .filter((t) => t !== d.category && t !== "filipino")
                .map((t) => (
                  <li key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/80 capitalize">
                    {t}
                  </li>
                ))}
            </ul>
          </section>
        )}

        <hr className="border-border" />

        <CommentsSection key={d.id} establishmentId={d.id} establishmentName={d.name} />
      </div>
    </article>
  )
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-foreground">{children}</div>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading details">
      <DialogTitle className="sr-only">Loading</DialogTitle>
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-6 p-6 sm:p-8">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  )
}
