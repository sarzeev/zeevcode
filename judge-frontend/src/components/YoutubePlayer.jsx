import { useEffect, useRef, useState } from 'react'

export default function YoutubePlayer({ videoId, onEnded }) {
  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const [playerReady, setPlayerReady] = useState(false)

  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    }

    const initPlayer = () => {
      if (playerRef.current) return // Already initialized

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              if (onEnded) onEnded()
            }
          }
        }
      })
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      window.onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, []) // Empty deps so it only runs once and loads API

  // When videoId changes, load the new video
  useEffect(() => {
    if (playerReady && playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(videoId)
    }
  }, [videoId, playerReady])

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingTop: '56.25%' }}>
      <div ref={containerRef} className="absolute left-0 top-0 h-full w-full border-0"></div>
    </div>
  )
}
