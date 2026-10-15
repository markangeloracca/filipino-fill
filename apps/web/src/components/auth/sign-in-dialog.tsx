"use client"

import { Loader2 } from "lucide-react"
import { useId, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, errorMessage } from "@/lib/api"
import { EmailOtpFlow } from "./email-otp-flow"

export function SignInDialog() {
  const { signInOpen, closeSignIn, signInReason, refreshMe } = useAuth()
  const [step, setStep] = useState<"otp" | "profile">("otp")
  const [token, setToken] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const nameId = useId()

  function reset() {
    setStep("otp")
    setToken(null)
    setName("")
  }

  async function handleVerified(accessToken: string) {
    const me = await refreshMe()
    if (me && !me.displayName) {
      setToken(accessToken)
      setStep("profile")
      return
    }
    toast.success(`Welcome back${me?.displayName ? `, ${me.displayName}` : ""}!`)
    closeSignIn()
  }

  async function saveName(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    const trimmed = name.trim()
    if (trimmed) {
      setSaving(true)
      try {
        await api.updateMe(trimmed, token)
        await refreshMe()
      } catch (err) {
        toast.error(errorMessage(err))
        setSaving(false)
        return
      }
      setSaving(false)
    }
    toast.success("You're registered. Maligayang pagdating!")
    closeSignIn()
  }

  return (
    <Dialog open={signInOpen} onOpenChange={(open) => !open && closeSignIn()} onOpenChangeComplete={(open) => !open && reset()}>
      <DialogContent className="gap-6 p-6 sm:max-w-md sm:p-8">
        {step === "otp" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl tracking-tight">Sign in or register</DialogTitle>
              <DialogDescription>
                {signInReason ?? "Your email is your account. We'll send a one-time code to verify it — no password needed."}
              </DialogDescription>
            </DialogHeader>
            <EmailOtpFlow onVerified={handleVerified} />
          </>
        ) : (
          <form onSubmit={saveName} className="grid gap-6">
            <DialogHeader>
              <DialogTitle className="text-xl tracking-tight">You&apos;re verified 🎉</DialogTitle>
              <DialogDescription>How should we show your name on comments? You can skip this.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor={nameId}>Display name</Label>
              <Input id={nameId} className="h-11" maxLength={60} autoFocus placeholder="e.g. Tita Baby" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => {
                  toast.success("You're registered. Maligayang pagdating!")
                  closeSignIn()
                }}
                disabled={saving}
              >
                Skip
              </Button>
              <Button type="submit" size="lg" disabled={saving || !name.trim()}>
                {saving && <Loader2 className="animate-spin" aria-hidden />}
                Save
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
