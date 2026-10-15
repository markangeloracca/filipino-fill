import "server-only"

/**
 * Deterministic SVG "photos" for mock establishments. Every scene is drawn from
 * (scene, category, name, seed) so the same URL always yields the same image.
 */

export const MOCK_SCENES = ["exterior", "interior", "signature", "festive"] as const
export type MockScene = (typeof MOCK_SCENES)[number]

const W = 1280
const H = 800

type Rng = () => number
function rng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = <T,>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c)

// Muted, photo-like palettes per category: [facade, trim, accent, awningAlt]
const CATEGORY_PALETTES: Record<string, Array<[string, string, string, string]>> = {
  restaurant: [["#b4532a", "#5b2a17", "#f2b134", "#fff4e0"], ["#2f6b4f", "#183a2b", "#e9b949", "#fdf6e3"], ["#8f2d2d", "#4a1515", "#f0c05a", "#fff5e6"]],
  bakery: [["#d9a066", "#7a4b23", "#f6e1c3", "#ffffff"], ["#c78c5a", "#6b3f1d", "#7b4fa0", "#f8ecff"]],
  grocery: [["#3c7a5a", "#1f4532", "#f4c430", "#ffffff"], ["#2d5f8a", "#173450", "#e94f37", "#ffffff"]],
  cafe: [["#6d4aa2", "#3a2560", "#f6c8e0", "#fff7fb"], ["#3f8f8a", "#1e4c49", "#f7d488", "#fffaf0"]],
  remittance: [["#2c5aa0", "#16305a", "#f3c623", "#ffffff"], ["#c0392b", "#6e1f17", "#f6d55c", "#ffffff"]],
  beauty: [["#c76b98", "#6e3152", "#f9d9e7", "#ffffff"], ["#8c6bb1", "#4b3570", "#f3e5f5", "#ffffff"]],
  church: [["#d8cbb3", "#7d6b52", "#2c5aa0", "#f7f1e5"], ["#c9c2b8", "#6b625a", "#b23a48", "#f5f0ea"]],
  community: [["#e07a3f", "#7a3a16", "#2c5aa0", "#fff3e8"], ["#4f7cac", "#273f59", "#f2c14e", "#ffffff"]],
  services: [["#56657a", "#2b3442", "#f2c14e", "#f4f6f9"], ["#3d6b73", "#1f3a3f", "#e8b04a", "#f2f7f7"]],
  health: [["#4f9d8f", "#24524a", "#ffffff", "#e8f6f3"], ["#5d8fc9", "#2c4a70", "#ffffff", "#eef4fb"]],
  retail: [["#9b7a4a", "#4f3c20", "#e9dcc0", "#fffaf0"], ["#6a4c93", "#36254d", "#f2c14e", "#fdf8ff"]],
}

const SKIES = [
  { top: "#7fb6e6", bottom: "#d8ecfa", sun: "#fff6cc", sunY: 120, light: 1 }, // midday
  { top: "#f2a65a", bottom: "#fde3b8", sun: "#fff1c1", sunY: 300, light: 0.9 }, // golden hour
  { top: "#2b3a67", bottom: "#c86b6b", sun: "#ffd5a0", sunY: 380, light: 0.65 }, // dusk
  { top: "#a9c7e8", bottom: "#eef4fa", sun: "#ffffff", sunY: 90, light: 1 }, // winter chinook
]

const SIGNATURE_ITEMS: Record<string, string[]> = {
  restaurant: ["Adobo", "Sinigang", "Kare-Kare", "Lechon Kawali", "Pancit", "Lumpia", "Sisig"],
  bakery: ["Pandesal", "Ensaymada", "Ube Roll", "Spanish Bread", "Hopia", "Pan de Coco"],
  grocery: ["Calamansi", "Bagoong", "Banana Ketchup", "Dried Mango", "Chicharon", "Patis"],
  cafe: ["Halo-Halo", "Kapeng Barako", "Ube Latte", "Taho", "Turon", "Buko Pandan"],
  remittance: ["Sea Cargo", "Air Cargo", "Padala", "Bills Payment", "Box Pickup"],
  beauty: ["Haircut", "Rebond", "Hilot", "Manicure", "Lashes"],
  church: ["Sunday Mass", "Simbang Gabi", "Novena", "Choir", "Bible Study"],
  community: ["Newcomers", "Tagalog Class", "Folk Dance", "Seniors", "Basketball"],
  services: ["Immigration", "Tax Filing", "Insurance", "Translation", "Real Estate"],
  health: ["Family Care", "Dental", "Physio", "Home Care", "Walk-in"],
  retail: ["Barong", "Filipiniana", "Terno", "Capiz", "Embroidery"],
}

