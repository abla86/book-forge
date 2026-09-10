# BookForge AI

> A production-minded AI-assisted book development platform for planning, writing, reviewing, versioning and exporting complete books.

## Overview

BookForge AI treats a book as a persistent project rather than a collection of disconnected AI prompts. The platform combines structured story planning, a Story Bible, chapter generation, continuity auditing, version history, creative assets and controlled AI access behind a server-side API boundary.

## Core capabilities

- **Book planning** — structured project setup, genre, tone, audience, POV and chapter planning.
- **Full-book generation** — chapter-oriented generation with persistent jobs and resumable workflows.
- **Story Bible** — characters, locations, timeline and continuity rules kept as project context.
- **Continuity auditing** — deterministic rule-based analysis with optional AI-assisted review.
- **Character development** — AI-assisted character journey and arc analysis.
- **Version history** — snapshots, rollback, chapter-level reversion and version diffs.
- **Creative assets** — covers, illustrations and character assets through a dedicated engine.
- **AI integration** — Google Gemini through a server-side API boundary; API keys are never sent to the browser.
- **Authentication and RBAC** — server-side sessions with FOUNDER, ADMIN, AUTHOR and READER roles.
- **Security controls** — secure cookies, password hashing, project isolation, rate limiting, cost guarding, audit logging and an emergency kill switch.
- **Persistence** — PostgreSQL support for production with a disk-backed development adapter.

## Architecture

```text
React + TypeScript
        |
        v
  Express API boundary
        |
   +----+----------------------+
   |                           |
   v                           v
Domain engines             Security layer
   |                           |
   +-----------+---------------+
               |
               v
        Persistence adapter
          /           \
         v             v
   PostgreSQL      Local disk
               |
               v
          Gemini API
```

Key engines include:

- Story Bible / context management
- Full-book generation and recovery
- Continuity analysis
- Versioning and rollback
- Creative asset generation
- Cost and operational controls

See [`assets/architecture.svg`](assets/architecture.svg) for the visual architecture overview.

## Security-first design

Security is implemented as an application concern, not only as documentation.

- Protected API routes use a **deny-by-default** authentication gate.
- Identity is derived from a **validated server-side session**, not client-supplied identity headers.
- Session cookies are `HttpOnly`, `SameSite=Strict` and use the `__Host-` prefix in production.
- Passwords use **scrypt** with per-password random salts and constant-time verification.
- Project operations enforce owner/role isolation on the server.
- AI generation is guarded by rate limits, cost budgets and an emergency kill switch.
- Security-relevant actions are written to an audit log.
- Security headers include CSP-adjacent browser hardening headers, frame protection, MIME sniffing protection and production HSTS.
- Secrets are supplied through environment variables; real credentials must never be committed.
- Regression tests cover password handling, RBAC and authentication trust boundaries.

## Technology

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| AI | Google Gemini API (`gemini-3.8-flash`) |
| Data | PostgreSQL + development persistence adapter |
| UI | Tailwind CSS, Framer Motion, Lucide |
| Documents | PDF-lib, JSZip |
| Testing | Node test runner + TypeScript/tsx |
| Tooling | Bun lockfile, npm-compatible scripts |
| CI | GitHub Actions |

## Local development

### Requirements

- Node.js 20+
- Bun (recommended because the repository contains `bun.lock`)
- PostgreSQL for production-style persistence
- Gemini API credentials for AI generation features

### Setup

```bash
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

For local development, the persistence adapter can operate without PostgreSQL and stores development state under `data/`. That directory is ignored by Git.

### Quality checks

```bash
bun run lint
bun run test
bun run security:test
bun run build
```

## Configuration

See `.env.example` for the required configuration shape:

- `GEMINI_API_KEY` — Gemini API credential.
- `GEMINI_MODEL` — optional model override; defaults to `gemini-3.8-flash`.
- `FOUNDER_PASSWORD` — initial founder password, supplied only through a secret manager.
- `DATABASE_URL` — production PostgreSQL connection string.
- `APP_URL` — deployment URL where required by the hosting environment.

Never commit a real `.env` file or production credentials.

## Project structure

```text
book-forge/
├── src/
│   ├── components/       # UI components and application views
│   ├── lib/
│   │   ├── engine/       # domain engines
│   │   ├── security.ts   # authentication, RBAC and security services
│   │   └── db.ts         # persistence adapter
│   └── types/            # shared TypeScript models
├── tests/                # automated regression/security tests
├── public/               # static assets
├── assets/               # architecture and portfolio visuals
├── schema.sql            # PostgreSQL schema
├── server.ts             # Express/Vite server and API boundary
├── package.json          # scripts and dependencies
├── bun.lock              # reproducible Bun dependency lockfile
└── vite.config.ts        # Vite configuration
```

## Portfolio focus

This project demonstrates practical work across:

- AI application architecture
- Full-stack TypeScript
- REST API design
- Authentication and authorization
- Security engineering
- PostgreSQL persistence
- Long-running AI workflows and recovery
- Automated testing
- Cost controls and auditability
- Document and asset generation
- UX for complex creative workflows

## Status

**Portfolio project — active development.**

The repository is structured as a serious engineering project, with security, persistence, testing and maintainability treated as first-class concerns alongside the user experience.
