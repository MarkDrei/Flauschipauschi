# Flauschipauschi

A game built with Next.js 15, TypeScript, React, and HTML5 Canvas.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (ES Modules)
- **Frontend**: React + HTML5 Canvas
- **Styling**: Tailwind CSS + custom CSS
- **Testing**: Vitest (with jsdom)
- **Authentication**: iron-session (HTTP-only cookies)
- **Rendering**: Custom Canvas renderers

## Project Structure

```
public/                     # Static assets served at root URL
├── background.svg          # Fullscreen sky/landscape background
└── unicorn.svg             # Unicorn sprite (named parts with data-pivot for animation)
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page – fullscreen game canvas
├── components/            # React components
├── game/                  # Game engine and logic
├── renderers/            # Canvas rendering utilities
├── shared/               # Shared types and utilities
│   ├── types.ts
│   └── defenseValues.ts
├── styles/              # Global styles
└── __tests__/          # Test files
```

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the game.

### Build

```bash
npm run build
npm start
```

### Testing

```bash
npm test
npm run test:ui  # Run tests with UI
```

## Home Page

`src/app/page.tsx` renders the fullscreen `GameCanvas` component. The game engine (`src/game/engine.ts`) loads `public/unicorn.svg` as the player sprite.

### Unicorn rig & animation

The unicorn SVG (`viewBox="0 0 520 350"`) is built from named, nested parts; nesting is the hierarchy (a child moves with its parent):

```
body
├── tail
├── leg_back_left, leg_front_left, leg_back_right, leg_front_right
└── head
    ├── mane, horn, forelock, eye, cheek, mouth
```

Every part has a `data-pivot="x y"` at its joint.

- `src/game/unicornRig.ts` splits the SVG into per-part layers (in paint order) at load time. The engine rasterises each layer once into an offscreen canvas and per frame draws them with canvas transforms around their pivots.
- `src/game/unicornPose.ts` is pure and unit-tested. `stepMotion()` integrates the smoothed speed, trot phase and damped springs, and `computePose()` maps that state to `{ angle, dx, dy, scaleY }` per part. While moving it produces a speed-dependent trot with trailing legs, a tail and mane that drag behind, a head bob and a body bounce. When idle it produces breathing, blinks and tail flicks. The sprite is mirrored when moving left.

## Key Features

- **Type-Safe**: Full TypeScript with strict mode enabled
- **ES Modules**: Modern JavaScript module system
- **Canvas Rendering**: HTML5 Canvas for game views
- **Game Engine**: Custom game engine with update/render loops
- **API Routes**: Next.js API routes for backend functionality
- **Sessions**: iron-session for secure HTTP-only cookies
- **Testing**: Vitest with jsdom for unit and integration tests
- **Styling**: Tailwind CSS with custom global styles

## Development Guidelines

### Adding New Pages

Create new pages in `src/app/` following Next.js App Router conventions:

```typescript
// src/app/new-page/page.tsx
export default function NewPage() {
  return <div>New Page Content</div>;
}
```

### Adding API Routes

Create API routes in `src/app/api/`:

```typescript
// src/app/api/new-endpoint/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  return NextResponse.json({ data: "..." });
}
```

### Game Rendering

The game engine is located in `src/game/engine.ts`. To use it in a component:

```typescript
"use client";
import { useEffect } from "react";
import { GameEngine } from "@/game/engine";

export default function GameComponent() {
  useEffect(() => {
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    const engine = new GameEngine(canvas);
    engine.start();
    return () => engine.stop();
  }, []);

  return <canvas id="gameCanvas" />;
}
```

## Deployment

Pushes to `main` are deployed to https://flauschipauschi.ironstrike.de via the VPS webhook (https://github.com/MarkDrei/vpsIonos). Other branches become preview deployments. The platform builds the `Dockerfile` (Next.js standalone output) and runs the container on port 3000 behind Traefik.

## Notes

- Database support (PostgreSQL) is planned but not yet implemented
- Future: Deadlock-proof typed lock system for concurrency
- Future: In-memory cache with persistence

## License

MIT
