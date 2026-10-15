"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Inbox, Loader2, Mail } from "lucide-react"
import { useEffect, useId, useState, type FormEvent } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { env } from "@/lib/env"
import { getSupabase } from "@/lib/supabase"

const emailSchema = z.email("Enter a valid email address").max(320)
const OTP_LENGTH = 6
const RESEND_COOLDOWN_S = 30

interface EmailOtpFlowProps {
  /** Called once Supabase confirms the code; the user is now signed in and verified. */
  onVerified: (accessToken: string) => Promise<void> | void
  submitLabel?: string
}

/** Two-step email → 6-digit code verification. The email address is the user's ID. */
export function EmailOtpFlow({ onVerified, submitLabel = "Send code" }: EmailOtpFlowProps) {
  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const emailId = useId()
  const errorId = useId()

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function sendCode(e?: FormEvent) {
    e?.preventDefault()
    const parsed = emailSchema.safeParse(email.trim().toLowerCase())
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email")
      return
    }
    setPending(true)
    setError(null)
    const { error: err } = await getSupabase().auth.signInWithOtp({ email: parsed.data, options: { shouldCreateUser: true } })
    setPending(false)
    if (err) {
      setError(err.status === 429 ? "Too many attempts. Please wait a moment and try again." : err.message)
      return
    }
    setEmail(parsed.data)
    setCode("")
    setStep("code")
    setCooldown(RESEND_COOLDOWN_S)
  }

  async function verify(token: string) {
    if (token.length !== OTP_LENGTH || pending) return
    setPending(true)
    setError(null)
    const { data, error: err } = await getSupabase().auth.verifyOtp({ email, token, type: "email" })
    if (err || !data.session) {
      setPending(false)
      setCode("")
      setError(err?.message.includes("expired") ? "That code has expired. Request a new one." : "That code didn't match. Try again.")
      return
    }
    try {
      await onVerified(data.session.access_token)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setPending(false)
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step === "email" ? (
        <motion.form
          key="email"
          onSubmit={sendCode}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="grid gap-4"
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor={emailId}>Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id={emailId}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                className="h-11 pl-9 text-base sm:text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                disabled={pending}
              />
            </div>
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="h-11" disabled={pending || !email}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {submitLabel}
          </Button>
        </motion.form>
      ) : (
        <motion.div
          key="code"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="grid gap-5"
        >
          <p className="text-sm text-muted-foreground">
            We sent a {OTP_LENGTH}-digit code to <span className="font-medium text-foreground">{email}</span>.
          </p>
          <div className="flex justify-center">
            <InputOTP
              maxLength={OTP_LENGTH}
              value={code}
              onChange={setCode}
              onComplete={verify}
              autoFocus
              disabled={pending}
              inputMode="numeric"
              pattern="^[0-9]+$"
              aria-label="Verification code"
              aria-describedby={error ? errorId : undefined}
            >
              <InputOTPGroup>
                {Array.from({ length: OTP_LENGTH }, (_, i) => (
                  <InputOTPSlot key={i} index={i} className="size-11 text-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-center text-sm text-destructive">
              {error}
            </p>
          )}
          <Button size="lg" className="h-11" onClick={() => verify(code)} disabled={pending || code.length !== OTP_LENGTH}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Verify
          </Button>
          <div className="flex items-center justify-between text-sm">
            <Button variant="ghost" size="sm" onClick={() => setStep("email")} disabled={pending}>
              <ArrowLeft aria-hidden /> Change email
            </Button>
            <Button variant="ghost" size="sm" onClick={() => sendCode()} disabled={pending || cooldown > 0}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </Button>
          </div>
          {env.NEXT_PUBLIC_DEV_MAILBOX_URL && (
            <a
              href={env.NEXT_PUBLIC_DEV_MAILBOX_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Inbox className="size-3.5" aria-hidden /> Local dev: open the Mailpit inbox to grab your code
            </a>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
