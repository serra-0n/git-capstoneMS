ALTER TABLE tenants
    ADD COLUMN cover_image_path VARCHAR(500) NULL AFTER logo_path,
    ADD COLUMN features TEXT NULL AFTER description;

ALTER TABLE accommodations
    ADD COLUMN image_path VARCHAR(500) NULL AFTER amenities,
    ADD COLUMN description TEXT NULL AFTER image_path;
