import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { matchApi, problemApi, submissionApi, userApi } from '../services/api.js'

const resultLabels = {
  ACCEPTED: { text: 'ACCEPTED', color: 'var(--accent-green)' },
  WRONG_ANSWER: { text: 'WRONG ANSWER', color: 'var(--accent-red)' },
  RUNTIME_ERROR: { text: 'RUNTIME ERROR', color: 'var(--accent-red)' },
  COMPILE_ERROR: { text: 'COMPILE ERROR', color: 'var(--accent-red)' },
  TIME_LIMIT_EXCEEDED: { text: 'TIME LIMIT', color: '#ffd166' },
}

const languageMap = {
  JAVA: 'java',
  PYTHON: 'python',
  CPP: 'cpp',
}

function getProblemSlug(match) {
  return (
    match?.problemSlug ??
    match?.problem?.slug ??
    match?.problem?.problemSlug ??
    match?.problem?.titleSlug ??
    ''
  )
}

function getProblemId(problem) {
  return problem?.id ?? problem?.problemId ?? problem?.uuid ?? ''
}

function getPlayerName(player, fallback) {
  return player?.username ?? player?.name ?? player?.user?.username ?? fallback
}

function getPlayerRating(player) {
  return player?.rating ?? player?.user?.rating ?? 1200
}

function getPlayerId(player) {
  return player?.id ?? player?.userId ?? player?.user?.id ?? ''
}

