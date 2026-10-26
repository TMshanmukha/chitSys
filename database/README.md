# Chit Fund Database Management

This folder contains database migrations, seed scripts, ER diagrams, and schema definitions for the Chit Fund Management System.

## Directory Structure

```
database/
├── migrations/         # Versioned SQL migration scripts
│   └── 001_create_auth_tables.sql
├── schema/             # Full schema reference & future architectural plans
│   └── future_schema.sql
├── seeds/              # Seed scripts for initial users & demo records
├── diagrams/           # Mermaid ER diagrams and structural maps
│   └── er_diagram.md
└── README.md
```

## Running Migrations and Seeds

Migrations and database bootstrapping are executed programmatically via the backend migration runner:

```bash
# From the backend directory:
npm run db:migrate
npm run db:seed
```

This guarantees:
1. Automatic creation of the target database (`chitfund_db`) if it doesn't already exist.
2. Safe tracking of applied migrations via `schema_migrations`.
3. Secure creation of the initial Super Admin account using strong password hashing (Argon2id/Bcrypt).
4. Automated creation of a demo Collection Agent for testing.
