#!/usr/bin/env node
// Generates supabase/seed.sql with 100 mock Filipino establishments across Calgary.
// Deterministic (seeded PRNG) so `supabase db reset` always yields the same data.
//
//   node scripts/generate-seed.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'seed.sql');

// --- deterministic PRNG ------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261015);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + rand() * (max - min);
const int = (min, max) => Math.floor(between(min, max + 1));
const sample = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
};

// --- Calgary neighbourhoods (approximate centroids) -------------------------
// Weighted toward the NE and International Avenue, where many Filipino-Canadian
// businesses cluster.
const NEIGHBOURHOODS = [
  { name: 'Forest Lawn', lat: 51.0405, lng: -113.964, quad: 'SE', street: '17 Avenue SE', postal: 'T2A', weight: 6 },
  { name: 'Marlborough', lat: 51.056, lng: -113.962, quad: 'NE', street: 'Marlborough Way NE', postal: 'T2A', weight: 5 },
  { name: 'Pineridge', lat: 51.075, lng: -113.95, quad: 'NE', street: 'Rundlehorn Drive NE', postal: 'T1Y', weight: 4 },
  { name: 'Taradale', lat: 51.123, lng: -113.94, quad: 'NE', street: 'Taradale Drive NE', postal: 'T3J', weight: 6 },
  { name: 'Saddle Ridge', lat: 51.129, lng: -113.95, quad: 'NE', street: 'Saddletowne Circle NE', postal: 'T3J', weight: 6 },
  { name: 'Martindale', lat: 51.117, lng: -113.958, quad: 'NE', street: 'Martindale Boulevard NE', postal: 'T3J', weight: 5 },
  { name: 'Skyview Ranch', lat: 51.153, lng: -113.958, quad: 'NE', street: 'Skyview Ranch Road NE', postal: 'T3N', weight: 4 },
  { name: 'Cityscape', lat: 51.155, lng: -113.932, quad: 'NE', street: 'Cityscape Boulevard NE', postal: 'T3N', weight: 3 },
  { name: 'Redstone', lat: 51.164, lng: -113.953, quad: 'NE', street: 'Redstone Parade NE', postal: 'T3N', weight: 3 },
  { name: 'Cornerstone', lat: 51.145, lng: -113.931, quad: 'NE', street: 'Cornerstone Boulevard NE', postal: 'T3N', weight: 3 },
  { name: 'Falconridge', lat: 51.1, lng: -113.95, quad: 'NE', street: 'Falconridge Boulevard NE', postal: 'T3J', weight: 4 },
  { name: 'Whitehorn', lat: 51.089, lng: -113.968, quad: 'NE', street: '36 Street NE', postal: 'T1Y', weight: 3 },
  { name: 'Sunridge', lat: 51.073, lng: -113.986, quad: 'NE', street: 'Sunridge Way NE', postal: 'T1Y', weight: 3 },
  { name: 'Huntington Hills', lat: 51.117, lng: -114.071, quad: 'NW', street: '4 Street NW', postal: 'T2K', weight: 3 },
  { name: 'Beddington Heights', lat: 51.129, lng: -114.075, quad: 'NE', street: 'Beddington Boulevard NE', postal: 'T3K', weight: 2 },
  { name: 'Panorama Hills', lat: 51.158, lng: -114.089, quad: 'NW', street: 'Country Hills Boulevard NW', postal: 'T3K', weight: 2 },
  { name: 'Evanston', lat: 51.173, lng: -114.105, quad: 'NW', street: 'Evanston Drive NW', postal: 'T3P', weight: 2 },
  { name: 'Thorncliffe', lat: 51.095, lng: -114.059, quad: 'NW', street: 'Centre Street N', postal: 'T2K', weight: 3 },
  { name: 'Downtown Core', lat: 51.0464, lng: -114.0631, quad: 'SW', street: '8 Avenue SW', postal: 'T2P', weight: 3 },
  { name: 'Beltline', lat: 51.039, lng: -114.072, quad: 'SW', street: '17 Avenue SW', postal: 'T2R', weight: 3 },
  { name: 'Chinatown', lat: 51.052, lng: -114.064, quad: 'SE', street: 'Centre Street S', postal: 'T2G', weight: 2 },
  { name: 'Bridgeland', lat: 51.053, lng: -114.04, quad: 'NE', street: '1 Avenue NE', postal: 'T2E', weight: 2 },
  { name: 'Bowness', lat: 51.088, lng: -114.188, quad: 'NW', street: 'Bowness Road NW', postal: 'T3B', weight: 1 },
  { name: 'Marda Loop', lat: 51.023, lng: -114.1, quad: 'SW', street: '33 Avenue SW', postal: 'T2T', weight: 1 },
  { name: 'Glenbrook', lat: 51.03, lng: -114.145, quad: 'SW', street: '37 Street SW', postal: 'T3E', weight: 2 },
  { name: 'Acadia', lat: 50.971, lng: -114.051, quad: 'SE', street: 'Macleod Trail SE', postal: 'T2H', weight: 2 },
  { name: 'Shawnessy', lat: 50.903, lng: -114.067, quad: 'SW', street: 'Shawville Boulevard SE', postal: 'T2Y', weight: 2 },
  { name: 'McKenzie Towne', lat: 50.915, lng: -113.959, quad: 'SE', street: 'McKenzie Towne Drive SE', postal: 'T2Z', weight: 2 },
  { name: 'Seton', lat: 50.878, lng: -113.948, quad: 'SE', street: 'Seton Boulevard SE', postal: 'T3M', weight: 2 },
  { name: 'Mahogany', lat: 50.896, lng: -113.93, quad: 'SE', street: 'Mahogany Boulevard SE', postal: 'T3M', weight: 1 },
];
const WEIGHTED_HOODS = NEIGHBOURHOODS.flatMap((n) => Array(n.weight).fill(n));

