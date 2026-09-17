export default function PlaylistSidebar({ videos, progress, currentVideo, onSelectVideo }) {
  const isCompleted = (videoId) => {
    return progress.some(p => p.video.id === videoId && p.completed)
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
      
      <div className="border-b border-[var(--border)] p-5">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--text-primary)]">
          Playlist
        </h3>
        <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
          {progress.filter(p => p.completed).length} / {videos.length} completed
        </p>
      </div>
      
      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {videos.map((video, index) => {
            const active = currentVideo?.id === video.id
            const completed = isCompleted(video.id)
            
            return (
              <li key={video.id}>
                <button
                  onClick={() => onSelectVideo(video)}
                  className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors ${
                    active 
                      ? 'bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30' 
                      : 'hover:bg-[var(--bg-elevated)] border border-transparent'
                  }`}
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                    {completed ? (
                      <svg className="h-4 w-4 text-[var(--accent-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : active ? (
                      <span className="h-2 w-2 rounded-full bg-[var(--accent-cyan)]"></span>
                    ) : (
                      <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">{index + 1}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-sm font-medium leading-snug ${active ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-primary)]'}`}>
                      {video.title}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-muted)]">
                      {video.duration || '00:00'}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
