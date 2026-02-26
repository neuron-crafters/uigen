# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps + generate Prisma client + run migrations)
npm run setup

# Development server (turbopack)
npm run dev

# Background dev server (logs to logs.txt)
npm run dev:daemon

# Run all tests
npm run test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Run tests matching a pattern
npx vitest run --reporter=verbose -t "MessageList"

# Reset the database
npm run db:reset
```

`NODE_OPTIONS='--require ./node-compat.cjs'` is prepended to all Next.js commands — this is baked into the npm scripts, so always use `npm run dev` rather than calling `next` directly.

## Code Style

Use comments sparingly. Only comment complex or non-obvious code.

## Architecture

### AI Provider & Fallback

`src/lib/provider.ts` exports `getLanguageModel()`. If `ANTHROPIC_API_KEY` is absent, it returns a `MockLanguageModel` that streams hardcoded static components. When an API key is present it uses `claude-haiku-4-5`. The mock limits `maxSteps` to 4; real API allows 40.

### Virtual File System

All generated components live in an **in-memory** `VirtualFileSystem` (`src/lib/file-system.ts`) — nothing is ever written to disk. The VFS:
- Uses `Map<string, FileNode>` keyed by absolute path (e.g., `/App.jsx`, `/components/Button.jsx`)
- Serializes to/from plain `Record<string, FileNode>` for transport and DB storage
- Is passed to the API on every chat request (`body.files`) and reconstructed server-side

### AI Tool Calls → File System Updates

The chat API (`src/app/api/chat/route.ts`) gives Claude two tools bound to the server-side VFS instance:
- **`str_replace_editor`** — create files, str_replace within files, insert at line
- **`file_manager`** — rename/delete files

On the client side, `ChatContext` (`src/lib/contexts/chat-context.tsx`) receives tool call events via `onToolCall` and forwards them to `FileSystemContext.handleToolCall()` (`src/lib/contexts/file-system-context.tsx`), which mirrors the same mutations on the client-side VFS instance and triggers a re-render via `refreshTrigger`.

### Live Preview Pipeline

`PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) renders an `<iframe>` whose content is rebuilt whenever `refreshTrigger` changes:
1. Get all files from VFS as `Map<string, string>`
2. Call `createImportMap()` (`src/lib/transform/jsx-transformer.ts`), which:
   - Transpiles each `.js/.jsx/.ts/.tsx` file via `@babel/standalone` (in-browser)
   - Creates blob URLs for each transpiled module
   - Builds a browser `<script type="importmap">` with all module→URL mappings
   - Third-party packages not in the VFS are resolved to `https://esm.sh/<pkg>`
   - Missing local imports get auto-generated placeholder modules
3. Generate preview HTML with `createPreviewHTML()`, which injects Tailwind CDN, the import map, collected CSS, and a module script that `import()`s `/App.jsx` and renders it into `#root`

### Generated Component Conventions

The AI system prompt (`src/lib/prompts/generation.tsx`) enforces:
- Every project **must** have a root `/App.jsx` as the entry point (default export)
- Use **Tailwind CSS** for all styling (Tailwind CDN is injected in preview)
- Local file imports must use the `@/` alias (e.g., `import Button from '@/components/Button'`)
- No HTML files — `App.jsx` is the only entry point

### Auth & Persistence

- JWT sessions via `jose` (`src/lib/auth.ts`); sessions verified in `src/middleware.ts`
- Passwords hashed with `bcrypt`
- Prisma + SQLite (`prisma/dev.db`), Prisma client generated to `src/generated/prisma/`
- Database schema is defined in `prisma/schema.prisma` — reference it to understand all models and relations
- Projects store `messages` (JSON string of full chat history) and `data` (JSON string of serialized VFS) in the DB
- Anonymous users are supported (`userId` is nullable on `Project`); anonymous work tracked in `src/lib/anon-work-tracker.ts` (localStorage)
- Only authenticated users can save projects; `/api/projects` and `/api/filesystem` are protected routes

### Server Actions

`src/actions/` contains Next.js server actions for project CRUD — `create-project`, `get-project`, `get-projects`. These require an active session and interact with Prisma directly.
