"use client"

import { Loader2 } from "lucide-react"
import { useId, useState, type FormEvent, type ReactNode } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CATEGORY_META } from "@/lib/categories"
import { CATEGORIES, type EstablishmentDetail, type EstablishmentInput } from "@/lib/types"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || undefined)

// Mirrors the API's DTO constraints so users get instant, field-level feedback.
const formSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(120),
  category: z.enum(CATEGORIES),
  tagline: optionalText(160),
  description: z.string().trim().min(10, "At least 10 characters").max(4000),
  address: z.string().trim().min(3, "Required").max(200),
  neighbourhood: z.string().trim().min(2, "Required").max(80),
  postalCode: optionalText(7).refine((v) => !v || /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/.test(v), "Use a Canadian postal code, e.g. T2A 1B3"),
  latitude: z.coerce.number().min(50.8, "Must be within Calgary").max(51.25, "Must be within Calgary"),
  longitude: z.coerce.number().min(-114.35, "Must be within Calgary").max(-113.85, "Must be within Calgary"),
  phone: optionalText(32),
  email: optionalText(320).refine((v) => !v || z.email().safeParse(v).success, "Invalid email"),
  website: optionalText(300).refine((v) => !v || /^https?:\/\/\S+\.\S+/.test(v), "Must start with http:// or https://"),
  priceLevel: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(1).max(4).optional()),
  tags: z.string().transform((v) =>
    v
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20)
  ),
  isFilipinoOwned: z.boolean(),
  establishedYear: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(1950).max(2100).optional()),
})

type FormValues = Record<keyof z.input<typeof formSchema>, string | boolean>

function toFormValues(e: EstablishmentDetail | null): FormValues {
  return {
    name: e?.name ?? "",
    category: e?.category ?? "restaurant",
    tagline: e?.tagline ?? "",
    description: e?.description ?? "",
    address: e?.address ?? "",
    neighbourhood: e?.neighbourhood ?? "",
    postalCode: e?.postalCode ?? "",
    latitude: e ? String(e.latitude) : "51.0447",
    longitude: e ? String(e.longitude) : "-114.0719",
    phone: e?.phone ?? "",
    email: e?.email ?? "",
    website: e?.website ?? "",
    priceLevel: e?.priceLevel ? String(e.priceLevel) : "",
    tags: e?.tags.filter((t) => t !== e.category && t !== "filipino").join(", ") ?? "",
    isFilipinoOwned: e?.isFilipinoOwned ?? true,
    establishedYear: e?.establishedYear ? String(e.establishedYear) : "",
  }
}

/** Parent remounts this (via `key`) each time it opens, so state starts fresh. */
interface Props {
  open: boolean
  initial: EstablishmentDetail | null
  onOpenChange: (open: boolean) => void
  onSubmit: (input: EstablishmentInput) => Promise<void>
}

export function EstablishmentFormDialog({ open, initial, onOpenChange, onSubmit }: Props) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(initial))
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [saving, setSaving] = useState(false)
  const formId = useId()

  const set = (key: keyof FormValues) => (value: string | boolean) => setValues((v) => ({ ...v, [key]: value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = formSchema.safeParse(values)
    if (!parsed.success) {
      const next: Partial<Record<keyof FormValues, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues
        next[key] ??= issue.message
      }
      setErrors(next)
      document.getElementById(`${formId}-${Object.keys(next)[0]}`)?.focus()
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await onSubmit(parsed.data)
    } finally {
      setSaving(false)
    }
  }

  const field = (key: keyof FormValues, label: string, control: ReactNode, hint?: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`${formId}-${key}`}>{label}</Label>
      {control}
      {errors[key] ? (
        <p id={`${formId}-${key}-error`} className="text-xs text-destructive">
          {errors[key]}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )

  const text = (key: keyof FormValues, props: React.ComponentProps<typeof Input> = {}) => (
    <Input
      id={`${formId}-${key}`}
      value={values[key] as string}
      onChange={(e) => set(key)(e.target.value)}
      aria-invalid={!!errors[key]}
      aria-describedby={errors[key] ? `${formId}-${key}-error` : undefined}
      className="h-10"
      {...props}
    />
  )

  const selectClass =
    "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader className="p-6 pb-4 sm:px-8 sm:pt-8">
            <DialogTitle className="text-xl tracking-tight">{initial ? `Edit ${initial.name}` : "Add establishment"}</DialogTitle>
            <DialogDescription>
              {initial ? "Changes are visible on the map immediately." : "New places get generated mock photos automatically."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-6 pb-6 sm:grid-cols-2 sm:px-8">
            <div className="sm:col-span-2">{field("name", "Name", text("name", { autoFocus: true, maxLength: 120 }))}</div>
            {field(
              "category",
              "Category",
              <select id={`${formId}-category`} value={values.category as string} onChange={(e) => set("category")(e.target.value)} className={selectClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            )}
            {field(
              "priceLevel",
              "Price level",
              <select id={`${formId}-priceLevel`} value={values.priceLevel as string} onChange={(e) => set("priceLevel")(e.target.value)} className={selectClass}>
                <option value="">Not applicable</option>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {"$".repeat(n)}
                  </option>
                ))}
              </select>
            )}
            <div className="sm:col-span-2">{field("tagline", "Tagline", text("tagline", { maxLength: 160 }), "Optional, shown under the name")}</div>
            <div className="sm:col-span-2">
              {field(
                "description",
                "Description",
                <Textarea
                  id={`${formId}-description`}
                  value={values.description as string}
                  onChange={(e) => set("description")(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  aria-invalid={!!errors.description}
                />
              )}
            </div>
            <div className="sm:col-span-2">{field("address", "Street address", text("address", { maxLength: 200 }))}</div>
            {field("neighbourhood", "Neighbourhood", text("neighbourhood", { maxLength: 80 }))}
            {field("postalCode", "Postal code", text("postalCode", { maxLength: 7, autoCapitalize: "characters" }))}
            {field("latitude", "Latitude", text("latitude", { inputMode: "decimal" }), "Calgary is ~50.85 to 51.2")}
            {field("longitude", "Longitude", text("longitude", { inputMode: "decimal" }), "Calgary is ~-114.3 to -113.9")}
            {field("phone", "Phone", text("phone", { type: "tel", maxLength: 32 }))}
            {field("email", "Email", text("email", { type: "email", maxLength: 320 }))}
            <div className="sm:col-span-2">{field("website", "Website", text("website", { type: "url", maxLength: 300, placeholder: "https://" }))}</div>
            <div className="sm:col-span-2">{field("tags", "Specialties / tags", text("tags"), "Comma-separated, e.g. adobo, lechon, catering")}</div>
            {field("establishedYear", "Established", text("establishedYear", { inputMode: "numeric", maxLength: 4 }))}
            <label className="flex items-center gap-3 self-end rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-muted/60">
              <input
                type="checkbox"
                checked={values.isFilipinoOwned as boolean}
                onChange={(e) => set("isFilipinoOwned")(e.target.checked)}
                className="size-4 accent-primary"
              />
              Filipino-owned
            </label>
          </div>

          <DialogFooter className="m-0 rounded-b-xl px-6 py-4 sm:px-8">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={saving}>
              {saving && <Loader2 className="animate-spin" aria-hidden />}
              {initial ? "Save changes" : "Add establishment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