// --- Establishments by category (100 total) ---------------------------------
const CATALOG = {
  restaurant: {
    names: [
      'Kusina ni Lola', 'Lutong Bahay Kitchen', 'Sarap Grill & Inasal', 'Adobo Republic', 'Kamayan Feast House',
      'Sinigang Station', 'Lechon de Calgary', 'Pancit Palace', 'Tapsilog Corner', 'Bulalo Bowl',
      'Kare-Kare Kitchen', "Tita Baby's Carinderia", 'Manila Bay Eatery', 'Cebu Lechon House', 'Ilocos Empanada Co.',
      'Pampanga Pride Kitchen', 'Bicol Express Diner', 'Davao Grill Haus', 'Sisig Society', 'Kanto Fried Chicken',
      'Ihaw-Ihaw sa Kanto', 'Silog Spot YYC', 'Gotohan ni Kuya', 'Barrio Fiesta Calgary', 'Mang Ben BBQ',
      'Inasal sa Prairie', 'Bahay Kubo Bistro', 'Lugawan Express', 'Turo-Turo Station', 'Kainan sa Chinook',
    ],
    specialties: ['adobo', 'sinigang', 'lechon', 'kare-kare', 'sisig', 'pancit canton', 'lumpia shanghai', 'chicken inasal', 'bulalo', 'tapsilog', 'longsilog', 'bicol express', 'dinuguan', 'arroz caldo', 'pinakbet', 'crispy pata', 'bbq skewers', 'kamayan boodle fight'],
    taglines: ['Home-style Filipino comfort food', 'Lutong bahay, just like Lola made', 'Turo-turo favourites served fresh daily', 'Charcoal-grilled Filipino barbecue', 'Family-style feasts and silog all day'],
    hours: { mon: '11:00-21:00', tue: '11:00-21:00', wed: '11:00-21:00', thu: '11:00-21:00', fri: '11:00-22:00', sat: '10:00-22:00', sun: '10:00-20:00' },
    price: [1, 2, 2, 3],
  },
  bakery: {
    names: [
      'Pandesal Haus', 'Panaderia de Calgary', 'Ensaymada Corner', 'Mamon & More Bakeshop', 'Ube Oven Bakery',
      'Hopia Hub', 'Pan de Coco Bakeshop', "Lola Nena's Bakeshop", 'Bibingka Bros.', 'Kakanin Kitchen',
    ],
    specialties: ['pandesal', 'ensaymada', 'ube cheese pandesal', 'spanish bread', 'pan de coco', 'hopia', 'mamon', 'bibingka', 'puto', 'kutsinta', 'sapin-sapin', 'leche flan', 'ube halaya', 'buko pie'],
    taglines: ['Fresh pandesal every morning', 'Baked goods and kakanin from the islands', 'Ube everything, baked daily', 'Merienda favourites since day one'],
    hours: { mon: '07:00-19:00', tue: '07:00-19:00', wed: '07:00-19:00', thu: '07:00-19:00', fri: '07:00-20:00', sat: '07:00-20:00', sun: '08:00-17:00' },
    price: [1, 1, 2],
  },
  grocery: {
    names: [
      'Tindahan Pinoy Mart', 'Sari-Sari Superstore', 'Manila Fresh Market', 'Kabayan Grocery', 'Island Pantry Foods',
      'Seafood City Express', 'Bayanihan Mart', 'Pinoy Pasalubong Center', 'Asian Fiesta Supermarket', 'Mabuhay Grocery',
      'Palengke YYC', 'Visayas Food Mart', 'Luzon Trading Co.', 'Mindanao Fresh',
    ],
    specialties: ['dried fish', 'frozen bangus', 'calamansi', 'fresh ube', 'pancit noodles', 'banana ketchup', 'sukang iloko', 'chicharon', 'shrimp paste', 'filipino snacks', 'longganisa', 'tocino', 'pasalubong boxes', 'philippine mangoes'],
    taglines: ['Your one-stop shop for Filipino groceries', 'Tastes of home, stocked fresh weekly', 'From the palengke to your kitchen', 'Pasalubong, snacks and pantry staples'],
    hours: { mon: '09:00-21:00', tue: '09:00-21:00', wed: '09:00-21:00', thu: '09:00-21:00', fri: '09:00-21:00', sat: '09:00-21:00', sun: '10:00-19:00' },
    price: [1, 2],
  },
  cafe: {
    names: [
      'Halo-Halo Haven', 'Kape Barako Café', 'Ube & Co. Desserts', 'Taho Tea House', 'Mais con Yelo Bar',
      'Turon Treats Café', 'Calamansi Coffee', 'Sago’t Gulaman Stop',
    ],
    specialties: ['halo-halo', 'kapeng barako', 'ube latte', 'taho', 'turon', 'buko pandan', 'mais con yelo', 'calamansi juice', 'sago’t gulaman', 'leche flan', 'mango float'],
    taglines: ['Cool desserts and warm barako', 'Halo-halo all year, even in a Chinook', 'Filipino café culture in Calgary', 'Merienda, matcha and more ube'],
    hours: { mon: '08:00-20:00', tue: '08:00-20:00', wed: '08:00-20:00', thu: '08:00-21:00', fri: '08:00-22:00', sat: '09:00-22:00', sun: '09:00-19:00' },
    price: [1, 2],
  },
  remittance: {
    names: [
      'Balikbayan Box Express', 'PadalaHub Remittance', 'Kabayan Cargo Services', 'Pinoy Door-to-Door Forwarders',
      'Bayad Center Calgary', 'Pamilya Money Transfer', 'Isla Cargo & Remit', 'Pasalubong Shipping Co.',
    ],
    specialties: ['balikbayan boxes', 'door-to-door cargo', 'money transfer', 'bills payment', 'load & e-wallet top-up', 'air cargo', 'sea cargo', 'free box pickup'],
    taglines: ['Send love home, door-to-door', 'Fast, reliable remittance to the Philippines', 'Balikbayan boxes, picked up free', 'Bills payment and cargo in one stop'],
    hours: { mon: '10:00-19:00', tue: '10:00-19:00', wed: '10:00-19:00', thu: '10:00-19:00', fri: '10:00-19:00', sat: '10:00-17:00', sun: 'closed' },
    price: [2],
  },
  beauty: {
    names: [
      'Ganda Beauty Salon', 'Gupit Pinoy Barbershop', 'Bella Pinay Spa', 'Hilot Healing Studio', 'Maganda Nails & Lashes',
      'Kulot & Co. Hair Studio', 'Barbero sa Northeast',
    ],
    specialties: ['haircut', 'rebond', 'hair colour', 'hilot massage', 'manicure', 'pedicure', 'lash extensions', 'beard trim', 'keratin treatment', 'bridal styling'],
    taglines: ['Beauty with a Pinoy touch', 'Traditional hilot and modern spa care', 'Fresh cuts, friendly kuwentuhan', 'Nails, lashes and good vibes'],
    hours: { mon: 'closed', tue: '10:00-19:00', wed: '10:00-19:00', thu: '10:00-20:00', fri: '10:00-20:00', sat: '09:00-18:00', sun: '11:00-17:00' },
    price: [2, 3],
  },
  church: {
    names: [
      'Filipino Catholic Mission of Calgary', 'Simbang Gabi Community Parish', 'Iglesia Bayanihan Fellowship',
      'Santo Niño Devotees Chapel', 'Couples for Christ Calgary Centre',
    ],
    specialties: ['tagalog mass', 'simbang gabi', 'santo niño fiesta', 'youth ministry', 'choir', 'bible study', 'flores de mayo', 'novena'],
    taglines: ['Faith, fellowship and fiesta', 'Masses in Tagalog every Sunday', 'A spiritual home away from home', 'Simbang Gabi and community worship'],
    hours: { mon: '09:00-17:00', tue: '09:00-17:00', wed: '09:00-17:00', thu: '09:00-17:00', fri: '09:00-21:00', sat: '09:00-21:00', sun: '07:30-20:00' },
    price: [null],
  },
  community: {
    names: [
      'Bayanihan Community Centre', 'Filipino-Canadian Association of Calgary', 'Kababayan Newcomer Hub',
      'Pinoy Seniors Club YYC', 'Sayaw Pilipinas Dance Troupe',
    ],
    specialties: ['newcomer support', 'tagalog classes', 'folk dance', 'seniors programs', 'fiesta events', 'job board', 'youth basketball', 'independence day celebration'],
    taglines: ['Building bayanihan in Calgary', 'Support for newcomers and families', 'Culture, community and celebration', 'Keeping Filipino traditions alive'],
    hours: { mon: '09:00-18:00', tue: '09:00-18:00', wed: '09:00-18:00', thu: '09:00-21:00', fri: '09:00-21:00', sat: '10:00-16:00', sun: 'closed' },
    price: [null],
  },
  services: {
    names: [
      'Kabayan Immigration Consulting', 'Pinoy Tax & Accounting', 'Bayani Realty Group', 'Tulay Translation Services',
      'Kapamilya Insurance Brokers', 'Daan Driving School', 'Sulong Career Services',
    ],
    specialties: ['immigration consulting', 'permanent residency', 'tax filing', 'bookkeeping', 'real estate', 'document translation', 'notary', 'auto insurance', 'life insurance', 'driving lessons', 'resume help'],
    taglines: ['Trusted guidance for your Canadian journey', 'Professional services, Pinoy-friendly', 'We speak your language — literally', 'Helping kababayans settle and succeed'],
    hours: { mon: '09:00-18:00', tue: '09:00-18:00', wed: '09:00-18:00', thu: '09:00-18:00', fri: '09:00-17:00', sat: '10:00-15:00', sun: 'closed' },
    price: [2, 3],
  },
  health: {
    names: ['Kalinga Family Clinic', 'Ngiti Dental Care', 'Lusog Physiotherapy', 'Alaga Home Care Services'],
    specialties: ['family medicine', 'walk-in clinic', 'dental cleaning', 'orthodontics', 'physiotherapy', 'caregiver services', 'tagalog-speaking staff', 'seniors care'],
    taglines: ['Care with malasakit', 'Tagalog-speaking healthcare professionals', 'Healthy smiles for the whole pamilya', 'Compassionate care at home'],
    hours: { mon: '08:00-18:00', tue: '08:00-18:00', wed: '08:00-18:00', thu: '08:00-20:00', fri: '08:00-17:00', sat: '09:00-14:00', sun: 'closed' },
    price: [2],
  },
  retail: {
    names: ['Barong & Filipiniana Boutique', 'Pinoy Pride Apparel'],
    specialties: ['barong tagalog', 'filipiniana dresses', 'terno', 'custom embroidery', 'pinoy streetwear', 'jeepney souvenirs', 'capiz décor'],
    taglines: ['Formal Filipino wear for every occasion', 'Wear your heritage proudly'],
    hours: { mon: 'closed', tue: '11:00-19:00', wed: '11:00-19:00', thu: '11:00-19:00', fri: '11:00-20:00', sat: '10:00-18:00', sun: '12:00-17:00' },
    price: [2, 3],
  },
};

