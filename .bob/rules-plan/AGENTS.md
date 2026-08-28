# Project Architecture Rules (Non-Obvious Only)

> Full context: read `AGENTS.md` and `node_modules/next/dist/docs/` before planning.

## Architectural Constraints

- **App Router only** — no `pages/` directory. All routing lives under `app/`. Do not plan Pages Router patterns.
- **Server Components are the default** — plan with the assumption that components are server-side unless interactivity is explicitly needed. Minimise `'use client'` surface area.
- **Caching is opt-in in v16** — `fetch` results are NOT cached by default. Plan explicit `'use cache'` directives (with `cacheComponents: true`) or `<Suspense>` streaming for any data that should be cached.
- **React Compiler replaces manual memoisation** — do not plan `useMemo`/`useCallback` wrappers; the compiler handles this automatically since `reactCompiler: true` is set.
- **Turbopack constraints** — custom Webpack loaders/plugins cannot be used without `--webpack`. Plan Turbopack-native alternatives (e.g., `turbopack.resolveAlias` instead of `webpack.resolve.fallback`).
- **No test infrastructure yet** — plan to add a test framework (e.g., Vitest + Testing Library) before writing tests; no `test` script exists in `package.json`.
- **Tailwind v4 theming is CSS-only** — design token / theme extension plans must target `@theme inline {}` in `app/globals.css`, not a JS config.
- **Route-level type generation** — `PageProps<'/route'>` / `LayoutProps<'/route'>` types are generated artifacts; plans that add new routes should include a `next typegen` step to keep types current.
- **`proxy.ts` for request interception** — plan network boundary logic in `proxy.ts` (Node.js runtime only). Edge runtime interception still requires `middleware.ts`.

## Security & Scope Policy (Planning Agent)

> This agent **must not** modify application source code. It produces plans only.

- **Repository boundary** — never read or write outside the repo root.
- **No sudo**; no destructive commands.
- **No secrets** — never read or reference `.env*` or credential files in plans.
- **No production access**.
- **Plans are not code** — output goes to `.agent/plans/` only. Do not touch `app/`,
  `lib/`, `public/`, or any application source path.
- **New dependencies** — must be explicitly justified in the plan; do not install them.
- **Ambiguity → ask** — if requirements, scope, or constraints are unclear, ask before
  producing a plan.
