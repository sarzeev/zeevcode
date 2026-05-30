import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { matchApi, userApi } from '../services/api.js'

function getRank(rating) {
  if (rating < 1200) {
    return { label: 'UNRANKED', color: '#6b6b8a' }
  }

  if (rating < 1400) {
    return { label: 'BRONZE', color: '#cd7f32' }
  }

  if (rating < 1600) {
    return { label: 'SILVER', color: '#c0c0c0' }
  }

  if (rating < 1800) {
    return { label: 'GOLD', color: '#ffd700' }
  }

  return { label: 'MASTER', color: 'var(--accent-cyan)' }
}

function formatMemberSince(value) {
  if (!value) {
    return '--'
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function formatMatchDate(value) {
  if (!value) {
    return '--'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function getUserId(user) {
  return user?.id ?? user?.userId ?? user?.uuid ?? ''
}

function getPlayer(match, slot) {
  if (slot === 1) {
    return match.player1 ?? match.playerOne ?? match.user1 ?? match.players?.[0]
  }

  return match.player2 ?? match.playerTwo ?? match.user2 ?? match.players?.[1]
}

function getPlayerId(player, fallback) {
  return player?.id ?? player?.userId ?? player?.user?.id ?? fallback ?? ''
}

function getPlayerName(player, fallback) {
  return player?.username ?? player?.name ?? player?.user?.username ?? fallback
}

function getOpponent(match, userId) {
  const playerOne = getPlayer(match, 1)
  const playerTwo = getPlayer(match, 2)
  const playerOneId = getPlayerId(playerOne, match.player1Id)
  const playerTwoId = getPlayerId(playerTwo, match.player2Id)

  if (playerOneId === userId) {
    return getPlayerName(playerTwo, 'Opponent')
  }

  if (playerTwoId === userId) {
    return getPlayerName(playerOne, 'Opponent')
  }

  return 'Opponent'
}

function getWinnerId(match) {
  return match.winnerId ?? match.winner_id ?? match.winner?.id ?? ''
}

function getProblemTitle(match) {
  return match.problem?.title ?? match.problemTitle ?? match.problem?.name ?? 'Unknown Problem'
}

function isOnline(friend) {
  if (!friend.addedAt) {
    return false
  }

  return Date.now() - friend.addedAt < 10 * 60 * 1000
}

export default function ProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [matches, setMatches] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFriendsOpen, setIsFriendsOpen] = useState(false)
  const [friendUsername, setFriendUsername] = useState('')
  const [friends, setFriends] = useState([])
  const [friendMessage, setFriendMessage] = useState('')

  const pendingMatchId = location.state?.pendingMatchId ?? null
  const pendingMatchCreated = location.state?.pendingMatchCreated ?? false
  const stateUsername = location.state?.username ?? ''
  const stateUserId = location.state?.userId ?? userId

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      try {
        setIsLoading(true)
        setError('')

        const [userResponse, matchesResponse] = await Promise.all([
          userApi.getUser(userId),
          matchApi.getForUser(userId),
        ])

        const rawMatches = Array.isArray(matchesResponse.data) ? matchesResponse.data : []
        const sortedMatches = rawMatches
          .slice()
          .sort((a, b) => new Date(b.createdAt ?? b.created_at ?? 0) - new Date(a.createdAt ?? a.created_at ?? 0))
          .slice(0, 10)

        if (isMounted) {
          setUser(userResponse.data)
          setMatches(sortedMatches)
        }
      } catch {
        if (isMounted) {
          setError('Unable to load profile')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [userId])

  useEffect(() => {
    try {
      const storedFriends = JSON.parse(localStorage.getItem('zeevcode_friends') ?? '[]')
      setFriends(Array.isArray(storedFriends) ? storedFriends : [])
    } catch {
      setFriends([])
    }
  }, [])

  async function handleAddFriend() {
    const trimmedUsername = friendUsername.trim()

    if (!trimmedUsername) {
      setFriendMessage('Enter a username')
      return
    }

    try {
      const response = await userApi.getUserByUsername(trimmedUsername)
      const friend = response.data
      const normalizedFriend = {
        userId: getUserId(friend),
        username: friend.username ?? trimmedUsername,
        addedAt: Date.now(),
      }
      const nextFriends = friends.some((item) => item.userId === normalizedFriend.userId || item.username === normalizedFriend.username)
        ? friends
        : [...friends, normalizedFriend]

      setFriends(nextFriends)
      localStorage.setItem('zeevcode_friends', JSON.stringify(nextFriends))
      setFriendUsername('')
      setFriendMessage('Friend added')
    } catch {
      setFriendMessage('User not found')
    }
  }

  async function handleInviteFriend(friend) {
    try {
      setFriendMessage(`Inviting ${friend.username}...`)
      const newMatch = await matchApi.create({
        player1Id: stateUserId,
        player2Id: friend.userId,
      })
      await matchApi.start(newMatch.data.id)
      navigate(`/match/${newMatch.data.id}`, {
        state: { username: stateUsername || user?.username, userId: stateUserId },
      })
    } catch {
      setFriendMessage('Failed to create match')
    }
  }

  const rating = user?.rating ?? 0
  const wins = user?.wins ?? 0
  const losses = user?.losses ?? 0
  const totalGames = wins + losses
  const winRate = totalGames > 0 ? `${Math.round((wins / totalGames) * 100)}%` : '--'
  const rank = getRank(rating)

  return (
    <main style={styles.page}>
      <style>{`
        @keyframes profile-pulse {
          from {
            background-position: 200% 0;
          }

          to {
            background-position: -200% 0;
          }
        }
      `}</style>

      <button style={styles.backButton} type="button" onClick={() => navigate('/')}>
        {'\u2190 Back to Lobby'}
      </button>

      <h1 style={styles.pageTitle}>Player Profile</h1>

      {pendingMatchCreated && pendingMatchId ? (
        <div style={styles.pendingBanner}>
          <span style={styles.pendingText}>Match ready! →</span>
          <button
            style={styles.pendingButton}
            type="button"
            onClick={() =>
              navigate(`/match/${pendingMatchId}`, {
                state: { username: stateUsername, userId: stateUserId },
              })
            }
          >
            Enter Match Room
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <ProfileSkeleton />
      ) : error ? (
        <section style={styles.errorCard}>{error}</section>
      ) : (
        <>
          <section style={styles.statsCard}>
            <div style={styles.statsRow}>
              <div style={styles.usernameBlock}>
                <p style={styles.eyebrow}>Username</p>
                <h2 style={styles.username}>{user?.username ?? 'Unknown Player'}</h2>
              </div>

              <StatBox label="Rating" value={rating} color="var(--accent-cyan)" />
              <StatBox label="W/L" value={`${wins}/${totalGames}`} color="var(--accent-green)" />
              <StatBox label="Win Rate" value={winRate} color="var(--accent-cyan)" />
              <article style={{ ...styles.statBox, borderColor: rank.color }}>
                <p style={styles.statLabel}>Rank</p>
                <strong style={{ ...styles.statValue, color: rank.color }}>{rank.label}</strong>
              </article>
            </div>

            <div style={styles.profileActions}>
              <button style={styles.findMatchButton} type="button" onClick={() => navigate('/')}>
                Find Match
              </button>
              <button style={styles.friendsButton} type="button" onClick={() => setIsFriendsOpen(true)}>
                Friends
              </button>
            </div>

            <p style={styles.memberSince}>Member since {formatMemberSince(user?.createdAt ?? user?.created_at)}</p>
          </section>

          <section style={styles.historySection}>
            <h2 style={styles.sectionTitle}>Match History</h2>
            {matches.length > 0 ? (
              <div style={styles.matchList}>
                {matches.map((match) => (
                  <MatchCard key={match.id} match={match} userId={getUserId(user) || userId} />
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>No matches played yet</div>
            )}
          </section>
        </>
      )}

      <FriendsPanel
        friendMessage={friendMessage}
        friends={friends}
        friendUsername={friendUsername}
        isOpen={isFriendsOpen}
        onAddFriend={handleAddFriend}
        onInvite={handleInviteFriend}
        onClose={() => setIsFriendsOpen(false)}
        onUsernameChange={setFriendUsername}
      />
    </main>
  )
}

function StatBox({ label, value, color }) {
  return (
    <article style={styles.statBox}>
      <p style={styles.statLabel}>{label}</p>
      <strong style={{ ...styles.statValue, color }}>{value}</strong>
    </article>
  )
}

function MatchCard({ match, userId }) {
  const winnerId = getWinnerId(match)
  const isWin = winnerId === userId
  const resultLabel = winnerId ? (isWin ? 'WIN' : 'LOSS') : '--'
  const resultColor = isWin ? 'var(--accent-green)' : 'var(--accent-red)'

  return (
    <article style={{ ...styles.matchCard, borderLeftColor: isWin ? 'var(--accent-green)' : 'var(--accent-red)' }}>
      <div>
        <p style={styles.matchMeta}>Opponent</p>
        <h3 style={styles.matchOpponent}>{getOpponent(match, userId)}</h3>
      </div>
      <div>
        <p style={styles.matchMeta}>Problem</p>
        <p style={styles.matchProblem}>{getProblemTitle(match)}</p>
      </div>
      <strong style={{ ...styles.matchResult, color: resultColor }}>{resultLabel}</strong>
      <div style={styles.matchFooter}>
        <span>{formatMatchDate(match.createdAt ?? match.created_at)}</span>
        <span style={styles.statusBadge}>{match.status ?? 'WAITING'}</span>
      </div>
    </article>
  )
}

function FriendsPanel({
  friendMessage,
  friends,
  friendUsername,
  isOpen,
  onAddFriend,
  onInvite,
  onClose,
  onUsernameChange,
}) {
  return (
    <aside style={{ ...styles.friendsPanel, transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}>
      <div style={styles.friendsHeader}>
        <h2 style={styles.friendsTitle}>Friends</h2>
        <button style={styles.closeButton} type="button" onClick={onClose}>
          X
        </button>
      </div>

      <div style={styles.friendSearch}>
        <input
          style={styles.friendInput}
          type="text"
          value={friendUsername}
          onChange={(event) => onUsernameChange(event.target.value)}
          placeholder="username"
        />
        <button style={styles.addButton} type="button" onClick={onAddFriend}>
          Add
        </button>
      </div>

      <p style={styles.friendMessage}>{friendMessage}</p>

      <div style={styles.friendsList}>
        {friends.length > 0 ? (
          friends.map((friend) => (
            <article style={styles.friendRow} key={friend.userId || friend.username}>
              <div style={styles.friendInfo}>
                <span
                  style={{
                    ...styles.statusDot,
                    background: isOnline(friend) ? '#39ff14' : '#6b6b8a',
                    boxShadow: isOnline(friend) ? '0 0 6px rgba(57, 255, 20, 0.6)' : 'none',
                  }}
                />
                <span style={styles.friendName}>{friend.username}</span>
              </div>
              <button style={styles.inviteButton} type="button" onClick={() => onInvite(friend)}>
                Invite
              </button>
            </article>
          ))
        ) : (
          <p style={styles.noFriends}>No friends yet</p>
        )}
      </div>
    </aside>
  )
}

function ProfileSkeleton() {
  return (
    <>
      <section style={styles.statsCard}>
        <div style={{ ...styles.skeleton, width: '35%', height: '2rem' }} />
        <div style={styles.statsRow}>
          <div style={{ ...styles.skeleton, width: '80px', height: '3.5rem' }} />
          <div style={{ ...styles.skeleton, width: '80px', height: '3.5rem' }} />
          <div style={{ ...styles.skeleton, width: '80px', height: '3.5rem' }} />
          <div style={{ ...styles.skeleton, width: '80px', height: '3.5rem' }} />
        </div>
      </section>
      <section style={styles.historySection}>
        <div style={{ ...styles.skeleton, width: '30%', height: '1.5rem' }} />
        <div style={{ ...styles.skeleton, height: '3.5rem' }} />
        <div style={{ ...styles.skeleton, height: '3.5rem' }} />
      </section>
    </>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at 18% 12%, rgba(0, 212, 255, 0.1), transparent 28rem), radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px), var(--bg-primary)',
    backgroundSize: 'auto, 24px 24px, auto',
    color: 'var(--text-primary)',
    padding: '2rem clamp(1rem, 4vw, 4rem) 4rem',
  },
  backButton: {
    background: 'transparent',
    border: 0,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  pageTitle: {
    color: '#6b6b8a',
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    fontWeight: 500,
    letterSpacing: '3px',
    marginBottom: '1rem',
    textTransform: 'uppercase',
  },

  /* ── Pending Match Banner ── */
  pendingBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(0, 212, 255, 0.08)',
    border: '1px solid rgba(0, 212, 255, 0.35)',
    borderRadius: '6px',
    padding: '0.6rem 1rem',
    marginBottom: '1rem',
  },
  pendingText: {
    color: '#e0e0e8',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  pendingButton: {
    background: 'rgba(0, 212, 255, 0.2)',
    border: '1px solid #00d4ff',
    borderRadius: '4px',
    color: '#00d4ff',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '1px',
    padding: '0.35rem 0.85rem',
    textTransform: 'uppercase',
    transition: 'all 0.2s ease',
  },

  /* ── Stats Card ── */
  statsCard: {
    border: '1px solid rgba(0, 212, 255, 0.28)',
    borderRadius: '8px',
    background: 'rgba(18, 18, 26, 0.88)',
    boxShadow: '0 0 34px rgba(0, 212, 255, 0.08)',
    marginBottom: '1.5rem',
    padding: '1.25rem 1.5rem',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  usernameBlock: {
    minWidth: 0,
    flexShrink: 1,
  },
  eyebrow: {
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    marginBottom: '0.2rem',
    textTransform: 'uppercase',
  },
  username: {
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    fontWeight: 700,
    lineHeight: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statBox: {
    border: '1px solid rgba(0, 212, 255, 0.28)',
    borderRadius: '6px',
    background: 'rgba(10, 10, 15, 0.72)',
    padding: '0.4rem 0.5rem',
    maxWidth: '80px',
    minWidth: '60px',
    textAlign: 'center',
    flexShrink: 0,
  },
  statLabel: {
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.55rem',
    marginBottom: '0.15rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  profileActions: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  findMatchButton: {
    background: 'rgba(0, 212, 255, 0.15)',
    border: '1px solid rgba(0, 212, 255, 0.5)',
    borderRadius: '4px',
    color: '#00d4ff',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '1px',
    padding: '0.35rem 0.85rem',
    textTransform: 'uppercase',
    transition: 'all 0.2s ease',
  },
  friendsButton: {
    background: 'rgba(0, 212, 255, 0.06)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '4px',
    color: '#00d4ff',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '1px',
    padding: '0.35rem 0.85rem',
    textTransform: 'uppercase',
    transition: 'all 0.2s ease',
  },
  memberSince: {
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    marginTop: '0',
  },

  /* ── Match History ── */
  historySection: {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'rgba(18, 18, 26, 0.72)',
    padding: '1rem 1.25rem',
  },
  sectionTitle: {
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '2px',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
  },
  matchList: {
    display: 'grid',
    gap: '0.5rem',
  },
  matchCard: {
    border: '1px solid var(--border)',
    borderLeft: '3px solid',
    borderRadius: '6px',
    background: 'rgba(10, 10, 15, 0.72)',
    display: 'grid',
    gap: '0.4rem',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.3fr) auto',
    alignItems: 'center',
    padding: '0.6rem 0.75rem',
  },
  matchMeta: {
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.55rem',
    marginBottom: '0.1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  matchOpponent: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.85rem',
    fontWeight: 700,
  },
  matchProblem: {
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.8rem',
  },
  matchResult: {
    alignSelf: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  matchFooter: {
    borderTop: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    display: 'flex',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6rem',
    gap: '0.75rem',
    gridColumn: '1 / -1',
    justifyContent: 'space-between',
    paddingTop: '0.4rem',
  },
  statusBadge: {
    border: '1px solid rgba(0, 212, 255, 0.35)',
    borderRadius: '999px',
    color: 'var(--accent-cyan)',
    fontSize: '0.55rem',
    padding: '0.1rem 0.4rem',
  },
  emptyState: {
    border: '1px dashed rgba(0, 212, 255, 0.28)',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    padding: '1rem',
    textAlign: 'center',
  },
  errorCard: {
    border: '1px solid var(--accent-red)',
    borderRadius: '8px',
    background: 'rgba(255, 71, 87, 0.08)',
    color: 'var(--accent-red)',
    fontFamily: 'var(--font-mono)',
    padding: '1.25rem',
  },
  skeleton: {
    animation: 'profile-pulse 1.2s ease-in-out infinite',
    background: 'linear-gradient(90deg, rgba(18, 18, 26, 0.8), rgba(0, 212, 255, 0.16), rgba(18, 18, 26, 0.8))',
    backgroundSize: '200% 100%',
    borderRadius: '8px',
    marginBottom: '1rem',
  },

  /* ── Friends Panel ── */
  friendsPanel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '280px',
    height: '100vh',
    background: '#12121a',
    borderLeft: '2px solid #00d4ff',
    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.25rem 1rem',
    transition: 'transform 0.3s ease',
    zIndex: 1000,
    overflowY: 'auto',
  },
  friendsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  friendsTitle: {
    color: '#00d4ff',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    margin: 0,
  },
  closeButton: {
    background: 'transparent',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '4px',
    color: '#6b6b8a',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    padding: '0.2rem 0.5rem',
    transition: 'color 0.2s ease',
  },
  friendSearch: {
    display: 'flex',
    gap: '0.4rem',
    marginBottom: '0.5rem',
  },
  friendInput: {
    flex: 1,
    background: 'rgba(10, 10, 15, 0.9)',
    border: '1px solid rgba(0, 212, 255, 0.25)',
    borderRadius: '4px',
    color: '#e0e0e8',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    padding: '0.35rem 0.5rem',
    outline: 'none',
  },
  addButton: {
    background: 'rgba(0, 212, 255, 0.15)',
    border: '1px solid rgba(0, 212, 255, 0.5)',
    borderRadius: '4px',
    color: '#00d4ff',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '1px',
    padding: '0.35rem 0.6rem',
    textTransform: 'uppercase',
  },
  friendMessage: {
    color: '#6b6b8a',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    minHeight: '1rem',
    marginBottom: '0.5rem',
  },
  friendsList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  friendRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(10, 10, 15, 0.6)',
    border: '1px solid rgba(0, 212, 255, 0.12)',
    borderRadius: '4px',
    padding: '0.4rem 0.5rem',
  },
  friendInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    minWidth: 0,
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  friendName: {
    color: '#e0e0e8',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  inviteButton: {
    background: 'rgba(57, 255, 20, 0.1)',
    border: '1px solid rgba(57, 255, 20, 0.4)',
    borderRadius: '3px',
    color: '#39ff14',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.55rem',
    fontWeight: 700,
    letterSpacing: '0.5px',
    padding: '0.2rem 0.45rem',
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  noFriends: {
    color: '#6b6b8a',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    textAlign: 'center',
    padding: '1.5rem 0',
  },
}
