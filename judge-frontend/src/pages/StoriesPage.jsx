import SiteNav from '../components/SiteNav'

const STORIES = [
  {
    name: 'Aisha · SWE L4',
    company: 'Meta',
    blurb: 'Two months of daily duels on ZeevCode, then a clean medium + hard pair. Focus on explaining trade-offs out loud.',
    takeaway: 'Talk while you code.',
  },
  {
    name: 'Rohan · Backend',
    company: 'Stripe',
    blurb: 'System design clicked after rewriting caching notes three times. Fundamentals checklist kept the revision honest.',
    takeaway: 'Revise until boring.',
  },
  {
    name: 'Mei · Full-stack',
    company: 'Shopify',
    blurb: 'Lost the first three ranked matches. Rating climbed after treating practice like warm-up, not the main event.',
    takeaway: 'Warm up, then duel.',
  },
]

export default function StoriesPage() {
  return (
    <div className="zc-grid-bg min-h-screen">
      <SiteNav solid />

      <main className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <p className="zc-animate-in font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.24em] text-[#fb7185]">
          Field notes
        </p>
        <h1 className="zc-animate-in zc-animate-in-delay-1 mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight md:text-5xl">
          Stories
        </h1>
        <p className="zc-animate-in zc-animate-in-delay-1 mt-3 max-w-lg text-[var(--text-secondary)]">
          Short interview war stories — what worked when the clock was real.
        </p>

        <ul className="zc-animate-in zc-animate-in-delay-2 mt-12 space-y-0 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {STORIES.map((story) => (
            <li key={story.name} className="py-8">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide text-[var(--text-primary)]">
                  {story.name}
                </h2>
                <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--accent-cyan)]">
                  {story.company}
                </span>
              </div>
              <p className="mt-4 max-w-2xl leading-relaxed text-[var(--text-secondary)]">
                {story.blurb}
              </p>
              <p className="mt-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.18em] text-[#fb7185]">
                {story.takeaway}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
