import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SiteNav from '../components/SiteNav'
import YoutubePlayer from '../components/YoutubePlayer'
import PlaylistSidebar from '../components/PlaylistSidebar'
import { fundamentalsApi, userApi } from '../services/api.js'

export default function SubjectLearningPage() {
  const { subjectSlug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [data, setData] = useState(null)
  const [currentVideo, setCurrentVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dbUserId, setDbUserId] = useState(null)
  const [activeTab, setActiveTab] = useState('videos')

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
          if (res.data.videos && res.data.videos.length > 0) {
            // Restore from localStorage or find first unwatched
            const savedVideoId = localStorage.getItem(`zeevcode_last_video_${subjectSlug}`)
            let targetVideo = null
            
            if (savedVideoId) {
              targetVideo = res.data.videos.find(v => v.id === savedVideoId)
            }
            
            if (!targetVideo) {
              targetVideo = res.data.videos.find(v => 
                !(res.data.progress || []).some(p => p.video.id === v.id && p.completed)
              )
            }
            
            setCurrentVideo(targetVideo || res.data.videos[0])
          }
          setLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (isMounted) navigate('/fundamentals')
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [subjectSlug, user, navigate])

  useEffect(() => {
    if (currentVideo) {
      localStorage.setItem(`zeevcode_last_video_${subjectSlug}`, currentVideo.id)
    }
  }, [currentVideo, subjectSlug])

  const handleVideoEnded = async () => {
    if (!currentVideo || !dbUserId) return
    await handleMarkCompleted()
    goNext()
  }

  const handleMarkCompleted = async () => {
    if (!currentVideo || !dbUserId) return
    
    // Optimistic update
    const newProgress = [...(data.progress || [])]
    const existingIdx = newProgress.findIndex(p => p.video.id === currentVideo.id)
    if (existingIdx >= 0) {
      newProgress[existingIdx].completed = true
    } else {
      newProgress.push({ video: { id: currentVideo.id }, completed: true })
    }
    setData(prev => ({ ...prev, progress: newProgress }))
    
    try {
      await fundamentalsApi.markVideoComplete(currentVideo.id, dbUserId)
    } catch (err) {
      console.error(err)
    }
  }

  const isCurrentVideoCompleted = () => {
    if (!currentVideo || !data || !data.progress) return false
    return data.progress.some(p => p.video.id === currentVideo.id && p.completed)
  }

  const goNext = () => {
    if (!data || !data.videos || !currentVideo) return
    const idx = data.videos.findIndex(v => v.id === currentVideo.id)
    if (idx !== -1 && idx < data.videos.length - 1) {
      setCurrentVideo(data.videos[idx + 1])
    }
  }

  const goPrev = () => {
    if (!data || !data.videos || !currentVideo) return
    const idx = data.videos.findIndex(v => v.id === currentVideo.id)
    if (idx > 0) {
      setCurrentVideo(data.videos[idx - 1])
    }
  }

  if (loading || !data) {
    return (
      <div className="zc-grid-bg min-h-screen">
        <SiteNav solid />
        <div className="flex mt-20 justify-center text-[var(--text-muted)]">Loading...</div>
      </div>
    )
  }

  const progressPercentage = data.videos.length > 0 
    ? Math.round(((data.progress || []).filter(p => p.completed).length / data.videos.length) * 100) 
    : 0

  const currentIndex = currentVideo ? data.videos.findIndex(v => v.id === currentVideo.id) : -1
  const hasNext = currentIndex !== -1 && currentIndex < data.videos.length - 1
  const hasPrev = currentIndex > 0

  return (
    <div className="zc-grid-bg min-h-screen flex flex-col">
      <SiteNav solid />

      {/* Changed to w-[95%] max-w-[1600px] to take up more space */}
      <main className="mx-auto flex w-[95%] max-w-[1600px] flex-1 flex-col py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <a 
              href="/fundamentals" 
              className="mb-2 inline-block font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              ? Back to Fundamentals
            </a>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--text-primary)] md:text-4xl">
              {data.subject.name}
            </h1>
          </div>
          
          <div className="w-full max-w-xs">
            <div className="mb-2 flex justify-between font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
              <span>Course Progress</span>
              <span className="text-[var(--accent-cyan)]">{progressPercentage}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div 
                className="h-full bg-[var(--accent-cyan)] transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-4 border-b border-[var(--border)] font-[family-name:var(--font-mono)] text-sm uppercase tracking-wider">
          <button 
            className={`pb-3 transition-colors ${activeTab === 'videos' ? 'border-b-2 border-[var(--accent-cyan)] text-[var(--accent-cyan)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('videos')}
          >
            Videos
          </button>
          <button 
            className={`pb-3 transition-colors ${activeTab === 'resources' ? 'border-b-2 border-[var(--accent-cyan)] text-[var(--accent-cyan)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('resources')}
          >
            Resources
          </button>
          <button 
            className={`pb-3 transition-colors ${activeTab === 'quiz' ? 'border-b-2 border-[var(--accent-cyan)] text-[var(--accent-cyan)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('quiz')}
          >
            Quiz
          </button>
        </div>

        {activeTab === 'videos' && (
          <div className="flex flex-col gap-6 xl:flex-row">
            <div className="flex-1">
              {currentVideo ? (
                <>
                  <YoutubePlayer 
                    videoId={currentVideo.youtubeVideoId} 
                    onEnded={handleVideoEnded} 
                  />
                  <div className="mt-4 flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/20 p-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)]">
                        {currentVideo.title}
                      </h2>
                      <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
                        Video {currentIndex + 1} of {data.videos.length}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex gap-2">
                        <button 
                          onClick={goPrev}
                          disabled={!hasPrev}
                          className={`flex items-center justify-center rounded px-3 py-2 text-sm font-bold transition-colors ${hasPrev ? 'bg-[var(--bg-elevated)] text-white hover:bg-[var(--bg-elevated)]/80 border border-[var(--border)]' : 'bg-transparent text-[var(--text-muted)] opacity-50 cursor-not-allowed border border-[var(--border)]'}`}
                          title="Previous Video"
                        >
                          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Prev
                        </button>
                        <button 
                          onClick={goNext}
                          disabled={!hasNext}
                          className={`flex items-center justify-center rounded px-3 py-2 text-sm font-bold transition-colors ${hasNext ? 'bg-[var(--bg-elevated)] text-white hover:bg-[var(--bg-elevated)]/80 border border-[var(--border)]' : 'bg-transparent text-[var(--text-muted)] opacity-50 cursor-not-allowed border border-[var(--border)]'}`}
                          title="Next Video"
                        >
                          Next <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>

                      {dbUserId && (
                        <button
                          onClick={handleMarkCompleted}
                          disabled={isCurrentVideoCompleted()}
                          className={`flex items-center gap-2 rounded px-4 py-2.5 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest transition-colors ${
                            isCurrentVideoCompleted() 
                              ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] opacity-70 cursor-default border border-[var(--accent-green)]/30'
                              : 'bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/30'
                          }`}
                        >
                          {isCurrentVideoCompleted() ? (
                            <>
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                              Completed
                            </>
                          ) : (
                            'Mark as Completed'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/20 text-[var(--text-muted)]">
                  No videos found for this subject.
                </div>
              )}
            </div>
            
            {/* Sidebar width adjusted to w-[400px] or 450px on xl screens, giving it a chunkier, complete look */}
            <div className="h-[750px] w-full xl:w-[450px] shrink-0">
              <PlaylistSidebar 
                videos={data.videos} 
                progress={data.progress || []}
                currentVideo={currentVideo}
                onSelectVideo={setCurrentVideo}
              />
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/20 p-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold mb-4">Resources</h2>
            {data.resources && data.resources.length > 0 ? (
              <ul className="space-y-3">
                {data.resources.map(res => (
                  <li key={res.id}>
                    <a href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-[var(--accent-cyan)] hover:underline">
                      <span className="font-[family-name:var(--font-mono)] text-xs uppercase text-[var(--text-muted)] p-1 border border-[var(--border)] rounded">
                        {res.type}
                      </span>
                      {res.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--text-muted)]">No resources available for this subject yet.</p>
            )}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/20 p-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold mb-4">Quiz</h2>
            {data.quizzes && data.quizzes.length > 0 ? (
              <p className="text-[var(--text-primary)]">Quiz functionality coming soon! {data.quizzes.length} questions available.</p>
            ) : (
              <p className="text-[var(--text-muted)]">No quizzes available for this subject yet.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
