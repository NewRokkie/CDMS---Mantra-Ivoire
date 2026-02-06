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
- UN/EDIFACT D.96A standard
- CODECO message generation
- XML ↔ EDI conversion
- Gate In/Out EDI transmission
- SFTP file transfer (simulated in internal implementation)