const DESCRIPTION_OPENERS = {
  restaurant: (n, s, h) => `${n} serves generous plates of ${s[0]}, ${s[1]} and ${s[2]} in the heart of ${h}. Recipes come straight from the owners' family kitchen, and the rice is always unli on weekends.`,
  bakery: (n, s, h) => `${n} bakes ${s[0]} fresh before sunrise, alongside ${s[1]} and ${s[2]}. A favourite merienda stop for ${h} families — come early, the first batch sells out fast.`,
  grocery: (n, s, h) => `${n} stocks everything you need for a proper Filipino kitchen: ${s[0]}, ${s[1]}, ${s[2]} and more. Located in ${h}, with weekly shipments of pasalubong favourites.`,
  cafe: (n, s, h) => `${n} is a cozy ${h} hangout known for ${s[0]} and ${s[1]}. Pair a cup of ${s[2]} with a slice of something ube while you catch up with barkada.`,
  remittance: (n, s, h) => `${n} helps Calgary's Filipino community stay connected with family back home. Services include ${s[0]}, ${s[1]} and ${s[2]}, right here in ${h}.`,
  beauty: (n, s, h) => `${n} offers ${s[0]}, ${s[1]} and ${s[2]} with a warm, kapamilya welcome. Walk-ins are welcome at our ${h} studio; Tagalog and English spoken.`,
  church: (n, s, h) => `${n} is a gathering place for faith and fellowship in ${h}. Join us for ${s[0]}, ${s[1]} and ${s[2]} — all are welcome.`,
  community: (n, s, h) => `${n} brings kababayans together through ${s[0]}, ${s[1]} and ${s[2]}. Based in ${h}, run by volunteers who've walked the newcomer path themselves.`,
  services: (n, s, h) => `${n} provides ${s[0]}, ${s[1]} and ${s[2]} for individuals and families. Our ${h} office offers consultations in Tagalog, Bisaya and English.`,
  health: (n, s, h) => `${n} provides ${s[0]} and ${s[1]}, with ${s[2]} available on request. Serving ${h} and surrounding communities with culturally aware care.`,
  retail: (n, s, h) => `${n} carries ${s[0]}, ${s[1]} and ${s[2]} for weddings, debuts and cultural events. Visit our ${h} shop for fittings and custom orders.`,
};

