import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { adminApi, problemApi, userApi } from '../services/api.js'

export default function AdminProblemsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [problems, setProblems] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProblem, setEditingProblem] = useState(null)
  
  // Form State
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [difficulty, setDifficulty] = useState('EASY')
  const [description, setDescription] = useState('')
  const [templateCode, setTemplateCode] = useState('')
  const [timeLimit, setTimeLimit] = useState(2000)
  const [memoryLimit, setMemoryLimit] = useState(256)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const userRes = await userApi.getMe()
        if (userRes.data.role !== 'ADMIN') {
          navigate('/')
          return
        }
        fetchProblems()
      } catch {
        if (isMounted) navigate('/')
      }
    }
    load()
    return () => { isMounted = false }
  }, [navigate])

  async function fetchProblems() {
    try {
      const res = await adminApi.getAllProblems()
      setProblems(res.data || [])
    } catch (e) {
      console.error("Failed to load problems", e)
    }
  }

  function openModal(problem = null) {
    if (problem) {
      setEditingProblem(problem)
      setTitle(problem.title)
      setSlug(problem.slug)
      setDifficulty(problem.difficulty)
      setDescription(problem.description)
      setTemplateCode(problem.templateCode)
      setTimeLimit(problem.timeLimit || 2000)
      setMemoryLimit(problem.memoryLimit || 256)
    } else {
      setEditingProblem(null)
      setTitle('')
      setSlug('')
      setDifficulty('EASY')
      setDescription('')
      setTemplateCode('')
      setTimeLimit(2000)
      setMemoryLimit(256)
    }
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = { title, slug, difficulty, description, templateCode, timeLimit, memoryLimit }
    try {
      if (editingProblem) {
        await adminApi.updateProblem(editingProblem.id, payload)
      } else {
        await adminApi.createProblem(payload)
      }
      setIsModalOpen(false)
      fetchProblems()
    } catch (err) {
      alert("Failed to save problem: " + (err.response?.data || err.message))
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure? Unplayed problems will be permanently deleted, while played problems will be archived.")) return
    try {
      const res = await adminApi.deleteProblem(id)
      alert(res.data?.message || "Operation complete.")
      fetchProblems()
    } catch (err) {
      alert("Failed to process deletion.")
    }
  }

  async function handleRestore(id) {
    try {
      await adminApi.restoreProblem(id)
      fetchProblems()
    } catch (err) {
      alert("Failed to restore problem.")
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
        .btn-green { background: rgba(0, 255, 128, 0.1); color: var(--accent-green); border: 1px solid var(--accent-green); }
        .btn-green:hover { background: var(--accent-green); color: black; }
        .btn-gray { background: rgba(255, 255, 255, 0.1); color: var(--text-secondary); border: 1px solid var(--text-secondary); }
        .btn-gray:hover { background: var(--text-secondary); color: black; }
        
        table { width: 100%; border-collapse: collapse; background: rgba(18,18,26,0.8); border-radius: 8px; overflow: hidden; }
        th, td { padding: 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); }
        th { font-family: var(--font-mono); color: var(--text-secondary); background: rgba(0,0,0,0.2); }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal { background: var(--bg-primary); padding: 2rem; border-radius: 8px; border: 1px solid var(--accent-red); width: 600px; max-width: 90%; max-height: 90vh; overflow-y: auto; }
        .form-group { margin-bottom: 1rem; display: flex; flex-direction: column; }
        .form-group label { margin-bottom: 0.5rem; font-family: var(--font-mono); color: var(--text-secondary); font-size: 0.9rem; }
        .form-group input, .form-group select, .form-group textarea { background: rgba(0,0,0,0.3); border: 1px solid var(--border); color: white; padding: 0.8rem; border-radius: 4px; font-family: inherit; }
        .form-group textarea { min-height: 100px; font-family: var(--font-mono); }
      `}</style>

      <header className="header">
        <div className="logo">Manage Problems</div>
        <div>
          <button className="btn btn-red" onClick={() => navigate('/admin')} style={{ marginRight: '1rem' }}>Back</button>
          <button className="btn btn-cyan" onClick={() => openModal()}>+ Add Problem</button>
        </div>
      </header>

      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Slug</th>
            <th>Difficulty</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {problems.map(p => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{p.slug}</td>
              <td style={{ color: p.difficulty === 'HARD' ? 'var(--accent-red)' : p.difficulty === 'MEDIUM' ? '#ffd166' : 'var(--accent-green)' }}>{p.difficulty}</td>
              <td style={{ color: p.active ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 'bold' }}>{p.active ? 'ACTIVE' : 'ARCHIVED'}</td>
              <td style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-green" onClick={() => navigate(`/admin/problems/${p.id}/testcases`)}>Test Cases</button>
                <button className="btn btn-cyan" onClick={() => openModal(p)}>Edit</button>
                {p.active ? (
                  <button className="btn btn-red" onClick={() => handleDelete(p.id)}>Archive/Delete</button>
                ) : (
                  <button className="btn btn-gray" onClick={() => handleRestore(p.id)}>Restore</button>
                )}
              </td>
            </tr>
          ))}
          {problems.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>No problems found.</td></tr>}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent-cyan)' }}>{editingProblem ? 'Edit Problem' : 'New Problem'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Title</label><input required value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div className="form-group"><label>Slug (e.g. two-sum)</label><input required value={slug} onChange={e => setSlug(e.target.value)} /></div>
              <div className="form-group"><label>Difficulty</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}><label>Time Limit (ms)</label><input type="number" required value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} /></div>
                <div className="form-group" style={{ flex: 1 }}><label>Memory Limit (MB)</label><input type="number" required value={memoryLimit} onChange={e => setMemoryLimit(Number(e.target.value))} /></div>
              </div>
              <div className="form-group"><label>Description (Markdown)</label><textarea required value={description} onChange={e => setDescription(e.target.value)} /></div>
              <div className="form-group"><label>Template Code (Java)</label><textarea required value={templateCode} onChange={e => setTemplateCode(e.target.value)} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-red" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-cyan">Save Problem</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
