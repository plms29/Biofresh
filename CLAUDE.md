@AGENTS.md

# BioFresh OS

Post-harvest operations MVP for a perishable-produce co-operative.

**Read `README.md` first.** It documents the product scope, the four roles, the batch
lifecycle, the alert rules and the Decision Room. This file covers only what the README
and the code don't tell you: the constraints, the invariants, and the things that cost
time to rediscover.

## Hard constraints — don't undo these

- **English only.** Every string, comment, JSDoc and seed record is English. The co-op
  is Vietnamese and users may speak Vietnamese to you, but the codebase and UI stay
  English. Money stays in VND; dates and numbers use `en-GB`.
- **No emoji anywhere** — not as icons, not in copy, not in seed data. Products are
  identified by `<ProductMark>` / `<ProductLabel>` from
  `src/components/common/product-mark.tsx`: a coloured two-letter chip (SB, DF, MG, AV,
  PF). `ProductMeta` carries `code` + `tone`, never `emoji`. Emoji render differently
  per platform, can't be themed, and can't be contrast-checked.
- **Buyers are not users.** They never log in and have no account. The only thing they
  ever see is `/p/[id]`, the Process Passport. Never let price, buyer names, inventory,
  margin or decision data reach that route.
- **No forecasting models.** Every figure must trace back to an open order, a market
  signal entered by Sales, or the internal reference price. Action deadlines are a
  configured window per product, not a freshness prediction. If a feature needs a
  prediction, it's out of scope for this release — see the README's "out of scope" list.

## Architecture invariants

- `src/lib/domain/**` is pure business logic. It must not import from `components/`,
  `app/` or the store. Swapping `localStorage` for a real database should leave this
  layer untouched. Keep new rules here, not in pages.
- **The active role follows the route.** `AppShell` syncs `role` from `pathname`, so
  standing on `/packhouse` means acting as the packhouse and every logged action is
  attributed correctly. Don't reintroduce a role picker that's independent of navigation.
- **State lives in `localStorage`** via zustand `persist`. There is no server and no
  env var. Anything data-dependent must render only after `useHydrated()` returns true,
  or SSR and the browser will disagree.
- **Bump `version` in `src/store/use-biofresh.ts` whenever the persisted shape *or* the
  seed content changes.** The `migrate` there discards old state so `ensureSeeded`
  reloads. Skip this and returning users keep stale data — that's how Vietnamese copy
  and old emoji survived a rewrite once already. Currently at v4.
- **Time**: never call `Date.now()` inside render. Use `useNow()` (one shared clock,
  ticks per minute) and pass `now` into domain functions, which all take it explicitly.
  `useNow()` returns `0` before hydration and every caller handles that case.

## Conventions

- **Glossary** (keep these exact): Sales / Field Supervisor / Packhouse / Manager /
  batch / sub-lot / grade / buyer / order / market signal / harvest order / picking
  guide / allocation / surplus / decision case / Decision Room / Process Passport /
  BioFresh Field Protocol / action deadline / internal reference price / expected value
  / confidence / unallocated / sellable inventory.
- **Design rules come from the `ui-ux-pro-max` skill** (installed under
  `.claude/skills/`, gitignored, reinstall with `npx ui-ux-pro-max-cli init --ai claude`).
  Its `search.py` needs Python 3. The generator's *style* suggestion was rejected on
  purpose — it proposes a blue "Exaggerated Minimalism" landing-page look that suits
  neither a dense ops console nor the agriculture-green identity. Its *rules* are what
  we follow.
- **Tokens, not literals.** Colours, elevation (`--shadow-e1..e4`) and motion
  (`--dur-fast/base`, `--ease-out`) are defined in `src/app/globals.css`. Semantic
  colours: leaf = good, sun = watch, risk = critical. Never hardcode a hex in a
  component.
- **Contrast is checked, not assumed.** Everything meets WCAG AA. `muted-foreground` is
  `#646b62` and `sun-700` is `#8d6209` specifically because the lighter values failed on
  muted surfaces. Re-measure if you change a colour.
- **Touch targets** are 44px on phones and tighten on pointer devices (`h-11 sm:h-9`).
  Mobile inputs use 16px text so iOS doesn't auto-zoom.
- **Numbers line up**: add `.tnum` to anything with digits in a column.
- Icons come from `lucide-react` only — one family, don't mix in another set.

## Gotchas that cost time

- `untilText(iso, now)` returns a **self-contained phrase** — `"5h left"`, `"2h
  overdue"`. Never embed it mid-sentence (`Due ${untilText(...)}` reads "Due 5h left").
  Put it after a colon or use it standalone.
- `PageHeader`'s `eyebrow` prop is typed `string`, so it can't take `<ProductLabel>`.
  Use `PRODUCTS[key].label` there, or widen the prop.
- An `<option>` element can't contain a component. In product dropdowns use the plain
  `PRODUCTS[k].label` text.
- The `shadcn` package was a **CSS** dependency (`@import "shadcn/tailwind.css"`), not
  just a CLI. It was removed along with that import because nothing used its variants —
  don't re-add it without checking. Its absence is why `next build` works at all; the
  import was silently breaking the production build before.
- **Dev server HMR goes stale** after large multi-file edits: computed styles stop
  matching the DOM and the console shows phantom `X is not defined` errors. Fix by
  stopping the server, `rm -rf .next`, restarting, and opening a **fresh tab** — the
  console buffer keeps old errors from the previous server, so always confirm against a
  new tab before believing an error.
- On Windows Git Bash, `grep -P` matches **bytes**, so a Vietnamese-character class
  produces false positives (it will even flag `favicon.ico`). Use a small Python script
  with explicit `\uXXXX` ranges and `io.TextIOWrapper(..., encoding='utf-8')` on stdout,
  or Python will also die on `cp1252` when printing the results.
- `getComputedStyle` readings taken through the browser tool have been unreliable mid-
  session. When a style looks wrong, take a screenshot before concluding there's a bug.

## Verify before calling anything done

```bash
npx tsc --noEmit
npx eslint src
npm run build
```

Then run it and look at it — `npm run dev`, or the `biofresh-dev` config in
`.claude/launch.json`. The end-to-end path worth re-walking after any domain change:
Sales order → Field picking → Packhouse intake + grading → Sales inventory updates →
Decision Room → six protocol steps → ship → close → check `/p/[batch]`.

## Known debt

- **No dark mode.** The design skill wants both themes designed together; this touches
  every component and was deliberately deferred. Tokens are already in place for it.
- **The Decision Room coefficients are placeholders.** Transport costs, channel price
  factors and confidence values in `src/lib/domain/decisions.ts` are sample numbers, not
  the co-op's real ones. They must be replaced before demoing to real operators — the
  output looks authoritative and currently isn't.
- **Single-machine data.** `localStorage` means two people never see the same figures.
  Fine for walking the flow, misleading for a multi-machine demo.
