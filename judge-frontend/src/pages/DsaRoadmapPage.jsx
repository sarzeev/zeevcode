import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dsaApi } from '../services/api'
import SiteNav from '../components/SiteNav'

export default function DsaRoadmapPage() {
  const navigate = useNavigate()
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dsaApi.getProblems({ collection: 'neetcode-150' })
      .then(res => setProblems(res.data))
      .catch(err => console.error("Error fetching roadmap", err))
      .finally(() => setLoading(false))
  }, [])

  const categories = [...new Set(problems.map(p => p.category).filter(Boolean))]

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <SiteNav />
      <main className="max-w-6xl mx-auto p-6 pt-24">
        <h1 className="text-3xl font-display font-bold text-[var(--accent-cyan)] mb-8">DSA Roadmap</h1>
        
        {loading ? (
          <p>Loading roadmap...</p>
        ) : (
          <div className="flex flex-col gap-8">
            {categories.map(cat => {
              const catProbs = problems.filter(p => p.category === cat)
              return (
                <section key={cat} className="bg-[rgba(18,18,26,0.8)] border border-[var(--border)] rounded-xl p-6">
                  <h2 className="text-xl font-display font-bold mb-4">{cat}</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] text-sm font-mono">
                          <th className="p-3">Status</th>
                          <th className="p-3">Title</th>
                          <th className="p-3">Difficulty</th>
                          <th className="p-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catProbs.map(p => (
                          <tr key={p.id} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                            <td className="p-3">
                              {/* TODO: Hook up real status */}
                              <span className="text-[var(--text-secondary)]">⚪</span>
                            </td>
                            <td className="p-3 font-medium hover:text-[var(--accent-cyan)] cursor-pointer" onClick={() => navigate(`/dsa/problems/${p.slug}`)}>
                              {p.title}
                            </td>
                            <td className="p-3 text-sm font-mono" style={{ color: p.difficulty === 'EASY' ? 'var(--accent-green)' : p.difficulty === 'HARD' ? 'var(--accent-red)' : '#ffd166' }}>
                              {p.difficulty}
                            </td>
                            <td className="p-3">
                              <button onClick={() => navigate(`/dsa/problems/${p.slug}`)} className="text-sm px-3 py-1 border border-[var(--accent-cyan)] text-[var(--accent-cyan)] rounded hover:bg-[var(--accent-cyan)] hover:text-[var(--bg-primary)] transition-colors">
                                Solve
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
