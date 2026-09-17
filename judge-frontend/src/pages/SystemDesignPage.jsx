import { useState } from 'react'
import SiteNav from '../components/SiteNav'

const TOPICS = [
  { id: 1, title: 'Scalability & Load Balancing', category: 'Architecture', done: false, revised: false },
  { id: 2, title: 'Database Sharding & Replication', category: 'Databases', done: false, revised: false },
  { id: 3, title: 'Caching Strategies (Redis / Memcached)', category: 'Caching', done: false, revised: false },
  { id: 4, title: 'Message Queues (Kafka / RabbitMQ)', category: 'Messaging', done: false, revised: false },
  { id: 5, title: 'Design a URL Shortener', category: 'Practice', done: false, revised: false },
  { id: 6, title: 'Design Twitter / X', category: 'Practice', done: false, revised: false },
]

export default function SystemDesignPage() {
  const [topics, setTopics] = useState(TOPICS)
  const doneCount = topics.filter((t) => t.done).length
  const revisedCount = topics.filter((t) => t.revised).length

  function toggleDone(id) {
    setTopics(topics.map((t) => (t.id === id ? { ...t, done: !t.done, revised: t.done ? false : t.revised } : t)))
  }

  function toggleRevised(id) {
    setTopics(topics.map((t) => (t.id === id ? { ...t, revised: !t.revised } : t)))
  }

  return (
    <div className="zc-grid-bg min-h-screen">
      <SiteNav solid />

      <main className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <p className="zc-animate-in font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.24em] text-[var(--accent-amber)]">
          Architecture
        </p>
        <div className="zc-animate-in zc-animate-in-delay-1 mt-3 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
              System Design
            </h1>
            <p className="mt-3 max-w-md text-[var(--text-secondary)]">
              Think in trade-offs — capacity, consistency, and failure modes under pressure.
            </p>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="font-[family-name:var(--font-display)] text-3xl font-bold leading-none">
                {doneCount}<span className="text-lg text-[var(--text-muted)]">/{topics.length}</span>
              </p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                Done
              </p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-3xl font-bold leading-none text-[var(--accent-amber)]">
                {revisedCount}
              </p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                Revised
              </p>
            </div>
          </div>
        </div>

        <div className="zc-animate-in zc-animate-in-delay-2 mt-10">
          <div className="mb-3 hidden grid-cols-12 gap-4 px-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)] md:grid">
            <span className="col-span-6">Topic</span>
            <span className="col-span-2 text-center">Category</span>
            <span className="col-span-2 text-center">Done</span>
            <span className="col-span-2 text-center">Revised</span>
          </div>

          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {topics.map((topic) => (
              <li
                key={topic.id}
                className={`grid grid-cols-12 items-center gap-3 py-4 transition-colors hover:bg-[var(--bg-elevated)]/40 md:gap-4 ${
                  topic.done ? 'opacity-70' : ''
                }`}
              >
                <div className="col-span-12 md:col-span-6">
                  <p className={`text-base font-medium md:text-lg ${topic.done ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                    {topic.title}
                  </p>
                </div>
                <div className="col-span-4 md:col-span-2 md:text-center">
                  <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                    {topic.category}
                  </span>
                </div>
                <div className="col-span-4 flex justify-center md:col-span-2">
                  <button
                    type="button"
                    onClick={() => toggleDone(topic.id)}
                    aria-label={`Mark ${topic.title} done`}
                    className={`flex h-8 w-8 items-center justify-center border-2 transition-all active:scale-90 ${
                      topic.done
                        ? 'border-[var(--accent-amber)] bg-[var(--accent-amber)] text-[var(--bg-primary)]'
                        : 'border-[var(--border)] text-transparent hover:border-[var(--accent-amber)]/60'
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
                <div className="col-span-4 flex justify-center md:col-span-2">
                  <button
                    type="button"
                    onClick={() => toggleRevised(topic.id)}
                    disabled={!topic.done}
                    aria-label={`Mark ${topic.title} revised`}
                    className={`flex h-8 w-8 items-center justify-center border-2 transition-all active:scale-90 ${
                      !topic.done
                        ? 'cursor-not-allowed border-[var(--border)] opacity-40'
                        : topic.revised
                          ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)] text-[var(--bg-primary)]'
                          : 'border-[var(--border)] text-transparent hover:border-[var(--accent-cyan)]/60'
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
