---
name: legacy-lens-design
description: Use when designing, evaluating, or improving UI/UX for the Legacy Lens application — covers visual hierarchy, layout, typography, color, motion, and product identity for a forensic code-investigation workspace.
---

# Legacy Lens Design Skill

This skill governs all UI/UX design decisions for Legacy Lens. Follow every step in order.
Never skip Step 1. Never modify product requirements.

---

## Step 1 — Inspect Before Designing

Before touching any UI, gather ground truth from the repository.

1. Read `LEGACY_LENS_PRD.md` in full. Note every named screen, feature, and user flow. These are locked requirements — this skill may refine visual form but **never changes product intent or scope**.
2. Use `glob` and `list_files` to locate all existing UI components, pages, and stylesheets under `app/`, `components/`, and `styles/` (or equivalent directories).
3. Use `read_file` on relevant pages and components to understand what currently exists before proposing or applying any change.
4. Identify which screen or component is the target of the current task. If it is ambiguous, use `ask_followup_question` to confirm.

Only after completing this step may you proceed.

---

## Step 2 — Understand the Product Identity

Legacy Lens is **forensic engineering software**. Every design decision must reinforce that identity.

### What it is
- A code-review investigation workspace
- An evidence-driven developer intelligence tool
- Serious enterprise software that respects the user's intelligence
- Technically dense but never cluttered
- Premium without being decorative

### What it is not
- A SaaS marketing site
- A generic dashboard product
- A chat application
- An AI toy with sparkles and gradients

### Emotional register
The interface should feel like:
> _A senior engineer working a post-incident investigation. Calm. Precise. Everything visible has a reason._

---

## Step 3 — Apply the Visual Priorities

Every screen in Legacy Lens has a fixed priority hierarchy. Design decisions must respect this order:

1. **Usability** — the interface must work correctly and legibly under task pressure
2. **Information hierarchy** — the most important data must be visually dominant
3. **Product identity** — the forensic, investigative character must be evident
4. **Visual polish** — refinement and craft, applied after the above are satisfied

Never sacrifice usability for polish. Never sacrifice information hierarchy for product identity.

### Primary Screen: Code-Review Investigation Workspace

Within this screen, the visual priority order is:

| Priority | Element | Role |
|---|---|---|
| 1 | Diff | Primary source material — the ground truth |
| 2 | Behavioral risk | Primary insight — what the diff means |
| 3 | Evidence | Traceable connections between findings and code |
| 4 | Behavioral rules | Discovered intelligence surfaced from patterns |
| 5 | Reveal Intent | Uncovering hidden system knowledge |
| 6 | Blast-radius | Relational impact — immediately scannable |

Higher-priority elements must receive more visual weight, more space, and clearer typographic treatment than lower-priority elements. Never invert this hierarchy through decoration.

---

## Step 4 — Apply the Design System Rules

### Layout

- **The workspace is the primary layout pattern** — not a grid of cards, not a marketing page, not a dashboard.
- Use a split-pane or columnar layout appropriate to the investigation workflow. The diff panel anchors the left or primary zone.
- Avoid symmetrical grid layouts where all panels have equal visual weight.
- Panels and zones should have clear visual roles: primary content, secondary context, metadata/annotation.
- Never use a hero section, feature grid, or marketing pattern inside the application.
- Avoid giant empty whitespace. Use density intentionally — whitespace communicates grouping and separation, not decoration.

### Spacing

- Spacing should be **deliberate and systematic** — use a consistent scale (e.g. 4px base unit).
- Tighter spacing within a logical group; looser spacing between groups.
- Do not add padding for padding's sake. Every spacing decision communicates structure.
- Avoid the "cards floating in a sea of margin" pattern.

### Color

- **Restrained palette.** A near-neutral background (very dark or very light depending on theme), one or two functional accent colors, semantic colors for risk levels only.
- Risk/severity colors are **functional**, not decorative. Use them sparingly and consistently:
  - Critical / high risk: a warm red
  - Medium risk: amber
  - Low / informational: muted blue or neutral
- No gradient backgrounds. No glassmorphism. No color used for its own sake.
- Avoid neon or cyberpunk color palettes. Avoid corporate-blue saturation.
- Background surfaces: prefer very subtle tonal differences over border-heavy separation.

### Typography

Apply a strong display hierarchy:

