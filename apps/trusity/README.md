# Trusity – AI Presentation Generator

Active module of **book-forge** (creative/content platform). Generates slide decks from a business idea with Gemini, lets you edit them with live collaboration, and exports real PowerPoint files.

- **Stack:** React 19, Vite, TypeScript, Tailwind, Express, WebSocket (live collaboration), `@google/genai`, `pptxgenjs`
- **Run:** `npm install`, set `GEMINI_API_KEY` (see `metadata.json` / `.env`), then `npm run dev` (port `3000`, override with `PORT`)
- **Check:** `npm run lint` (typecheck) and `npm run build`; CI runs both plus a server smoke test (`.github/workflows/trusity.yml`)
- **History:** merged with full git history from the former standalone repository `abla86/Trusity---AI-Presentation-Generator`
