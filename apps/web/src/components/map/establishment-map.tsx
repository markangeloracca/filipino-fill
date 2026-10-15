"use client"

import "maplibre-gl/dist/maplibre-gl.css"
import { AttributionControl, LngLatBounds, Map as MapLibre, Marker, NavigationControl, Popup, setWorkerUrl, type GeoJSONSource } from "maplibre-gl"
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon, Position } from "geojson"
import { useEffect, useRef, useState } from "react"
import type { EstablishmentSummary } from "@/lib/types"

export type MapTheme = "light" | "dark"

/**
 * Per-theme map colours. Every value is checked for ≥ 3:1 against the basemap
 * (WCAG 1.4.11) by `npm run check:contrast` — keep the two in sync.
 */
const MAP_THEME: Record<
  MapTheme,
  { style: string; dot: string; dotStroke: string; boundary: string; casing: string; mask: string; maskOpacity: number }
> = {
  light: {
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    dot: "#27272a",
    dotStroke: "#ffffff",
    boundary: "#1d4ed8",
    casing: "#ffffff",
    mask: "#18181b",
    maskOpacity: 0.07,
  },
  dark: {
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    dot: "#e4e4e7",
    dotStroke: "#18181b",
    boundary: "#60a5fa",
    casing: "#0a0a0a",
    mask: "#000000",
    maskOpacity: 0.45,
  },
}

// Extent of the official boundary (scripts/build-city-boundary.mjs); the initial view shows the whole city.
const CALGARY_BOUNDS: [[number, number], [number, number]] = [
  [-114.3158, 50.84283],
  [-113.85991, 51.21243],
]
const BOUNDARY_URL = "/data/calgary-boundary.geojson"
const CITY_ATTRIBUTION =
  'City limits: <a href="https://data.calgary.ca/d/erra-cqp9" target="_blank" rel="noreferrer">City of Calgary</a> (OGL – City of Calgary)'

const SOURCE_ID = "establishments"
const DOTS_LAYER = "establishment-dots"
const BOUNDARY_SOURCE = "calgary-boundary"
const MASK_SOURCE = "calgary-mask"
const MASK_LAYER = "calgary-outside-mask"
const BOUNDARY_CASING_LAYER = "calgary-boundary-casing"
const BOUNDARY_LINE_LAYER = "calgary-boundary-line"

// Served from /public (see scripts/copy-maplibre-worker.mjs); the bundled default path 404s.
setWorkerUrl("/maplibre-gl-worker.mjs")

type BoundaryCollection = FeatureCollection<MultiPolygon | Polygon>

interface EstablishmentMapProps {
  all: EstablishmentSummary[]
  /** Active search results, rendered as pulsing + bouncing red pins. `null` = no active search. */
  results: EstablishmentSummary[] | null
  highlightedId: string | null
  focusedId: string | null
  theme: MapTheme
  onSelect: (id: string) => void
  onHighlight?: (id: string | null) => void
  /** Whether the floating search panel covers the map's top-left; camera moves keep pins clear of it. */
  panelOpen: boolean
}

function toFeatureCollection(items: EstablishmentSummary[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((e) => ({
      type: "Feature",
      id: e.id,
      geometry: { type: "Point", coordinates: [e.longitude, e.latitude] },
      properties: { id: e.id, name: e.name, neighbourhood: e.neighbourhood },
    })),
  }
}

/** World polygon with the city's outer rings cut out: dims everything outside Calgary. */
function outsideMask(boundary: BoundaryCollection): Feature<Polygon> {
  const holes: Position[][] = []
  for (const f of boundary.features) {
    const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates]
    for (const poly of polys) if (poly[0]) holes.push(poly[0])
  }
  const world: Position[] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ]
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [world, ...holes] } }
}

/** The panel overlays the map on wide screens; keep fitted results out from under it. */
function fitPadding(panelOpen: boolean): { top: number; bottom: number; left: number; right: number } {
  const wide = typeof window !== "undefined" && window.innerWidth >= 768
  if (wide) return { top: 96, bottom: 64, left: panelOpen ? 460 : 80, right: 80 }
  return { top: panelOpen ? 310 : 88, bottom: 48, left: 40, right: 40 }
}

