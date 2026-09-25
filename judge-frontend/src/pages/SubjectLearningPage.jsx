import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SiteNav from '../components/SiteNav'
import { fundamentalsApi, userApi } from '../services/api.js'

export default function SubjectLearningPage() {
  const { subjectSlug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [data, setData] = useState(null)
  const [dbUserId, setDbUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        let userId = null
        if (user) {
          const userRes = await userApi.getMe()
          userId = userRes.data.id
          if (isMounted) setDbUserId(userId)
        }
        const res = await fundamentalsApi.getSubjectDetails(subjectSlug, userId)
        if (isMounted) {
          setData(res.data)
          setLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError('Subject not found or content is being indexed.')
          setLoading(false)
        }
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [subjectSlug, user])

  const openChapter = (chapter) => {
    navigate(`/fundamentals/${subjectSlug}/chapter?path=${encodeURIComponent(chapter.path)}`)
  }

  if (loading) {
    return (
      <div className="zc-grid-bg min-h-screen">
        <SiteNav solid />
        <main className="mx-auto max-w-5xl px-5 py-12 md:px-8">
          <div className="mt-8 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse h-16 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="zc-grid-bg min-h-screen">
        <SiteNav solid />
        <main className="mx-auto max-w-5xl px-5 py-12 md:px-8">
          <a href="/fundamentals" className="mb-6 inline-block font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            ← Back to Fundamentals
          </a>
          <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-8 text-center">
            <p className="text-[var(--text-muted)]">{error || 'Subject not found.'}</p>
          </div>
        </main>
      </div>
    )
  }

  const progressPercent = data.totalChapters > 0
    ? Math.round((data.completedChapters / data.totalChapters) * 100)
    : 0

  return (
    <div className="zc-grid-bg min-h-screen">
      <SiteNav solid />

      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        {/* Breadcrumb */}
        <a
          href="/fundamentals"
          className="inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Fundamentals
        </a>

        {/* Header */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[var(--accent-green)]">
              CS Fundamentals
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--text-primary)] md:text-4xl">
              {data.subjectName}
            </h1>
          </div>

          <div className="w-full max-w-xs shrink-0">
            <div className="mb-1.5 flex justify-between font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
              <span>Progress</span>
              <span className="text-[var(--accent-cyan)]">
                {data.completedChapters}/{data.totalChapters} &bull; {progressPercent}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div
                className="h-full rounded-full bg-[var(--accent-cyan)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Chapter List */}
        <div className="mt-8 space-y-2">
          {data.chapters.map((chapter, idx) => (
            <button
              key={chapter.path}
              onClick={() => openChapter(chapter)}
              className="group flex w-full items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 px-5 py-4 text-left transition-all duration-150 hover:border-[var(--accent-cyan)]/40 hover:bg-[var(--bg-elevated)]"
            >
              {/* Order/Status indicator */}
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-[family-name:var(--font-mono)] text-sm font-bold transition-colors ${
                chapter.completed
                  ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]'
                  : 'bg-[var(--bg-muted)] text-[var(--text-muted)] group-hover:bg-[var(--accent-cyan)]/10 group-hover:text-[var(--accent-cyan)]'
              }`}>
                {chapter.completed ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  String(chapter.order).padStart(2, '0')
                )}
              </div>

              {/* Chapter name */}
              <div className="flex-1 min-w-0">
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)] group-hover:text-white transition-colors truncate">
                  {chapter.name}
                </p>
                <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
                  Chapter {chapter.order}
                </p>
              </div>

              {/* Arrow */}
              <svg
                className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-all group-hover:translate-x-1 group-hover:text-[var(--accent-cyan)]"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}

          {data.chapters.length === 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-8 text-center">
              <p className="text-[var(--text-muted)]">No chapters found. Content is being indexed.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
