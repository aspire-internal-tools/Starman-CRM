# Azure Environment Parameters

Non-secret Bicep parameter sets for development, test, and production planning.

- `dev.bicepparam`: scale-to-zero technical pilot settings.
- `test.bicepparam`: synthetic-data acceptance and recovery testing.
- `prod.bicepparam`: proposed production capacity; not deployment authorization.

PostgreSQL and JWT secrets are read from `STARMAN_POSTGRES_ADMIN_PASSWORD` and `STARMAN_JWT_SECRET` at validation/deployment time. Do not replace those environment lookups with literal values.

All environments default to Canada Central, application deployment off, and Canadian geo-backup off. Any change to region, recovery replication, production capacity, or alert destination requires review.