function star(cx: number, cy: number, R: number, r: number, points = 5, rot = -Math.PI / 2): string {
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? R : r
    const a = rot + (i * Math.PI) / points
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(" ")
}

function parol(cx: number, cy: number, size: number, color: string, glow = true): string {
  return `<g>
    ${glow ? `<circle cx="${cx}" cy="${cy}" r="${size * 1.9}" fill="${color}" opacity="0.18" filter="url(#blur)"/>` : ""}
    <line x1="${cx}" y1="${cy - size * 4}" x2="${cx}" y2="${cy - size}" stroke="#3a3a3a" stroke-width="2" opacity="0.6"/>
    <path d="M${cx - size * 0.35},${cy + size * 0.6} q${-size * 0.2},${size * 1.4} ${-size * 0.5},${size * 2}" stroke="${color}" stroke-width="3" fill="none" opacity="0.8"/>
    <path d="M${cx + size * 0.35},${cy + size * 0.6} q${size * 0.2},${size * 1.4} ${size * 0.5},${size * 2}" stroke="${color}" stroke-width="3" fill="none" opacity="0.8"/>
    <polygon points="${star(cx, cy, size, size * 0.45)}" fill="${color}" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${size * 0.28}" fill="#fff7d6"/>
  </g>`
}

function banderitas(y: number, r: Rng, sag = 40, x0 = 0, x1 = W): string {
  const colors = ["#0038a8", "#ce1126", "#fcd116", "#ffffff"]
  const n = 22
  let flags = ""
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const x = x0 + t * (x1 - x0)
    const yy = y + Math.sin(t * Math.PI) * sag
    flags += `<polygon points="${x - 18},${yy} ${x + 18},${yy} ${x},${yy + 34}" fill="${colors[(i + Math.floor(r() * 2)) % colors.length]}" opacity="0.92"/>`
  }
  return `<path d="M${x0},${y} Q${(x0 + x1) / 2},${y + sag * 2} ${x1},${y}" stroke="#5a4a3a" stroke-width="2" fill="none"/>${flags}`
}

const defs = `<defs>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.22"/></filter>
  <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7b0"/><stop offset="1" stop-color="#f0a85a"/></linearGradient>
</defs>`