function getEventType(event) {
  return event?.status ?? event?.type ?? event?.eventType ?? event?.result ?? ''
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export default function MatchRoomPage() {
  const { matchId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const username = location.state?.username ?? ''
  const userId = location.state?.userId || 'e0c3644d-2665-4f30-b830-8c48fe7c8335'
  const editorRef = useRef(null)
  const [match, setMatch] = useState(null)
  const [problem, setProblem] = useState(null)
  const [testCases, setTestCases] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isTestCasesOpen, setIsTestCasesOpen] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState('JAVA')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [results, setResults] = useState([])
  const [winnerId, setWinnerId] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [playerRatings, setPlayerRatings] = useState({})
  const [actionMessage, setActionMessage] = useState('')
  const [isRematchLoading, setIsRematchLoading] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(30 * 60)
  const matchStatus = match?.status ?? 'WAITING'
  const playerOne = match?.player1 ?? match?.playerOne ?? match?.user1 ?? match?.players?.[0]
  const playerTwo = match?.player2 ?? match?.playerTwo ?? match?.user2 ?? match?.players?.[1]
  const playerOneId = getPlayerId(playerOne) || match?.player1Id
  const playerTwoId = getPlayerId(playerTwo) || match?.player2Id
  const opponentId = playerOneId === userId ? playerTwoId : playerOneId

  useEffect(() => {
    if (!userId) {
      return
    }

    let isMounted = true

    async function loadProblem() {
      try {
        setIsLoading(true)
        setLoadError('')

        const matchResponse = await matchApi.get(matchId)
        const matchData = matchResponse.data
        const slug = getProblemSlug(matchData)

        if (!slug) {
          throw new Error('Problem slug missing from match')
        }

        const problemResponse = await problemApi.getBySlug(slug)
        const problemData = problemResponse.data
        const problemId = getProblemId(problemData)
        let visibleCases = []

        if (problemId) {
          const testCaseResponse = await problemApi.getTestCases(problemId)
          visibleCases = Array.isArray(testCaseResponse.data) ? testCaseResponse.data : []
        }

        if (isMounted) {
          setMatch(matchData)
          setProblem(problemData)
          setTestCases(visibleCases.filter((testCase) => testCase.visible ?? testCase.isVisible ?? true))
          setCode(problemData.templateCode ?? problemData.starterCode ?? '')
        }
      } catch {
        if (isMounted) {
          setLoadError('Unable to load match problem')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProblem()

    return () => {
      isMounted = false
    }
  }, [matchId, userId])

  useEffect(() => {
    if (!userId) {
      return undefined
    }

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL || 'http://localhost:8081/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe(`/topic/match/${matchId}`, (message) => {
          const event = JSON.parse(message.body)
          const eventType = getEventType(event)

          if (eventType === 'MATCH_FINISHED') {
            setWinnerId(event.winnerId ?? event.winner?.id ?? '')
          }

          if (event.matchStatus ?? event.status) {
            setMatch((currentMatch) => ({
              ...currentMatch,
              status: event.matchStatus ?? event.status,
            }))
          }

          setResults((currentResults) => [
            {
              id: `${Date.now()}-${currentResults.length}`,
              type: eventType,
              userId: event.userId ?? event.user?.id ?? event.playerId ?? event.submission?.userId ?? '',
              username: event.username ?? event.user?.username ?? event.playerUsername ?? 'Opponent',
              message: event.message ?? '',
              runtimeMs: event.runtimeMs ?? event.runtime_ms ?? event.submission?.runtimeMs ?? null,
              pointsChange: event.pointsChange ?? event.ratingDelta ?? event.points ?? null,
              winnerId: event.winnerId ?? event.winner?.id ?? '',
            },
            ...currentResults,
          ])
          setIsSubmitting(false)
        })
      },
    })

    stompClient.activate()

    return () => {
      stompClient.deactivate()
    }
  }, [matchId, userId])

  useEffect(() => {
    const status = match?.status ?? 'WAITING'

    if (status !== 'IN_PROGRESS') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => Math.max(currentSeconds - 1, 0))
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [match?.status])

  useEffect(() => {
    if (!userId || !winnerId) {
      return undefined
    }

    let isMounted = true
    const refreshTimer = window.setTimeout(async () => {
      try {
        const opponentToFetch = userId === playerOneId ? playerTwoId : playerOneId
        const requests = [userApi.getUser(userId)]

        if (opponentToFetch) {
          requests.push(userApi.getUser(opponentToFetch))
        }

        const [currentUserResponse, opponentResponse] = await Promise.all(requests)
        const nextRatings = {
          [userId]: currentUserResponse.data?.rating ?? currentUserResponse.data?.user?.rating,
        }

        if (opponentToFetch && opponentResponse?.data) {
          nextRatings[opponentToFetch] = opponentResponse.data.rating ?? opponentResponse.data.user?.rating
        }

        if (isMounted) {
          setCurrentUser(currentUserResponse.data)
          setPlayerRatings((ratings) => ({
            ...ratings,
            ...nextRatings,
          }))
        }
      } catch {
        if (isMounted) {
          setActionMessage('Could not refresh ratings')
        }
      }
    }, 1000)

    return () => {
      isMounted = false
      window.clearTimeout(refreshTimer)
    }
  }, [playerOneId, playerTwoId, userId, winnerId])

  async function handleSubmit() {
    if (!problem || isSubmitting) {
      return
    }

    const currentCode = editorRef.current?.getValue() ?? code
    const problemId = getProblemId(problem)

    try {
      setIsSubmitting(true)
      await submissionApi.submit({
        matchId,
        userId,
        problemId,
        code: currentCode,
        language: selectedLanguage,
      })
    } catch {
      setIsSubmitting(false)
      setResults((currentResults) => [
        {
          id: `${Date.now()}-submit-error`,
          type: 'COMPILE_ERROR',
          username,
          message: 'Submission failed before reaching judge',
        },
        ...currentResults,
      ])
    }
  }

  async function handleSurrender(opponentIdToWin) {
    const confirmed = window.confirm('Are you sure? You will lose rating.')

    if (!confirmed) {
      return
    }

    try {
      await matchApi.finish(matchId, opponentIdToWin)
      navigate('/')
    } catch {
      setActionMessage('Could not surrender match')
    }
  }

  async function handleNewProblem() {
    if (!opponentId || matchStatus !== 'FINISHED') {
      return
    }

    try {
      setIsRematchLoading(true)
      setActionMessage('')
      const newMatch = await matchApi.create({
        player1Id: userId,
        player2Id: opponentId,
      })
      await matchApi.start(newMatch.data.id)
      navigate(`/match/${newMatch.data.id}`, {
        state: { username, userId },
      })
    } catch {
      setIsRematchLoading(false)
      setActionMessage('Could not create rematch')
    }
  }

  if (!userId) {
    return (
      <main style={styles.expiredPage}>
        <div style={styles.expiredCard}>Session expired, go back to lobby</div>
      </main>
    )
  }

  const didFinish = Boolean(winnerId) || matchStatus === 'FINISHED'
  const didCurrentUserWin = didFinish && winnerId === userId
  const didCurrentUserLose = didFinish && winnerId && winnerId !== userId
  const ratingDelta = didCurrentUserWin ? 25 : didCurrentUserLose ? -15 : 0
  const updatedRating = playerRatings[userId] ?? currentUser?.rating ?? currentUser?.user?.rating

  return (
    <main className="match-room">
      <style>{`
        .match-room {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 30% 45% 25%;
          background:
            radial-gradient(circle at 50% 0%, rgba(0, 212, 255, 0.08), transparent 28rem),
            radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
            var(--bg-primary);
          background-size: auto, 24px 24px, auto;
          color: var(--text-primary);
        }

        .match-panel {
          min-height: 100vh;
          overflow: hidden;
        }

        .problem-panel,
        .status-panel {
          padding: 1.4rem;
          overflow-y: auto;
        }

        .problem-panel {
          border-right: 1px solid rgba(0, 212, 255, 0.45);
        }

        .editor-panel {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          border-right: 1px solid rgba(0, 212, 255, 0.45);
          background: rgba(10, 10, 15, 0.92);
        }

        .editor-header,
        .submit-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border-bottom: 1px solid var(--border);
          padding: 1rem;
        }

        .submit-bar {
          border-top: 1px solid var(--border);
          border-bottom: 0;
        }

        .panel-title,
        .problem-title {
          font-family: var(--font-display);
          font-weight: 700;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .problem-title {
          color: var(--text-primary);
          font-size: 2rem;
          line-height: 1;
        }

        .panel-title {
          color: var(--accent-cyan);
          font-size: 1.5rem;
        }

        .difficulty-badge,
        .status-badge {
          display: inline-flex;
          border: 1px solid currentColor;
          border-radius: 999px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 500;
          margin-top: 0.8rem;
          padding: 0.3rem 0.65rem;
        }

        .problem-description {
          color: var(--text-primary);
          font-size: 0.98rem;
          line-height: 1.75;
          margin-top: 1.5rem;
          white-space: pre-wrap;
        }

        .test-toggle,
        .submit-button,
        .language-select {
          border-radius: 8px;
          font-family: var(--font-display);
          font-weight: 700;
          text-transform: uppercase;
        }

        .test-toggle {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          margin-top: 1.5rem;
          padding: 0.85rem 1rem;
        }

        .test-cases {
          display: grid;
          gap: 0.8rem;
          margin-top: 0.8rem;
        }

        .test-case {
          border: 1px solid var(--border);
          border-radius: 8px;
          background: rgba(18, 18, 26, 0.82);
          padding: 0.9rem;
        }

        .test-label,
        .player-meta,
        .result-message {
          color: var(--text-secondary);
          font-family: var(--font-mono);
          font-size: 0.78rem;
        }

        .test-block {
          color: var(--text-primary);
          font-family: var(--font-mono);
          font-size: 0.85rem;
          margin: 0.3rem 0 0.8rem;
          white-space: pre-wrap;
        }

        .language-select {
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-primary);
          outline: none;
          padding: 0.7rem 0.9rem;
        }

        .language-select:focus {
          border-color: var(--accent-cyan);
          box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.14);
        }

        .submit-button {
          border: 0;
          background: var(--accent-cyan);
          color: var(--bg-primary);
          cursor: pointer;
          font-size: 1.15rem;
          padding: 0.85rem 1.6rem;
        }

        .submit-button:disabled {
          cursor: wait;
          filter: grayscale(0.2) brightness(0.8);
        }

        .status-panel {
          display: grid;
          grid-template-rows: 40% 40% 20%;
          gap: 0;
          padding: 0;
        }

        .timer {
          color: var(--accent-cyan);
          font-family: var(--font-mono);
          font-size: 2.2rem;
          font-weight: 500;
        }

        .status-section {
          border-bottom: 1px solid rgba(0, 212, 255, 0.35);
          display: grid;
          min-height: 0;
          overflow: hidden;
          padding: 1rem;
        }

        .status-section:last-child {
          border-bottom: 0;
        }

        .results-section {
          grid-template-rows: auto auto minmax(0, 1fr);
        }

        .players-section {
          align-content: start;
          gap: 0.85rem;
        }

        .actions-section {
          align-content: center;
          gap: 0.8rem;
        }

        .player-card,
        .result-card,
        .winner-banner {
          border: 1px solid var(--border);
          border-radius: 8px;
          background: rgba(18, 18, 26, 0.82);
          padding: 1rem;
        }

        .player-list,
        .results-list {
          display: grid;
          gap: 0.8rem;
        }

        .results-list {
          align-content: start;
          overflow-y: auto;
          padding-right: 0.25rem;
        }

        .match-meta-row,
        .player-heading,
        .result-line,
        .action-buttons {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .player-name {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
        }

        .you-badge {
          border: 1px solid var(--accent-cyan);
          border-radius: 999px;
          color: var(--accent-cyan);
          font-family: var(--font-mono);
          font-size: 0.68rem;
          padding: 0.18rem 0.45rem;
        }

        .result-card {
          animation: fade-in 220ms ease both;
          font-family: var(--font-mono);
        }

        .result-title {
          font-size: 0.95rem;
          font-weight: 500;
        }

        .points-change {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          font-weight: 500;
        }

        .winner-banner {
          color: #ffd700;
          font-family: var(--font-display);
          font-size: 1.7rem;
          font-weight: 700;
          text-align: center;
          text-transform: uppercase;
        }

        .winner-rating {
          color: var(--text-primary);
          display: block;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          margin-top: 0.35rem;
        }

        .winner-banner.lose {
          color: var(--accent-red);
        }

        .action-button {
          border-radius: 8px;
          cursor: pointer;
          flex: 1;
          font-family: var(--font-display);
          font-size: 0.95rem;
          font-weight: 700;
          padding: 0.8rem 0.65rem;
          text-transform: uppercase;
        }

        .surrender-button {
          border: 1px solid var(--accent-red);
          background: rgba(255, 71, 87, 0.12);
          color: var(--accent-red);
        }

        .new-problem-button {
          border: 1px solid var(--accent-cyan);
          background: rgba(0, 212, 255, 0.12);
          color: var(--accent-cyan);
        }

        .back-link {
          color: var(--text-secondary);
          font-family: var(--font-mono);
          font-size: 0.85rem;
          text-align: center;
          text-decoration: none;
        }

        .back-link:hover {
          color: var(--accent-cyan);
        }

        .action-message {
          color: #ffd166;
          font-family: var(--font-mono);
          font-size: 0.78rem;
          min-height: 1rem;
          text-align: center;
        }

        .skeleton {
          border-radius: 8px;
          background: linear-gradient(90deg, rgba(18, 18, 26, 0.8), rgba(0, 212, 255, 0.16), rgba(18, 18, 26, 0.8));
          background-size: 200% 100%;
          animation: skeleton-pulse 1.2s ease-in-out infinite;
          height: 1rem;
          margin-bottom: 1rem;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes skeleton-pulse {
          from {
            background-position: 200% 0;
          }

          to {
            background-position: -200% 0;
          }
        }

        @media (max-width: 1100px) {
          .match-room {
            grid-template-columns: 1fr;
          }

          .match-panel {
            min-height: auto;
          }

          .problem-panel,
          .editor-panel {
            border-right: 0;
            border-bottom: 1px solid rgba(0, 212, 255, 0.45);
          }

          .editor-panel {
            min-height: 70vh;
          }

          .status-panel {
            grid-template-rows: auto;
          }

          .status-section {
            min-height: 18rem;
          }
        }
      `}</style>

      <section className="match-panel problem-panel" aria-label="Problem description">
        {isLoading ? (
          <>
            <div className="skeleton" style={{ width: '70%', height: '2rem' }} />
            <div className="skeleton" style={{ width: '28%' }} />
            <div className="skeleton" style={{ width: '100%', height: '9rem' }} />
            <div className="skeleton" style={{ width: '90%', height: '5rem' }} />
          </>
        ) : loadError ? (
          <p style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{loadError}</p>
        ) : (
          <>
            <h1 className="problem-title">{problem?.title ?? 'Untitled Problem'}</h1>
            <span className="difficulty-badge" style={{ color: getDifficultyColor(problem?.difficulty) }}>
              {problem?.difficulty ?? 'MEDIUM'}
            </span>
            <p className="problem-description">{problem?.description ?? 'No description available.'}</p>

            <button className="test-toggle" type="button" onClick={() => setIsTestCasesOpen((open) => !open)}>
              Visible Test Cases
              <span>{isTestCasesOpen ? '−' : '+'}</span>
            </button>

            {isTestCasesOpen ? (
              <div className="test-cases">
                {testCases.length > 0 ? (
                  testCases.map((testCase, index) => (
                    <article className="test-case" key={testCase.id ?? index}>
                      <p className="test-label">INPUT</p>
                      <pre className="test-block">{testCase.input ?? testCase.stdin ?? '-'}</pre>
                      <p className="test-label">EXPECTED OUTPUT</p>
                      <pre className="test-block">{testCase.expectedOutput ?? testCase.output ?? '-'}</pre>
                    </article>
                  ))
                ) : (
                  <article className="test-case">
                    <p className="test-label">No visible test cases yet.</p>
                  </article>
                )}
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="match-panel editor-panel" aria-label="Code editor">
        <header className="editor-header">
          <h2 className="panel-title">Code Arena</h2>
          <select
            className="language-select"
            value={selectedLanguage}
            onChange={(event) => setSelectedLanguage(event.target.value)}
          >
            <option value="JAVA">JAVA</option>
            <option value="PYTHON">PYTHON</option>
            <option value="CPP">CPP</option>
          </select>
        </header>

        <Editor
          defaultLanguage="javascript"
          language={languageMap[selectedLanguage]}
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value ?? '')}
          onMount={(editor) => {
            editorRef.current = editor
          }}
          options={{
            fontFamily: 'JetBrains Mono',
            fontSize: 14,
            minimap: { enabled: false },
            padding: { top: 18 },
            scrollBeyondLastLine: false,
          }}
        />

        <footer className="submit-bar">
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            match/{matchId}
          </span>
          <button className="submit-button" type="button" disabled={isSubmitting || !problem} onClick={handleSubmit}>
            {isSubmitting ? 'RUNNING...' : 'SUBMIT'}
          </button>
        </footer>
      </section>

      <aside className="match-panel status-panel" aria-label="Match status">
        <section className="status-section results-section" aria-label="Results">
          <h2 className="panel-title">Results</h2>
          {didCurrentUserWin ? <WinnerBanner type="win" rating={updatedRating} ratingDelta={ratingDelta} /> : null}
          {didCurrentUserLose ? <WinnerBanner type="lose" rating={updatedRating} ratingDelta={ratingDelta} /> : null}
          {didFinish && !winnerId ? <div className="winner-banner">MATCH FINISHED</div> : null}
          <div className="results-list">
            {results.length > 0 ? (
              results.map((result) => (
                <ResultCard key={result.id} result={result} currentUserId={userId} currentUsername={username} />
              ))
            ) : (
              <article className="result-card">
                <p className="result-message">Awaiting submissions...</p>
              </article>
            )}
          </div>
        </section>

        <section className="status-section players-section" aria-label="Players">
          <h2 className="panel-title">Players</h2>
          <div className="match-meta-row">
            <span className="status-badge" style={{ color: getStatusColor(matchStatus), marginTop: 0 }}>
              {matchStatus}
            </span>
            {matchStatus === 'IN_PROGRESS' ? <div className="timer">{formatTime(secondsLeft)}</div> : null}
          </div>

          <div className="player-list">
            <PlayerCard
              label="Player 1"
              player={playerOne}
              fallback={username || 'Player 1'}
              isCurrentUser={playerOneId === userId}
              ratingOverride={playerRatings[playerOneId]}
            />
            <PlayerCard
              label="Player 2"
              player={playerTwo}
              fallback="Waiting..."
              isCurrentUser={playerTwoId === userId}
              ratingOverride={playerRatings[playerTwoId]}
            />
          </div>
        </section>

        <section className="status-section actions-section" aria-label="Actions">
          <div className="action-buttons">
            <button className="action-button surrender-button" type="button" onClick={() => handleSurrender(opponentId)}>
              Surrender
            </button>
            <button
              className="action-button new-problem-button"
              type="button"
              disabled={matchStatus !== 'FINISHED' || isRematchLoading}
              onClick={handleNewProblem}
              style={matchStatus !== 'FINISHED' && !isRematchLoading ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            >
              {isRematchLoading ? 'Loading...' : matchStatus !== 'FINISHED' ? 'Finish First' : 'New Problem'}
            </button>
          </div>
          <p className="action-message">{actionMessage}</p>
          <Link className="back-link" to="/">{'\u2190 Back to Lobby'}
          </Link>
        </section>
      </aside>
    </main>
  )
}

function PlayerCard({ label, player, fallback, isCurrentUser, ratingOverride }) {
  return (
    <article className="player-card">
      <p className="player-meta">{label}</p>
      <div className="player-heading">
        <h3 className="player-name">{getPlayerName(player, fallback)}</h3>
        {isCurrentUser ? <span className="you-badge">YOU</span> : null}
      </div>
      <p className="player-meta">rating: {ratingOverride ?? getPlayerRating(player)}</p>
    </article>
  )
}

function ResultCard({ result, currentUserId, currentUsername }) {
  const resultMeta = resultLabels[result.type] ?? {
    text: result.type === 'MATCH_FINISHED' ? 'MATCH FINISHED' : result.type || 'UPDATE',
    color: 'var(--accent-cyan)',
  }
  const submittedBy =
    (result.userId && result.userId === currentUserId) || result.username === currentUsername ? 'You' : result.username
  const pointsChange = Number(result.pointsChange ?? 0)
  const hasPointsChange = result.pointsChange !== null && result.pointsChange !== undefined

  return (
    <article className="result-card">
      <div className="result-line">
        <p className="result-title" style={{ color: resultMeta.color }}>
          {resultMeta.text}
        </p>
        {hasPointsChange ? (
          <span className="points-change" style={{ color: pointsChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {pointsChange >= 0 ? '+' : ''}
            {pointsChange} pts
          </span>
        ) : null}
      </div>
      <p className="result-message">Submitted by: {submittedBy}</p>
      {result.runtimeMs !== null && result.runtimeMs !== undefined ? (
        <p className="result-message">Time: {result.runtimeMs}ms</p>
      ) : null}
      {result.message ? <p className="result-message">{result.message}</p> : null}
    </article>
  )
}

function WinnerBanner({ type, rating, ratingDelta }) {
  const isWin = type === 'win'
  const deltaText = ratingDelta > 0 ? `+${ratingDelta}` : String(ratingDelta)

  return (
    <div className={`winner-banner ${isWin ? '' : 'lose'}`}>
      {isWin ? '🏆 YOU WIN! +25 pts' : '💀 YOU LOSE -15 pts'}
      {rating ? (
        <span className="winner-rating">
          New Rating: {rating} ({deltaText})
        </span>
      ) : null}
    </div>
  )
}

function getDifficultyColor(difficulty) {
  if (difficulty === 'EASY') {
    return 'var(--accent-green)'
  }

  if (difficulty === 'HARD') {
    return 'var(--accent-red)'
  }

  return '#ffd166'
}

function getStatusColor(status) {
  if (status === 'IN_PROGRESS') {
    return 'var(--accent-green)'
  }

  if (status === 'FINISHED') {
    return 'var(--accent-red)'
  }

  return 'var(--accent-cyan)'
}

const styles = {
  expiredPage: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    padding: '2rem',
  },
  expiredCard: {
    border: '1px solid var(--accent-red)',
    borderRadius: '8px',
    background: 'var(--bg-surface)',
    color: 'var(--accent-red)',
    fontFamily: 'var(--font-mono)',
    padding: '1.25rem 1.5rem',
  },
}
