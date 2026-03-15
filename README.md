# Flauschipauschi

A game built with Next.js 15, TypeScript, React, and HTML5 Canvas.

## Technology Stack

- **Framework**: Next.js 15 (App Router with static export)
- **Language**: TypeScript (ES Modules)
- **Frontend**: React + HTML5 Canvas
- **Styling**: Tailwind CSS + custom CSS
- **Testing**: Vitest (with jsdom)
- **Rendering**: Custom Canvas renderers
- **Deployment**: Static site (no Node.js required)

## Project Structure

```
public/                     # Static assets served at root URL
├── background.svg          # Fullscreen sky/landscape background
├── unicorn.svg             # Unicorn sprite (variant 1)
└── unicorn2.svg            # Unicorn sprite (variant 2, displayed on home page)
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page – fullscreen background + unicorn2
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

### Build for Production

```bash
npm run build
```

The compiled output is generated in the `out/` folder as a static site (no Node.js runtime required).

### Deployment

**This app is built for traditional web hosting** (PHP hosting, static file hosting, etc.) — it requires **no Node.js server**.

#### Upload to Traditional Hosting

1. Run `npm run build` to generate the `out/` folder
2. Upload the **entire contents of `out/`** to your web host
3. Access the app via your domain

**Important**: Upload the files to the root of where you want the app to be accessed:
- If you want it at `https://example.com/` → upload to web root
- If you want it at `https://example.com/games/flauschipauschi/` → upload to that subdirectory

#### Build for a Subdirectory

If your app will be in a subdirectory (not the root), set the path before building:

```bash
export MSYS_NO_PATHCONV=1
export NEXT_PUBLIC_BASE_PATH="/path/to/flauschipauschi"
npm run build
```

Then upload the `out/` folder contents to that path on your server.

#### Test Locally

To test the production build locally:

```bash
npm run build
npx http-server out/ -p 3000
```

Then open `http://localhost:3000` in your browser.

### Testing

```bash
npm test
npm run test:ui  # Run tests with UI
```

## Home Page

`src/app/page.tsx` renders a fullscreen scene:
- `public/background.svg` is stretched to cover the entire viewport as a background layer.
- `public/unicorn2.svg` is centered on top of the background at `256×256 px`.

No canvas or JavaScript is needed for this view — it is a pure server component using `<img>` tags and Tailwind CSS (`absolute`, `inset-0`, `object-cover`).

## Key Features

- **Type-Safe**: Full TypeScript with strict mode enabled
- **ES Modules**: Modern JavaScript module system
- **Canvas Rendering**: HTML5 Canvas for game views
- **Game Engine**: Custom game engine with update/render loops
- **Static Export**: Compiled to pure HTML/CSS/JavaScript (no server needed)
- **Testing**: Vitest with jsdom for unit and integration tests
- **Styling**: Tailwind CSS with custom global styles
- **Traditional Hosting Ready**: Deploy to any web host (PHP hosting, static file hosting, etc.)

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

## Notes

- Database support (PostgreSQL) is planned but not yet implemented
- Container/Docker configuration is planned but not yet implemented
- Future: Deadlock-proof typed lock system for concurrency
- Future: In-memory cache with persistence

## License

MIT