function frame(body: string, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">
${defs}
${body}
<rect width="${W}" height="${H}" fill="url(#vignette)"/>
<g opacity="0.75"><rect x="${W - 168}" y="${H - 44}" width="152" height="28" rx="14" fill="#000" opacity="0.35"/><text x="${W - 92}" y="${H - 25}" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" letter-spacing="1.5" fill="#fff">MOCK PHOTO</text></g>
</svg>`
}

function skyline(r: Rng, baseY: number, color: string): string {
  let s = ""
  let x = -20
  while (x < W) {
    const w = 40 + r() * 70
    const h = 60 + r() * 170
    s += `<rect x="${x.toFixed(0)}" y="${(baseY - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${color}"/>`
    x += w + 6
  }
  // Calgary Tower silhouette
  const tx = 300 + r() * 600
  s += `<rect x="${tx - 9}" y="${baseY - 330}" width="18" height="330" fill="${color}"/>
    <rect x="${tx - 34}" y="${baseY - 360}" width="68" height="34" rx="10" fill="${color}"/>
    <rect x="${tx - 3}" y="${baseY - 395}" width="6" height="40" fill="${color}"/>`
  return s
}

function exterior(name: string, category: string, r: Rng): string {
  const [facade, trim, accent, awningAlt] = pick(r, CATEGORY_PALETTES[category] ?? CATEGORY_PALETTES.restaurant)
  const sky = pick(r, SKIES)
  const fontSize = Math.max(30, Math.min(62, Math.floor(1500 / Math.max(name.length, 12))))
  const awningY = 380
  let stripes = ""
  for (let i = 0; i < 20; i++) stripes += `<rect x="${140 + i * 50}" y="${awningY}" width="25" height="70" fill="${awningAlt}"/>`
  let scallops = ""
  for (let i = 0; i < 20; i++) scallops += `<path d="M${140 + i * 50},${awningY + 70} a25,22 0 0 0 50,0 z" fill="${i % 2 ? accent : facade}"/>`
  let upperWindows = ""
  for (let i = 0; i < 5; i++) {
    const wx = 190 + i * 190
    upperWindows += `<rect x="${wx}" y="250" width="110" height="50" rx="4" fill="${sky.light < 0.8 ? "#ffd98a" : "#9cc3e0"}" opacity="0.85" stroke="${trim}" stroke-width="6"/>`
  }
  const planters = [180, 1060]
    .map(
      (px) => `<rect x="${px}" y="640" width="70" height="56" rx="8" fill="${trim}"/>
      <circle cx="${px + 20}" cy="628" r="26" fill="#3f7d4e"/><circle cx="${px + 48}" cy="620" r="30" fill="#4f9a5f"/><circle cx="${px + 35}" cy="602" r="22" fill="#5fae6f"/>`,
    )
    .join("")
  return frame(
    `<rect width="${W}" height="${H}" fill="${sky.top}"/>
    <rect width="${W}" height="${H}" fill="${sky.bottom}" opacity="0.6"/>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky.top}"/><stop offset="1" stop-color="${sky.bottom}"/></linearGradient>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <circle cx="${200 + r() * 880}" cy="${sky.sunY}" r="60" fill="${sky.sun}" opacity="0.9"/>
    <ellipse cx="${200 + r() * 300}" cy="110" rx="120" ry="26" fill="#fff" opacity="0.5" filter="url(#soft)"/>
    <ellipse cx="${800 + r() * 300}" cy="160" rx="160" ry="30" fill="#fff" opacity="0.4" filter="url(#soft)"/>
    <g opacity="0.35">${skyline(r, 560, sky.light < 0.8 ? "#1d2440" : "#6b7f99")}</g>
    <rect x="120" y="200" width="1040" height="500" fill="${facade}" filter="url(#shadow)"/>
    <rect x="110" y="190" width="1060" height="24" fill="${trim}"/>
    ${upperWindows}
    <rect x="300" y="310" width="680" height="64" rx="10" fill="${trim}"/>
    <rect x="308" y="318" width="664" height="48" rx="7" fill="none" stroke="${accent}" stroke-width="2" opacity="0.7"/>
    <text x="640" y="${342 + fontSize * 0.08}" dominant-baseline="middle" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${Math.min(fontSize, 42)}" fill="#fff">${esc(name)}</text>
    <rect x="140" y="${awningY}" width="1000" height="70" fill="${accent}"/>
    ${stripes}
    ${scallops}
    <rect x="170" y="470" width="360" height="200" rx="4" fill="url(#glass)" opacity="${0.75 + (1 - sky.light) * 0.25}" stroke="${trim}" stroke-width="10"/>
    <rect x="750" y="470" width="360" height="200" rx="4" fill="url(#glass)" opacity="${0.75 + (1 - sky.light) * 0.25}" stroke="${trim}" stroke-width="10"/>
    <line x1="350" y1="470" x2="350" y2="670" stroke="${trim}" stroke-width="6"/>
    <line x1="930" y1="470" x2="930" y2="670" stroke="${trim}" stroke-width="6"/>
    ${parol(260, 545, 34, "#e94f37")}
    ${parol(1020, 545, 34, "#f2c14e")}
    <rect x="570" y="470" width="140" height="230" rx="6" fill="${trim}"/>
    <rect x="584" y="486" width="112" height="150" rx="4" fill="url(#glass)" opacity="0.85"/>
    <circle cx="684" cy="590" r="6" fill="#e8d7a0"/>
    <rect x="590" y="652" width="100" height="22" rx="4" fill="#fff" opacity="0.9"/>
    <text x="640" y="668" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-size="14" font-weight="700" fill="${trim}">BUKAS · OPEN</text>
    <rect y="700" width="${W}" height="100" fill="#8b8f96"/>
    <rect y="700" width="${W}" height="10" fill="#6c7078"/>
    ${planters}`,
    `${name} storefront`,
  )
}

