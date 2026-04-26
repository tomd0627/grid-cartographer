# Grid Cartographer

A visual CSS Grid playground. Click and drag to draw named grid areas; get `grid-template-areas` CSS instantly.

---

## What it does

1. Set your grid dimensions (1–12 columns × 1–12 rows)
2. Click and drag across cells to define a named area
3. Name the area in the prompt that appears
4. Repeat for each region of your layout
5. Copy the generated CSS — it's ready to paste

The output includes a complete `.container` rule with `display: grid`, `grid-template-areas`, `grid-template-columns`, and `grid-template-rows`, plus a `grid-area` rule for each named area.

---

## Running locally

This is a static site using native ES modules — no build step, but you need a local server (browsers block `import` over `file://`).

```bash
# any static server works — here are two options:

npx serve .
# or
npx http-server . -p 3000
```

Then open `http://localhost:3000` (or whichever port the server reports).

---

## Project structure

```
grid-cartographer/
├── index.html
├── css/
│   ├── variables.css     — design tokens (all custom properties)
│   ├── reset.css         — modern CSS reset
│   ├── base.css          — body, @font-face, graph-paper background
│   ├── layout.css        — two-panel app shell
│   ├── header.css        — sticky header
│   ├── controls.css      — dimension inputs, buttons
│   ├── grid.css          — grid cells, drag states, area colours
│   ├── areas.css         — named areas sidebar
│   ├── output.css        — CSS output panel, syntax highlighting
│   └── responsive.css    — breakpoints, prefers-reduced-motion
├── js/
│   ├── state.js          — single source of truth, pub/sub
│   ├── grid.js           — DOM rendering (full rebuild + fast update)
│   ├── drag.js           — mouse, touch, and keyboard interaction
│   ├── areas.js          — area create/rename/delete, colour cycling
│   ├── output.js         — CSS generation, rectangle validation
│   ├── clipboard.js      — copy with execCommand fallback
│   └── main.js           — app init, event wiring, subscriber registration
└── assets/
    ├── favicon.svg
    └── fonts/            — self-hosted Inter and JetBrains Mono (WOFF2)
```

---

## Architecture

**State**: `state.js` owns all mutable data — grid dimensions, the area `Map`, and cell assignments. All mutations go through exported functions (`createArea`, `setDimensions`, etc.); nothing writes to state directly. A `subscribe(fn)` function triggers the renderer whenever state changes.

**Two-tier rendering**: Dimension changes trigger a full `renderGrid()` rebuild via a `DocumentFragment`. During drag (high-frequency `mousemove`), only `updateCellStates()` runs — it sets `data-*` attributes without touching the DOM structure. CSS output is skipped during active drag and regenerated on `mouseup`/`touchend`.

**CSS generation**: Builds an N×M matrix from `cellAssignments` (unassigned cells become `.`), validates each area forms a contiguous rectangle (required by `grid-template-areas`), then emits the CSS string. Non-rectangular areas show an inline warning.

**No bundler**: `<script type="module">` handles ES module loading natively. The script tag is at the end of `<body>`, so no `defer` needed.

---

## Keyboard support

| Key                 | Action                             |
| ------------------- | ---------------------------------- |
| `Tab` / `Shift+Tab` | Move between cells                 |
| `Space` / `Enter`   | Start / extend selection           |
| `Escape`            | Cancel drag selection              |
| `Escape`            | Close name overlay or context menu |

---

## Development

Install pre-commit tooling:

```bash
npm install
```

`npm install` also runs `husky` (via the `prepare` script), which wires the pre-commit hook. Every commit runs Prettier, ESLint, and Stylelint on staged files via `lint-staged`.

Run linters manually:

```bash
npm run lint         # all three
npm run lint:js      # ESLint only
npm run lint:css     # Stylelint only
npm run lint:format  # Prettier check only
```

**CSS conventions**: Logical properties throughout (`inline-size`, `padding-block`, etc.), alphabetical property order, BEM class naming. Enforced by Stylelint.

**JS conventions**: ESLint v9 flat config. `===` required, no `var`, no `console.log` in committed code.

---

## Browser compatibility

Requires:

- `color-mix()` — Chrome 111+, Firefox 113+, Safari 16.2+
- CSS logical properties — all modern browsers
- `<script type="module">` — all modern browsers
- Variable fonts — all modern browsers

No IE11 or legacy Edge support.

---

## Deployment

Deploys to Netlify from the repo root (`publish = "."`). The `netlify.toml` sets:

- Long-lived cache headers (`max-age=31536000, immutable`) for `/css/*`, `/js/*`, `/assets/*`
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, strict `Content-Security-Policy` (no CDN dependencies, so `'self'` only)

---

## License

MIT