const PHOTO_SCENES = [
  { scene: 'exterior', caption: (n) => `${n} storefront` },
  { scene: 'interior', caption: () => 'Inside the space' },
  { scene: 'signature', caption: (_, c) => SIGNATURE_CAPTION[c] },
  { scene: 'festive', caption: () => 'Community fiesta vibes' },
];
const SIGNATURE_CAPTION = {
  restaurant: 'House specialty, plated fresh',
  bakery: 'Fresh from the oven',
  grocery: 'Stocked shelves of Filipino staples',
  cafe: 'Signature halo-halo',
  remittance: 'Balikbayan boxes ready to ship',
  beauty: 'Our styling stations',
  church: 'Stained glass in the chapel',
  community: 'Programs and gatherings',
  services: 'Consultation desk',
  health: 'Welcoming care rooms',
  retail: 'Handmade barong and Filipiniana',
};

// --- helpers -----------------------------------------------------------------
const slugify = (s) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
const sql = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};
const sqlArray = (arr) => `array[${arr.map(sql).join(', ')}]::text[]`;
const LETTERS = 'ABCEGHJKLMNPRSTVXY';
const postal = (fsa) => `${fsa} ${int(1, 9)}${pick(LETTERS.split(''))}${int(0, 9)}`;

// --- build rows -----------------------------------------------------------------
const rows = [];
const photoRows = [];
let phoneSeq = 100;

