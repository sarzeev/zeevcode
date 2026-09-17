import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { problemApi, submissionApi, dsaApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function DsaProblemPage() {
  const { slug } = useParams()
  const { currentUser } = useAuth()
  const [problem, setProblem] = useState(null)
  const [testCases, setTestCases] = useState([])
  const [progress, setProgress] = useState(null)
  const [code, setCode] = useState('')
  const [lang, setLang] = useState('JAVA')
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState([])
  const editorRef = useRef(null)
  
  useEffect(() => {
    problemApi.getBySlug(slug).then(res => {
      setProblem(res.data)
      setCode(res.data.templateCode || '')
      return res.data.id
    }).then(id => {
      problemApi.getTestCases(id).then(tRes => setTestCases(tRes.data))
      if (currentUser) {
        dsaApi.getProblemProgress(id).then(pRes => setProgress(pRes.data)).catch(() => {})
      }
    })
  }, [slug, currentUser])

  useEffect(() => {
    if (!currentUser) return
    const client = new Client({
      webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL || 'http://localhost:8081/ws'),
      onConnect: () => {
        client.subscribe(`/topic/practice/${currentUser.uid}`, (msg) => {
          const res = JSON.parse(msg.body)
          setResults(prev => [res, ...prev])
          setSubmitting(false)
          // Refresh progress to see updated status
          if (problem?.id) {
            dsaApi.getProblemProgress(problem.id).then(pRes => setProgress(pRes.data))
          }
        })
      }
    })
    client.activate()
    return () => client.deactivate()
  }, [currentUser, problem])

  const submit = () => {
    if (!problem || !currentUser) return
    setSubmitting(true)
    submissionApi.practiceSubmit({
      userId: currentUser.uid, // Assuming backend resolves by firebase uid if needed, or we might need the internal userId.
      problemId: problem.id,
      code: editorRef.current?.getValue() || code,
      language: lang
    }).catch(() => setSubmitting(false))
  }

  const updateMastery = (level) => {
    if(!problem) return
    dsaApi.updateMastery(problem.id, level).then(res => setProgress(res.data))
  }

  const updateStatus = (status) => {
    if(!problem) return
    dsaApi.updateStatus(problem.id, status).then(res => setProgress(res.data))
  }

  if (!problem) return <div className="p-8 text-white">Loading...</div>

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)] text-white">
      <header className="flex justify-between items-center p-4 border-b border-[var(--border)]">
        <Link to="/dsa/problems" className="text-[var(--accent-cyan)] font-mono hover:underline">← Back to Roadmap</Link>
        <h1 className="font-display font-bold text-xl">{problem.title}</h1>
        <div className="w-24"></div>
      </header>
      
      <div className="flex-1 grid grid-cols-[1fr_2fr_300px] overflow-hidden">
        {/* Left: Description */}
        <div className="p-6 border-r border-[var(--border)] overflow-y-auto">
          <div className="flex gap-2 mb-4">
            <span className="px-2 py-1 border rounded-full text-xs font-mono">{problem.difficulty}</span>
            {problem.category && <span className="px-2 py-1 bg-white/10 rounded-full text-xs font-mono">{problem.category}</span>}
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
            {problem.description}
          </div>
          
          <h3 className="mt-8 mb-4 font-mono text-sm text-[var(--text-secondary)] uppercase">Test Cases</h3>
          {testCases.map((tc, i) => (
            <div key={i} className="mb-4 bg-white/5 p-3 rounded">
              <div className="text-xs text-gray-400 font-mono mb-1">Input:</div>
              <pre className="font-mono text-sm">{tc.input}</pre>
              <div className="text-xs text-gray-400 font-mono mt-2 mb-1">Expected:</div>
              <pre className="font-mono text-sm">{tc.expected}</pre>
            </div>
          ))}
        </div>

        {/* Center: Editor */}
        <div className="flex flex-col border-r border-[var(--border)] bg-[#0a0a0f]">
          <div className="p-2 flex justify-end bg-white/5 border-b border-[var(--border)]">
            <select value={lang} onChange={e => setLang(e.target.value)} className="bg-transparent text-sm font-mono outline-none">
              <option value="JAVA">Java</option>
              <option value="PYTHON">Python</option>
              <option value="CPP">C++</option>
            </select>
          </div>
          <div className="flex-1">
            <Editor
              theme="vs-dark"
              language={lang.toLowerCase()}
              value={code}
              onChange={setCode}
              onMount={(editor) => editorRef.current = editor}
              options={{ minimap: { enabled: false }, fontFamily: 'JetBrains Mono', fontSize: 14 }}
            />
          </div>
          <div className="p-4 border-t border-[var(--border)] flex justify-end bg-white/5">
            <button disabled={submitting} onClick={submit} className="bg-[var(--accent-green)] text-black px-6 py-2 font-display font-bold rounded uppercase disabled:opacity-50">
              {submitting ? 'Running...' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Right: Progress & Results */}
        <div className="p-4 flex flex-col gap-6 overflow-y-auto">
          <div className="bg-white/5 p-4 rounded-xl border border-[var(--border)]">
            <h3 className="font-display font-bold mb-4 uppercase text-[var(--accent-cyan)] text-sm tracking-wider">My Progress</h3>
            
            <label className="block text-xs text-gray-400 mb-1 font-mono">Status</label>
            <select 
              value={progress?.status || 'NOT_STARTED'} 
              onChange={e => updateStatus(e.target.value)}
              className="w-full bg-black/50 border border-[var(--border)] rounded p-2 mb-4 text-sm outline-none focus:border-[var(--accent-cyan)]"
            >
              <option value="NOT_STARTED">Not Started</option>
              <option value="ATTEMPTED">Attempted</option>
              <option value="SOLVED">Solved</option>
              <option value="MASTERED">Mastered</option>
            </select>

            <label className="block text-xs text-gray-400 mb-1 font-mono">Mastery (1-5)</label>
            <input 
              type="range" min="1" max="5" 
              value={progress?.masteryLevel || 1}
              onChange={e => updateMastery(parseInt(e.target.value))}
              className="w-full mb-4 accent-[var(--accent-cyan)]"
            />
            
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={progress?.completed || false} readOnly className="accent-[var(--accent-green)]" />
                <span className={progress?.completed ? 'text-gray-200' : 'text-gray-500'}>Completed</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={progress?.revision1 || false} onChange={() => dsaApi.markRevision(problem.id, 1).then(res => setProgress(res.data))} className="accent-[var(--accent-cyan)]" />
                <span className={progress?.revision1 ? 'text-gray-200' : 'text-gray-500'}>Revision 1</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={progress?.revision2 || false} onChange={() => dsaApi.markRevision(problem.id, 2).then(res => setProgress(res.data))} className="accent-[var(--accent-cyan)]" />
                <span className={progress?.revision2 ? 'text-gray-200' : 'text-gray-500'}>Revision 2</span>
              </label>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="font-display font-bold mb-4 uppercase text-[var(--text-secondary)] text-sm tracking-wider">Results</h3>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="p-3 bg-white/5 border border-[var(--border)] rounded font-mono text-xs">
                  <div className={r.status === 'ACCEPTED' ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>{r.status}</div>
                  {r.runtimeMs && <div className="mt-1 text-gray-400">Time: {r.runtimeMs}ms</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
