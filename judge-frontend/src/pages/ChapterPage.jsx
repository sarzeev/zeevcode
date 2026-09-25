import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SiteNav from '../components/SiteNav'
import { fundamentalsApi, userApi } from '../services/api.js'

export default function ChapterPage() {
  const { subjectSlug } = useParams()
  const [searchParams] = useSearchParams()
  const chapterPath = searchParams.get('path')
  const navigate = useNavigate()
  const { user } = useAuth()

  const [html, setHtml] = useState('')
  const [subjectData, setSubjectData] = useState(null)
  const [currentChapter, setCurrentChapter] = useState(null)
  const [dbUser, setDbUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!chapterPath) {
      navigate(`/fundamentals/${subjectSlug}`)
      return
    }
    let isMounted = true
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        let userId = null
        if (user) {
          const userRes = await userApi.getMe()
          userId = userRes.data.id
          if (isMounted) setDbUser(userRes.data)
        }

        const [subjectRes, contentRes] = await Promise.all([
          fundamentalsApi.getSubjectDetails(subjectSlug, userId),
          fundamentalsApi.getChapterContent(subjectSlug, chapterPath),
        ])

        if (isMounted) {
          setSubjectData(subjectRes.data)
          setHtml(contentRes.data.html)
          const chapter = subjectRes.data.chapters.find(c => c.path === chapterPath)
          setCurrentChapter(chapter || null)
          setCompleted(chapter?.completed || false)
          setLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError('Chapter content unavailable. Please try again.')
          setLoading(false)
        }
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [subjectSlug, chapterPath, user, navigate])

  const handleMarkComplete = useCallback(async () => {
    if (!dbUser || completed || completing) return
    setCompleting(true)
    try {
      await fundamentalsApi.markChapterComplete(dbUser.id, subjectSlug, chapterPath)
      setCompleted(true)
      // Optimistically update subjectData
      setSubjectData(prev => prev ? {
        ...prev,
        completedChapters: prev.completedChapters + 1,
        chapters: prev.chapters.map(c =>
          c.path === chapterPath ? { ...c, completed: true } : c
        )
      } : prev)
    } catch (err) {
      console.error(err)
    } finally {
      setCompleting(false)
    }
  }, [dbUser, completed, completing, subjectSlug, chapterPath])

  const chapters = subjectData?.chapters || []
  const currentIndex = chapters.findIndex(c => c.path === chapterPath)
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null
  const nextChapter = currentIndex !== -1 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null

  const goToChapter = (chapter) => {
    navigate(`/fundamentals/${subjectSlug}/chapter?path=${encodeURIComponent(chapter.path)}`)
  }

  return (
    <div className="zc-grid-bg min-h-screen">
      <SiteNav solid />

      <style>{`
        .md-content h1 { font-size: 1.875rem; font-weight: 700; color: #ececf4; margin: 1.5rem 0 1rem; font-family: var(--font-display, 'Rajdhani', sans-serif); }
        .md-content h2 { font-size: 1.5rem; font-weight: 700; color: #ececf4; margin: 1.5rem 0 0.75rem; padding-bottom: 0.375rem; border-bottom: 1px solid #252536; font-family: var(--font-display, 'Rajdhani', sans-serif); }
        .md-content h3 { font-size: 1.25rem; font-weight: 600; color: #d4d4e8; margin: 1.25rem 0 0.5rem; }
        .md-content h4 { font-size: 1.1rem; font-weight: 600; color: #d4d4e8; margin: 1rem 0 0.375rem; }
        .md-content p { color: #8a8aa8; line-height: 1.75; margin: 0.75rem 0; }
        .md-content ul, .md-content ol { color: #8a8aa8; padding-left: 1.5rem; margin: 0.75rem 0; line-height: 1.75; }
        .md-content li { margin: 0.25rem 0; }
        .md-content li > p { margin: 0; }
        .md-content strong { color: #ececf4; font-weight: 600; }
        .md-content em { color: #a8a8c8; }
        .md-content code { background: #1c1c2a; color: #00d4ff; padding: 0.125rem 0.375rem; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.85em; border: 1px solid #252536; }
        .md-content pre { background: #161622; border: 1px solid #252536; border-radius: 8px; padding: 1.25rem; overflow-x: auto; margin: 1rem 0; }
        .md-content pre code { background: none; border: none; padding: 0; color: #ececf4; font-size: 0.875rem; }
        .md-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
        .md-content th { background: #1c1c2a; color: #ececf4; font-weight: 600; padding: 0.625rem 0.875rem; text-align: left; border: 1px solid #252536; }
        .md-content td { padding: 0.5rem 0.875rem; border: 1px solid #252536; color: #8a8aa8; }
        .md-content tr:nth-child(even) td { background: #0e0e1690; }
        .md-content blockquote { border-left: 3px solid #00d4ff; background: rgba(0,212,255,0.05); padding: 0.75rem 1rem; margin: 1rem 0; border-radius: 0 6px 6px 0; }
        .md-content blockquote p { color: #a8a8c8; margin: 0; }
        .md-content a { color: #00d4ff; text-decoration: underline; text-underline-offset: 3px; }
        .md-content a:hover { color: #66e0ff; }
        .md-content img { max-width: 100%; border-radius: 8px; border: 1px solid #252536; margin: 1rem 0; }
        .md-content hr { border: none; border-top: 1px solid #252536; margin: 1.5rem 0; }
        .md-content del { color: #5c5c78; }
      `}</style>

      <main className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--text-muted)]">
          <button onClick={() => navigate('/fundamentals')} className="hover:text-[var(--text-primary)] transition-colors">
            Fundamentals
          </button>
          <span>/</span>
          <button onClick={() => navigate(`/fundamentals/${subjectSlug}`)} className="hover:text-[var(--text-primary)] transition-colors">
            {subjectData?.subjectName || subjectSlug}
          </button>
          {currentChapter && (
            <>
              <span>/</span>
              <span className="text-[var(--text-secondary)] max-w-xs truncate normal-case">
                {currentChapter.name}
              </span>
            </>
          )}
        </div>

        {loading ? (
          <div className="mt-8 space-y-4 animate-pulse">
            <div className="h-8 w-2/3 rounded bg-[var(--bg-elevated)]" />
            <div className="h-4 w-full rounded bg-[var(--bg-elevated)]" />
            <div className="h-4 w-5/6 rounded bg-[var(--bg-elevated)]" />
            <div className="h-4 w-4/5 rounded bg-[var(--bg-elevated)]" />
            <div className="mt-6 h-32 w-full rounded bg-[var(--bg-elevated)]" />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-8 text-center">
            <p className="text-[var(--text-muted)]">{error}</p>
            <button
              onClick={() => navigate(`/fundamentals/${subjectSlug}`)}
              className="mt-4 rounded bg-[var(--accent-cyan)]/10 px-5 py-2 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/20"
            >
              Back to Subject
            </button>
          </div>
        ) : (
          <>
            {/* Chapter Header */}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {currentChapter && (
                  <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--accent-cyan)]">
                    Chapter {currentChapter.order}
                  </p>
                )}
                <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--text-primary)] md:text-4xl">
                  {currentChapter?.name || 'Chapter'}
                </h1>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {dbUser && (
                  <button
                    onClick={handleMarkComplete}
                    disabled={completed || completing}
                    className={`flex items-center gap-2 rounded px-4 py-2 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest transition-all ${
                      completed
                        ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/30 cursor-default'
                        : completing
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-wait border border-[var(--border)]'
                        : 'bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30 hover:bg-[var(--accent-cyan)]/20'
                    }`}
                  >
                    {completed ? (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Done
                      </>
                    ) : completing ? 'Saving...' : 'Mark Complete'}
                  </button>
                )}
              </div>
            </div>

            {/* Chapter Content */}
            <article
              className="md-content mt-8 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/30 px-6 py-8 md:px-10"
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {/* Prev / Next Navigation */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {prevChapter ? (
                <button
                  onClick={() => goToChapter(prevChapter)}
                  className="flex flex-1 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 px-5 py-4 text-left transition-all hover:border-[var(--accent-cyan)]/40 hover:bg-[var(--bg-elevated)]"
                >
                  <svg className="h-4 w-4 shrink-0 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <div className="min-w-0">
                    <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Previous</p>
                    <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-primary)] truncate">{prevChapter.name}</p>
                  </div>
                </button>
              ) : <div className="flex-1" />}

              {nextChapter ? (
                <button
                  onClick={() => goToChapter(nextChapter)}
                  className="flex flex-1 items-center justify-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 px-5 py-4 text-right transition-all hover:border-[var(--accent-cyan)]/40 hover:bg-[var(--bg-elevated)]"
                >
                  <div className="min-w-0">
                    <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Next</p>
                    <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-primary)] truncate">{nextChapter.name}</p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : <div className="flex-1" />}
            </div>

            {/* Back to subject */}
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate(`/fundamentals/${subjectSlug}`)}
                className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                ← Back to {subjectData?.subjectName || 'Subject'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