for (const [category, def] of Object.entries(CATALOG)) {
  for (const name of def.names) {
    const hood = pick(WEIGHTED_HOODS);
    const slug = slugify(name);
    const specialties = sample(def.specialties, 4);
    const tags = [...new Set([...specialties, category, 'filipino'])];
    const ownedFlag = category === 'grocery' || category === 'remittance' ? rand() > 0.3 : rand() > 0.05;
    if (!ownedFlag) tags.push('caters to filipinos');
    const lat = +(hood.lat + between(-0.007, 0.007)).toFixed(6);
    const lng = +(hood.lng + between(-0.011, 0.011)).toFixed(6);
    const price = pick(def.price);
    const hasRating = category !== 'church' && category !== 'community';

    rows.push({
      slug,
      name,
      category,
      tagline: pick(def.taglines),
      description: DESCRIPTION_OPENERS[category](name, specialties, hood.name),
      address: `${int(100, 9800)} ${hood.street}`,
      neighbourhood: hood.name,
      postal_code: postal(hood.postal),
      latitude: lat,
      longitude: lng,
      // 555-01xx is reserved for fictional use in the NANP.
      phone: `(403) 555-0${String(phoneSeq++).slice(-3)}`,
      email: `hello@${slug}.example`,
      website: `https://${slug}.example`,
      hours: def.hours,
      price_level: price ?? null,
      rating: hasRating ? +between(3.7, 5).toFixed(1) : null,
      review_count: hasRating ? int(8, 640) : 0,
      tags,
      is_filipino_owned: ownedFlag,
      established_year: int(1988, 2025),
    });

    const photoSeed = int(1, 9999);
    PHOTO_SCENES.forEach(({ scene, caption }, i) => {
      const params = new URLSearchParams({ c: category, n: name, s: String(photoSeed + i) });
      photoRows.push({ slug, url: `/mock-photos/${scene}?${params}`, caption: caption(name, category), sort_order: i });
    });
  }
}

