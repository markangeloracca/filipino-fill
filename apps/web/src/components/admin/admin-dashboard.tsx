"use client"

import { motion } from "framer-motion"
import { Building2, Lock, MessageSquare, Pencil, Plus, Search, ShieldCheck, Trash2, Users } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/auth-provider"
import { BrandMark } from "@/components/search/search-panel"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, errorMessage } from "@/lib/api"
import { CATEGORY_META } from "@/lib/categories"
import type { EstablishmentDetail, EstablishmentInput, EstablishmentSummary, PlatformStats } from "@/lib/types"
import { EstablishmentFormDialog } from "./establishment-form-dialog"

export function AdminDashboard() {
  const { status, isAdmin, openSignIn } = useAuth()

  if (status === "loading") return <PageShell><DashboardSkeleton /></PageShell>

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-24 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted ring-1 ring-foreground/10">
            <Lock className="size-6 text-foreground/80" aria-hidden />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admins only</h1>
            <p className="text-sm text-muted-foreground">
              {status === "guest" ? "Sign in with an administrator account to manage the platform." : "Your account doesn't have admin access."}
            </p>
          </div>
          <div className="flex gap-2">
            {status === "guest" && (
              <Button size="lg" onClick={() => openSignIn()}>
                Sign in
              </Button>
            )}
            <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Back to map
            </Link>
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <AdminContent />
    </PageShell>
  )
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3 rounded-lg focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none">
            <BrandMark className="size-9" />
            <span className="font-semibold tracking-tight text-foreground">
              Filipino Fill <span className="font-normal text-muted-foreground">/ Admin</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  )
}

