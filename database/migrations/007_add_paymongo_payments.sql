CREATE TABLE paymongo_attempts (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

    reservation_id BIGINT UNSIGNED NOT NULL,
    tenant_id BIGINT UNSIGNED NOT NULL,
    client_id BIGINT UNSIGNED NOT NULL,

    account_label VARCHAR(100) NOT NULL,
    mode ENUM('test', 'live') NOT NULL,

    payment_stage ENUM('deposit', 'full', 'balance') NOT NULL,

    expected_centavos BIGINT UNSIGNED NOT NULL,
    previous_paid_centavos BIGINT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'PHP',

    status ENUM(
        'creating',
        'pending',
        'paid',
        'failed',
        'expired',
        'needs_review'
    )NOT NULL DEFAULT 'creating',
    active_reservation_id BIGINT UNSIGNED NULL,

    checkout_id VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NULL,
    checkout_url TEXT NULL,

    provider_payment_id VARCHAR(100)
        CHARACTER SET ascii COLLATE ascii_bin NULL,

    received_centavos BIGINT UNSIGNED NULL,
    received_currency CHAR(3) NULL,

    expires_at DATETIME NOT NULL,
    provider_paid_at DATETIME NULL,
    settled_at DATETIME NULL,
    last_checked_at DATETIME NULL,

    review_reason VARCHAR(255) NULL,

    created_at DATETIME NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_paymongo_active_reservation (active_reservation_id),

    UNIQUE KEY uq_paymongo_checkout(
        account_label,
        mode,
        checkout_id
    ),

    UNIQUE KEY uq_paymongo_payment(
        account_label,
        mode,
        provider_payment_id
    ),

    KEY idx_paymongo_client(client_id, created_at),
    KEY idx_paymongo_reservation(tenant_id, created_at),
    KEY idx_paymongo_reservation_id(reservation_id),
    KEY idx_paymongo_reconcile(status, last_checked_at)
) ENGINE=InnoDB;

CREATE TABLE paymongo_webhook_events (
    event_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    checkout_id VARCHAR(100) NULL,
    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (event_key)
) ENGINE=InnoDB;
