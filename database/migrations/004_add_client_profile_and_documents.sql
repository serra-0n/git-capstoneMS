ALTER TABLE users
    ADD COLUMN contact_number VARCHAR(30) NULL AFTER email;

ALTER TABLE documents
    ADD COLUMN client_id INT UNSIGNED NULL AFTER tenant_id,
    ADD COLUMN reservation_id INT UNSIGNED NULL AFTER client_id,
    ADD KEY documents_client_index (client_id),
    ADD KEY documents_reservation_index (reservation_id),
    ADD CONSTRAINT documents_client_fk
        FOREIGN KEY (client_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT documents_reservation_fk
        FOREIGN KEY (reservation_id) REFERENCES reservations(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
