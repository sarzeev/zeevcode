import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { adminApi, problemApi, userApi } from '../services/api.js'

export default function AdminTestCasesPage() {
  const { id } = useParams() // problemId
  const navigate = useNavigate()
  const [problem, setProblem] = useState(null)
  const [testCases, setTestCases] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  const [input, setInput] = useState('')
  const [expectedOutput, setExpectedOutput] = useState('')
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const userRes = await userApi.getMe()
        if (userRes.data.role !== 'ADMIN') {
          navigate('/')
          return
        }
        
        // Use getAll to find the specific problem (since getById doesn't exist on problemApi frontend yet)
        const probRes = await problemApi.getAll()
        const found = probRes.data.find(p => p.id === id)
        if (found && isMounted) setProblem(found)

        fetchTestCases()
      } catch (err) {
        if (isMounted) navigate('/admin/problems')
      }
    }
    load()
    return () => { isMounted = false }
  }, [id, navigate])

  async function fetchTestCases() {
    try {
      const res = await adminApi.getTestCases(id)
      setTestCases(res.data)
    } catch (e) {
      console.error("Failed to fetch test cases", e)
    }
  }

  function openModal(tc = null) {
    if (tc) {
      setEditingId(tc.id)
      setInput(tc.input || '')
      setExpectedOutput(tc.expected || tc.expectedOutput || '')
      setHidden(tc.hidden || false)
    } else {
      setEditingId(null)
      setInput('')
      setExpectedOutput('')
      setHidden(false)
    }
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = { input, expectedOutput, hidden }
    try {
      if (editingId) {
        await adminApi.updateTestCase(editingId, payload)
      } else {
        await adminApi.createTestCase(id, payload)
      }
      setIsModalOpen(false)
      fetchTestCases()
    } catch (err) {
      alert("Failed to save test case")
    }
  }

  async function handleDelete(tcId) {
    if (!window.confirm("Delete test case?")) return
    try {
      await adminApi.deleteTestCase(tcId)
      fetchTestCases()
    } catch (err) {
      alert("Failed to delete test case")
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
        
        table { width: 100%; border-collapse: collapse; background: rgba(18,18,26,0.8); border-radius: 8px; overflow: hidden; }
        th, td { padding: 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); }
        th { font-family: var(--font-mono); color: var(--text-secondary); background: rgba(0,0,0,0.2); }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal { background: var(--bg-primary); padding: 2rem; border-radius: 8px; border: 1px solid var(--accent-red); width: 600px; max-width: 90%; }
        .form-group { margin-bottom: 1rem; display: flex; flex-direction: column; }
        .form-group label { margin-bottom: 0.5rem; font-family: var(--font-mono); color: var(--text-secondary); font-size: 0.9rem; }
        .form-group input, .form-group textarea { background: rgba(0,0,0,0.3); border: 1px solid var(--border); color: white; padding: 0.8rem; border-radius: 4px; font-family: inherit; }
        .form-group textarea { min-height: 100px; font-family: var(--font-mono); }
      `}</style>

      <header className="header">
        <div className="logo">Test Cases: {problem?.title || 'Loading...'}</div>
        <div>
          <button className="btn btn-red" onClick={() => navigate('/admin/problems')} style={{ marginRight: '1rem' }}>Back</button>
          <button className="btn btn-cyan" onClick={() => openModal()}>+ Add Test Case</button>
        </div>
      </header>

      <table>
        <thead>
          <tr>
            <th>Input (Preview)</th>
            <th>Expected (Preview)</th>
            <th>Visibility</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {testCases.map(tc => (
            <tr key={tc.id}>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{tc.input?.substring(0, 30)}...</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{(tc.expected || tc.expectedOutput || '').substring(0, 30)}...</td>
              <td style={{ color: tc.hidden ? 'var(--accent-red)' : 'var(--accent-green)' }}>{tc.hidden ? 'HIDDEN' : 'PUBLIC'}</td>
              <td style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-cyan" onClick={() => openModal(tc)}>Edit</button>
                <button className="btn btn-red" onClick={() => handleDelete(tc.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {testCases.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center' }}>No test cases found.</td></tr>}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent-cyan)' }}>{editingId ? 'Edit Test Case' : 'New Test Case'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Input Data</label><textarea required value={input} onChange={e => setInput(e.target.value)} /></div>
              <div className="form-group"><label>Expected Output</label><textarea required value={expectedOutput} onChange={e => setExpectedOutput(e.target.value)} /></div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                <label style={{ margin: 0 }}>Hidden Test Case?</label>
                <input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-red" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-cyan">Save Test Case</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
