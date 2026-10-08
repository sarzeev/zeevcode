function getDifficultyColor(difficulty) {
  if (difficulty === 'Easy') return 'var(--accent-green)'
  if (difficulty === 'Medium') return '#ffd166'
  if (difficulty === 'Hard') return 'var(--accent-red)'
  return 'var(--text-secondary)'
}

// One row in a ProblemList: title, difficulty and the solve action.
export default function ProblemListItem({ problem, onSolve }) {
  return (
    <tr>
      <td style={{ fontWeight: 'bold' }}>{problem.title}</td>
      <td style={{ color: getDifficultyColor(problem.difficulty), fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        {problem.difficulty}
      </td>
      <td>
        <button className="btn-solve" onClick={() => onSolve(problem)}>
          Solve
        </button>
      </td>
    </tr>
  )
}
