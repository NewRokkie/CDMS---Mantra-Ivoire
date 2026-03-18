# CDMS - Container Depot Management System

Container Depot Management System with integrated EDI (Electronic Data Interchange) capabilities for CODECO (Container Discharge/Loading Order) messages.

## Features

- Container depot management
- Gate In/Out operations
- EDI integration with CODECO message generation
- Yard management and visualization
- Client and user management
- Real-time dashboard analytics
- EDI file processing (XML ↔ EDI conversion)

## Database & Migrations

This project uses **Supabase** as the database backend. Migrations follow the Supabase naming convention: `YYYYMMDDHHMMSS_description.sql`.

### Migration Structure

```
supabase/
└── migrations/
    ├── README.md                              # Documentation complète
    ├── 20260304000000_consolidated_schema.sql # Schéma complet
    ├── 20260304000001_functions_and_triggers.sql # Fonctions & Triggers
    └── generated/
        ├── README.md                          # Documentation migrations générées
        ├── 20260304000000_consolidated_schema.sql
        ├── 20260304000001_custom_functions.sql
        └── 20260304000002_*.sql à 20260304000027_*.sql (tables individuelles)
```

### Applying Migrations

```bash
# Via Supabase CLI
npx supabase db push --file supabase/migrations/20260304000000_consolidated_schema.sql
npx supabase db push --file supabase/migrations/20260304000001_functions_and_triggers.sql

# Or via Dashboard Supabase (SQL Editor)
# Copy/paste the content of the migration files
```

### Regenerating Migrations

If the database schema changes, you can regenerate the migrations:

```bash
# Generate migrations from current database (Supabase format automatique)
npx tsx scripts/generate-migrations.ts
```

The generator automatically produces files in Supabase format:
- `YYYYMMDDHHMMSS_description.sql` naming convention
- Tables in dependency order (no FK dependencies first)
- Sanitized filenames (lowercase, underscores)

## Deployment

This application is configured for deployment on Heroku:

- Uses internal EDI processing (no external API dependencies)
- Automatically detects Heroku environment
- Optimized for cloud deployment

## Development Setup

```bash
npm install
npm run dev
```

## Heroku Deployment

The application is configured for Heroku deployment with:

- Procfile for web process
- heroku-postbuild script
- Environment-aware configuration

## Architecture

The system consists of:
- Frontend: React/Vite application with TypeScript
- EDI Processing: Internal TypeScript implementation (no external dependencies)
- Data Management: Supabase backend
- Visualization: Three.js for 3D yard visualization

## EDI Integration

The EDI system supports:
- UN/EDIFACT D.95B standard
- CODECO message generation
- XML ↔ EDI conversion
- Gate In/Out EDI transmission
- SFTP file transfer (simulated in internal implementation)