function AdminContent() {
  const { getToken, me } = useAuth()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [rows, setRows] = useState<EstablishmentSummary[] | null>(null)
  const [filter, setFilter] = useState("")
  const [editing, setEditing] = useState<EstablishmentDetail | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<EstablishmentSummary | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getToken()
      .then((token) => (token ? Promise.allSettled([api.adminStats(token), api.searchEstablishments({ limit: 200 })]) : null))
      .then((settled) => {
        if (!settled || cancelled) return
        const [s, list] = settled
        if (s.status === "fulfilled") setStats(s.value)
        else setStatsError(errorMessage(s.reason))
        if (list.status === "fulfilled") setRows(list.value)
      })
    return () => {
      cancelled = true
    }
  }, [getToken, reloadKey])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!rows) return null
    return q ? rows.filter((r) => `${r.name} ${r.neighbourhood} ${r.category}`.toLowerCase().includes(q)) : rows
  }, [rows, filter])

  async function openEdit(id: string) {
    try {
      setEditing(await api.getEstablishment(id))
      setFormKey((k) => k + 1)
      setFormOpen(true)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function save(input: EstablishmentInput) {
    const token = await getToken()
    if (!token) return
    try {
      const saved = editing ? await api.updateEstablishment(editing.id, input, token) : await api.createEstablishment(input, token)
      toast.success(editing ? `Saved ${saved.name}` : `Added ${saved.name}`)
      setFormOpen(false)
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    const token = await getToken()
    if (!token) return
    setDeletePending(true)
    try {
      await api.deleteEstablishment(deleting.id, token)
      toast.success(`Removed ${deleting.name}`)
      setDeleting(null)
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[clamp(1.6rem,1.3rem+1vw,2.1rem)] font-semibold tracking-tight text-foreground">Platform status</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {me?.email} · {me?.role === "super_admin" ? "Super admin" : "Admin"}
        </p>
      </div>

      {statsError ? (
        <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive ring-1 ring-destructive/30">
          {statsError}
        </p>
      ) : !stats ? (
        <StatsSkeleton />
      ) : (
        <>
          <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<Users />} label="Registered users" value={stats.registeredUsers} sub={`+${stats.newUsersLast7Days} this week · ${stats.pendingVerification} pending`} />
            <StatTile icon={<Building2 />} label="Establishments" value={stats.establishments} sub={`${stats.filipinoOwned} Filipino-owned`} />
            <StatTile icon={<MessageSquare />} label="Comments" value={stats.comments} sub={`+${stats.commentsLast7Days} this week`} />
            <StatTile icon={<ShieldCheck />} label="Admins" value={stats.admins} sub="Including super admin" />
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <BarList
              className="lg:col-span-2"
              title="Establishments by category"
              items={stats.byCategory.map((c) => ({ label: CATEGORY_META[c.category]?.label ?? c.category, value: c.count }))}
            />
            <BarList title="Top neighbourhoods" items={stats.topNeighbourhoods.map((n) => ({ label: n.neighbourhood, value: n.count }))} />
          </div>
        </>
      )}

      <section aria-labelledby="manage-heading" className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]">
        <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="manage-heading" className="text-lg font-semibold tracking-tight text-foreground">
              Establishments
            </h2>
            <p className="text-sm text-muted-foreground">Add, update or remove places shown on the map.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" aria-label="Filter establishments" className="h-10 pl-9" />
            </div>
            <Button
              size="lg"
              className="h-10"
              onClick={() => {
                setEditing(null)
                setFormKey((k) => k + 1)
                setFormOpen(true)
              }}
            >
              <Plus aria-hidden /> Add
            </Button>
          </div>
        </div>

        {!filtered ? (
          <div className="space-y-3 p-6" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">{rows?.length ? `Nothing matches “${filter}”.` : "No establishments yet."}</p>
            <Button
              variant="outline"
              onClick={() => {
                if (rows?.length) return setFilter("")
                setEditing(null)
                setFormKey((k) => k + 1)
                setFormOpen(true)
              }}
            >
              {rows?.length ? "Clear filter" : "Add the first one"}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Neighbourhood</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Rating</TableHead>
                  <TableHead className="pr-6 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="group">
                    <TableCell className="py-3 pl-6">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG mock photos */}
                        {r.coverPhotoUrl && <img src={r.coverPhotoUrl} alt="" className="size-9 rounded-md object-cover ring-1 ring-foreground/10" loading="lazy" />}
                        <span className="font-medium text-foreground">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground/80">{CATEGORY_META[r.category].label}</TableCell>
                    <TableCell className="hidden text-foreground/80 md:table-cell">{r.neighbourhood}</TableCell>
                    <TableCell className="hidden text-right text-foreground/80 tabular-nums sm:table-cell">{r.rating?.toFixed(1) ?? "—"}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r.id)} aria-label={`Edit ${r.name}`}>
                          <Pencil aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(r)} aria-label={`Remove ${r.name}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <EstablishmentFormDialog key={formKey} open={formOpen} initial={editing} onOpenChange={setFormOpen} onSubmit={save} />

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && !deletePending && setDeleting(null)}>
        <DialogContent className="gap-6 p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">Remove {deleting?.name}?</DialogTitle>
            <DialogDescription>It will disappear from the map and search. The record is soft-deleted and can be restored from the database.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-6 -mb-6 px-6">
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletePending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletePending}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatTile({ icon, label, value, sub }: { icon: ReactNode; label: string; value: number; sub: string }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
        <span className="text-muted-foreground [&_svg]:size-4" aria-hidden>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </motion.article>
  )
}

/** Single-series magnitude list: one hue, direct value labels, no legend needed. */
function BarList({ title, items, className }: { title: string; items: Array<{ label: string; value: number }>; className?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <section className={`rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] ${className ?? ""}`}>
      <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="group grid grid-cols-[minmax(7rem,10rem)_1fr_2.5rem] items-center gap-3 text-sm" title={`${item.label}: ${item.value}`}>
            <span className="truncate text-foreground/80">{item.label}</span>
            <span className="h-2.5 overflow-hidden rounded-r bg-muted" aria-hidden>
              <span
                className="block h-full origin-left rounded-r bg-foreground/80 transition-opacity group-hover:opacity-80"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-medium text-foreground tabular-nums">{item.value}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function StatsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <Skeleton className="h-10 w-64" />
      <StatsSkeleton />
    </div>
  )
}
