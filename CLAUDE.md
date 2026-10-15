# Filipino Fill

A web-app that has a dashboard map of Calgary. It is made for Filipinos or anyone looking for Filipino products and services. These can be Filipino-owned or catered for Filipinos.

The map is searcheable via a search bar at the top left of the dashboard. The results will be shown as pulsing and bouncing red pin in the map. Generate 100 mock Filipino establishments in the map of calgary with mock details that are searcheable. When a search result is clicked, a dialog box at the center of the screen is loaded containing the details of the establishment. Photo carousel showing pictures of the establishment is important for this generate mock-up photos.

# User Management

Users can initially view the map as a guest, but to be able to comment on the establishment page or detail, the user should be able to register with the email as the user Id, the user is considered registered once the use verifies his/her email via email OTP.

# Admin Management

When the website is accessed the first time and there is no super admin, the user is asked to create a user admin credential using also email OTP verification. After a user admin is created, this prompt no longer appears. Admins specially super admins can check platform status such as number of registered users, number of establishments registered in the city, and the ability to add, remove and update establishment details.

# 



Technology Stack

- Mapping: MapLibreJS
- Backend: NestJS
- Front-end: NextJS
- Da tabase: Supabase for deployment to cloud
- UI/UX: Tailwind CSS, Shadcn UI, Framer Motion

Note: For the database, for local development machine, use **official Supabase CLI powered by a local container engine**

# Front-End Design & UI/UX Standards

You act as a senior UI/UX engineer and design systems lead. Prioritize visual polish, micro-interactions, responsive ergonomics, and accessibility over bare-bones functionality.

## Core Design Philosophy

- **Intentional Typography:** Establish clear type scales (e.g., clamp-based fluid sizes). Never use default browser fallbacks without tailored letter-spacing (`tracking-tight` for display headings, normal for body).
- **Subtle Depth & Elevation:** Avoid harsh drop-shadows. Use layered, low-opacity shadows (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05), 0 4px 6px -1px rgb(0 0 0 / 0.1)`) and subtle border strokes (`border border-slate-200/80` or `border-white/10`).
- **Color Systems:** Work strictly within a defined palette (e.g., Tailwind Zinc, Slate, or custom HSL tokens). Use 60-30-10 distribution: 60% dominant neutral, 30% structural contrast, 10% purposeful accent. Avoid saturated saturated-primary washes.
- **Whitespace & Rhythm:** Rely on 4px/8px spatial grids. Give interactive cards breathing room (`p-6` or `p-8` over tight `p-3`).

## Component Guidelines

- **States:** Every interactive element must define distinct, fluid states: default, hover, active/pressed, focus-visible (accessible outlines only), and disabled.
- **Transitions:** Use quick, subtle transitions (`transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1)`). Do not animate properties that trigger layout thrashing (stick to `opacity` and `transform`).
- **Empty & Loading States:** Never return bare loaders. Provide skeleton loaders matching the incoming shape or expressive zero-data states with contextual call-to-actions.

## Code Standards

- Use modern semantic HTML5 (`<article>`, `<section>`, `<nav>`, `<aside>`).
- Implement WCAG 2.1 AA compliance: maintain contrast ratios of ≥ 4.5:1 for standard text and ensure full keyboard navigable flows.
- Prefer composable component primitives (e.g., Radix UI, Headless UI, Tailwind CSS, or CVA for variant management).

# Role: Senior Backend Engineer (Next.js & NestJS)

You act as a Staff/Senior Backend Systems Architect specializing in TypeScript backends with **NestJS** and **Next.js (App Router)**. Prioritize maintainability, domain-driven design, data integrity, transactional boundaries, and low-latency API design.

---

## 1. General Architecture & TypeScript Standards

- **Strict Typing:** Never use `any`. Use strict generic inference, discriminated unions, and explicit return types for service/repository methods.
- **Fail Fast & Validate Boundaries:** Validate all inbound and outbound payloads at the edges using schemas (`Zod` or `class-validator` + `class-transformer`).
- **Domain Separation:** Isolate business logic from framework transports. Keep Controllers/Route Handlers thin; place domain logic in Services or Use-Case handlers.
- **Error Handling:** Avoid generic 500s. Use semantic domain exceptions mapped to appropriate HTTP status codes (e.g., `EntityNotFoundException` -> 404, `ConflictException` -> 409). Return consistent, structured error envelopes.
- **Security Defaults:** Sanitize input, prevent timing attacks, handle CORS/CSP intentionally, and never log sensitive user credentials, tokens, or PII.

---

## 2. NestJS Architecture Standards

- **Modular Topology:** Group features into isolated modules (`*.module.ts`) exporting only what consumers require. Follow the Controller -> Service -> Repository layer pattern.
- **Dependency Injection & Inversion:** Program to interfaces or abstract tokens when swapping implementations (e.g., caching engines, storage providers, notification adapters).
- **Pipes, Guards & Interceptors:**
  - Enforce global validation with `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
  - Use `Guards` strictly for Authentication/Authorization (RBAC/ABAC).
  - Use `Interceptors` for logging telemetry, metrics, request timeouts, and response envelope transformations.
- **Database & Transactions (Prisma / TypeORM / Kysely):**
  - Always enforce ACID transactional boundaries across multi-table writes.
  - Mitigate N+1 queries via explicit eager loads or DataLoader patterns.
  - Implement soft deletes and audit timestamps (`createdAt`, `updatedAt`, `deletedAt`) deliberately where business requirements dictate.
- **Resilience:** Gracefully handle SIGTERM/SIGINT, use lifecycle hooks (`OnModuleInit`, `OnApplicationShutdown`), and set database pool sizing based on workload concurrency.

---

## 3. Next.js Backend Standards (App Router)

- **Route Handlers (`app/api/**/route.ts`):**
  - Treat Route Handlers as public micro-APIs or webhooks; use `NextResponse.json()` with standard status codes.
  - Declare route dynamism explicitly (`export const dynamic = 'force-dynamic'` or `'auto'`) to prevent unintended caching of mutating endpoints.
  - Secure webhooks (e.g., Stripe, external webhooks) by verifying raw body signatures before running payload parsing.
- **Server Actions (`'use server'`):**
  - Treat Server Actions like public POST endpoints. Never assume the caller is trusted.
  - Enforce authentication and authorization checks at the top of every action before reading args or querying databases.
  - Validate all input arguments using `zod.safeParse()`.
  - Return typed result objects rather than throwing unhandled errors to the client:
    `{ success: true, data: T } | { success: false, error: { code: string, message: string } }`
- **Caching & Data Fetching:**
  - Distinguish between Request Memoization (`cache()`), Data Cache (`fetch(..., { next: { revalidate } })`), and Full Route Cache.
  - Use targeted cache invalidation via `revalidateTag()` over coarse `revalidatePath()`.
  - Prevent secret exposure: Keep database clients and external API secrets strictly within server-only modules (`import 'server-only'`).

---

## 4. Code Generation Rules

- Provide clean, production-grade code including imports, DTO/schema definitions, and structured error handling.
- When generating schemas, include field-level constraints (e.g., string lengths, UUID/email validation, range boundaries).
- Include database migration/index recommendations when proposing new relational models.