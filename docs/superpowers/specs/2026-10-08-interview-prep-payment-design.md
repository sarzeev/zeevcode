# Interview Prep Paywall (Razorpay) — Design

Date: 2026-10-08
Status: Approved by user (gate at ZeevCode entry, ₹5, test mode first)
Supersedes: pricing in `interview-plan.txt` (₹99 → ₹5); flow otherwise follows it.

## Goal

The ZeevCode home "Interview Prep" card currently opens `https://product.ginclair.com/dashboard`
directly for any logged-in user. After this change, only users who have paid (one-time,
lifetime) for the `INTERVIEW_PREP` product can enter. Payment goes through Razorpay.

Decisions (user-confirmed):
- Enforcement boundary: **gate at ZeevCode entry** (login + entitlement check before redirect).
  product.ginclair.com's own auth remains that app's boundary (direct-URL access is out of
  scope for v1).
- Price: **₹5 = 500 paise**, one-time, lifetime. Amount is defined only in the backend.
- Gateway: **Razorpay** (Orders API + Checkout.js + webhook). Test mode first; live keys are
  an env swap.

## Flow

```
Home card "Interview Prep" → /interview-prep (ProtectedRoute: unauth → existing login)
  GET /api/payments/interview-prep/status
    entitled  → "Enter Interview Prep" → https://product.ginclair.com/dashboard
    not       → premium page: what's included, ₹5 one-time · lifetime, CTA
  CTA → POST /api/payments/interview-prep/order → {orderId, keyId, amount, currency}
       → open Razorpay Checkout (public key only) → user pays
  success → POST /api/payments/interview-prep/verify {order_id, payment_id, signature}
       → backend HMAC-verifies, checks ownership/amount/currency, marks payment VERIFIED,
         inserts entitlement (idempotent) → response ok → unlock → Enter → redirect
  cancel/fail → explicit state; can retry; tab-close is covered by webhook

Razorpay webhook (payment.captured / order.paid) → POST /api/payments/webhook
  (permitAll, X-Razorpay-Signature = HMAC-SHA256(raw body, webhook secret))
  → same idempotent verify-and-grant path (rescues users who closed the tab)
```

Invariants:
- "Payment successful" is never shown before the backend verify returns ok.
- Frontend never sends the amount; backend uses the product-configured constant.
- Entitlement = source of truth for access; never derived from payment state in the UI.
- Re-running verify/webhook for the same order is a no-op (unique constraints + checks).

## Database — Flyway `V13__add_payments_entitlements.sql`

```sql
create table payments (
    id                     uuid primary key default gen_random_uuid(),
    user_id                uuid not null references users(id),
    product_key            varchar(64) not null,
    razorpay_order_id      varchar(64) not null unique,
    razorpay_payment_id    varchar(64) null,
    amount                 bigint not null,            -- paise
    currency               varchar(8) not null,
    status                 varchar(20) not null,        -- CREATED / VERIFIED / FAILED
    failure_reason         text null,
    created_at             timestamptz not null default now(),
    verified_at            timestamptz null
);
create index idx_payments_user on payments(user_id);

create table entitlements (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references users(id),
    product_key varchar(64) not null,
    status      varchar(20) not null default 'ACTIVE',
    granted_at  timestamptz not null default now(),
    unique (user_id, product_key)
);
```

## Backend (Spring Boot, `zeevCode/`)

Config (`application.properties`, env overridable):
```
razorpay.key-id=${RAZORPAY_KEY_ID:}
razorpay.key-secret=${RAZORPAY_KEY_SECRET:}
razorpay.webhook-secret=${RAZORPAY_WEBHOOK_SECRET:}
```

- `entity/Payment.java`, `entity/Entitlement.java`, enums `PaymentStatus`
- `repository/PaymentRepository.java` (findByRazorpayOrderId, existsByRazorpayPaymentId...),
  `repository/EntitlementRepository.java` (existsByUserIdAndProductKey, count...)