if (rows.length !== 100) throw new Error(`Expected 100 establishments, got ${rows.length}`);
if (new Set(rows.map((r) => r.slug)).size !== rows.length) throw new Error('Duplicate slugs');

// --- emit SQL --------------------------------------------------------------------
const lines = [
  '-- AUTO-GENERATED by scripts/generate-seed.mjs — do not edit by hand.',
  '-- 100 mock Filipino establishments across Calgary. All contact details are fictional.',
  '',
  'begin;',
  '',
  'insert into public.establishments',
  '  (slug, name, category, tagline, description, address, neighbourhood, postal_code, latitude, longitude,',
  '   phone, email, website, hours, price_level, rating, review_count, tags, is_filipino_owned, established_year)',
  'values',
  rows
    .map(
      (r) =>
        `  (${[
          sql(r.slug), sql(r.name), sql(r.category), sql(r.tagline), sql(r.description), sql(r.address),
          sql(r.neighbourhood), sql(r.postal_code), r.latitude, r.longitude, sql(r.phone), sql(r.email),
          sql(r.website), `${sql(JSON.stringify(r.hours))}::jsonb`, sql(r.price_level), sql(r.rating),
          r.review_count, sqlArray(r.tags), r.is_filipino_owned, r.established_year,
        ].join(', ')})`,
    )
    .join(',\n') + ';',
  '',
  'insert into public.establishment_photos (establishment_id, url, caption, sort_order)',
  'select e.id, p.url, p.caption, p.sort_order',
  'from (values',
  photoRows.map((p) => `  (${sql(p.slug)}, ${sql(p.url)}, ${sql(p.caption)}, ${p.sort_order})`).join(',\n'),
  ') as p(slug, url, caption, sort_order)',
  'join public.establishments e on e.slug = p.slug;',
  '',
  'commit;',
  '',
];

writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${rows.length} establishments and ${photoRows.length} photos to ${OUT}`);
