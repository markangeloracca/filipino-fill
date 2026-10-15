import { WEEKDAYS, type Weekday } from "./types"

const CALGARY_TZ = "America/Edmonton"

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
}

/** Current weekday + minutes-since-midnight in Calgary, regardless of the viewer's timezone. */
export function calgaryNow(date = new Date()): { day: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CALGARY_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  const day = get("weekday").slice(0, 3).toLowerCase() as Weekday
  return { day: WEEKDAYS.includes(day) ? day : "mon", minutes: Number(get("hour")) * 60 + Number(get("minute")) }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export function isOpenNow(hours: Partial<Record<Weekday, string>>, now = calgaryNow()): boolean | null {
  const today = hours[now.day]
  if (!today) return null
  if (today === "closed") return false
  const [open, close] = today.split("-")
  if (!open || !close) return null
  return now.minutes >= toMinutes(open) && now.minutes < toMinutes(close)
}

export function formatRange(range: string | undefined): string {
  if (!range) return "—"
  if (range === "closed") return "Closed"
  const fmt = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number)
    const suffix = h >= 12 && h < 24 ? "pm" : "am"
    const hour12 = h % 12 === 0 ? 12 : h % 12
    return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, "0")}${suffix}`
  }
  const [open, close] = range.split("-")
  return `${fmt(open)} – ${fmt(close)}`
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
export function timeAgo(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ]
  for (const [unit, size] of units) if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  return "just now"
}

export const priceLabel = (level: number | null) => (level ? "$".repeat(level) : null)

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}
