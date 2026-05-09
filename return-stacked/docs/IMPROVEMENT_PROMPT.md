# Project Improvement Prompt

A reusable prompt for asking Claude to review and improve a React + TypeScript + Vite + Tailwind SPA (or similar client-rendered frontend with non-trivial computational logic). Paste the section below into a fresh Claude conversation, optionally trimming sections that don't apply.

---

## Prompt

You are reviewing a React + TypeScript + Vite + Tailwind project. Read the codebase, then propose and (when I confirm) apply concrete improvements aligned with the principles below. **Do not refactor speculatively** — only act when there is a real, current pain point that the change resolves. Three similar lines beats a premature abstraction. No designing for hypothetical future frameworks, platforms, or storage backends.

Before you change anything, give me a short numbered list of proposed changes with the **why** for each. Wait for me to confirm. After I confirm, apply changes incrementally and run `tsc --noEmit`, the linter, and the build between meaningful steps.

### Principles to apply (in priority order)

1. **Correctness of numerical / domain logic.** If the project does any percentage, currency, or allocation math: use fixed-point integer arithmetic (e.g., basis points where `10_000 = 100%`) for the canonical value, and round only at the display boundary. This eliminates floating-point drift, "total = 100.0000001%" validation failures, and slider jitter. Convert at the edges; compute in integers.

2. **Single source of truth for derived data.** When multiple UI views render the same time-series or computed dataset, build one canonical per-row dataset once and have every renderer look up rows. Never let two components recompute the same numbers independently — they will drift.

3. **Immutability at state boundaries.** State-updating functions return new objects; they never mutate inputs. This makes React renders predictable and makes the logic trivially testable. Don't fake immutability with a deep clone at the top of an otherwise-mutating function — write it immutably.

4. **Pure functions for business logic.** Calculation, validation, and transformation functions should be plain TS functions with no React, no DOM, no storage, no globals. They take inputs and return outputs. Keep them in `src/...` directories that don't import from `react`. This is the single largest win for testability.

5. **Separation between pure logic, side-effecting adapters, and presentation** — but only as much as the project actually needs. If there is exactly one storage backend and no plan for another, don't invent an `IStorageAdapter` interface; just call `localStorage` from one well-named module. Introduce the seam the day you have a second implementation, not before.

6. **Feature-based folder layout for app code.** Group by feature (`features/etf-calculator/`, `features/portfolio/`), not by file kind (`components/`, `hooks/`, `utils/`). Cross-feature primitives go in `shared/`. Avoid a top-level `utils.ts` or `types.ts` — those names are usually a sign that something didn't get a real home.

7. **No barrel exports inside the project.** Use explicit `import { X } from './path/to/X'`. Barrels (`index.ts` re-exports) hurt tree-shaking, slow TS, and obscure dependencies. The one acceptable barrel is at a published API boundary, which a frontend SPA usually does not have.

8. **One naming convention, applied uniformly.** Pick PascalCase for `.ts`/`.tsx` source files (matching component, type, and class conventions) and stick to it everywhere. Framework-required exceptions only: Next.js `page.tsx`/`layout.tsx`, ecosystem configs, `globals.css`. Do not invent new exceptions.

9. **TypeScript strict mode, zero `any`, zero ts-ignore.** Treat type errors as build failures (`tsc --noEmit` in CI). Prefer `unknown` + narrowing over `any`. If a third-party type is wrong, write a local declaration rather than escaping the type system.

10. **Tailwind: utility-first, but extract a component when the className list crosses ~6 utilities and repeats.** Do not pre-extract. Prefer `cn()` / `clsx` for conditional classes. Use Radix primitives for accessibility-critical interactions (dialog, select, slider, tabs) rather than hand-rolling.

11. **Comments explain WHY, not WHAT.** Default to no comment. Add one only when the reason for the code is non-obvious from the code itself: a hidden invariant, a workaround for a specific bug, a constraint a reader would otherwise violate. Never comment "what the code does" — naming is for that. Never reference the current PR, ticket, or task in code comments.

12. **Don't add error handling for impossible states.** Validate at system boundaries (user input, network, storage). Trust internal calls. No try/catch around code that cannot throw. No fallback paths for branches that cannot be reached.

### Anti-patterns to flag and remove

- **Speculative abstraction layers.** A `Service` class that wraps a single pure function. An interface with one implementation. A factory for objects that have no construction logic. Inline these.
- **One-file-per-type pedantry.** A `domain/` directory with 18 files each containing one type alias is harder to navigate than one cohesive `types.ts` per feature. Co-locate small related types; split when a single file passes ~300 lines or hosts unrelated concerns.
- **Premature framework-agnosticism.** "What if we move to Vue/Svelte/Electron/CLI?" — you won't. The cost of designing for it is paid every day; the benefit is paid never.
- **Floating-point percentages.** Any `parseFloat(...).toFixed(1)` round-trip in a calculation chain is a bug waiting to happen. Replace with integer math.
- **Recomputed derived data per component.** Two components running their own `.map(...).reduce(...)` over the same source array. Lift it to a memoized hook or a precomputed dataset.
- **`useEffect` for derivations.** If a value is derived from props/state, compute it during render (or `useMemo`), not in an effect that sets state.
- **Documentation files that duplicate the code.** A 300-line `ARCHITECTURE.md` listing every service goes stale within weeks. Prefer a short README that explains the *non-obvious* decisions; let the code be the spec for the rest.
- **Celebratory or marketing-tone docs** ("🎉 Modularization Complete!", checkmark lists of benefits). Replace with terse, factual notes.

### Process

1. Start by reading `package.json`, `tsconfig.json`, `vite.config.ts`, and the top two levels of `src/`. State the actual stack and folder layout back to me in 3–5 lines.
2. Identify the top 3–5 highest-leverage improvements. For each: file path(s), what changes, why it matters now, rough size of the diff.
3. Wait for my confirmation or redirection before editing.
4. Apply changes one principle at a time. After each, run `npm run tsc:ci` (or equivalent) and the linter. Report results before moving on.
5. Do not create new top-level docs unless I ask. Do not write summary files. The diff and the conversation are the record.

### What "done" looks like for one pass

- Every change traces to a principle above and a current symptom in the code.
- `tsc --noEmit`, ESLint (max-warnings=0), and the production build all pass.
- No new abstractions without a second concrete caller justifying them.
- No files added that don't carry their weight.

---

## Notes on using this prompt

- **Trim aggressively.** If the target project has no numerical math, drop principle 1. If it has no derived datasets, drop principle 2. The prompt is a menu, not a checklist.
- **Drop the React/Vite/Tailwind framing** if you reuse this for a different stack — the underlying principles (immutability, pure functions, feature folders, no speculative abstraction, why-not-what comments) are stack-agnostic.
- **The strongest principles** are 1 (fixed-point math), 2 (single source of truth for derived data), 4 (pure functions), and 5 (don't abstract until you have a second implementation). The rest are tidying.
