# Repository consolidation — 2026-09-15

## Canonical repository

`abla86/book-forge` is the canonical BookForge AI application.

## Repository decisions

| Repository | Decision | Basis |
|---|---|---|
| `abla86/book-forge` | **CANONICAL** | Most complete implementation: persistence, security/RBAC, testing, cost controls and operational safeguards. |
| `abla86/Bookplattform` | **LEGACY DUPLICATE** | README content is byte-identical to the canonical BookForge README and describes the same application. No unique functionality identified in the consolidation pass. |
| `abla86/BookForge-AI` | **LEGACY IMPLEMENTATION** | Same BookForge application identity and overlapping stack; canonical repository contains the more complete production/security surface. |

## Consolidation rule

New development belongs only in `book-forge`. Legacy repositories must not receive new features. Repository-level archival/deletion is performed separately when the GitHub administration capability is available.

## Safety

No application code was deleted from the canonical repository. The consolidation pass only redirects legacy repositories and records the canonical ownership decision.
