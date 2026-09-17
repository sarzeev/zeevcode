import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { userApi } from '../services/api.js'

export default function AdminFundamentalsPage() {
  const navigate = useNavigate()
  const [dbUser, setDbUser] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [newSubject, setNewSubject] = useState({ name: '', slug: '', description: '' })
  const [playlistUrls, setPlaylistUrls] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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

        fetchSubjects()
      } catch (err) {
        if (isMounted) navigate('/')
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [navigate])

  const fetchSubjects = async () => {
    try {
      const res = await userApi.getAdminSubjects()
      setSubjects(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateSubject = async (e) => {
    e.preventDefault()
    try {
      await userApi.createAdminSubject(newSubject)
      setNewSubject({ name: '', slug: '', description: '' })
      fetchSubjects()
      setMessage('Subject created successfully')
    } catch (err) {
      setMessage('Failed to create subject')
    }
  }

  const handleImportPlaylist = async (subjectId) => {
    const url = playlistUrls[subjectId]
    if (!url) return
    setLoading(true)
    try {
      await userApi.importAdminPlaylist(subjectId, { playlistUrl: url })
      setMessage('Playlist imported successfully')
      setPlaylistUrls({ ...playlistUrls, [subjectId]: '' })
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setMessage('Failed: ' + err.response.data.error)
      } else {
        setMessage('Failed to import playlist')
      }
    }
    setLoading(false)
  }

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
        .section-card {
          background: rgba(18, 18, 26, 0.8);
          border: 1px solid rgba(255, 71, 87, 0.3);
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
        }
        .form-group {
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
        }
        .form-group label {
          margin-bottom: 0.5rem;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          text-transform: uppercase;
          font-size: 0.8rem;
        }
        .form-group input, .form-group textarea {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 0.75rem;
          border-radius: 4px;
          font-family: var(--font-mono);
        }
        .btn {
          background: rgba(255, 71, 87, 0.1);
          border: 1px solid var(--accent-red);
          color: var(--accent-red);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-family: var(--font-mono);
          text-transform: uppercase;
        }
        .btn:hover {
          background: rgba(255, 71, 87, 0.2);
        }
        .subject-item {
          border-bottom: 1px solid var(--border);
          padding: 1rem 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>

      <header className="header">
        <div className="logo">Fundamentals Management</div>
      </header>
      
      <a href="/admin" className="back-link">? Back to Admin Dashboard</a>

      {message && (
        <div style={{ color: message.startsWith('Failed') ? 'var(--accent-red)' : 'var(--accent-green)', marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      <div className="section-card">
        <h3>Create Subject</h3>
        <form onSubmit={handleCreateSubject} style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label>Name</label>
            <input value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Slug (e.g., os, cn)</label>
            <input value={newSubject.slug} onChange={e => setNewSubject({...newSubject, slug: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={newSubject.description} onChange={e => setNewSubject({...newSubject, description: e.target.value})} required />
          </div>
          <button type="submit" className="btn">Create</button>
        </form>
      </div>

      <div className="section-card">
        <h3>Existing Subjects</h3>
        <div>
          {subjects.map(sub => (
            <div key={sub.id} className="subject-item">
              <div>
                <h4>{sub.name} <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>/{sub.slug}</span></h4>
                <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem'}}>{sub.description}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="YouTube Playlist URL" 
                  value={playlistUrls[sub.id] || ''} 
                  onChange={e => setPlaylistUrls({...playlistUrls, [sub.id]: e.target.value})}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '0.5rem', color: 'white', borderRadius: '4px' }}
                />
                <button 
                  className="btn" 
                  onClick={() => handleImportPlaylist(sub.id)}
                  disabled={loading}
                >
                  {loading ? 'Fetching...' : 'Fetch Videos'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
