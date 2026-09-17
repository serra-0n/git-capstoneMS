CREATE TABLE tenant_memberships (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    tenant_id INT UNSIGNED NOT NULL,
    membership_role ENUM('owner','admin', 'staff') NOT NULL DEFAULT 'owner',
    membership_status ENUM('pending', 'active', 'suspended') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY unique_user_tenant (user_id, tenant_id),
    KEY tenant_membership_user_index (user_id),
    KEY tenant_membership_tenant_index (tenant_id),

    CONSTRAINT tenant_membership_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT tenant_membership_tenant_fk
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

INSERT INTO tenant_memberships (
    user_id,
    tenant_id,
    membership_role,
    membership_status
)

SELECT
    users.id,
    users.tenant_id,
    'owner',
    CASE
        WHEN users.account_status = 'active'
        AND tenants.tenant_status = 'active'
        THEN 'active'
        ELSE 'pending'
    END

FROM users
INNER JOIN tenants
    ON tenants.id = users.tenant_id
WHERE users.role = 'resort_admin'
    AND users.tenant_id IS NOT NULL
ON DUPLICATE KEY UPDATE
    membership_role = VALUES(membership_role),
    membership_status = VALUES(membership_status);