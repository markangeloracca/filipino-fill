"use client"

import { LayoutDashboard, LogOut, Map as MapIcon, UserRound } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { initials } from "@/lib/format"

const ROLE_LABEL = { user: "Member", admin: "Admin", super_admin: "Super admin" } as const

export function UserMenu() {
  const { status, me, isAdmin, openSignIn, signOut } = useAuth()
  const pathname = usePathname()

  if (status === "loading") return <Skeleton className="h-10 w-28 rounded-full" />

  if (status === "guest" || !me) {
    return (
      <Button
        onClick={() => openSignIn()}
        className="h-10 rounded-full px-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.05),0_4px_12px_-2px_rgb(0_0_0/0.15)]"
      >
        <UserRound aria-hidden /> Sign in
      </Button>
    )
  }

  const label = me.displayName ?? me.email
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Account menu for ${label}`}
            className="flex h-10 items-center gap-2 rounded-full border border-border bg-card/95 pr-1 pl-1 sm:pr-4 text-sm font-medium text-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.05),0_4px_12px_-2px_rgb(0_0_0/0.12)] backdrop-blur transition-colors hover:bg-card focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98]"
          />
        }
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden>
          {initials(me.displayName ?? me.email.split("@")[0]) || "K"}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5">
            <p className="truncate text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs font-normal text-muted-foreground">{ROLE_LABEL[me.role]}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {pathname !== "/" && (
          <DropdownMenuItem render={<Link href="/" />}>
            <MapIcon aria-hidden /> Map
          </DropdownMenuItem>
        )}
        {isAdmin && pathname !== "/admin" && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <LayoutDashboard aria-hidden /> Admin dashboard
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
