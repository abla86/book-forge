# BookForge AI

> A production-minded AI-assisted book development platform for planning, writing, reviewing, versioning and exporting complete books.

## Why this project

BookForge AI explores how generative AI can support a structured writing workflow without treating a book as a collection of disconnected text fragments. The application models a book as a persistent project with chapters, characters, continuity rules, versions and exportable assets.

## Core capabilities

- **Book planning** — structured project setup, genre and tone selection, chapter planning and story context.
- **Full-book generation** — chapter-oriented generation rather than isolated prompts.
- **Story Bible** — persistent characters, world details and project context.
- **Continuity auditing** — detects potential inconsistencies across the project.
- **Version history** — keeps project changes traceable.
- **Library and export** — manages generated material and prepares book assets for export.
- **AI integration** — Google Gemini integration through a server-side API boundary.
- **Authentication and roles** — session-based access control and role-aware features.
- **Audit and cost controls** — audit logging, rate limiting, cost guarding and an emergency kill switch.

## Architecture

```text
React + TypeScript
        |
        v
  Express API layer
        |
   +----+-------------------+
   |                        |
   v                        v
BookForge engines        Security layer
   |                        |
   +----+-------------+----+
        |             |
        v             v
 Persistence       Gemini API
```

The application separates the UI, API boundary, domain engines, persistence and security concerns. Key engines include the Story Bible, full-book generation, continuity analysis, versioning and asset handling.

See [`assets/architecture.svg`](assets/architecture.svg) for the visual architecture overview.

## Security-first design

Security is treated as part of the application architecture rather than an afterthought.

- API routes default to protected access, with an explicit public allow-list.
- Server-side sessions are used for authenticated access.
- Passwords are handled through a dedicated password service.
- Security headers are applied at the HTTP layer.
- Rate limiting and cost controls help protect expensive AI operations.
- Audit logging supports traceability.
- An emergency kill switch can disable sensitive operations.
- Secrets are supplied through environment variables; `.env` files are excluded from source control.
- Dedicated security tests are included in the project test suite.

## Technology

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| AI | Google Gemini API |
| Data | PostgreSQL |
| UI | Tailwind CSS, Framer Motion, Lucide |
| Documents | PDF-lib, JSZip |
| Testing | Node test runner + TypeScript/tsx |
| Tooling | Bun lockfile, npm-compatible scripts |

## Local development

### Requirements

- Node.js 20+
- PostgreSQL
- Gemini API credentials for AI features

### Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The application runs through the Express/Vite development server.

### Quality checks

```bash
npm run lint
npm test
npm run security:test
npm run build
```

## Project structure

```text
book-forge/
├── src/
│   ├── components/       # UI components and application views
│   ├── lib/
│   │   ├── engine/       # domain engines
│   │   ├── security/     # authentication and security services
│   │   └── db/            # persistence
│   ├── data/             # initial project data
│   └── types/            # shared TypeScript models
├── tests/                # automated tests
├── public/               # static assets
├── schema.sql            # database schema
├── server.ts             # Express/Vite server and API boundary
└── vite.config.ts        # Vite configuration
```

## Portfolio focus

This project demonstrates practical work across:

- AI application architecture
- Full-stack TypeScript
- REST API design
- PostgreSQL persistence
- Authentication and authorization
- Security engineering
- Automated testing
- Document generation
- Versioning and auditability
- UX for complex workflows

## Status

**Portfolio project — active development.**

The repository is intentionally structured as a serious engineering project, with security, persistence, testing and maintainability considered alongside the user interface.
