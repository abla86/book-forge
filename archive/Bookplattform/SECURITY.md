# Security Model

## Authentication

- Protected `/api` routes use a deny-by-default session gate.
- Session identity is resolved from the server-side session store.
- Client-supplied `x-user-*` headers are not trusted for authorization.
- Production sessions use an `HttpOnly`, `SameSite=Strict`, `Secure` `__Host-` cookie.
- Logout invalidates the server-side session and clears the browser cookie.

## Authorization

Authorization is enforced server-side with role and project-owner checks. Ordinary authors cannot read or write projects owned by another user, while administrative operations require the appropriate privileged role.

## Passwords

Passwords are hashed with Node.js `scrypt` using a random per-password salt. Hash parameters and lengths are validated before verification, and comparisons use `timingSafeEqual`.

## AI safety controls

AI generation is protected by:

- emergency kill switch
- per-user concurrent-job limits
- hourly request limits
- per-project cost budgets
- server-side API key handling
- audit logging

The application does not silently fall back to fake AI output when the Gemini API is unavailable.

## Data protection

- Real environment files and local persistence data are ignored by Git.
- API responses avoid returning password hashes.
- Health checks do not expose API-key presence or other secret configuration details.
- Production requires a PostgreSQL connection rather than the development disk fallback.

## Regression coverage

Security tests cover password hashing and malformed hashes, RBAC isolation, founder-only operations, and the authentication trust boundary in `server.ts`.

## Reporting

Do not commit credentials, API keys, database passwords, session tokens or personal data. For a security issue, create a private security report through the repository's available GitHub security reporting mechanism rather than publishing exploit details in an issue.
