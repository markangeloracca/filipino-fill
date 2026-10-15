"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Loader2, MessageCircle, ShieldCheck, Trash2 } from "lucide-react"
import { useEffect, useId, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { api, errorMessage } from "@/lib/api"
import { initials, timeAgo } from "@/lib/format"
import type { Comment } from "@/lib/types"

const MAX_LENGTH = 1000

export function CommentsSection({ establishmentId, establishmentName }: { establishmentId: string; establishmentName: string }) {
  const { status, me, isAdmin, getToken, openSignIn } = useAuth()
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [body, setBody] = useState("")
  const [posting, setPosting] = useState(false)
  const fieldId = useId()
  const counterId = useId()

  useEffect(() => {
    const ctrl = new AbortController()
    api
      .listComments(establishmentId, ctrl.signal)
      .then(setComments)
      .catch((err) => {
        if (!ctrl.signal.aborted) setLoadError(errorMessage(err))
      })
    return () => ctrl.abort()
  }, [establishmentId])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    const token = await getToken()
    if (!token) {
      openSignIn("Sign in to comment. We'll verify your email with a one-time code.")
      return
    }
    setPosting(true)
    try {
      const created = await api.createComment(establishmentId, text, token)
      setComments((c) => [created, ...(c ?? [])])
      setBody("")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  async function remove(id: string) {
    const token = await getToken()
    if (!token) return
    const previous = comments
    setComments((c) => c?.filter((x) => x.id !== id) ?? null)
    try {
      await api.deleteComment(id, token)
      toast.success("Comment deleted")
    } catch (err) {
      setComments(previous)
      toast.error(errorMessage(err))
    }
  }

  return (
    <section aria-labelledby={`${fieldId}-heading`} className="space-y-5">
      <h3 id={`${fieldId}-heading`} className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
        <MessageCircle className="size-4" aria-hidden />
        Comments {comments && comments.length > 0 && <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>}
      </h3>

      {status === "authenticated" && me?.emailVerified ? (
        <form onSubmit={submit} className="space-y-2">
          <label htmlFor={fieldId} className="sr-only">
            Write a comment about {establishmentName}
          </label>
          <Textarea
            id={fieldId}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_LENGTH))}
            placeholder={`Share your experience at ${establishmentName}…`}
            rows={3}
            aria-describedby={counterId}
            className="min-h-20 resize-none text-base sm:text-sm"
            disabled={posting}
          />
          <div className="flex items-center justify-between">
            <span id={counterId} className="text-xs text-muted-foreground tabular-nums">
              {body.length}/{MAX_LENGTH}
            </span>
            <Button type="submit" disabled={posting || !body.trim()}>
              {posting && <Loader2 className="animate-spin" aria-hidden />}
              Post comment
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-input bg-muted/50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/80">Join the conversation — registered members can share tips and reviews.</p>
          <Button
            variant="outline"
            onClick={() => openSignIn("Sign in to comment. We'll verify your email with a one-time code.")}
            disabled={status === "loading"}
            className="shrink-0"
          >
            Sign in to comment
          </Button>
        </div>
      )}

      {loadError ? (
        <p role="alert" className="text-sm text-destructive">
          {loadError}
        </p>
      ) : comments === null ? (
        <div className="space-y-4" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">No comments yet. Be the first to share your experience!</p>
      ) : (
        <ul className="space-y-1">
          <AnimatePresence initial={false}>
            {comments.map((c) => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.18 }}
              >
                <article className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-muted/60">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground/80" aria-hidden>
                    {initials(c.author.name) || "K"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <header className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold text-foreground">{c.author.name}</span>
                      {c.author.role !== "user" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                          <ShieldCheck className="size-3" aria-hidden /> Admin
                        </span>
                      )}
                      <time dateTime={c.createdAt} className="text-xs text-muted-foreground">
                        {timeAgo(c.createdAt)}
                      </time>
                    </header>
                    <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-line text-foreground/80">{c.body}</p>
                  </div>
                  {(me?.id === c.author.id || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(c.id)}
                      aria-label="Delete comment"
                      className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  )}
                </article>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}
