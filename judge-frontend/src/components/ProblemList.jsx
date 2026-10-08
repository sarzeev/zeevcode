import ProblemListItem from './ProblemListItem'

// Renders a ProblemList (e.g. NeetCode 150) as rows of ProblemListItem.
// Generic on purpose: no knowledge of any specific list. When more than one
// list exists, a selector is shown automatically.
export default function ProblemList({
  lists,
  selectedSlug,
  onSelectList,
  problems,
  loading = false,
  error = '',
  onSolve,
}) {
  return (
    <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
      {lists.length > 1 && (
        <select
          value={selectedSlug}
          onChange={(e) => onSelectList(e.target.value)}
          style={{
            width: '100%',
            marginBottom: '0.5rem',
            background: 'rgba(0,0,0,0.3)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '0.4rem 0.6rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
          }}
        >
          {lists.map((list) => (
            <option key={list.slug} value={list.slug}>
              {list.name}
            </option>
          ))}
        </select>
      )}
      <table className="problems-table" style={{ marginTop: 0 }}>
        <thead>
          <tr>
            <th style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 1 }}>Title</th>
            <th style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 1 }}>Difficulty</th>
            <th style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 1 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading problems...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan="3" style={{ textAlign: 'center', color: 'var(--accent-red)' }}>
                {error}
              </td>
            </tr>
          ) : problems.length > 0 ? (
            problems.map((problem) => (
              <ProblemListItem
                key={`${problem.leetcodeId}-${problem.slug}`}
                problem={problem}
                onSolve={onSolve}
              />
            ))
          ) : (
            <tr>
              <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                No problems available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