| Role | Treatment |
|---|---|
| Primary heading / screen title | Large, high-weight, tight tracking — establishes context immediately |
| Section heading | Medium weight, clear contrast from body |
| Body copy | Readable, comfortable line-height (~1.6), regular weight |
| Code / diff text | Monospace, consistent size, high legibility — never shrink below readable |
| Data / metadata labels | Can use monospace or condensed; must be clearly secondary to body |
| Risk / finding labels | Strong contrast to background; weight communicates severity |

- Use font weight and size — not color alone — to establish hierarchy.
- Avoid all-caps for body text or labels. Small-caps or tracked uppercase is acceptable for section labels only.
- Never use decorative or display fonts for code or data.

### Components

- **Avoid generic component aesthetics** — shadcn defaults, Tailwind UI cookie-cutter cards, excessive border-radius, pill badges everywhere.
- Border radius: use sparingly. Sharp or very slightly rounded corners (2–4px) reinforce the forensic, precise character. Large rounded cards (12px+) feel consumer-app generic.
- Cards / panels: use subtle borders or background tonal shifts, not shadow stacks.
- Badges / tags: use only when the label genuinely needs to be scannable inline. Prefer inline text with weight/color differentiation over a pill badge for everything.
- Tables and lists: prefer dense, structured tables or code-adjacent lists for data over card grids.
- Empty states: never use placeholder content or lorem ipsum. Empty states should be functional — explain what goes here and how to populate it.

### Icons

- Icons must be **functional**, never decorative.
- Use icons only where they aid rapid recognition (file type, action type, severity level). Never use icons as visual filler.
- Icon + label pairs are preferred over icon-only when space allows.
- Do not add a random icon to every list item or heading to make the UI feel "designed."

### Motion

- Motion should be **subtle and functional** — it communicates state change, not personality.
- Acceptable uses: panel expand/collapse, loading state transitions, focus indication.
- **Reveal Intent** is the one exception: this interaction may use a stronger, deliberate transition (e.g. a purposeful fade + expand or a slide-in from context) to reinforce the sense of uncovering hidden knowledge. Keep it under 400ms and ensure it is interruptible.
- No page-enter animations, no staggered list animations, no hover-scale transforms.
- Never use motion to distract from content.

---

## Step 5 — Avoid These Patterns Explicitly

Before finalizing any design, verify none of the following are present:

| Anti-pattern | Why it is wrong for Legacy Lens |
|---|---|
| Generic shadcn dashboard layout | Communicates "boilerplate SaaS," not investigation tooling |
| Rows of equally-sized cards | Destroys information hierarchy; everything looks equally important |
| Excessive pill badges | Creates visual noise; undermines the precision character |
| Large border-radius (12px+) on primary surfaces | Consumer-app feel, inconsistent with forensic precision |
| Gradient backgrounds or cards | Decorative, generic; draws attention away from content |
| Glassmorphism | Trendy pattern; makes content less readable |
| Neon / cyberpunk color | Inconsistent with serious enterprise tooling |
| Meaningless charts | Charts must encode real, actionable data — never added for visual interest |
| Giant empty whitespace | Implies the interface has nothing to say |
| Chat-app UI patterns | Wrong mental model for an investigation workspace |
| AI sparkles / magic wand icons everywhere | Trivializes the analytical rigor of the product |
| Giant hero section inside the application | This is not a marketing page |
| Placeholder / lorem ipsum content | Never acceptable in any shipped state |

---

## Step 6 — Deliver with Rationale

When proposing or implementing a design change:

1. State which Visual Priority (Step 3) the change serves.
2. Explain how it reinforces the forensic/investigation product identity.
3. Call out any trade-offs explicitly.
4. If the change touches the Reveal Intent interaction, describe the motion behavior precisely.

If implementing code, apply the rules above to all new CSS, Tailwind classes, and component structure. Do not introduce generic component library defaults without reviewing them against the rules in Step 4 and Step 5.

---

## Step 7 — Validate Before Completing

Before marking the work done:

- [ ] Does the diff remain the most visually dominant element in the workspace?
- [ ] Is risk communicated with clear hierarchy and appropriate color semantics?
- [ ] Is every spacing and sizing decision intentional — no defaults left unreviewed?
- [ ] Are there any pill badges, gradient cards, or large border-radius elements that should not be there?
- [ ] Does the result feel like forensic investigation tooling, not a generic SaaS dashboard?
- [ ] Does any motion used serve a functional purpose?
- [ ] Have product requirements in `LEGACY_LENS_PRD.md` been preserved without modification?

If any check fails, revise before completing.
