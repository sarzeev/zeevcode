import SiteNav from '../components/SiteNav'

const RESOURCES = [
  {
    title: 'System Design Primer',
    type: 'GitHub',
    href: 'https://github.com/donnemartin/system-design-primer',
    blurb: 'The classic open-source map of scaling patterns.',
  },
  {
    title: 'CS 61B / Algorithms notes',
    type: 'Course',
    href: 'https://sp25.datastructur.es/',
    blurb: 'Data structures with the depth interviews reward.',
  },
  {
    title: 'High Scalability',
    type: 'Blog',
    href: 'https://highscalability.com/',
    blurb: 'Real architectures from companies that ship at scale.',
  },
  {
    title: 'ByteByteGo newsletter',
    type: 'Substack',
    href: 'https://blog.bytebytego.com/',
    blurb: 'Visual system design explainers, week after week.',
  },
]

export default function ResourcesPage() {
  return (
    <div className="zc-grid-bg min-h-screen">
      <SiteNav solid />

      <main className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <p className="zc-animate-in font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.24em] text-[#7dd3fc]">
          Library
        </p>
        <h1 className="zc-animate-in zc-animate-in-delay-1 mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight md:text-5xl">
          Resources
        </h1>
        <p className="zc-animate-in zc-animate-in-delay-1 mt-3 max-w-lg text-[var(--text-secondary)]">
          A short list of high-signal books, repos, and blogs — no filler links.
        </p>

        <ul className="zc-animate-in zc-animate-in-delay-2 mt-12 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {RESOURCES.map((item) => (
            <li key={item.title}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-2 py-6 transition-colors hover:bg-[var(--bg-elevated)]/40 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-2"
              >
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                      {item.type}
                    </span>
                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)]">
                      {item.title}
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)] sm:pl-[4.5rem]">
                    {item.blurb}
                  </p>
                </div>
                <span className="shrink-0 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
                  Open →
                </span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
