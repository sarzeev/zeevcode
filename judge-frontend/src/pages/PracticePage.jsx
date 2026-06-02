import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { Link, useLocation, useParams } from 'react-router-dom'
import { problemApi, submissionApi } from '../services/api.js'

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

function getProblemId(problem) {
  return problem?.id ?? problem?.problemId ?? problem?.uuid ?? ''
}

function getDifficultyColor(difficulty) {
  if (difficulty === 'EASY') return 'var(--accent-green)'
  if (difficulty === 'HARD') return 'var(--accent-red)'
  return '#ffd166'
}

export default function PracticePage() {
  const { problemSlug } = useParams()
  const location = useLocation()
  const userId = location.state?.userId || ''
  const username = location.state?.username || ''
  const editorRef = useRef(null)
  const [problem, setProblem] = useState(null)
  const [testCases, setTestCases] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isTestCasesOpen, setIsTestCasesOpen] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState('JAVA')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [results, setResults] = useState([])

  useEffect(() => {
    let isMounted = true

    async function loadProblem() {
      try {
        setIsLoading(true)
        setLoadError('')

        const problemResponse = await problemApi.getBySlug(problemSlug)
        const problemData = problemResponse.data
        const problemId = getProblemId(problemData)
        let visibleCases = []

        if (problemId) {
          const testCaseResponse = await problemApi.getTestCases(problemId)
          visibleCases = Array.isArray(testCaseResponse.data) ? testCaseResponse.data : []
        }

        if (isMounted) {
          setProblem(problemData)
          setTestCases(visibleCases.filter((tc) => tc.visible ?? tc.isVisible ?? true))
          setCode(problemData.templateCode ?? problemData.starterCode ?? '')
        }
      } catch {
        if (isMounted) {
          setLoadError('Unable to load problem')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProblem()
    return () => { isMounted = false }
  }, [problemSlug])

  useEffect(() => {
    if (!userId) return undefined

    const stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8081/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe(`/topic/practice/${userId}`, (message) => {
          const event = JSON.parse(message.body)
          setResults((prev) => [
            {
              id: `${Date.now()}-${prev.length}`,
              type: event.status ?? event.type ?? 'UPDATE',
              message: event.message ?? '',
            },
            ...prev,
          ])
          setIsSubmitting(false)
        })
      },
    })

    stompClient.activate()
    return () => { stompClient.deactivate() }
  }, [userId])

  async function handleSubmit() {
    if (!problem || isSubmitting || !userId) return

    const currentCode = editorRef.current?.getValue() ?? code
    const problemId = getProblemId(problem)

    try {
      setIsSubmitting(true)
      await submissionApi.practiceSubmit({
        userId,
        problemId,
        code: currentCode,
        language: selectedLanguage,
      })
    } catch {
      setIsSubmitting(false)
      setResults((prev) => [
        {
          id: `${Date.now()}-submit-error`,
          type: 'COMPILE_ERROR',
          message: 'Submission failed before reaching judge',
        },
        ...prev,
      ])
    }
  }

  if (!userId) {
    return (
      <main style={styles.expiredPage}>
        <div style={styles.expiredCard}>
          No user session. <Link to="/" style={{ color: 'var(--accent-cyan)' }}>Go to Lobby</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="practice-room">
      <style>{`
        .practice-room {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 30% 45% 25%;
          background:
            radial-gradient(circle at 50% 0%, rgba(57, 255, 20, 0.06), transparent 28rem),
            radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
            var(--bg-primary);
          background-size: auto, 24px 24px, auto;
          color: var(--text-primary);
        }

        .practice-panel {
          min-height: 100vh;
          overflow: hidden;
        }

        .problem-panel,
        .results-panel {
          padding: 1.4rem;
          overflow-y: auto;
        }

        .problem-panel {
          border-right: 1px solid rgba(57, 255, 20, 0.35);
        }

        .editor-panel {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          border-right: 1px solid rgba(57, 255, 20, 0.35);
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

        .panel-title {
          font-family: var(--font-display);
          font-weight: 700;
          letter-spacing: 0;
          text-transform: uppercase;
          color: var(--accent-green);
          font-size: 1.5rem;
        }

        .problem-title {
          font-family: var(--font-display);
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-primary);
          font-size: 2rem;
          line-height: 1;
        }

        .difficulty-badge {
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

        .test-toggle {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg-surface);
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          font-family: var(--font-display);
          font-weight: 700;
          text-transform: uppercase;
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

        .test-label {
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
          border-radius: 8px;
          background: var(--bg-surface);
          color: var(--text-primary);
          font-family: var(--font-display);
          font-weight: 700;
          text-transform: uppercase;
          outline: none;
          padding: 0.7rem 0.9rem;
        }

        .language-select:focus {
          border-color: var(--accent-green);
          box-shadow: 0 0 0 3px rgba(57, 255, 20, 0.14);
        }

        .submit-button {
          border: 0;
          border-radius: 8px;
          background: var(--accent-green);
          color: var(--bg-primary);
          cursor: pointer;
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 700;
          padding: 0.85rem 1.6rem;
          text-transform: uppercase;
        }

        .submit-button:disabled {
          cursor: wait;
          filter: grayscale(0.2) brightness(0.8);
        }

        .result-card {
          border: 1px solid var(--border);
          border-radius: 8px;
          background: rgba(18, 18, 26, 0.82);
          padding: 1rem;
          animation: fade-in 220ms ease both;
          font-family: var(--font-mono);
        }

        .result-title {
          font-size: 0.95rem;
          font-weight: 500;
        }

        .result-message {
          color: var(--text-secondary);
          font-family: var(--font-mono);
          font-size: 0.78rem;
          margin-top: 0.35rem;
        }

        .results-list {
          display: grid;
          gap: 0.8rem;
          align-content: start;
          margin-top: 1rem;
        }

        .practice-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border: 1px solid rgba(57, 255, 20, 0.4);
          border-radius: 999px;
          color: var(--accent-green);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          padding: 0.25rem 0.65rem;
          margin-bottom: 1rem;
        }

        .back-link {
          display: block;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          font-size: 0.85rem;
          text-align: center;
          text-decoration: none;
          margin-top: 1.5rem;
        }

        .back-link:hover {
          color: var(--accent-green);
        }

        .skeleton {
          border-radius: 8px;
          background: linear-gradient(90deg, rgba(18, 18, 26, 0.8), rgba(57, 255, 20, 0.12), rgba(18, 18, 26, 0.8));
          background-size: 200% 100%;
          animation: skeleton-pulse 1.2s ease-in-out infinite;
          height: 1rem;
          margin-bottom: 1rem;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes skeleton-pulse {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

        @media (max-width: 1100px) {
          .practice-room {
            grid-template-columns: 1fr;
          }

          .practice-panel {
            min-height: auto;
          }

          .problem-panel,
          .editor-panel {
            border-right: 0;
            border-bottom: 1px solid rgba(57, 255, 20, 0.35);
          }

          .editor-panel {
            min-height: 70vh;
          }
        }
      `}</style>

      {/* ─── Problem Panel ─── */}
      <section className="practice-panel problem-panel" aria-label="Problem description">
        {isLoading ? (
          <>
            <div className="skeleton" style={{ width: '70%', height: '2rem' }} />
            <div className="skeleton" style={{ width: '28%' }} />
            <div className="skeleton" style={{ width: '100%', height: '9rem' }} />
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

      {/* ─── Editor Panel ─── */}
      <section className="practice-panel editor-panel" aria-label="Code editor">
        <header className="editor-header">
          <h2 className="panel-title">Practice Arena</h2>
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
          onMount={(editor) => { editorRef.current = editor }}
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
            practice/{problemSlug}
          </span>
          <button className="submit-button" type="button" disabled={isSubmitting || !problem} onClick={handleSubmit}>
            {isSubmitting ? 'RUNNING...' : 'RUN CODE'}
          </button>
        </footer>
      </section>

      {/* ─── Results Panel ─── */}
      <aside className="practice-panel results-panel" aria-label="Results">
        <span className="practice-badge">⚡ PRACTICE MODE</span>
        <h2 className="panel-title">Results</h2>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginTop: '0.5rem' }}>
          No rating changes. No opponent. Just you and the code.
        </p>

        <div className="results-list">
          {results.length > 0 ? (
            results.map((result) => {
              const meta = resultLabels[result.type] ?? { text: result.type || 'UPDATE', color: 'var(--accent-cyan)' }
              return (
                <article className="result-card" key={result.id}>
                  <p className="result-title" style={{ color: meta.color }}>{meta.text}</p>
                  {result.message ? <p className="result-message">{result.message}</p> : null}
                </article>
              )
            })
          ) : (
            <article className="result-card">
              <p className="result-message">Submit code to see results...</p>
            </article>
          )}
        </div>

        <Link className="back-link" to="/">{'\u2190 Back to Lobby'}</Link>
      </aside>
    </main>
  )
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
