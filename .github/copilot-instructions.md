# Flauschipauschi - Workspace Instructions

AI agent instructions for developing the Flauschipauschi game project.

## Project Overview

**Flauschipauschi** is a game built with:
- **Next.js 15** (App Router)
- **React 19** + TypeScript (strict mode, ES2020)
- **HTML5 Canvas** for game rendering
- **Tailwind CSS** for styling
- **iron-session** for authentication (HTTP-only cookies)
- **Vitest** for testing (jsdom environment)

## Essential Commands

### Development
```bash
npm run dev        # Start dev server (localhost:3000, HMR enabled)
npm run build      # Compile and optimize for production
npm start          # Run production build
```

### Testing & Quality
```bash
npm test           # Run Vitest suite
npm run test:ui    # Interactive test UI
npm run lint       # ESLint check (catches unused vars/types)
```

## Project Architecture

### Core Directories

| Directory | Purpose |
|-----------|---------|
| `public/` | Static SVG assets served at root URL (`/background.svg`, `/unicorn.svg`, `/unicorn2.svg`) |
| `src/app/` | Next.js App Router pages & API routes |
| `src/app/api/` | Server-side API endpoints |
| `src/components/` | React components (client/server) |
| `src/game/` | Game engine & logic |
| `src/renderers/` | Canvas rendering utilities & effects |
| `src/shared/` | Shared types, constants, utilities |
| `src/styles/` | Global CSS (Tailwind) |
| `src/__tests__/` | Unit & integration tests |

### Static Assets (`public/`)

| File | Description |
|------|-------------|
| `public/background.svg` | Sky/landscape background, `viewBox="0 0 800 600"` |
| `public/unicorn.svg` | Unicorn sprite variant 1 |
| `public/unicorn2.svg` | Unicorn sprite variant 2 (`viewBox="0 0 200 200"`), shown on home page |

### Home Page (`src/app/page.tsx`)

Server component (no `"use client"`) that renders a fullscreen scene:
- `background.svg` fills the entire viewport (`absolute inset-0 w-full h-full object-cover`).
- `unicorn2.svg` is centered on top of the background at `256×256 px` (`absolute inset-0 m-auto w-64 h-64`).
- No canvas or JavaScript is used for this view.

### Key Files

- **next.config.ts** - Next.js configuration (App Router, TypeScript)
- **tsconfig.json** - TypeScript strict mode + path aliases
- **tailwind.config.mjs** - Tailwind CSS customization
- **postcss.config.mjs** - PostCSS for Tailwind processing
- **vitest.config.ts** - Test runner configuration

## Development Conventions

### TypeScript

- **Strict mode enabled** - All strict type checking flags are ON
- **Path aliases** - Use `@/` prefix:
  - `@/components/*` → React components
  - `@/app/*` → App Router pages
  - `@/api/*` → API routes
  - `@/game/*` → Game engine
  - `@/shared/*` → Types & utilities
- **No unused imports/variables** - Build will fail if unused
- **ES2020 target** - Modern JavaScript syntax required

### Code Organization

1. **Client vs Server**
   - Add `"use client"` at top of client components
   - Server components are default in App Router
   - API routes are always server-side

2. **Component Patterns**
   ```typescript
   // Server component (default)
   export default function Page() { ... }

   // Client component
   "use client";
   import { useEffect } from "react";
   export default function Interactive() { ... }
   ```

3. **Shared Types**
   - Define shared types in `src/shared/types.ts`
   - Use for both frontend and API routes
   - Example: `GameState`, `Vector2D`, etc.

### Game Engine

The `GameEngine` class in `src/game/engine.ts`:
- Handles Canvas rendering loop
- Manages game state (running, score)
- Provides `start()`, `stop()`, `getState()` methods
- Usage in React component:

```typescript
"use client";
import { useEffect } from "react";
import { GameEngine } from "@/game/engine";

export default function Game() {
  useEffect(() => {
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    const engine = new GameEngine(canvas);
    engine.start();
    return () => engine.stop();
  }, []);

  return <canvas id="gameCanvas" />;
}
```

## Testing Guidelines

- **Test location**: `src/__tests__/` (colocated with `setup.ts`)
- **File naming**: `*.test.ts` or `*.spec.ts`
- **Environment**: jsdom (browser simulation)
- **Example test**:

```typescript
import { describe, it, expect } from "vitest";
import { GameEngine } from "@/game/engine";

describe("GameEngine", () => {
  it("should initialize with correct state", () => {
    const canvas = document.createElement("canvas");
    const engine = new GameEngine(canvas);
    const state = engine.getState();
    expect(state.running).toBe(false);
  });
});
```

## Common Tasks

### Adding a New Page
```typescript
// src/app/about/page.tsx
export const metadata = { title: "About" };

export default function About() {
  return <main>About page content</main>;
}
```

### Adding an API Route
```typescript
// src/app/api/game/score/route.ts
import { NextResponse } from "next/server";
import type { GameState } from "@/shared/types";

export async function POST(request: Request) {
  const data: GameState = await request.json();
  return NextResponse.json({ success: true, data });
}
```

### Adding a React Component
```typescript
// src/components/GameCanvas.tsx
"use client";
import { useEffect } from "react";
import { GameEngine } from "@/game/engine";

interface GameCanvasProps {
  width?: number;
  height?: number;
}

export default function GameCanvas({ width = 800, height = 600 }: GameCanvasProps) {
  useEffect(() => {
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    const engine = new GameEngine(canvas);
    engine.start();
    return () => engine.stop();
  }, []);

  return <canvas id="gameCanvas" width={width} height={height} />;
}
```

## Common Pitfalls & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Build fails: "X is declared but never used" | TypeScript strict mode | Remove unused imports/variables or prefix with `_` |
| Canvas not rendering | Element not in DOM when `GameEngine` initializes | Use `useEffect` with proper cleanup in client component |
| Styles not applying | Tailwind not processing | Ensure `tailwind.config.mjs` includes correct globs, restart dev server |
| Type errors in API routes | Missing type imports | Use `import type { X } from "@/shared/types"` |
| Tests fail with "canvas is not defined" | jsdom missing setup | Check `src/__tests__/setup.ts` is proper |

## Configuration Notes

### Environment

- **Node.js target**: ES2020
- **Module system**: ESNext (Next.js handles bundling)
- **Config files**: Use `.mjs` extension for Tailwind/PostCSS (ESM requirement)
- **Peer dependencies**: Project uses `--legacy-peer-deps` for React 19 compatibility

### Build Behavior

- **Development**: `npm run dev` enables HMR, source maps, faster builds
- **Production**: `npm run build` optimizes code splitting, minification
- **Type checking**: Runs during build; fixes must address **all** type errors

## Future Expansion Areas

When ready to add:

- **Database**: PostgreSQL schema + typed SQL utilities in `src/shared/db/`
- **Rendering**: Canvas utilities in `src/renderers/` (particle effects, etc.)
- **Concurrency**: Typed lock system in `src/shared/locks/`
- **Caching**: In-memory cache + persistence in `src/shared/cache/`

These are stubbed but not yet implemented per requirements.

## Useful References

- [Next.js 15 Docs](https://nextjs.org/docs)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vitest](https://vitest.dev/)
- [React 19 Docs](https://react.dev)
