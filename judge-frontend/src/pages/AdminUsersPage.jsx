import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { adminApi, userApi } from '../services/api.js'

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const userRes = await userApi.getMe()
        if (userRes.data.role !== 'ADMIN') {
          navigate('/')
          return
        }
        fetchUsers()
      } catch {
        if (isMounted) navigate('/')
      }
    }
    load()
    return () => { isMounted = false }
  }, [navigate])

  async function fetchUsers(query = '') {
    try {
      const res = await adminApi.searchUsers(query)
      setUsers(res.data || [])
    } catch (e) {
      console.error("Failed to load users", e)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    fetchUsers(searchQuery)
  }

  async function handleToggleRole(u) {
    const newRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN'
    if (!window.confirm(`Change ${u.username}'s role to ${newRole}?`)) return
    try {
      await adminApi.updateUserRole(u.id, newRole)
      fetchUsers(searchQuery)
    } catch {
      alert("Failed to update role")
    }
  }

  async function handleToggleStatus(u) {
    const action = u.active || u.isActive ? 'Disable' : 'Enable'
    if (!window.confirm(`${action} user ${u.username}?`)) return
    try {
      if (action === 'Disable') await adminApi.disableUser(u.id)
      else await adminApi.enableUser(u.id)
      fetchUsers(searchQuery)
    } catch {
      alert(`Failed to ${action.toLowerCase()} user`)
    }
  }

  return (
    <div className="admin-page">
      <style>{`
        .admin-page { min-height: 100vh; background: var(--bg-primary); color: var(--text-primary); padding: 2rem; font-family: var(--font-body); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 71, 87, 0.3); padding-bottom: 1rem; margin-bottom: 2rem; }
        .logo { font-family: var(--font-display); color: var(--accent-red); font-size: 2rem; font-weight: bold; }
        .btn { padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-family: var(--font-mono); text-transform: uppercase; border: none; font-weight: bold; }
        .btn-red { background: rgba(255, 71, 87, 0.1); color: var(--accent-red); border: 1px solid var(--accent-red); }
        .btn-red:hover { background: var(--accent-red); color: white; }
        .btn-cyan { background: rgba(0, 212, 255, 0.1); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); }
        .btn-cyan:hover { background: var(--accent-cyan); color: black; }
        .btn-gray { background: rgba(255, 255, 255, 0.1); color: var(--text-secondary); border: 1px solid var(--text-secondary); font-size: 0.8rem; padding: 0.3rem 0.6rem; }
        .btn-gray:hover { background: var(--text-secondary); color: black; }
        
        .search-bar { display: flex; gap: 1rem; margin-bottom: 2rem; }
        .search-input { flex: 1; padding: 0.8rem; border-radius: 4px; background: rgba(0,0,0,0.3); border: 1px solid var(--border); color: white; font-family: var(--font-mono); }
        
        table { width: 100%; border-collapse: collapse; background: rgba(18,18,26,0.8); border-radius: 8px; overflow: hidden; }
        th, td { padding: 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); }
        th { font-family: var(--font-mono); color: var(--text-secondary); background: rgba(0,0,0,0.2); }
      `}</style>

      <header className="header">
        <div className="logo">Manage Users</div>
        <div>
          <button className="btn btn-red" onClick={() => navigate('/admin')}>Back to Dashboard</button>
        </div>
      </header>

      <form className="search-bar" onSubmit={handleSearch}>
        <input 
          className="search-input" 
          placeholder="Search by username..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <button type="submit" className="btn btn-cyan">Search</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>W/L</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => {
            const active = u.active !== undefined ? u.active : (u.isActive !== undefined ? u.isActive : true);
            return (
              <tr key={u.id} style={{ opacity: active ? 1 : 0.5 }}>
                <td style={{ fontWeight: 'bold' }}>{u.username}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                <td style={{ color: u.role === 'ADMIN' ? 'var(--accent-red)' : 'var(--accent-cyan)', fontWeight: 'bold' }}>{u.role}</td>
                <td style={{ color: active ? 'var(--accent-green)' : 'var(--accent-red)' }}>{active ? 'ACTIVE' : 'DISABLED'}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--accent-green)' }}>{u.wins}W</span> / <span style={{ color: 'var(--accent-red)' }}>{u.losses}L</span>
                </td>
                <td style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-gray" onClick={() => handleToggleRole(u)}>Toggle Role</button>
                  <button className="btn-gray" onClick={() => handleToggleStatus(u)}>
                    {active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            )
          })}
          {users.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center' }}>No users found.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