function interior(name: string, category: string, r: Rng): string {
  const [facade, trim, accent] = pick(r, CATEGORY_PALETTES[category] ?? CATEGORY_PALETTES.restaurant)
  const items = [...(SIGNATURE_ITEMS[category] ?? SIGNATURE_ITEMS.restaurant)].sort(() => r() - 0.5).slice(0, 4)
  let planks = ""
  for (let i = -8; i <= 8; i++) planks += `<line x1="${640 + i * 40}" y1="560" x2="${640 + i * 170}" y2="${H}" stroke="#000" stroke-opacity="0.12" stroke-width="2"/>`
  const lamps = [320, 640, 960]
    .map(
      (lx) => `<line x1="${lx}" y1="0" x2="${lx}" y2="120" stroke="#2b2b2b" stroke-width="3"/>
      <circle cx="${lx}" cy="160" r="90" fill="#ffd98a" opacity="0.35" filter="url(#blur)"/>
      <path d="M${lx - 42},160 L${lx - 16},120 L${lx + 16},120 L${lx + 42},160 Z" fill="${trim}"/>
      <ellipse cx="${lx}" cy="161" rx="30" ry="6" fill="#fff3c4"/>`,
    )
    .join("")
  let capiz = ""
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) capiz += `<rect x="${92 + col * 42}" y="${212 + row * 42}" width="36" height="36" fill="#f6efe2" opacity="0.85"/>`
  const tables = [300, 980]
    .map(
      (tx) => `<ellipse cx="${tx}" cy="690" rx="140" ry="36" fill="${trim}" filter="url(#shadow)"/>
      <ellipse cx="${tx}" cy="684" rx="140" ry="34" fill="#c89b6d"/>
      <circle cx="${tx - 50}" cy="676" r="18" fill="#fff" opacity="0.95"/><circle cx="${tx + 40}" cy="680" r="18" fill="#fff" opacity="0.95"/>
      <rect x="${tx - 6}" y="716" width="12" height="70" fill="${trim}"/>`,
    )
    .join("")
  return frame(
    `<rect width="${W}" height="560" fill="${facade}"/>
    <rect width="${W}" height="560" fill="#fff" opacity="0.55"/>
    <rect y="470" width="${W}" height="90" fill="${facade}" opacity="0.7"/>
    <rect y="556" width="${W}" height="${H - 556}" fill="#a87b52"/>
    ${planks}
    <rect x="80" y="200" width="180" height="180" fill="${trim}"/>${capiz}
    <rect x="470" y="190" width="340" height="230" rx="10" fill="#22262b" filter="url(#shadow)"/>
    <text x="640" y="236" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="700" fill="${accent}">${category === "church" || category === "community" ? "Schedule" : "Today’s Specials"}</text>
    ${items.map((it, i) => `<text x="500" y="${280 + i * 36}" font-family="ui-sans-serif, system-ui" font-size="22" fill="#f4f4f5">${esc(it)}</text><line x1="${510 + it.length * 11}" y1="${274 + i * 36}" x2="740" y2="${274 + i * 36}" stroke="#f4f4f5" stroke-opacity="0.35" stroke-dasharray="3 6"/><circle cx="770" cy="${273 + i * 36}" r="6" fill="${accent}"/>`).join("")}
    <rect x="980" y="230" width="200" height="150" rx="8" fill="#fff" opacity="0.6"/>
    <text x="1080" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${trim}">Mabuhay!</text>
    <text x="1080" y="332" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-size="14" fill="${trim}">${esc(name.slice(0, 22))}</text>
    ${lamps}
    <rect x="460" y="500" width="360" height="120" rx="8" fill="${trim}"/>
    <rect x="450" y="492" width="380" height="18" rx="6" fill="#d8b48a"/>
    ${tables}`,
    `Inside ${name}`,
  )
}

