import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SiteNav from '../components/SiteNav'
import { fundamentalsApi, userApi } from '../services/api.js'

export default function FundamentalsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dbUser, setDbUser] = useState(null)
  const [dashboardData, setDashboardData] = useState([])
  const [overallPercent, setOverallPercent] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        let currentUserId = null
        if (user) {
          const userRes = await userApi.getMe()
          if (isMounted) {
            setDbUser(userRes.data)
            currentUserId = userRes.data.id
          }
        }

        const [dashRes, progressRes] = await Promise.all([
          fundamentalsApi.getDashboard(currentUserId),
          fundamentalsApi.getProgress(currentUserId),
        ])

        if (isMounted) {
          setDashboardData(dashRes.data)
          setOverallPercent(progressRes.data.overallPercent || 0)
          setLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (isMounted) setLoading(false)
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [user])

  return (
    <div className="zc-grid-bg min-h-screen">
      <SiteNav solid />

      <main className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <p className="zc-animate-in font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.24em] text-[var(--accent-green)]">
          Core CS
        </p>
        <div className="zc-animate-in zc-animate-in-delay-1 mt-3 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
              Fundamentals
            </h1>
            <p className="mt-3 max-w-xl text-[var(--text-secondary)]">
              Master the core computer science concepts expected in top-tier interviews.
              Comprehensive notes directly from the CS-Fundamentals repository.
            </p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <p className="font-[family-name:var(--font-display)] text-4xl font-bold leading-none text-[var(--accent-cyan)]">
              {overallPercent}%
            </p>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              Overall Progress
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-6 h-52"
              >
                <div className="h-6 w-2/3 rounded bg-[var(--bg-muted)] mb-3" />
                <div className="h-4 w-full rounded bg-[var(--bg-muted)] mb-2" />
                <div className="h-4 w-3/4 rounded bg-[var(--bg-muted)]" />
              </div>
            ))}
          </div>
        ) : dashboardData.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
              <svg className="h-10 w-10 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)]">
                Content Loading
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                The repository is being indexed. Check back in a moment.
              </p>
            </div>
          </div>
        ) : (
          <div className="zc-animate-in zc-animate-in-delay-2 mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
            {dashboardData.map((subject) => {
              const { subjectSlug, subjectName, totalChapters, completedChapters } = subject
              const progressPercent = totalChapters > 0
                ? Math.round((completedChapters / totalChapters) * 100)
                : 0
              const hasProgress = completedChapters > 0

              return (
                <div
                  key={subjectSlug}
                  className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-6 transition-all duration-200 hover:border-[var(--accent-cyan)]/50 hover:bg-[var(--bg-elevated)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)] leading-tight">
                      {subjectName}
                    </h2>
                    <span className="font-[family-name:var(--font-mono)] text-xl font-bold text-[var(--accent-cyan)] shrink-0">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="mt-4 flex-1">
                    <div className="mb-2 flex justify-between text-xs text-[var(--text-muted)] font-[family-name:var(--font-mono)]">
                      <span>Progress</span>
                      <span>{completedChapters} / {totalChapters} chapters</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-primary)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-cyan)] transition-all duration-700 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
                      {totalChapters} chapters
                    </span>
                    <button
                      onClick={() => navigate(`/fundamentals/${subjectSlug}`)}
                      className="rounded bg-[var(--accent-cyan)]/10 px-5 py-2 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--accent-cyan)] transition-colors hover:bg-[var(--accent-cyan)]/20"
                    >
                      {hasProgress ? 'Continue Learning' : 'Explore'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
