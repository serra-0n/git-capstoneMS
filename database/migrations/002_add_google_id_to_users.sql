ALTER TABLE users
    ADD COLUMN google_id VARCHAR(255)
        CHARACTER SET ascii COLLATE ascii_bin
        NULL,
    ADD UNIQUE KEY unique_users_google_id (google_id);