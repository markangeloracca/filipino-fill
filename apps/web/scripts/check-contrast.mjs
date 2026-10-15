#!/usr/bin/env node
// WCAG 2.1 AA contrast check for both themes.
//   - Text pairs need ≥ 4.5:1 (1.4.3)
//   - UI component boundaries, focus rings and meaningful graphics need ≥ 3:1 (1.4.11)
// Colours are read from src/app/globals.css (theme tokens) and Tailwind's palette, so this
// stays in sync with the real design system. Translucent layers are composited in sRGB,
// exactly as the browser does.
//
//   npm run check:contrast

import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(import.meta.url)
const globals = readFileSync(join(root, "src/app/globals.css"), "utf8")
const twTheme = readFileSync(join(dirname(require.resolve("tailwindcss/package.json")), "theme.css"), "utf8")

// ---------------------------------------------------------------- colour math
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const encode = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
const decode = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

/** OKLCH → gamma-encoded sRGB [0..1] (gamut-clipped). */
function oklchToSrgb(L, C, H) {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return lin.map((c) => encode(clamp01(c)))
}

function parseColor(str) {
  str = str.trim()
  let m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/.exec(str)
  if (m) {
    const L = m[2] ? Number(m[1]) / 100 : Number(m[1])
    const alpha = m[5] === undefined ? 1 : m[6] ? Number(m[5]) / 100 : Number(m[5])
    return { rgb: oklchToSrgb(L, Number(m[3]), Number(m[4])), a: alpha }
  }
  m = /^#([0-9a-f]{6})$/i.exec(str)
  if (m) return { rgb: [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255), a: 1 }
  throw new Error(`Unparseable colour: ${str}`)
}

const over = (top, bottom) => ({ rgb: top.rgb.map((c, i) => c * top.a + bottom.rgb[i] * (1 - top.a)), a: 1 })
const luminance = ({ rgb }) => {
  const [r, g, b] = rgb.map(decode)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// ---------------------------------------------------------------- token tables
function block(css, selector) {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`Missing ${selector} block in globals.css`)
  return css.slice(start, css.indexOf("}", start))
}
function vars(css) {
  const out = {}
  for (const [, name, value] of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[name] = value
  return out
}
const palette = Object.fromEntries(
  Object.entries(vars(twTheme))
    .filter(([k]) => k.startsWith("color-"))
    .map(([k, v]) => [k.slice(6), v])
)
const tokens = { light: vars(block(globals, ":root")), dark: vars(block(globals, ".dark")) }

/**
 * Resolve "token", "token/NN", "palette-name/NN" (e.g. "blue-950/60") or "#hex",
 * optionally stacked over a backdrop given as a later argument.
 */
function color(theme, spec) {
  const [name, pct] = spec.split("/")
  const raw = name.startsWith("#") ? name : (tokens[theme][name] ?? palette[name])
  if (!raw) throw new Error(`Unknown colour "${name}" (${theme})`)
  const c = parseColor(raw)
  return pct ? { ...c, a: c.a * (Number(pct) / 100) } : c
}
/** Composite a stack of layers, top first: ["muted/60", "card"] = muted at 60% over card. */
function stack(theme, layers) {
  return layers
    .map((l) => color(theme, l))
    .reduceRight((acc, layer) => (acc ? over(layer, acc) : { ...layer, a: 1 }), null)
}

// ---------------------------------------------------------------- what we check
const BASEMAP = {
  light: { land: "#fafaf8", water: "#d4dadc" },
  dark: { land: "#0e0e0e", water: "#2c353c" },
}
// Mirrors MAP_THEME in src/components/map/establishment-map.tsx.
const MAP = {
  light: { boundary: "#1d4ed8", dot: "#27272a", pin: "#dc2626" },
  dark: { boundary: "#60a5fa", dot: "#e4e4e7", pin: "#f87171" },
}

const TEXT = 4.5
const UI = 3

function checks(theme) {
  const dark = theme === "dark"
  const b = BASEMAP[theme]
  const m = MAP[theme]
  return [
    // body text
    ["foreground", ["background"], TEXT, "Body text on page"],
    ["foreground", ["card"], TEXT, "Text on cards / panel"],
    ["foreground", ["popover"], TEXT, "Text in dialogs & menus"],
    ["foreground/80", ["card"], TEXT, "Secondary text (foreground/80) on cards"],
    ["foreground/80", ["muted/60", "card"], TEXT, "Secondary text on tinted rows"],
    ["muted-foreground", ["background"], TEXT, "Muted text on page"],
    ["muted-foreground", ["card"], TEXT, "Muted text on cards"],
    ["muted-foreground", ["popover"], TEXT, "Muted text in dialogs"],
    ["muted-foreground", ["muted"], TEXT, "Muted text on muted (chips, avatars)"],
    ["muted-foreground", ["muted/60", "card/95", "card"], TEXT, "Search placeholder in input"],
    ["primary-foreground", ["primary"], TEXT, "Primary button / selected chip"],
    ["secondary-foreground", ["secondary"], TEXT, "Secondary button"],
    ["destructive", ["popover"], TEXT, "Error text in dialogs"],
    ["destructive", ["destructive/10", "background"], TEXT, "Error banner"],
    // status badges (inside the details dialog)
    ...(dark
      ? [
          ["blue-200", ["blue-950/60", "popover"], TEXT, "“Filipino-owned” badge"],
          ["amber-200", ["amber-950/50", "popover"], TEXT, "“Caters to Filipinos” badge"],
          ["emerald-200", ["emerald-950/50", "popover"], TEXT, "“Open now” badge"],
        ]
      : [
          ["blue-800", ["blue-50", "popover"], TEXT, "“Filipino-owned” badge"],
          ["amber-900", ["amber-50", "popover"], TEXT, "“Caters to Filipinos” badge"],
          ["emerald-800", ["emerald-50", "popover"], TEXT, "“Open now” badge"],
        ]),
    // non-text UI (1.4.11)
    ["input", ["card"], UI, "Input border vs card"],
    ["input", ["popover"], UI, "Input border vs dialog"],
    ["ring", ["background"], UI, "Focus ring vs page"],
    ["ring", ["card"], UI, "Focus ring vs card"],
    ["ring", ["popover"], UI, "Focus ring vs dialog"],
    // map graphics vs basemap
    [m.boundary, [b.land], UI, "City boundary line vs land"],
    [m.boundary, [b.water], UI, "City boundary line vs river"],
    [m.dot, [b.land], UI, "Establishment dot vs land"],
    [m.pin, [b.land], UI, "Search pin vs land"],
  ]
}

let failures = 0
for (const theme of ["light", "dark"]) {
  console.log(`\n${theme.toUpperCase()} THEME`)
  for (const [fg, bgLayers, min, label] of checks(theme)) {
    const bg = stack(theme, bgLayers)
    const fgColor = over(color(theme, fg), bg)
    const r = ratio(fgColor, bg)
    const ok = r >= min
    if (!ok) failures++
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (≥${min})  ${label}`)
  }
}
console.log(failures ? `\n${failures} contrast check(s) failed.` : "\nAll contrast checks pass WCAG 2.1 AA.")
process.exit(failures ? 1 : 0)
