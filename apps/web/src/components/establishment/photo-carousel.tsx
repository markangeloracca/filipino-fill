"use client"

import { useEffect, useState } from "react"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import type { EstablishmentPhoto } from "@/lib/types"

export function PhotoCarousel({ photos, name }: { photos: EstablishmentPhoto[]; name: string }) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!api) return
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    onSelect()
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  if (!photos.length) {
    return <div className="flex aspect-[16/10] items-center justify-center bg-muted text-sm text-muted-foreground">No photos yet</div>
  }

  return (
    <section aria-roledescription="carousel" aria-label={`Photos of ${name}`} className="relative">
      <Carousel setApi={setApi} opts={{ loop: true }} className="group/carousel">
        <CarouselContent className="ml-0">
          {photos.map((p, i) => (
            <CarouselItem key={p.id} className="pl-0" aria-roledescription="slide" aria-label={`${i + 1} of ${photos.length}`}>
              <figure className="relative aspect-[16/10] overflow-hidden bg-muted">
                {!loaded[p.id] && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />}
                {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG mock photos */}
                <img
                  src={p.url}
                  alt={p.caption ?? `${name} photo ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  onLoad={() => setLoaded((s) => ({ ...s, [p.id]: true }))}
                  className={cn("size-full object-cover transition-opacity duration-300", loaded[p.id] ? "opacity-100" : "opacity-0")}
                />
                {p.caption && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-5 pt-10 pb-8 text-sm font-medium text-white">
                    {p.caption}
                  </figcaption>
                )}
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>
        {photos.length > 1 && (
          <>
            <CarouselPrevious className="left-3 size-9 border-white/20 bg-white/85 text-zinc-900 opacity-0 hover:bg-white dark:border-white/20 dark:bg-white/85 dark:text-zinc-900 dark:hover:bg-white shadow-sm backdrop-blur transition-opacity group-hover/carousel:opacity-100 focus-visible:opacity-100 max-sm:opacity-100" />
            <CarouselNext className="right-3 size-9 border-white/20 bg-white/85 text-zinc-900 opacity-0 hover:bg-white dark:border-white/20 dark:bg-white/85 dark:text-zinc-900 dark:hover:bg-white shadow-sm backdrop-blur transition-opacity group-hover/carousel:opacity-100 focus-visible:opacity-100 max-sm:opacity-100" />
          </>
        )}
      </Carousel>
      {photos.length > 1 && (
        <div className="absolute top-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white tabular-nums backdrop-blur" aria-hidden>
          {current + 1} / {photos.length}
        </div>
      )}
      {photos.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 px-5" role="group" aria-label="Choose photo">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => api?.scrollTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === current}
              className={cn(
                "h-1.5 rounded-full bg-card transition-[width,opacity] duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 focus-visible:outline-none",
                i === current ? "w-5 opacity-100" : "w-1.5 opacity-60 hover:opacity-90"
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
