create table payments (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references users(id),
    product_key         varchar(64) not null,
    razorpay_order_id   varchar(64) not null unique,
    razorpay_payment_id varchar(64) null,
    amount              bigint not null,
    currency            varchar(8) not null,
    status              varchar(20) not null,
    failure_reason      text null,
    created_at          timestamptz not null default now(),
    verified_at         timestamptz null
);

create index idx_payments_user on payments(user_id);
create index idx_payments_status on payments(status);

create table entitlements (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references users(id),
    product_key varchar(64) not null,
    status      varchar(20) not null default 'ACTIVE',
    granted_at  timestamptz not null default now(),
    unique (user_id, product_key)
);
