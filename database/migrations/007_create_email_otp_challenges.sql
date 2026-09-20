CREATE TABLE email_otp_challenges (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    challenge_token CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    user_id INT UNSIGNED NULL,
    email VARCHAR(254) NOT NULL,
    purpose ENUM('signup', 'password_login', 'google_login') NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME NULL,
    consumed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY unique_otp_challenge_token (challenge_token),
    KEY otp_email_purpose_index (email, purpose),
    KEY otp_user_index (user_id),
    KEY otp_expiration_index (expires_at),

    CONSTRAINT otp_challenge_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