function createPinElement(e: EstablishmentSummary, index: number, onSelect: (id: string) => void, onHighlight?: (id: string | null) => void) {
  const el = document.createElement("button")
  el.type = "button"
  el.className = "ff-pin"
  el.setAttribute("aria-label", `${e.name}, ${e.neighbourhood}. Open details`)
  el.style.setProperty("--ff-delay", `${(index % 8) * 90}ms`)
  el.innerHTML = `
    <span class="ff-pin-pulse" aria-hidden="true"></span>
    <span class="ff-pin-pulse ff-pin-pulse--late" aria-hidden="true"></span>
    <span class="ff-pin-body" aria-hidden="true">
      <svg viewBox="0 0 32 42" width="32" height="42">
        <path class="ff-pin-shape" d="M16 41s13-14.2 13-24.5C29 8.5 23.2 2.5 16 2.5S3 8.5 3 16.5C3 26.8 16 41 16 41z" stroke="#fff" stroke-width="2.5"/>
        <circle cx="16" cy="16.5" r="5.2" fill="#fff"/>
      </svg>
    </span>`
  el.addEventListener("click", (ev) => {
    ev.stopPropagation()
    onSelect(e.id)
  })
  el.addEventListener("mouseenter", () => onHighlight?.(e.id))
  el.addEventListener("mouseleave", () => onHighlight?.(null))
  el.addEventListener("focus", () => onHighlight?.(e.id))
  el.addEventListener("blur", () => onHighlight?.(null))
  return el
}

