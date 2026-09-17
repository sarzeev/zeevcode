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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        let currentUserId = null;
        if (user) {
          const userRes = await userApi.getMe()
          if (isMounted) {
            setDbUser(userRes.data)
            currentUserId = userRes.data.id
          }
        }
        
        const dashRes = await fundamentalsApi.getDashboard(currentUserId)
        if (isMounted) {
          setDashboardData(dashRes.data)
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

  const calculateOverallProgress = () => {
    if (dashboardData.length === 0) return 0
    let total = 0
    let completed = 0
    dashboardData.forEach(item => {
      total += item.totalVideos
      completed += item.completedVideos
    })
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
  }

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
              Master the core computer science concepts expected in top-tier interviews. Learn via curated video playlists and track your progress.
            </p>
          </div>
          <div className="flex flex-col items-end">
            <p className="font-[family-name:var(--font-display)] text-4xl font-bold leading-none text-[var(--accent-cyan)]">
              {calculateOverallProgress()}%
            </p>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              Overall Progress
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-16 flex justify-center text-[var(--text-muted)]">Loading...</div>
        ) : (
          <div className="zc-animate-in zc-animate-in-delay-2 mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
            {dashboardData.map(({ subject, totalVideos, completedVideos }) => {
              const progressPercentage = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0
              
              return (
                <div 
                  key={subject.id} 
                  className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-6 transition-all hover:border-[var(--accent-cyan)]/50 hover:bg-[var(--bg-elevated)]"
                >
                  <div className="flex items-start justify-between">
                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)]">
                      {subject.name}
                    </h2>
                    <span className="font-[family-name:var(--font-mono)] text-xl font-bold text-[var(--accent-cyan)]">
                      {progressPercentage}%
                    </span>
                  </div>
                  
                  <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-2 min-h-[40px]">
                    {subject.description}
                  </p>
                  
                  <div className="mt-6 flex-1">
                    <div className="mb-2 flex justify-between text-xs text-[var(--text-muted)] font-[family-name:var(--font-mono)]">
                      <span>Progress</span>
                      <span>{completedVideos} / {totalVideos} videos</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-primary)]">
                      <div 
                        className="h-full bg-[var(--accent-cyan)] transition-all duration-500 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={() => navigate(`/fundamentals/${subject.slug}`)}
                      className="rounded bg-[var(--accent-cyan)]/10 px-5 py-2.5 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--accent-cyan)] transition-colors hover:bg-[var(--accent-cyan)]/20"
                    >
                      Continue Learning
                    </button>
                  </div>
                </div>
              )
            })}
            
            {dashboardData.length === 0 && (
              <div className="col-span-full py-12 text-center text-[var(--text-muted)]">
                No subjects found. An admin needs to create them.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
