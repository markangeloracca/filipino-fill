"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { EmailOtpFlow } from "@/components/auth/email-otp-flow"
import { useAuth } from "@/components/providers/auth-provider"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api, ApiError, errorMessage } from "@/lib/api"

type Phase = "checking" | "hidden" | "prompt" | "claiming" | "done"
const DISMISS_KEY = "ff:setup-dismissed"

/**
 * First-run bootstrap. Shown only while no super admin exists: the visitor verifies
 * an email via OTP and is promoted to super admin. The API guarantees only one claim wins.
 */
export function SuperAdminSetup() {
  const { status, getToken, refreshMe } = useAuth()
  const [phase, setPhase] = useState<Phase>("checking")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .setupStatus()
      .then(({ superAdminExists }) => {
        if (cancelled) return
        let dismissed = false
        try {
          dismissed = sessionStorage.getItem(DISMISS_KEY) === "1"
        } catch {}
        setPhase(superAdminExists || dismissed ? "hidden" : "prompt")
      })
      .catch(() => !cancelled && setPhase("hidden"))
    return () => {
      cancelled = true
    }
  }, [])

  async function claim(token: string) {
    setPhase("claiming")
    setError(null)
    try {
      await api.claimSuperAdmin(token)
      await refreshMe()
      setPhase("done")
    } catch (err) {
      // 409: someone else completed setup in the meantime — nothing left to do here.
      if (err instanceof ApiError && err.status === 409) {
        setPhase("hidden")
        return
      }
      setError(errorMessage(err))
      setPhase("prompt")
    }
  }

  async function claimWithCurrentSession() {
    const token = await getToken()
    if (token) await claim(token)
  }

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1")
    } catch {}
    setPhase("hidden")
  }

  const open = phase === "prompt" || phase === "claiming" || phase === "done"

  return (
    <Dialog open={open} onOpenChange={(next) => !next && phase === "done" && setPhase("hidden")} disablePointerDismissal>
      <DialogContent showCloseButton={phase === "done"} className="gap-6 p-6 sm:max-w-md sm:p-8">
        {phase === "done" ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="grid gap-6 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <DialogHeader className="items-center">
              <DialogTitle className="text-xl tracking-tight">You&apos;re the super admin</DialogTitle>
              <DialogDescription>Setup is complete. This prompt won&apos;t appear again for anyone.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/admin" className={buttonVariants({ size: "lg" })} onClick={() => setPhase("hidden")}>
                Open admin dashboard
              </Link>
              <Button variant="outline" size="lg" onClick={() => setPhase("hidden")}>
                Explore the map
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10">
                <ShieldCheck className="size-5" aria-hidden />
              </div>
              <DialogTitle className="text-xl tracking-tight">Set up Filipino Fill</DialogTitle>
              <DialogDescription>
                No administrator exists yet. Verify your email to create the super admin account that manages establishments and
                platform settings.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {phase === "claiming" ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Creating your admin account…
              </div>
            ) : status === "authenticated" ? (
              <Button size="lg" className="h-11" onClick={claimWithCurrentSession}>
                Make my current account the super admin
              </Button>
            ) : (
              <EmailOtpFlow onVerified={claim} submitLabel="Send verification code" />
            )}
            <button
              type="button"
              onClick={dismiss}
              className="justify-self-center rounded text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              I&apos;m not the administrator — continue as guest
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