function banig(r: Rng): string {
  const colors = ["#c9a46a", "#b8864b", "#9c6b3a", "#d9b98a"]
  let s = `<rect width="${W}" height="${H}" fill="#c49a62"/>`
  for (let y = 0; y < H; y += 40)
    for (let x = 0; x < W; x += 40)
      s += `<rect x="${x}" y="${y}" width="40" height="40" fill="${colors[((x + y) / 40 + Math.floor(r() * 1.2)) % colors.length]}" opacity="0.7"/>`
  s += `<g stroke="#6b4a26" stroke-opacity="0.25" stroke-width="2">`
  for (let i = -H; i < W; i += 40) s += `<line x1="${i}" y1="0" x2="${i + H}" y2="${H}"/>`
  return s + "</g>"
}

function signature(name: string, category: string, r: Rng): string {
  const [facade, trim, accent] = pick(r, CATEGORY_PALETTES[category] ?? CATEGORY_PALETTES.restaurant)
  const label = pick(r, SIGNATURE_ITEMS[category] ?? ["Specialty"])
  let hero = ""
  switch (category) {
    case "restaurant":
      hero = `<circle cx="640" cy="420" r="250" fill="#fff" filter="url(#shadow)"/><circle cx="640" cy="420" r="220" fill="#f6f2ea"/>
        <ellipse cx="560" cy="400" rx="105" ry="95" fill="#fffdf7" stroke="#e8e1d2" stroke-width="3"/>
        ${Array.from({ length: 7 }, () => `<ellipse cx="${700 + r() * 90}" cy="${360 + r() * 130}" rx="${34 + r() * 16}" ry="${24 + r() * 10}" fill="${pick(r, ["#7a3b18", "#8b4513", "#6b2f12", "#9a5420"])}"/>`).join("")}
        <circle cx="610" cy="520" r="44" fill="#fff"/><circle cx="614" cy="516" r="18" fill="#f5b70a"/>
        <circle cx="1000" cy="230" r="70" fill="#fff" filter="url(#shadow)"/><circle cx="1000" cy="230" r="54" fill="#5a3214"/>
        <rect x="260" y="250" width="22" height="330" rx="11" fill="#c0c4c9" transform="rotate(-8 270 400)"/>`
      break
    case "bakery":
      hero = `<ellipse cx="640" cy="440" rx="330" ry="230" fill="#8a5a2b" filter="url(#shadow)"/><ellipse cx="640" cy="430" rx="300" ry="205" fill="#a8743f"/>
        ${Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2
          const x = 640 + Math.cos(a) * (120 + (i % 3) * 50)
          const y = 430 + Math.sin(a) * (80 + (i % 3) * 35)
          return `<ellipse cx="${x}" cy="${y}" rx="62" ry="44" fill="#e2a65e" stroke="#c9873f" stroke-width="3"/><ellipse cx="${x - 8}" cy="${y - 10}" rx="34" ry="16" fill="#f3c98a" opacity="0.7"/>`
        }).join("")}
        <ellipse cx="640" cy="430" rx="70" ry="50" fill="#7b4fa0" stroke="#5e3a80" stroke-width="3"/>`
      break
    case "cafe":
      hero = `<circle cx="640" cy="420" r="240" fill="#fff" filter="url(#shadow)"/><circle cx="640" cy="420" r="215" fill="#f1f6fb"/>
        ${Array.from({ length: 22 }, () => `<rect x="${500 + r() * 260}" y="${290 + r() * 250}" width="34" height="34" rx="6" fill="${pick(r, ["#e94f37", "#3fa34d", "#f2c14e", "#ffffff", "#c97b3c"])}" transform="rotate(${r() * 40} 640 420)"/>`).join("")}
        <circle cx="620" cy="400" r="78" fill="#7b4fa0"/><circle cx="600" cy="380" r="24" fill="#a77fd0" opacity="0.7"/>
        <rect x="680" y="430" width="90" height="70" rx="12" fill="#f5c26b"/><rect x="680" y="430" width="90" height="20" rx="8" fill="#a8641c"/>
        <rect x="900" y="160" width="26" height="420" rx="13" fill="#d6d6d6" transform="rotate(22 913 370)"/>`
      break
    case "grocery":
      hero = `<rect width="${W}" height="${H}" fill="#eef0f2"/>
        ${[160, 360, 560].map((sy) => `<rect x="60" y="${sy + 150}" width="1160" height="18" fill="${trim}"/>${Array.from({ length: 14 }, (_, i) => { const h = 90 + r() * 50; return `<rect x="${80 + i * 81}" y="${sy + 150 - h}" width="66" height="${h}" rx="6" fill="${pick(r, ["#e94f37", "#f2c14e", "#3fa34d", "#2c5aa0", "#ff8c42", "#7b4fa0"])}"/><rect x="${88 + i * 81}" y="${sy + 150 - h + 18}" width="50" height="22" rx="3" fill="#fff" opacity="0.85"/>` }).join("")}`).join("")}`
      break
    case "remittance":
      hero = `<rect width="${W}" height="${H}" fill="#e9e4da"/><rect y="640" width="${W}" height="160" fill="#b9b1a3"/>
        ${[[300, 470], [640, 470], [980, 470], [470, 250], [810, 250]].map(([bx, by]) => `<g filter="url(#shadow)"><rect x="${bx - 160}" y="${by}" width="320" height="210" rx="6" fill="#c8955a"/><rect x="${bx - 160}" y="${by}" width="320" height="210" rx="6" fill="none" stroke="#9c6b35" stroke-width="4"/><rect x="${bx - 14}" y="${by}" width="28" height="210" fill="#d9c08f" opacity="0.8"/><rect x="${bx - 110}" y="${by + 70}" width="220" height="64" rx="4" fill="#fff"/><text x="${bx}" y="${by + 100}" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-weight="800" font-size="20" fill="#16305a">BALIKBAYAN</text><text x="${bx}" y="${by + 124}" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-size="15" fill="#c0392b">BOX · PILIPINAS</text></g>`).join("")}`
      break
    case "church":
      hero = `<rect width="${W}" height="${H}" fill="#e9e2d4"/>
        <path d="M440,700 L440,320 A200,200 0 0 1 840,320 L840,700 Z" fill="#3b2f2a" filter="url(#shadow)"/>
        ${Array.from({ length: 30 }, (_, i) => `<rect x="${460 + (i % 6) * 60}" y="${200 + Math.floor(i / 6) * 100}" width="58" height="98" fill="${pick(r, ["#2c5aa0", "#b23a48", "#f2c14e", "#3fa34d", "#7b4fa0", "#5fa8d3"])}" opacity="0.9"/>`).join("")}
        <path d="M440,700 L440,320 A200,200 0 0 1 840,320 L840,700 Z" fill="none" stroke="#3b2f2a" stroke-width="26"/>
        <rect x="628" y="260" width="24" height="300" fill="#f7e7b4"/><rect x="560" y="330" width="160" height="24" fill="#f7e7b4"/>`
      break
    default: {
      // Generic: framed board with category items (community, services, health, beauty, retail)
      hero = `<rect width="${W}" height="${H}" fill="${facade}"/><rect width="${W}" height="${H}" fill="#fff" opacity="0.72"/>
        <rect x="190" y="130" width="900" height="520" rx="24" fill="#fff" filter="url(#shadow)"/>
        <rect x="190" y="130" width="900" height="110" rx="24" fill="${trim}"/><rect x="190" y="210" width="900" height="30" fill="${trim}"/>
        <text x="640" y="200" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="700" fill="#fff">${esc(name.slice(0, 34))}</text>
        ${(SIGNATURE_ITEMS[category] ?? []).slice(0, 4).map((it, i) => `<circle cx="${290}" cy="${310 + i * 82}" r="22" fill="${accent === "#ffffff" ? facade : accent}"/><text x="${290}" y="${318 + i * 82}" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-weight="700" font-size="20" fill="#fff">✓</text><text x="340" y="${320 + i * 82}" font-family="ui-sans-serif, system-ui" font-size="30" fill="#27272a">${esc(it)}</text>`).join("")}
        <polygon points="${star(930, 420, 110, 50)}" fill="${facade}" opacity="0.9"/><circle cx="930" cy="420" r="30" fill="#fff7d6"/>`
    }
  }
  const bg = category === "grocery" || category === "remittance" || category === "church" || !["restaurant", "bakery", "cafe"].includes(category) ? "" : banig(r)
  return frame(
    `${bg}${hero}
    <g filter="url(#shadow)"><rect x="60" y="60" width="${label.length * 17 + 60}" height="56" rx="28" fill="#fff" opacity="0.94"/></g>
    <text x="90" y="96" font-family="ui-sans-serif, system-ui" font-weight="700" font-size="24" fill="#27272a">${esc(label)}</text>`,
    `${label} at ${name}`,
  )
}

function festive(name: string, category: string, r: Rng): string {
  const [facade, trim] = pick(r, CATEGORY_PALETTES[category] ?? CATEGORY_PALETTES.restaurant)
  const parols = Array.from({ length: 5 }, (_, i) => parol(170 + i * 235 + (r() - 0.5) * 60, 230 + r() * 90, 36 + r() * 18, pick(r, ["#e94f37", "#f2c14e", "#3fa3d8", "#e86fb0", "#7ed957"]))).join("")
  let stars = ""
  for (let i = 0; i < 60; i++) stars += `<circle cx="${r() * W}" cy="${r() * 260}" r="${r() * 1.8 + 0.4}" fill="#fff" opacity="${0.4 + r() * 0.6}"/>`
  const jx = 260 + r() * 520
  const jeep = `<g transform="translate(${jx},560)" filter="url(#shadow)">
    <rect x="0" y="20" width="460" height="120" rx="14" fill="#d9dde3"/>
    <rect x="-10" y="0" width="480" height="30" rx="10" fill="${facade}"/>
    ${Array.from({ length: 6 }, (_, i) => `<rect x="${90 + i * 58}" y="42" width="48" height="44" rx="6" fill="#2b3a55"/>`).join("")}
    <rect x="10" y="42" width="66" height="44" rx="6" fill="#9fd3f2"/>
    <rect x="0" y="94" width="460" height="14" fill="#ce1126"/><rect x="0" y="108" width="460" height="8" fill="#0038a8"/><rect x="0" y="116" width="460" height="6" fill="#fcd116"/>
    <text x="270" y="22" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="20" fill="#fff">${esc(name.slice(0, 26))}</text>
    <polygon points="-30,70 0,40 0,130 -30,130" fill="#b9bfc8"/>
    <rect x="-40" y="100" width="20" height="30" rx="4" fill="#9aa1ab"/>
    <circle cx="70" cy="140" r="30" fill="#1f1f1f"/><circle cx="70" cy="140" r="12" fill="#c7c7c7"/>
    <circle cx="380" cy="140" r="30" fill="#1f1f1f"/><circle cx="380" cy="140" r="12" fill="#c7c7c7"/>
    <polygon points="${star(-12, 34, 14, 6)}" fill="#fcd116"/>
  </g>`
  return frame(
    `<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121a3a"/><stop offset="0.7" stop-color="#3a2d5c"/><stop offset="1" stop-color="${trim}"/></linearGradient>
    <rect width="${W}" height="${H}" fill="url(#night)"/>
    ${stars}
    ${banderitas(40, r, 30)}
    ${banderitas(120, r, 24, 80, W - 80)}
    ${parols}
    <rect y="700" width="${W}" height="100" fill="#1c1c22"/>
    <rect y="696" width="${W}" height="6" fill="#f2c14e" opacity="0.5"/>
    ${jeep}
    <text x="640" y="470" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="64" fill="#fff7d6" opacity="0.95">Mabuhay!</text>`,
    `Fiesta night at ${name}`,
  )
}

const RENDERERS: Record<MockScene, (name: string, category: string, r: Rng) => string> = { exterior, interior, signature, festive }

export function renderMockPhoto(scene: MockScene, category: string, name: string, seed: number): string {
  return RENDERERS[scene](name, category, rng(seed))
}
