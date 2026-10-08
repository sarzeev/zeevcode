import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { paymentApi } from '../services/api'
import { auth } from '../services/firebase'

const PREP_URL = 'https://product.ginclair.com/dashboard'
const PRODUCT_KEY = 'INTERVIEW_PREP'

const FEATURES = [
  { label: 'Mock interviews & checklists', icon: '01' },
  { label: 'AI learning dashboard', icon: '02' },
  { label: 'Progress tracking & certificates', icon: '03' },
  { label: 'Lifetime access — no subscription', icon: '04' },
]

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-[var(--accent-cyan)]"
      aria-hidden
    />
  )
}

export default function InterviewPrepPage() {
  const [state, setState] = useState('checking')
  const [priceLabel, setPriceLabel] = useState('₹5')
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    paymentApi
      .getStatus()
      .then((res) => {
        if (!isMounted) return
        const data = res.data || {}
        if (data.priceLabel) setPriceLabel(data.priceLabel)
        setState(data.entitled ? 'unlocked' : 'locked')
      })
      .catch((e) => {
        if (!isMounted) return
        setError(e.response?.data?.error || 'Could not load your access status. Check your connection and retry.')
        setState('error')
      })
    return () => {
      isMounted = false
    }
  }, [])

  function openPrep() {
    window.open(PREP_URL, '_blank', 'noopener,noreferrer')
  }

  async function startCheckout() {
    if (!window.Razorpay) {
      setError('Payment checkout could not be loaded. Check your connection and retry.')
      setState('error')
      return
    }

    setState('creating')
    let order
    try {
      const res = await paymentApi.createOrder()
      order = res.data
    } catch (e) {
      setError(e.response?.data?.error || 'Could not start the payment. Please try again.')
      setState('error')
      return
    }

    const firebaseUser = auth.currentUser
    const options = {
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'zeevCode',
      description: 'Interview Prep — one-time, lifetime access',
      prefill: {
        name: firebaseUser?.displayName || '',
        email: firebaseUser?.email || '',
      },
      theme: { color: '#00d4ff' },
      handler: async (response) => {
        setState('verifying')
        try {
          const res = await paymentApi.verify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
          if (res.data?.verified) {
            setError('')
            setState('success')
          } else {
            setError('Payment was not confirmed. If money was deducted, access will be unlocked automatically — or contact support.')
            setState('error')
          }
        } catch {
          setError('Payment confirmation failed. If money was deducted, access will be unlocked automatically — or try again.')
          setState('error')
        }
      },
      modal: {
        ondismiss: () => {
          setState('locked')
          setError('Payment cancelled — you can try again anytime.')
        },
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', (response) => {
      setError(response?.error?.description || 'Payment failed. Please try again.')
      setState('error')
    })
    rzp.open()
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)]">
      <header className="border-b border-[var(--border)] px-6 py-4 sm:px-10">
        <Link
          to="/"
          className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-cyan)]"
        >
          ← Back to zeevCode
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="zc-animate-in w-full max-w-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-6 sm:p-10">
          <div className="mb-6 flex items-center justify-between">
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--accent-amber)]">
              Premium · One-time
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              {PRODUCT_KEY}
            </span>
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl">
            Interview <span className="text-[var(--accent-cyan)]">Prep</span>
          </h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            Mocks &amp; checklists for SDE interviews — with lifetime access on one payment.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li
                key={f.icon}
                className="flex items-center gap-3 border border-[var(--border-soft)] bg-[var(--bg-surface)]/60 px-4 py-3"
              >
                <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--accent-cyan)]">
                  {f.icon}
                </span>
                <span className="text-sm text-[var(--text-primary)]">{f.label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-end justify-between border-t border-[var(--border)] pt-6">
            <div>
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                Total · one-time
              </p>
              <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)]">
                {priceLabel}
              </p>
            </div>
            <p className="text-right font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              No subscription
              <br />
              Lifetime access
            </p>
          </div>

          {state === 'checking' && (
            <div className="mt-6 flex items-center justify-center gap-2 py-4 text-[var(--text-secondary)]">
              <Spinner />
              <span className="text-sm">Checking your access…</span>
            </div>
          )}

          {(state === 'locked' || state === 'error') && (
            <div className="mt-6">
              {(state === 'error' || error) && (
                <p
                  role="alert"
                  className="mb-4 border border-[var(--accent-red)]/40 bg-[var(--accent-red)]/10 px-4 py-3 text-sm text-[var(--accent-red)]"
                >
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={startCheckout}
                disabled={state === 'creating' || state === 'verifying'}
                className="w-full bg-[var(--accent-cyan)] px-6 py-3 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-[var(--bg-primary)] transition-all hover:shadow-[0_0_24px_rgba(0,212,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === 'creating' ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner /> Starting payment…
                  </span>
                ) : (
                  `Unlock Interview Prep — ${priceLabel}`
                )}
              </button>
              <p className="mt-3 text-center font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                Payments secured by Razorpay
              </p>
            </div>
          )}

          {state === 'verifying' && (
            <div className="mt-6 flex items-center justify-center gap-2 py-4 text-[var(--text-secondary)]">
              <Spinner />
              <span className="text-sm">Verifying payment with the server…</span>
            </div>
          )}

          {(state === 'success' || state === 'unlocked') && (
            <div className="mt-6">
              <p className="mb-4 border border-[var(--accent-green)]/40 bg-[var(--accent-green-dim)] px-4 py-3 text-sm text-[var(--accent-green)]">
                {state === 'success'
                  ? 'Payment confirmed — Interview Prep is unlocked.'
                  : 'You already have lifetime access to Interview Prep.'}
              </p>
              <button
                type="button"
                onClick={openPrep}
                className="w-full bg-[var(--accent-green)] px-6 py-3 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-[var(--bg-primary)] transition-all hover:shadow-[0_0_24px_rgba(57,255,20,0.35)]"
              >
                Enter Interview Prep
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[var(--border)] px-6 py-4 text-center font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
        One payment · Lifetime access · zeevCode
      </footer>
    </div>
  )
}