- `service/PaymentService.java`
  - `createOrder(UUID userId, String productKey)` → RestTemplate POST
    `https://api.razorpay.com/v1/orders` (Basic auth keyId:keySecret, JSON body
    `{amount: 500, currency: "INR", receipt, notes:{user_id, product}}`); returns
    `{orderId, keyId, amount, currency}`. Errors → 502-style response without leaking keys.
  - `verifyPayment(UUID userId, String orderId, String paymentId, String signature)` →
    expected = HMAC-SHA256(keySecret, orderId|paymentId) hex; constant-time compare;
    order exists in `payments` and belongs to `userId`; amount/currency match product config;
    payment not already verified (idempotent re-verify returns success); marks VERIFIED;
    inserts entitlement (unique constraint → idempotent). Returns `{entitled: true}`.
  - `isEntitled(UUID userId, String productKey)`
  - `handleWebhookEvent(payload)` → parse `event` (`payment.captured`, `order.paid`),
    find order by `order_id`, resolve user via `notes.user_id` / order lookup, run the same
    verify-and-grant (webhook has no HMAC payment signature → trust comes from the
    verified webhook signature + order/amount checks). Idempotent.
  - Product catalog: `Map<String, ProductConfig>` with `INTERVIEW_PREP` → 500 paise, INR
    (single source of truth for amount).
- `controller/PaymentController.java`
  - `POST /api/payments/interview-prep/order` (auth)
  - `POST /api/payments/interview-prep/verify` (auth)
  - `GET  /api/payments/interview-prep/status` (auth) → `{entitled, product: "INTERVIEW_PREP",
    amount, currency, priceLabel: "₹5"}`
  - `POST /api/payments/webhook` (permitAll; `@RequestBody byte[]`; header
    `X-Razorpay-Signature`; HMAC-SHA256 of raw body vs webhook secret, constant-time;
    401 on mismatch — same pattern as `FundamentalsController` webhook)
- `SecurityConfig`: add `.requestMatchers("/api/payments/webhook").permitAll()`
- User resolution: `Authentication → Jwt.getSubject()` (Firebase UID) →
  `userService.getUserByFirebaseUid` (same as `UserController#/me`).

## Frontend (judge-frontend, Vercel)

- `index.html`: add `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>`
- `src/App.jsx`: route `/interview-prep` → `InterviewPrepPage` (inside ProtectedRoute)
- `src/pages/HomeLandingPage.jsx`: `prep` card `external` → `path: '/interview-prep'`
  (existing render already handles `path` via navigate)
- `src/services/api.js`: `paymentApi = { getStatus, createOrder, verify }`
- `src/pages/InterviewPrepPage.jsx` — states: `checking` →
  `locked` (premium pitch + ₹5 CTA) → `creating` → `paying` (checkout open) →
  `verifying` → `success` → `unlocked` (Enter); plus `failed(reason)`, `cancelled`,
  `network-error` with retry. Dark/hacker aesthetic matching other pages
  (CSS vars, mono/display fonts). Razorpay Checkout options: key, order_id, amount,
  currency, name "zeevCode — Interview Prep", prefill contact/email, theme color.
  On `handler` response → verify → success; on `dismiss` → cancelled.
  After unlock: "Enter Interview Prep" → `window.open('https://product.ginclair.com/dashboard', '_blank', 'noopener,noreferrer')`.

## Tests (backend, follow `FundamentalsControllerWebhookTest` style)

- Unauthenticated order/verify/status → 401/403
- Order amount is always the configured 500 paise (never from request)
- Verify: valid signature grants entitlement; invalid signature rejected
- Verify: order belonging to another user rejected; wrong amount/currency rejected
- Duplicate verify and duplicate webhook → entitlement count stays 1
- Unpaid user: status.entitled=false; paid user: true
- Webhook: missing/invalid `X-Razorpay-Signature` → 401, no state change; valid → grant

## Deploy

1. Backend: build, deploy to existing AWS setup; set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
   `RAZORPAY_WEBHOOK_SECRET` env vars (test-mode keys first).
2. Razorpay dashboard → Webhooks: POST `https://<backend-host>/api/payments/webhook`,
   events `payment.captured`, `order.paid`, secret = `RAZORPAY_WEBHOOK_SECRET`.
3. Frontend: `npm run build`, deploy to Vercel.
4. E2E in test mode: pay with test card/UPI → verify → unlock persists across refresh/login;
   second unpaid account stays locked.
5. Go live: swap env vars to `rzp_live_...` keys, redeploy; no code change.

## Out of scope

- Enforcing access inside product.ginclair.com (separate app/auth).
- Refunds, subscriptions, admin payment dashboard, UPI autopay, multiple products UI.
- Frontend unit tests (backend tests + manual E2E per spec).
