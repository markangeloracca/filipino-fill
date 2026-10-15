"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

const noopSubscribe = () => () => {}
/** True only after hydration — the stored theme is unknown during SSR. */
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false)

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const hydrated = useHydrated()
  const current = hydrated ? (theme ?? "system") : "system"
  const Icon = hydrated && resolvedTheme === "dark" ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Colour theme: ${OPTIONS.find((o) => o.value === current)?.label ?? "System"}. Change theme`}
            className={cn(
              "flex size-10 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.05),0_4px_12px_-2px_rgb(0_0_0/0.12)] backdrop-blur transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95",
              className
            )}
          />
        }
      >
        <Icon className="size-[18px]" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={current} onValueChange={(value) => setTheme(value as string)}>
            {OPTIONS.map(({ value, label, icon: OptionIcon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <OptionIcon aria-hidden /> {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
