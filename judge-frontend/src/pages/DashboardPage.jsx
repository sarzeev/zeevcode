import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { matchApi, userApi, problemApi, statsApi, matchmakingApi } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

function getRank(rating) {
  if (rating < 1200) return { label: 'UNRANKED', color: '#6b6b8a' }
  if (rating < 1400) return { label: 'BRONZE', color: '#cd7f32' }
  if (rating < 1600) return { label: 'SILVER', color: '#c0c0c0' }
  if (rating < 1800) return { label: 'GOLD', color: '#ffd700' }
  return { label: 'MASTER', color: 'var(--accent-cyan)' }
}

function getDifficultyColor(diff) {
  if (diff === 'EASY') return 'var(--accent-green)'
  if (diff === 'MEDIUM') return '#ffd166'
  if (diff === 'HARD') return 'var(--accent-red)'
  return 'var(--text-secondary)'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const [dbUser, setDbUser] = useState(null)
  
  const [leaderboard, setLeaderboard] = useState([])
  const [matches, setMatches] = useState([])
  const [problems, setProblems] = useState([])
  const [stats, setStats] = useState(null)
  
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('Ready to queue')
  
  // Admin switch state
  const [viewMode, setViewMode] = useState('USER') // 'USER' or 'ADMIN'

  useEffect(() => {
    let isMounted = true
    async function loadDashboardData() {
      try {
        const userRes = await userApi.getMe()
        const user = userRes.data
        if (isMounted) {
          setDbUser(user)
          if (user.role === 'ADMIN') {
            setViewMode('ADMIN')
          }
        }

        const lbRes = await userApi.getLeaderboard()
        if (isMounted) setLeaderboard(lbRes.data || [])

        try {
          const probRes = await problemApi.getAll()
          if (isMounted) setProblems(probRes.data || [])
        } catch (e) {
          console.error("Failed to fetch problems", e)
        }

        try {
          const statsRes = await statsApi.getPlatformStats()
          if (isMounted) setStats(statsRes.data)
        } catch (e) {
          console.error("Failed to fetch stats", e)
        }

        if (user && user.id) {
          const matchesRes = await matchApi.getForUser(user.id)
          const rawMatches = Array.isArray(matchesRes.data) ? matchesRes.data : []
          const sortedMatches = rawMatches
            .sort((a, b) => new Date(b.createdAt ?? b.created_at ?? 0) - new Date(a.createdAt ?? a.created_at ?? 0))
            .slice(0, 5)
          if (isMounted) setMatches(sortedMatches)
        }
      } catch (err) {
        console.error("Dashboard data load error", err)
      }
    }

    loadDashboardData()
    return () => { isMounted = false }
  }, [])

  const stompClientRef = useRef(null)

  useEffect(() => {
    if (!dbUser) return;
    
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8081/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/matchmaking/${dbUser.id}`, (message) => {
          const payload = JSON.parse(message.body)
          if (payload.type === 'MATCH_FOUND') {
            setStatus('found')
            setMessage('Match found. Preparing room...')
            navigate(`/match/${payload.matchId}`, { state: { username: dbUser.username, userId: dbUser.id } })
          } else if (payload.type === 'TIMEOUT') {
            setStatus('timeout_modal')
            setMessage('Search timed out.')
          }
        })
      }
    })
    
    client.activate()
    stompClientRef.current = client
    
    return () => {
      client.deactivate()
      if (dbUser?.id) {
        matchmakingApi.leave(dbUser.id).catch(() => {})
      }
    }
  }, [dbUser, navigate])

  async function handleFindMatch() {
    if (!dbUser) return
    try {
      setStatus('searching')
      setMessage(`Searching ranked arena...`)
      await matchmakingApi.join(dbUser.id)
    } catch {
      setStatus('error')
      setMessage('Could not join queue')
    }
  }

  async function handleCancelMatch() {
    if (!dbUser) return
    try {
      await matchmakingApi.leave(dbUser.id)
      setStatus('idle')
      setMessage('Search cancelled.')
    } catch {
      setStatus('error')
      setMessage('Could not leave queue')
    }
  }

  function handlePracticeMode() {
    if (!dbUser || problems.length === 0) return
    const randomProblem = problems[Math.floor(Math.random() * problems.length)]
    navigate(`/practice/${randomProblem.slug}`, { state: { userId: dbUser.id, username: dbUser.username } })
  }

  async function handlePracticeSoloFromModal() {
    if (!dbUser) return
    try {
      await matchmakingApi.leave(dbUser.id)
      handlePracticeMode()
    } catch {
      setStatus('error')
    }
  }

  const wins = dbUser?.wins ?? 0
  const losses = dbUser?.losses ?? 0
  const totalGames = wins + losses
  const winRate = totalGames > 0 ? `${Math.round((wins / totalGames) * 100)}%` : '--'
  const rank = getRank(dbUser?.rating ?? 1200)
  const isAdmin = dbUser?.role === 'ADMIN'

  return (
    <div className="layout-container">
      <style>{`
        .layout-container {
          display: flex;
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: var(--font-body);
        }
        .sidebar {
          width: 250px;
          background: rgba(18, 18, 26, 0.95);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 2rem 1rem;
        }
        .sidebar-logo {
          font-family: var(--font-display);
          color: var(--accent-cyan);
          font-size: 2rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 2rem;
          text-shadow: 0 0 15px rgba(0, 212, 255, 0.4);
        }
        .nav-section {
          margin-bottom: 2rem;
        }
        .nav-title {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1rem;
          padding-left: 0.5rem;
        }
        .nav-link {
          display: block;
          padding: 0.8rem 1rem;
          color: var(--text-primary);
          text-decoration: none;
          border-radius: 6px;
          margin-bottom: 0.5rem;
          transition: all 0.2s;
          cursor: pointer;
        }
        .nav-link:hover {
          background: rgba(0, 212, 255, 0.1);
          color: var(--accent-cyan);
        }
        .nav-link.active {
          background: rgba(0, 212, 255, 0.15);
          color: var(--accent-cyan);
          border-left: 3px solid var(--accent-cyan);
        }
        .mode-switch {
          margin-top: auto;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 1rem;
          border: 1px solid var(--border);
        }
        .mode-btn {
          width: 100%;
          padding: 0.6rem;
          margin-bottom: 0.5rem;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-radius: 4px;
          cursor: pointer;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          transition: all 0.2s;
        }
        .mode-btn.active-mode {
          background: var(--accent-cyan);
          color: var(--bg-primary);
          border-color: var(--accent-cyan);
        }
        .mode-btn.admin-mode.active-mode {
          background: var(--accent-red);
          border-color: var(--accent-red);
        }
        .logout-btn {
          width: 100%;
          padding: 0.8rem;
          margin-top: 1rem;
          background: transparent;
          border: 1px solid var(--accent-red);
          color: var(--accent-red);
          border-radius: 6px;
          cursor: pointer;
          font-family: var(--font-mono);
          text-transform: uppercase;
          transition: all 0.2s;
        }
        .logout-btn:hover {
          background: rgba(255, 71, 87, 0.1);
        }

        .main-content {
          flex: 1;
          padding: 2rem 3rem;
          background: radial-gradient(circle at 50% 0%, rgba(0, 212, 255, 0.05), transparent 40rem);
          overflow-y: auto;
        }
        
        .grid-layout {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          gap: 1.5rem;
        }
        @media (max-width: 1200px) {
          .grid-layout { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 800px) {
          .grid-layout { grid-template-columns: 1fr; }
          .layout-container { flex-direction: column; }
          .sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border); }
        }
        
        .panel {
          background: rgba(18, 18, 26, 0.8);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          backdrop-filter: blur(10px);
        }
        .panel-title {
          font-family: var(--font-display);
          font-size: 1.2rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.5rem;
        }
        .profile-username { font-size: 2rem; font-family: var(--font-display); font-weight: bold; margin-bottom: 0.5rem; }
        .profile-rank { font-family: var(--font-mono); font-weight: bold; font-size: 1.2rem; margin-bottom: 1.5rem; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .stat-item { background: rgba(0, 0, 0, 0.2); padding: 1rem; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 1.5rem; font-family: var(--font-mono); font-weight: bold; color: var(--accent-cyan); }
        .stat-label { font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; }
        .arena-panel { display: flex; flex-direction: column; alignItems: center; gap: 1.5rem; padding: 2rem; background: linear-gradient(180deg, rgba(0, 212, 255, 0.05) 0%, rgba(18, 18, 26, 0.8) 100%); }
        .btn-primary, .btn-secondary { width: 100%; padding: 1rem; border-radius: 8px; font-family: var(--font-display); font-size: 1.1rem; font-weight: bold; text-transform: uppercase; cursor: pointer; transition: all 0.3s ease; }
        .btn-primary { background: var(--accent-cyan); color: var(--bg-primary); border: none; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 20px rgba(0, 212, 255, 0.4); }
        .btn-secondary { background: transparent; color: var(--text-primary); border: 1px solid var(--border); }
        .btn-secondary:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); }
        .status-text { font-family: var(--font-mono); min-height: 1.5rem; text-align: center; width: 100%; }
        .history-list { display: flex; flex-direction: column; gap: 0.8rem; }
        .history-row, .lb-row { display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.03); padding: 0.8rem; border-radius: 6px; }
        .lb-rank { font-family: var(--font-mono); font-weight: bold; color: var(--text-secondary); width: 2rem; }
        .lb-name { flex: 1; font-weight: bold; }
        .lb-rating { color: var(--accent-cyan); font-family: var(--font-mono); }
        .problems-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .problems-table th { text-align: left; padding: 0.8rem; color: var(--text-secondary); border-bottom: 1px solid var(--border); font-family: var(--font-mono); font-size: 0.8rem; }
        .problems-table td { padding: 1rem 0.8rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .btn-solve { background: rgba(0, 212, 255, 0.1); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; font-family: var(--font-mono); font-size: 0.8rem; transition: all 0.2s; }
        .btn-solve:hover { background: var(--accent-cyan); color: var(--bg-primary); }
      `}</style>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">ZeevCode</div>
        
        <div className="nav-section">
          <div className="nav-title">User View</div>
          <a className="nav-link active">Dashboard</a>
          <a className="nav-link" onClick={() => alert('Practice coming soon')}>Practice</a>
          <a className="nav-link" onClick={() => alert('Matches coming soon')}>Matches</a>
          <a className="nav-link" onClick={() => alert('Leaderboard coming soon')}>Leaderboard</a>
        </div>

        {isAdmin && viewMode === 'ADMIN' && (
          <div className="nav-section">
            <div className="nav-title" style={{ color: 'var(--accent-red)' }}>Admin View</div>
            <a className="nav-link" onClick={() => navigate('/admin')} style={{ color: 'var(--accent-red)' }}>
              Dashboard
            </a>
            <a className="nav-link" onClick={() => navigate('/admin/problems')} style={{ color: 'var(--accent-red)' }}>
              Problems
            </a>
            <a className="nav-link" onClick={() => navigate('/admin/users')} style={{ color: 'var(--accent-red)' }}>
              Users
            </a>
            <a className="nav-link" onClick={() => navigate('/admin')} style={{ color: 'var(--accent-red)' }}>
              Statistics
            </a>
          </div>
        )}

        {isAdmin && (
          <div className="mode-switch">
            <div className="nav-title" style={{ paddingLeft: 0, textAlign: 'center' }}>Mode Switch</div>
            <button 
              className={`mode-btn ${viewMode === 'USER' ? 'active-mode' : ''}`}
              onClick={() => setViewMode('USER')}
            >
              View as User
            </button>
            <button 
              className={`mode-btn admin-mode ${viewMode === 'ADMIN' ? 'active-mode' : ''}`}
              onClick={() => setViewMode('ADMIN')}
            >
              View as Admin
            </button>
          </div>
        )}

        <button className="logout-btn" onClick={logout}>Logout</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="grid-layout">
          
          {/* LEFT COLUMN */}
          <div className="column">
            <div className="panel" style={{ marginBottom: '1.5rem' }}>
              <h2 className="panel-title">Profile</h2>
              {dbUser ? (
                <>
                  <div className="profile-username">{dbUser.username}</div>
                  <div className="profile-rank" style={{ color: rank.color }}>{rank.label}</div>
                  <div className="stats-grid">
                    <div className="stat-item"><div className="stat-value">{dbUser.rating}</div><div className="stat-label">Rating</div></div>
                    <div className="stat-item"><div className="stat-value">{winRate}</div><div className="stat-label">Win Rate</div></div>
                    <div className="stat-item"><div className="stat-value" style={{ color: 'var(--accent-green)' }}>{wins}</div><div className="stat-label">Wins</div></div>
                    <div className="stat-item"><div className="stat-value" style={{ color: 'var(--accent-red)' }}>{losses}</div><div className="stat-label">Losses</div></div>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-secondary)' }}>Loading profile...</div>
              )}
            </div>

            <div className="panel">
              <h2 className="panel-title">Recent Matches</h2>
              <div className="history-list">
                {matches.length > 0 ? (
                  matches.map((m) => {
                    const isWin = (m.winnerId || m.winner_id || m.winner?.id) === dbUser?.id
                    return (
                      <div key={m.id} className="history-row" style={{ borderLeft: `3px solid ${isWin ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{m.problem?.title || 'Unknown Problem'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{m.status}</div>
                        </div>
                        <div style={{ color: isWin ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>
                          {isWin ? 'WIN' : 'LOSS'}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No matches played yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN */}
          <div className="column">
            <div className="panel arena-panel" style={{ marginBottom: '1.5rem' }}>
              <h2 className="panel-title" style={{ border: 'none', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: 0 }}>The Arena</h2>
              
              {status === 'searching' ? (
                <button className="btn-secondary" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} onClick={handleCancelMatch}>Cancel Search</button>
              ) : (
                <button className="btn-primary" onClick={handleFindMatch}>Find Match</button>
              )}
              <button className="btn-secondary" onClick={() => alert("Friend Matches coming soon!")}>Play With Friends</button>
              <button className="btn-secondary" onClick={handlePracticeMode}>Practice Mode</button>
              
              <div className="status-text" style={{ color: status === 'error' ? 'var(--accent-red)' : status === 'found' ? 'var(--accent-green)' : 'var(--accent-cyan)' }}>
                {message}
              </div>
            </div>

            {status === 'timeout_modal' && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: 'var(--bg-primary)', padding: '2.5rem', borderRadius: '12px', border: '1px solid var(--accent-cyan)', textAlign: 'center', maxWidth: '400px', width: '90%', boxShadow: '0 0 40px rgba(0, 212, 255, 0.2)' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '1rem' }}>No opponent found.</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>The arena is quiet. Continue searching or practice solo?</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button className="btn-primary" onClick={handleFindMatch}>Continue Searching</button>
                    <button className="btn-secondary" onClick={handlePracticeSoloFromModal}>Practice Solo</button>
                  </div>
                </div>
              </div>
            )}

            <div className="panel">
              <h2 className="panel-title">Practice Problems</h2>
              <table className="problems-table">
                <thead><tr><th>Title</th><th>Difficulty</th><th>Action</th></tr></thead>
                <tbody>
                  {problems.length > 0 ? (
                    problems.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 'bold' }}>{p.title}</td>
                        <td style={{ color: getDifficultyColor(p.difficulty), fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{p.difficulty}</td>
                        <td><button className="btn-solve" onClick={() => alert("Practice environment coming soon!")}>Solve</button></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No problems available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="column">
            <div className="panel" style={{ marginBottom: '1.5rem' }}>
              <h2 className="panel-title">Top 3 Players</h2>
              <div className="history-list">
                {leaderboard.length > 0 ? (
                  leaderboard.slice(0, 3).map((player, idx) => (
                    <div key={player.id} className="lb-row">
                      <div className="lb-rank">#{idx + 1}</div>
                      <div className="lb-name">{player.username}</div>
                      <div className="lb-rating">{player.rating}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Leaderboard loading...</div>
                )}
              </div>
            </div>

            <div className="panel">
              <h2 className="panel-title">Platform Stats</h2>
              {stats ? (
                <div className="stats-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="stat-label">Total Users</div><div className="stat-value">{stats.totalUsers}</div>
                  </div>
                  <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="stat-label">Total Matches</div><div className="stat-value">{stats.totalMatches}</div>
                  </div>
                  <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="stat-label">Code Submits</div><div className="stat-value">{stats.totalSubmissions}</div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Stats loading...</div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
