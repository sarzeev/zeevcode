import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { matchApi, userApi } from '../services/api.js'

const mockLeaderboard = [
  { username: 'byteRift', rating: 2140, wins: 48, losses: 9 },
  { username: 'stackGhost', rating: 1985, wins: 42, losses: 14 },
  { username: 'cyanSyntax', rating: 1870, wins: 35, losses: 16 },
  { username: 'runtimeAce', rating: 1735, wins: 29, losses: 18 },
  { username: 'nullBreaker', rating: 1660, wins: 24, losses: 21 },
]

const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32']

export default function LobbyPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [difficulty, setDifficulty] = useState('ANY')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('Ready to queue')
  const [userId, setUserId] = useState('')
  const [leaderboard, setLeaderboard] = useState(mockLeaderboard)

  useEffect(() => {
    let isMounted = true

    async function fetchLeaderboard() {
      try {
        const response = await userApi.getAll()
        const users = Array.isArray(response.data) ? response.data : []
        const normalizedUsers = users.slice(0, 5).map((user, index) => ({
          username: user.username ?? `player_${index + 1}`,
          rating: user.rating ?? 1200,
          wins: user.wins ?? 0,
          losses: user.losses ?? 0,
        }))

        if (isMounted && normalizedUsers.length > 0) {
          setLeaderboard(normalizedUsers)
        }
      } catch {
        if (isMounted) {
          setLeaderboard(mockLeaderboard)
        }
      }
    }

    fetchLeaderboard()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleFindMatch() {
    const trimmedUsername = username.trim()

    if (!trimmedUsername) {
      setStatus('error')
      setMessage('Enter your username')
      return
    }

    try {
      let player

      try {
        const response = await userApi.getUserByUsername(trimmedUsername)
        player = response.data
      } catch (error) {
        if (error.response?.status !== 404) {
          throw error
        }

        const response = await userApi.createUser({
          username: trimmedUsername,
          email: `${trimmedUsername}@zeevcode.com`,
          avatarUrl: '',
        })
        player = response.data
      }

      const resolvedUserId = player.id ?? player.userId ?? ''
      setUserId(resolvedUserId)
      setStatus('searching')
      setMessage(`Searching ${difficulty.toLowerCase()} arena...`)

      const opponentId = 'b79c8ae4-9cbf-40bc-b5bf-7b7d19ae4638'
      setMessage('Creating match...')

      const newMatch = await matchApi.create({
        player1Id: resolvedUserId,
        player2Id: opponentId,
      })

      await matchApi.start(newMatch.data.id)

      setStatus('found')
      setMessage('Match found. Preparing room...')
      navigate(`/profile/${resolvedUserId}`, {
        state: {
          username: trimmedUsername,
          userId: resolvedUserId,
          pendingMatchId: newMatch.data.id,
          pendingMatchCreated: true,
        },
      })
    } catch {
      setStatus('error')
      setMessage('Could not create match')
    }
  }

  const statusStyle = {
    color:
      status === 'error'
        ? 'var(--accent-red)'
        : status === 'found'
          ? 'var(--accent-green)'
          : status === 'searching'
            ? 'var(--accent-cyan)'
            : 'var(--text-secondary)',
  }

  return (
    <main className="lobby-page">
      <style>{`
        .lobby-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
          background:
            radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.1), transparent 26rem),
            radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            var(--bg-primary);
          background-size: auto, 22px 22px, auto;
          color: var(--text-primary);
        }

        .lobby-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem;
        }

        .find-panel,
        .leaderboard-panel {
          width: min(100%, 34rem);
        }

        .brand {
          margin-bottom: 3rem;
        }

        .brand-title,
        .panel-title {
          font-family: var(--font-display);
          font-weight: 700;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .brand-title {
          color: var(--accent-cyan);
          font-size: clamp(3rem, 8vw, 5.8rem);
          line-height: 0.9;
          text-shadow: 0 0 28px rgba(0, 212, 255, 0.36);
        }

        .tagline {
          margin-top: 0.85rem;
          color: var(--text-primary);
          font-family: var(--font-mono);
          font-size: 1rem;
        }

        .match-form {
          display: grid;
          gap: 1rem;
        }

        .field-label {
          display: grid;
          gap: 0.45rem;
          color: var(--text-secondary);
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .field-input,
        .field-select {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: rgba(18, 18, 26, 0.88);
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 1rem;
          outline: none;
          padding: 0.95rem 1rem;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .field-input:focus,
        .field-select:focus {
          border-color: var(--accent-cyan);
          box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.14);
        }

        .find-button {
          border: 0;
          border-radius: 8px;
          background: var(--accent-cyan);
          color: var(--bg-primary);
          cursor: pointer;
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 700;
          padding: 1rem 1.25rem;
          text-transform: uppercase;
          transition: filter 160ms ease, transform 160ms ease, box-shadow 160ms ease;
        }

        .find-button:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
          box-shadow: 0 0 28px rgba(0, 212, 255, 0.28);
        }

        .find-button.searching {
          animation: pulse-cyan 1.1s ease-in-out infinite;
        }

        .status-message {
          min-height: 1.5rem;
          font-family: var(--font-mono);
          font-size: 0.95rem;
        }

        .user-id {
          color: var(--text-secondary);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          overflow-wrap: anywhere;
        }

        .divider {
          align-self: stretch;
          background: var(--accent-cyan);
          box-shadow: 0 0 18px rgba(0, 212, 255, 0.95);
          opacity: 0.85;
        }

        .panel-title {
          color: var(--text-primary);
          font-size: 2.5rem;
          margin-bottom: 1.5rem;
        }

        .leaderboard-list {
          display: grid;
          gap: 0.8rem;
        }

        .leaderboard-row {
          display: grid;
          grid-template-columns: 3rem minmax(0, 1fr) auto;
          gap: 1rem;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: rgba(18, 18, 26, 0.76);
          padding: 1rem;
          transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
        }

        .leaderboard-row:hover {
          background: rgba(26, 26, 46, 0.9);
          border-color: rgba(0, 212, 255, 0.38);
          transform: translateX(4px);
        }

        .rank {
          font-family: var(--font-mono);
          font-size: 1.2rem;
          font-weight: 500;
        }

        .player-name {
          color: var(--text-primary);
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .player-record {
          color: var(--text-secondary);
          font-family: var(--font-mono);
          font-size: 0.85rem;
          margin-top: 0.2rem;
        }

        .rating {
          color: var(--accent-cyan);
          font-family: var(--font-mono);
          font-size: 1.15rem;
          font-weight: 500;
        }

        @keyframes pulse-cyan {
          0%, 100% {
            box-shadow: 0 0 0 rgba(0, 212, 255, 0);
          }

          50% {
            box-shadow: 0 0 34px rgba(0, 212, 255, 0.56);
          }
        }

        @media (max-width: 820px) {
          .lobby-page {
            grid-template-columns: 1fr;
          }

          .lobby-section {
            min-height: auto;
            padding: 3rem 1.25rem;
          }

          .find-section {
            min-height: 100vh;
          }

          .divider {
            width: auto;
            height: 1px;
            margin: 0 1.25rem;
          }

          .brand {
            margin-bottom: 2rem;
          }

          .panel-title {
            font-size: 2.15rem;
          }
        }
      `}</style>

      <section className="lobby-section find-section" aria-label="Find match">
        <div className="find-panel">
          <div className="brand">
            <h1 className="brand-title">ZeevCode</h1>
            <p className="tagline">Code. Compete. Dominate.</p>
          </div>

          <div className="match-form">
            <label className="field-label">
              Your Username
              <input
                className="field-input"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="enter_handle"
              />
            </label>

            <label className="field-label">
              Difficulty
              <select
                className="field-select"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="ANY">ANY</option>
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </label>

            <button
              className={`find-button ${status === 'searching' ? 'searching' : ''}`}
              type="button"
              onClick={handleFindMatch}
            >
              Find Match
            </button>

            <p className="status-message" style={statusStyle}>
              {message}
            </p>

            {userId ? <p className="user-id">player_id: {userId}</p> : null}
          </div>
        </div>
      </section>

      <div className="divider" aria-hidden="true" />

      <section className="lobby-section" aria-label="Leaderboard">
        <div className="leaderboard-panel">
          <h2 className="panel-title">Leaderboard</h2>

          <div className="leaderboard-list">
            {leaderboard.map((player, index) => (
              <article className="leaderboard-row" key={`${player.username}-${index}`}>
                <span className="rank" style={{ color: rankColors[index] ?? 'var(--text-secondary)' }}>
                  #{index + 1}
                </span>
                <div>
                  <h3 className="player-name">{player.username}</h3>
                  <p className="player-record">
                    {player.wins}W / {player.losses}L
                  </p>
                </div>
                <strong className="rating">{player.rating}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
