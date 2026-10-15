"use client"

import type { Session } from "@supabase/supabase-js"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { api, ApiError } from "@/lib/api"
import { getSupabase } from "@/lib/supabase"
import type { Me } from "@/lib/types"

type AuthStatus = "loading" | "guest" | "authenticated"

interface AuthContextValue {
  status: AuthStatus
  me: Me | null
  isAdmin: boolean
  /** Fresh access token (auto-refreshed by supabase-js), or null for guests. */
  getToken: () => Promise<string | null>
  refreshMe: () => Promise<Me | null>
  signOut: () => Promise<void>
  signInOpen: boolean
  openSignIn: (reason?: string) => void
  closeSignIn: () => void
  signInReason: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  // Profile is tagged with the user id it was loaded for; null = load failed.
  const [profile, setProfile] = useState<{ userId: string; me: Me | null } | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)
  const [signInReason, setSignInReason] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const accessToken = session?.access_token ?? null
  const userId = session?.user.id ?? null
  useEffect(() => {
    if (!accessToken || !userId) return
    let cancelled = false
    api
      .me(accessToken)
      .then((me) => !cancelled && setProfile({ userId, me }))
      .catch((err) => {
        if (cancelled) return
        setProfile({ userId, me: null })
        // Session no longer valid server-side (user deleted, DB reset): drop it locally too.
        if (err instanceof ApiError && err.status === 401) void getSupabase().auth.signOut()
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, userId])

  const me = userId && profile?.userId === userId ? profile.me : undefined

  const getToken = useCallback(async () => {
    const { data } = await getSupabase().auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const refreshMe = useCallback(async () => {
    const token = await getToken()
    if (!token) return null
    const { data } = await getSupabase().auth.getUser(token)
    if (!data.user) return null
    const fresh = await api.me(token)
    setProfile({ userId: data.user.id, me: fresh })
    return fresh
  }, [getToken])

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut()
  }, [])

  const openSignIn = useCallback((reason?: string) => {
    setSignInReason(reason ?? null)
    setSignInOpen(true)
  }, [])
  const closeSignIn = useCallback(() => setSignInOpen(false), [])

  const status: AuthStatus = session === undefined || (session && me === undefined) ? "loading" : session && me ? "authenticated" : "guest"

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      me: me ?? null,
      isAdmin: me?.role === "admin" || me?.role === "super_admin",
      getToken,
      refreshMe,
      signOut,
      signInOpen,
      openSignIn,
      closeSignIn,
      signInReason,
    }),
    [status, me, getToken, refreshMe, signOut, signInOpen, openSignIn, closeSignIn, signInReason]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
