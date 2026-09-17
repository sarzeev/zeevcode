import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const LINKS = [
  { to: '/dsa', label: 'Arena' },
  { to: '/dsa/problems', label: 'DSA Roadmap' },
  { to: '/dsa/dashboard', label: 'DSA Dashboard' },
  { to: '/fundamentals', label: 'Fundamentals' },
  { to: '/system-design', label: 'System Design' },
  { to: '/resources', label: 'Resources' },
  { to: '/stories', label: 'Stories' },
]

const navBtn =
  'px-4 py-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)] border border-transparent transition-all duration-200 hover:border-[var(--border)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'

export default function SiteNav({
  solid = false,
  showSidebarToggle = false,
  sidebarOpen = false,
  onToggleSidebar,
}) {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        solid
          ? 'border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md'
          : 'border-[var(--border)] bg-[var(--bg-surface)]/90 backdrop-blur-md'
      }`}
    >
      <div className="flex h-14 w-full items-center gap-3 px-3 sm:px-5">
        {/* Left: sidebar toggle + brand */}
        <div className="flex shrink-0 items-center gap-2">
          {showSidebarToggle && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={sidebarOpen}
              className={`${navBtn} !px-2.5 ${sidebarOpen ? 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--accent-cyan)]' : ''}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
          <Link
            to="/"
            className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-[var(--accent-cyan)] transition-colors hover:text-[#5ae4ff] sm:text-2xl"
          >
            zeevCode
          </Link>
        </div>

        {/* Center: spaced individual nav buttons */}
        <nav className="hidden flex-1 items-center justify-center gap-3 md:flex lg:gap-4">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `${navBtn} ${
                  isActive
                    ? 'border-[var(--border)] bg-[var(--accent-cyan-dim)] text-[var(--accent-cyan)]'
                    : ''
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: email + logout pinned to top-right */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {currentUser?.email && (
            <span
              title={currentUser.email}
              className="hidden max-w-[180px] truncate border border-[var(--border)] bg-[var(--bg-elevated)]/60 px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-cyan)]/40 hover:text-[var(--text-primary)] lg:inline-block"
            >
              {currentUser.email}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className={`${navBtn} hover:border-[var(--accent-red)]/50 hover:bg-[rgba(255,71,87,0.1)] hover:text-[var(--accent-red)]`}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mobile nav — spaced chips */}
      <nav className="flex gap-2 overflow-x-auto border-t border-[var(--border-soft)] px-3 py-2 md:hidden">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `shrink-0 px-3 py-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.12em] border transition-all ${
                isActive
                  ? 'border-[var(--accent-cyan)]/40 bg-[var(--accent-cyan-dim)] text-[var(--accent-cyan)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
