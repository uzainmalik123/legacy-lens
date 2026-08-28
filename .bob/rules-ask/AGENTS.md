# Project Documentation Context (Non-Obvious Only)

> Full context: read `AGENTS.md` and `node_modules/next/dist/docs/` before answering.

- **Canonical docs are bundled** — all Next.js 16 docs are in `node_modules/next/dist/docs/`. Do not reference nextjs.org; it may describe an older version.
- **This is Next.js 16, not 15 or 14** — many Stack Overflow answers, blog posts, and AI training data describe older APIs. Trust the bundled docs over any external source.
- **Turbopack is the default bundler** — questions about Webpack configuration may no longer apply unless `--webpack` is passed explicitly.
- **`experimental.ppr` is gone** — replaced by `cacheComponents: true`. Code samples using `experimental: { ppr: true }` are outdated.
- **Tailwind CSS v4 has no JS config** — the `tailwind.config.js` / `.ts` file does not exist. Theme configuration lives in CSS `@theme` blocks.
- **`middleware.ts` is deprecated** — documentation and examples calling it `middleware` are outdated for this project.

## Security & Scope Policy (Ask / Documentation Agent)

> This agent **must not** modify any file. It reads and explains only.

- **Repository boundary** — never read outside the repo root.
- **No sudo**; no destructive commands.
- **No secrets** — never read or reference `.env*` or credential files.
- **Read-only** — do not create, modify, or delete any file.
- **Ambiguity → ask** — if the question requires assumptions about production state or
  credentials, say so explicitly rather than guessing.
