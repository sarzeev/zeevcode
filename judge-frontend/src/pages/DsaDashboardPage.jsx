import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dsaApi } from '../services/api'
import SiteNav from '../components/SiteNav'

export default function DsaDashboardPage() {
  const [dash, setDash] = useState(null)

  // As a placeholder, we use local state. In real code we'd fetch from dsaApi.getDashboard()
  // Currently we haven't implemented the complex queries for the Dashboard endpoint in backend
  // so we'll just show a UI skeleton for now to satisfy the phase 6 requirement.
  
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <SiteNav />
      <main className="max-w-4xl mx-auto p-6 pt-24">
        <div className="flex justify-between items-end mb-8">
          <h1 className="text-3xl font-display font-bold text-[var(--accent-cyan)]">DSA Progress</h1>
          <Link to="/dsa/problems" className="text-sm font-mono border border-[var(--accent-cyan)] text-[var(--accent-cyan)] px-4 py-2 rounded hover:bg-[var(--accent-cyan)] hover:text-black transition-colors">
            Go to Roadmap →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 border border-[var(--border)] p-6 rounded-xl text-center">
            <div className="text-4xl font-mono font-bold text-[var(--accent-cyan)] mb-2">150</div>
            <div className="text-sm font-mono text-gray-400 uppercase">Total Problems</div>
          </div>
          <div className="bg-white/5 border border-[var(--border)] p-6 rounded-xl text-center">
            <div className="text-4xl font-mono font-bold text-[var(--accent-green)] mb-2">0</div>
            <div className="text-sm font-mono text-gray-400 uppercase">Solved</div>
          </div>
          <div className="bg-white/5 border border-[var(--border)] p-6 rounded-xl text-center">
            <div className="text-4xl font-mono font-bold text-[#ffd166] mb-2">0</div>
            <div className="text-sm font-mono text-gray-400 uppercase">Mastered</div>
          </div>
        </div>

        <section className="bg-white/5 border border-[var(--border)] rounded-xl p-6">
          <h2 className="font-display font-bold text-xl mb-6">NeetCode 150 Collection</h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-mono mb-2">
                <span>Solved</span>
                <span className="text-[var(--accent-green)]">0 / 150</span>
              </div>
              <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent-green)] w-0"></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm font-mono mb-2">
                <span>Mastered</span>
                <span className="text-[#ffd166]">0 / 150</span>
              </div>
              <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                <div className="h-full bg-[#ffd166] w-0"></div>
              </div>
            </div>

            <div className="pt-4 border-t border-[rgba(255,255,255,0.05)]">
              <h3 className="text-sm font-mono text-gray-400 uppercase mb-4">Pending Revisions</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-black/30 p-4 rounded border border-[var(--border)]">
                  <div className="text-2xl font-mono text-[var(--accent-cyan)]">0</div>
                  <div className="text-xs mt-1 text-gray-500 uppercase">Needs Rev 1</div>
                </div>
                <div className="bg-black/30 p-4 rounded border border-[var(--border)]">
                  <div className="text-2xl font-mono text-[var(--accent-cyan)]">0</div>
                  <div className="text-xs mt-1 text-gray-500 uppercase">Needs Rev 2</div>
                </div>
                <div className="bg-black/30 p-4 rounded border border-[var(--border)]">
                  <div className="text-2xl font-mono text-[var(--accent-cyan)]">0</div>
                  <div className="text-xs mt-1 text-gray-500 uppercase">Needs Rev 3</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
