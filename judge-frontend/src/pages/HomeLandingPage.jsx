import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SiteNav from '../components/SiteNav'

const PATHS = [
  {
    id: 'dsa',
    title: 'DSA',
    blurb: 'Ranked battles & practice',
    path: '/dsa',
    accent: 'var(--accent-cyan)',
  },
  {
    id: 'funda',
    title: 'Fundamentals',
    blurb: 'OS · Networks · DBMS',
    path: '/fundamentals',
    accent: 'var(--accent-green)',
  },
  {
    id: 'sysdes',
    title: 'System Design',
    blurb: 'Scale · Cache · Queues',
    path: '/system-design',
    accent: 'var(--accent-amber)',
  },
  {
    id: 'resources',
    title: 'Resources',
    blurb: 'Repos · Books · Blogs',
    path: '/resources',
    accent: '#7dd3fc',
  },
  {
    id: 'stories',
    title: 'Stories',
    blurb: 'Interview war stories',
    path: '/stories',
    accent: '#fb7185',
  },
  {
    id: 'prep',
    title: 'Interview Prep',
    blurb: 'Mocks & checklists',
    path: '/dsa',
    accent: '#a5b4fc',
  },
]

const PROGRESS = [
  { id: 'dsa', label: 'DSA', completed: 120, total: 300, color: '#00d4ff' },
  { id: 'funda', label: 'Fundamentals', completed: 50, total: 200, color: '#39ff14' },
  { id: 'sysdes', label: 'SysDes', completed: 15, total: 50, color: '#ffb020' },
  { id: 'prep', label: 'Interview', completed: 10, total: 25, color: '#7dd3fc' },
]

function ProgressRings() {
  const size = 128
  const center = size / 2
  const strokeWidth = 6
  const gap = 2
  const baseRadius = size / 2 - strokeWidth

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        {PROGRESS.map((data, index) => {
          const radius = baseRadius - index * (strokeWidth + gap)
          const circumference = 2 * Math.PI * radius
          const percent = data.completed / data.total
          const offset = circumference - percent * circumference
          return (
            <g key={data.id}>
              <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--bg-muted)" strokeWidth={strokeWidth} />
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={data.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </g>
          )
        })}
      </svg>
      <ul className="grid w-full grid-cols-2 gap-x-3 gap-y-2">
        {PROGRESS.map((data) => (
          <li key={data.id} className="min-w-0">
            <div className="mb-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0" style={{ backgroundColor: data.color }} />
              <span className="truncate font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                {data.label}
              </span>
            </div>
            <p className="pl-3 font-[family-name:var(--font-display)] text-lg font-semibold leading-none">
              {Math.round((data.completed / data.total) * 100)}
              <span className="text-xs text-[var(--text-muted)]">%</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FocusBoard() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Solve 2 DP problems', type: 'daily', done: false },
    { id: 2, text: 'Complete SysDes mock', type: 'weekly', done: false },
  ])
  const [newTask, setNewTask] = useState('')
  const [taskType, setTaskType] = useState('daily')

  function addTask(e) {
    e.preventDefault()
    if (!newTask.trim()) return
    setTodos([{ id: Date.now(), text: newTask.trim(), type: taskType, done: false }, ...todos])
    setNewTask('')
  }

  function toggleTodo(id) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  const sorted = [...todos].sort((a, b) => {
    if (a.type === b.type) return 0
    return a.type === 'daily' ? -1 : 1
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form onSubmit={addTask} className="mb-3 shrink-0 space-y-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New ticket…"
          className="w-full border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 py-2 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-cyan)]"
        />
        <div className="flex gap-2">
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="flex-1 border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--text-secondary)] outline-none"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <button
            type="submit"
            className="bg-[var(--accent-cyan)] px-3 py-1.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-wider text-[var(--bg-primary)] transition-opacity hover:opacity-90"
          >
            Add
          </button>
        </div>
      </form>

      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {sorted.map((todo) => (
          <li key={todo.id}>
            <button
              type="button"
              onClick={() => toggleTodo(todo.id)}
              className={`flex w-full items-center gap-2 border px-2 py-2 text-left transition-colors ${
                todo.type === 'weekly'
                  ? 'border-[var(--border)] bg-[var(--bg-muted)]/40'
                  : 'border-[var(--border-soft)] bg-[var(--bg-elevated)]/30'
              } ${todo.done ? 'opacity-45' : 'hover:border-[var(--accent-cyan)]/35'}`}
            >
              <span
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${
                  todo.done
                    ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)] text-[var(--bg-primary)]'
                    : 'border-[var(--text-muted)]'
                }`}
              >
                {todo.done && (
                  <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={`min-w-0 flex-1 truncate text-[11px] ${todo.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                {todo.text}
              </span>
              <span className="shrink-0 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                {todo.type === 'daily' ? 'D' : 'W'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function HomeLandingPage() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="zc-grid-bg flex h-screen flex-col overflow-hidden">
      <SiteNav
        showSidebarToggle
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />

      <div className="relative flex min-h-0 flex-1">
        {/* Left sidebar — opens when Panel is clicked */}
        <aside
          className={`shrink-0 overflow-hidden border-[var(--border)] bg-[var(--bg-surface)] transition-[width] duration-300 ease-[var(--ease-out)] ${
            sidebarOpen ? 'w-[280px] border-r' : 'w-0 border-r-0'
          }`}
        >
          <div className="flex h-full w-[280px] flex-col">
            <div className="border-b border-[var(--border)] px-4 py-4">
              <h2 className="mb-3 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Progress
              </h2>
              <ProgressRings />
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
              <h2 className="mb-3 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Todo tickets
              </h2>
              <FocusBoard />
            </div>
          </div>
        </aside>

        {/* Main workspace — fills remaining space */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="flex h-full w-full flex-1 flex-col px-6 py-8 sm:px-10 sm:py-10 lg:px-14">
            <div className="zc-animate-in mb-8 shrink-0 sm:mb-10">
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                zeev<span className="text-[var(--accent-cyan)]">Code</span>
              </h1>
              <p className="mt-2 max-w-xl text-[var(--text-secondary)] sm:text-lg">
                Pick a path. Open the sidebar for progress and daily tickets.
              </p>
            </div>

            <div className="zc-animate-in zc-animate-in-delay-1 grid min-h-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
              {PATHS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="group flex min-h-[140px] flex-col justify-center border border-[var(--border)] bg-[var(--bg-elevated)]/40 px-6 py-8 text-left transition-all duration-200 hover:border-[var(--accent-cyan)]/50 hover:bg-[var(--bg-elevated)] hover:shadow-[0_0_24px_rgba(0,212,255,0.08)] sm:min-h-0 sm:py-10"
                >
                  <span
                    className="mb-4 block h-0.5 w-10 transition-all duration-200 group-hover:w-14"
                    style={{ backgroundColor: item.accent }}
                  />
                  <span className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-wide text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-cyan)] lg:text-4xl">
                    {item.title}
                  </span>
                  <span className="mt-2 block text-base text-[var(--text-secondary)]">
                    {item.blurb}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
