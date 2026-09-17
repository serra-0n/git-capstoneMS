ALTER TABLE reservations
    ADD COLUMN payment_plan ENUM('full', 'half', 'later')
        NOT NULL DEFAULT 'half'
        AFTER total_amount;

