import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { userApi, statsApi } from '../services/api.js'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [dbUser, setDbUser] = useState(null)
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        const userRes = await userApi.getMe()
        if (isMounted) setDbUser(userRes.data)
        
        if (userRes.data.role !== 'ADMIN') {
          navigate('/')
          return
        }

        const statsRes = await statsApi.getPlatformStats()
        if (isMounted) setStats(statsRes.data)
      } catch (err) {
        if (isMounted) navigate('/')
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [navigate])

  if (!dbUser || dbUser.role !== 'ADMIN') {
    return <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Loading Admin Panel...</div>
  }

  return (
    <div className="admin-container">
      <style>{`
        .admin-container {
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          padding: 2rem 4rem;
          font-family: var(--font-body);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          border-bottom: 1px solid rgba(255, 71, 87, 0.3);
          padding-bottom: 1rem;
        }
        .logo {
          font-family: var(--font-display);
          color: var(--accent-red);
          font-size: 2.5rem;
          font-weight: 700;
          text-shadow: 0 0 20px rgba(255, 71, 87, 0.4);
        }
        .nav-actions button {
          background: transparent;
          border: 1px solid var(--accent-red);
          color: var(--accent-red);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-family: var(--font-mono);
          text-transform: uppercase;
          transition: all 0.2s;
        }
        .nav-actions button:hover {
          background: rgba(255, 71, 87, 0.1);
          box-shadow: 0 0 10px rgba(255, 71, 87, 0.2);
        }
        .admin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
        }
        .admin-card {
          background: rgba(18, 18, 26, 0.8);
          border: 1px solid rgba(255, 71, 87, 0.3);
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          text-align: center;
          transition: transform 0.2s;
        }
        .admin-card:hover {
          transform: translateY(-5px);
          border-color: var(--accent-red);
        }
        .card-title {
          font-family: var(--font-display);
          font-size: 1.2rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1rem;
        }
        .card-value {
          font-size: 2.5rem;
          font-family: var(--font-mono);
          font-weight: bold;
          color: var(--accent-red);
        }
        .back-link {
          display: inline-block;
          margin-bottom: 2rem;
          color: var(--text-secondary);
          text-decoration: none;
          font-family: var(--font-mono);
          font-size: 0.9rem;
        }
        .back-link:hover {
          color: var(--accent-cyan);
        }
      `}</style>

      <header className="header">
        <div className="logo">ZeevCode Admin</div>
        <div className="nav-actions">
          <button onClick={logout}>Logout</button>
        </div>
      </header>
      
      <a href="/" className="back-link">← Back to Dashboard</a>

      <div className="admin-grid">
        <div className="admin-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/users')}>
          <div className="card-title">Manage Users</div>
          <div className="card-value">{stats?.totalUsers ?? '--'}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '1rem' }}>Click to view</div>
        </div>
        
        <div className="admin-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/problems')}>
          <div className="card-title">Manage Problems</div>
          <div className="card-value">{stats?.totalProblems ?? '--'}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '1rem' }}>Click to view</div>
        </div>

        <div className="admin-card">
          <div className="card-title">Matches Played</div>
          <div className="card-value">{stats?.totalMatches ?? '--'}</div>
        </div>

        <div className="admin-card">
          <div className="card-title">Submissions</div>
          <div className="card-value">{stats?.totalSubmissions ?? '--'}</div>
        </div>
      </div>
    </div>
  )
}