export function EstablishmentMap({ all, results, highlightedId, focusedId, theme, onSelect, onHighlight, panelOpen }: EstablishmentMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibre | null>(null)
  const markersRef = useRef(new Map<string, Marker>())
  const [ready, setReady] = useState(false)
  // Latest values for the style.load handler, which re-adds overlays after every basemap swap.
  const allRef = useRef(all)
  const searchActiveRef = useRef(results !== null)
  const themeRef = useRef(theme)
  const panelOpenRef = useRef(panelOpen)
  const boundaryRef = useRef<BoundaryCollection | null>(null)
  const appliedStyleRef = useRef<string | null>(null)
  const applyDimRef = useRef<(() => void) | null>(null)
  const onSelectRef = useRef(onSelect)
  const onHighlightRef = useRef(onHighlight)
  useEffect(() => {
    onSelectRef.current = onSelect
    onHighlightRef.current = onHighlight
    panelOpenRef.current = panelOpen
  })

  // --- init ----------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return
    const initialStyle = MAP_THEME[themeRef.current].style
    const map = new MapLibre({
      container: containerRef.current,
      style: initialStyle,
      bounds: CALGARY_BOUNDS,
      fitBoundsOptions: { padding: fitPadding(panelOpenRef.current) },
      minZoom: 8.5,
      maxZoom: 18,
      maxBounds: [
        [-114.75, 50.65],
        [-113.45, 51.4],
      ],
      attributionControl: false,
    })
    mapRef.current = map
    appliedStyleRef.current = initialStyle
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right")
    map.addControl(new AttributionControl({ compact: true, customAttribution: CITY_ATTRIBUTION }), "bottom-left")

    const hoverPopup = new Popup({ closeButton: false, closeOnClick: false, offset: 10, anchor: "bottom", className: "ff-popup" })

    /** (Re)adds our sources and layers. Safe to call repeatedly. */
    const applyOverlays = () => {
      const t = MAP_THEME[themeRef.current]
      const boundary = boundaryRef.current

      if (boundary) {
        if (!map.getSource(MASK_SOURCE)) map.addSource(MASK_SOURCE, { type: "geojson", data: outsideMask(boundary) })
        if (!map.getSource(BOUNDARY_SOURCE)) map.addSource(BOUNDARY_SOURCE, { type: "geojson", data: boundary })
        if (!map.getLayer(MASK_LAYER)) {
          // Below the basemap's labels so place names outside the city stay crisp.
          const firstLabel = map.getStyle().layers.find((l) => l.type === "symbol")?.id
          map.addLayer({ id: MASK_LAYER, type: "fill", source: MASK_SOURCE, paint: { "fill-color": t.mask, "fill-opacity": t.maskOpacity } }, firstLabel)
        }
        if (!map.getLayer(BOUNDARY_CASING_LAYER)) {
          map.addLayer({
            id: BOUNDARY_CASING_LAYER,
            type: "line",
            source: BOUNDARY_SOURCE,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": t.casing, "line-opacity": 0.9, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 5, 14, 7.5] },
          })
        }
        if (!map.getLayer(BOUNDARY_LINE_LAYER)) {
          map.addLayer({
            id: BOUNDARY_LINE_LAYER,
            type: "line",
            source: BOUNDARY_SOURCE,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": t.boundary, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2.25, 14, 3.5] },
          })
        }
      }

      if (!map.getSource(SOURCE_ID)) map.addSource(SOURCE_ID, { type: "geojson", data: toFeatureCollection(allRef.current) })
      if (!map.getLayer(DOTS_LAYER)) {
        map.addLayer({
          id: DOTS_LAYER,
          type: "circle",
          source: SOURCE_ID,
          paint: {
            "circle-color": t.dot,
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 13, 5.5, 16, 8],
            "circle-stroke-color": t.dotStroke,
            "circle-stroke-width": 1.5,
          },
        })
      }
      applyDim()
    }

    // Dim the base dots while a search is active so the red pins stand out.
    const applyDim = () => {
      if (!map.getLayer(DOTS_LAYER)) return
      const active = searchActiveRef.current
      map.setPaintProperty(DOTS_LAYER, "circle-opacity", active ? 0.3 : 0.9)
      map.setPaintProperty(DOTS_LAYER, "circle-stroke-opacity", active ? 0.4 : 0.95)
    }
    applyDimRef.current = applyDim

    map.on("style.load", () => {
      applyOverlays()
      setReady(true)
    })

    fetch(BOUNDARY_URL)
      .then((res) => (res.ok ? (res.json() as Promise<BoundaryCollection>) : null))
      .then((data) => {
        if (!data || mapRef.current !== map) return
        boundaryRef.current = data
        if (map.isStyleLoaded()) applyOverlays()
      })
      .catch(() => {
        /* The boundary is decorative context; the map still works without it. */
      })

    map.on("mouseenter", DOTS_LAYER, (ev) => {
      map.getCanvas().style.cursor = "pointer"
      const f = ev.features?.[0]
      if (!f || f.geometry.type !== "Point") return
      const props = f.properties as { name: string; neighbourhood: string }
      const node = document.createElement("div")
      const strong = document.createElement("strong")
      strong.textContent = props.name
      const span = document.createElement("span")
      span.textContent = props.neighbourhood
      node.append(strong, span)
      hoverPopup.setLngLat(f.geometry.coordinates as [number, number]).setDOMContent(node).addTo(map)
    })
    map.on("mouseleave", DOTS_LAYER, () => {
      map.getCanvas().style.cursor = ""
      hoverPopup.remove()
    })
    map.on("click", DOTS_LAYER, (ev) => {
      const id = ev.features?.[0]?.properties?.id
      if (typeof id === "string") onSelectRef.current(id)
    })

    const markers = markersRef.current
    return () => {
      markers.forEach((m) => m.remove())
      markers.clear()
      hoverPopup.remove()
      map.remove()
      mapRef.current = null
      applyDimRef.current = null
      setReady(false)
    }
  }, [])

  // --- theme: swap basemap; style.load re-adds our overlays in the new colours ----
  useEffect(() => {
    themeRef.current = theme
    const map = mapRef.current
    const style = MAP_THEME[theme].style
    if (!map || appliedStyleRef.current === style) return
    appliedStyleRef.current = style
    map.setStyle(style, { diff: false })
  }, [theme])

  // --- base dots ---------------------------------------------------------------
  useEffect(() => {
    allRef.current = all
    const map = mapRef.current
    if (!ready || !map) return
    ;(map.getSource(SOURCE_ID) as GeoJSONSource | undefined)?.setData(toFeatureCollection(all))
  }, [all, ready])

  useEffect(() => {
    searchActiveRef.current = results !== null
    if (ready) applyDimRef.current?.()
  }, [results, ready])

  // --- result pins (HTML markers survive basemap swaps) -------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const markers = markersRef.current
    markers.forEach((m) => m.remove())
    markers.clear()
    if (!results?.length) return

    results.forEach((e, i) => {
      const el = createPinElement(e, i, (id) => onSelectRef.current(id), (id) => onHighlightRef.current?.(id))
      markers.set(e.id, new Marker({ element: el, anchor: "bottom" }).setLngLat([e.longitude, e.latitude]).addTo(map))
    })

    if (results.length === 1) {
      map.flyTo({ center: [results[0].longitude, results[0].latitude], zoom: 14, padding: fitPadding(panelOpenRef.current), duration: 900 })
    } else {
      const bounds = new LngLatBounds()
      results.forEach((e) => bounds.extend([e.longitude, e.latitude]))
      map.fitBounds(bounds, { padding: fitPadding(panelOpenRef.current), maxZoom: 14, duration: 900 })
    }
  }, [results, ready])

  // --- highlight (from list hover) ----------------------------------------------
  useEffect(() => {
    markersRef.current.forEach((m, id) => {
      const el = m.getElement()
      const active = id === highlightedId
      el.toggleAttribute("data-active", active)
      el.style.zIndex = active ? "10" : ""
    })
  }, [highlightedId, results])

  // --- focus (selected establishment) -------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !focusedId) return
    const target = all.find((e) => e.id === focusedId) ?? results?.find((e) => e.id === focusedId)
    if (target) map.easeTo({ center: [target.longitude, target.latitude], zoom: Math.max(map.getZoom(), 13.5), padding: fitPadding(panelOpenRef.current), duration: 700 })
  }, [focusedId, ready, all, results])

  const colors = MAP_THEME[theme]
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" role="region" aria-label="Map of Filipino establishments in Calgary" />
      {!ready && <div className="pointer-events-none absolute inset-0 animate-pulse bg-muted" aria-hidden />}

      {/* Legend: identity is carried by text, never colour alone. */}
      <div
        className="pointer-events-none absolute right-3 bottom-24 z-[1] flex flex-col gap-1.5 rounded-xl border border-border bg-background/90 px-3 py-2 text-xs text-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.05),0_4px_12px_-2px_rgb(0_0_0/0.12)] backdrop-blur md:bottom-6 md:left-auto md:right-14"
        aria-label="Map legend"
        role="note"
      >
        <span className="flex items-center gap-2">
          <span className="h-[3px] w-5 rounded-full" style={{ backgroundColor: colors.boundary, boxShadow: `0 0 0 1.5px ${colors.casing}` }} aria-hidden />
          Calgary city limits
        </span>
        <span className="flex items-center gap-2">
          <span className="ml-1.5 size-2 rounded-full" style={{ backgroundColor: colors.dot, boxShadow: `0 0 0 1.5px ${colors.dotStroke}` }} aria-hidden />
          <span className="ml-1.5">Filipino establishment</span>
        </span>
        {results !== null && (
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 32 42" className="ml-1 h-3.5 w-3" aria-hidden>
              <path className="ff-pin-shape" d="M16 41s13-14.2 13-24.5C29 8.5 23.2 2.5 16 2.5S3 8.5 3 16.5C3 26.8 16 41 16 41z" />
            </svg>
            <span className="ml-0.5">Search result</span>
          </span>
        )}
      </div>
    </div>
  )
}
