import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { AuthProvider } from "@/components/providers/auth-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "Filipino Fill — Filipino places in Calgary", template: "%s · Filipino Fill" },
  description: "Find Filipino restaurants, bakeries, groceries, remittance centres, churches and services across Calgary.",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-zinc-900 px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <div id="main">{children}</div>
              <SignInDialog />
              <Toaster position="bottom-center" richColors closeButton />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
