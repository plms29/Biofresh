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
- **Numbers are computed; the AI only argues about them.** This constraint was
  *narrowed* deliberately (it used to be a flat "no AI at all"). The rule still holds
  for every figure: net value, expected value, extra cost, days to cash, confidence and
  action deadlines all come from `lib/domain/decisions.ts`, tracing back to an open
  order, a market signal Sales entered, or the internal reference price. What changed is
  that a Gemini assistant now reads those finished options and recommends one in plain
  language — see "Decision Room assistant" below. It must never generate a figure, and
  the API route rejects an answer naming an option it wasn't given. Do not let a model
  compute, estimate or predict a number; that would break the product's core promise
  that every figure is auditable.

## Architecture invariants

- `src/lib/domain/**` is pure business logic. It must not import from `components/`,
  `app/`, the store or `lib/supabase/`. Keep new rules here, not in pages — this layer
  doesn't know or care that Supabase exists.
- **The active role follows the route.** `AppShell` syncs `role` from `pathname`, so
  standing on `/packhouse` means acting as the packhouse and every logged action is
  attributed correctly. Don't reintroduce a role picker that's independent of navigation.
- **`/pick` is deliberately outside the role shell.** Pickers (`Farmer`) are *not*
  system users — no login, no role, no sidebar, no alerts, no nav. The screen is used
  one-handed outdoors on a shared phone, so it has its own layout and its own
  `ToastProvider`, targets far above the 44px minimum, and weights entered by tapping
  rather than typing. Don't "unify" it with the four role screens; the whole point is
  that it shares nothing with them but the data.
- **`HarvestOrder.pickedKg` is derived, never incremented.** It is recomputed by summing
  every `PickingEntry` on that order (`addPickingEntry` / `removePickingEntry` in the
  store). The Field Supervisor has no +10 kg button any more — weights come from the
  pickers, or from "Record for a picker", which still attributes to a named person.
  Never write `pickedKg` directly, or the total and the per-picker detail behind it
  will drift apart.
- **Size band ≠ grade.** `SizeBand` (L/M/S, in `catalog.ts` per product) is what a
  picker judges by eye at the bush; `Grade` (A/B/PROCESS/REJECT) is a quality call the
  packhouse makes later. They are separate axes and must not be collapsed into one.
- **Buyer rejections re-enter the loop.** `closeBatch` with `rejectedKg > 0` does not
  just store a number: it shrinks the shipped allocations by that amount so the stock is
  unallocated again, opens a decision case with `origin: "buyer_rejection"`, and leaves
  the batch in `decision` rather than `closed`. Returned produce is exactly the surplus
  this product exists to catch, so it must go back through the Decision Room rather than
  disappearing into an outcome field.
- **Sustainability lines are written by actions, never computed on the fly.**
  `recordSustainability` appends when a decision is committed and when a batch closes.
  Don't derive that panel from other tables — the point is a durable record of where
  produce actually went, including what was lost.
- **Data lives in Supabase, shared across devices — not in `localStorage` anymore.**
  Only `role` (which staff member's browser this is) still persists locally. See
  "Data layer: Supabase" below before touching the store or adding a new field to any
  domain type — a new field needs a matching column/JSONB path in the migration and the
  mapper, or it will silently vanish on the next load.
- **Time**: never call `Date.now()` inside render. Use `useNow()` (one shared clock,
  ticks per minute) and pass `now` into domain functions, which all take it explicitly.
  `useNow()` returns `0` before hydration and every caller handles that case.

## Data layer: Supabase

BioFresh shares a Supabase **project** with other unrelated apps (the user's account was
already at the 2-project free-tier limit) and lives entirely inside its own **schema**,
`biofresh` — every table, every RLS policy, every realtime publication entry is scoped to
that schema so it cannot collide with whatever else is in that project.

- **Schema source of truth**: the files in `supabase/migrations/`, applied in order —
  `0001` tables, `0002` grants (custom schemas don't inherit them), `0003` pickers,
  `0004` sustainability records and decision-case origin. They are not applied
  automatically — there is no Supabase CLI project link, no DB password on file,
  only the anon key. Changing a table shape means editing this file **and** telling the
  user to re-run it (or the specific `ALTER`) in the Supabase SQL Editor. The anon key
  cannot run DDL.
- **RLS is deliberately wide open** (`using (true) with check (true)` for the `anon`
  role, every table). This app has no authentication — roles are a UI switcher, not a
  login — so there is no user to scope rows to. This is not a regression: `localStorage`
  had zero access control either. It *is* a real tradeoff: anyone holding the anon key
  (which ships in the client bundle by design — that's what `NEXT_PUBLIC_` means) can
  read and write every row in the `biofresh` schema. Acceptable for an internal co-op
  tool; do not point buyer-facing code at this schema with the anon key, and revisit this
  if BioFresh ever gets real user accounts.
- **The sync pattern — read this before editing `use-biofresh.ts`.** All ~30 store
  actions are untouched from the localStorage version; they still call `set((s) => ...)`
  exactly as before. The only change is that `set` is now a **wrapper**: it runs the
  real update, diffs the previous and next state by reference (every action already
  creates a new array/object only where something changed, and reuses the old reference
  otherwise — that's what makes a generic diff possible without inspecting each action),
  and pushes just the changed rows to Supabase. Business logic never had to learn
  Supabase exists.
  - `rawSet` bypasses the wrapper. Use it only for (a) adopting a snapshot just pulled
    from Supabase, and (b) merging a realtime event that just arrived from another
    device. Routing either of those through the syncing `set` would immediately
    re-upload data that already came from the database, and for realtime specifically
    that creates an infinite echo between two open tabs.
  - `src/lib/supabase/mappers.ts` — one `xToRow` / `xFromRow` pair per table, camelCase
    domain object <-> snake_case row. Nested structures (`spec`, `protocol`, `options`,
    `incidents`, `qc`, `outcome`, `guide`) pass straight through as JSONB with no
    per-field column — that's a deliberate shortcut to avoid a relational redesign, not
    an oversight.
  - `src/lib/supabase/sync.ts` — `pullAll` (initial load), `pushAll` (first-run seed
    publish and `resetDemo`), `syncDiff` (the generic per-action push), `wipeAll`
    (`resetDemo`), `subscribeRealtime` (cross-device push).
- **Boot sequence** (`ensureSeeded`, called once per tab from `useSeed()`): pull all
  tables → if `coop_config` exists, adopt it via `rawSet` (no push-back) and start the
  realtime subscription → if it doesn't, generate the local demo seed, `rawSet` it, then
  `pushAll` it so every other device sees the same starting point. If Supabase is
  unreachable, catch the error and fall back to a local-only seed so the UI isn't blank
  — that fallback is not synced anywhere and diverges silently, which is fine for a demo
  and wrong for anything else.
- **"Config exists" means "set up", and that is only true for tables that existed when the
  database was first seeded.** This has already bitten once, and the failure was silent: the
  shared database was seeded before pickers shipped, so `farmers` came back empty and every
  `assigned_farmer_ids` was `[]`. Because `coop_config` was present, the first-run branch
  never ran again, nothing in the UI could add a picker, and `/pick` showed an empty "Who is
  picking?" list on every device, permanently. `ensureSeeded` now runs `backfillRoster`
  (`lib/domain/picking.ts`) on the adopt path and publishes the repair with `syncDiff`. It
  only ever fills a roster that is *empty* and only assigns teams to jobs that have *none*,
  so a co-op's own roster and the supervisor's own team choices are never overwritten.
  **Any future collection added after launch needs the same treatment** — a migration alone
  creates the table but leaves it empty forever on databases that predate it.
- **Realtime** covers `orders`, `market_signals`, `harvest_orders`, `batches`,
  `allocations`, `decision_cases` — not `coop_config` or `activity`. Config and activity
  still catch up on the next full reload (every reload re-runs the boot sequence above,
  since only `role` persists locally now), just not while a tab stays open. That gap is
  intentional scope-trimming, not a bug — extending realtime to those two is a small,
  contained follow-up if it's ever needed.
- **`.env`** holds `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (gitignored; `.env.example` documents the shape). `service_role` must never appear
  here or anywhere in this repo — it grants full access bypassing RLS entirely.
  No `GEMINI_API_KEY` belongs here: the v1 prototype used Gemini, the MVP rebuild
  dropped every AI feature (see "No forecasting models" above), and a real Gemini key
  was once pasted into chat during this project's history and should be treated as
  revoked — don't resurrect it from scrollback.

## Decision Room assistant (Gemini)

- `src/app/api/advisor/route.ts` — **server route only**. `GEMINI_API_KEY` has no
  `NEXT_PUBLIC_` prefix on purpose: unlike the Supabase anon key it is a billable secret
  and must never enter the browser bundle. Never move this call client-side.
- The model is handed *finished* options and returns a pick plus prose. The route then
  checks `recommendedOptionId` against the ids it sent and returns 502 if the model
  invented one. Keep that check — it is the guardrail that makes the feature safe.
- `src/lib/domain/advisor.ts` assembles the factual payload (options with computed
  figures, open orders for that product, live signals) and calls the route. It is pure
  apart from the `fetch`, and never throws — failures come back as a message.
- **Degrades cleanly**: no key, or any error, and the Decision Room shows the message
  and keeps its rule-based recommendation. The app must always be fully usable without
  Gemini; the assistant is an addition, never a dependency.
- Model: `gemini-2.5-flash` with `responseSchema` + `responseMimeType: application/json`,
  temperature 0.3. Structured output is what keeps parsing reliable.
- The UI labels the output "an opinion, not a calculation" next to the audited figures.
  Keep that distinction visible; it is the honest framing this feature depends on.
- **The assistant must be shown the same objective the rules rank by.** `recommendedOption`
  does not pick the highest expected value — it sorts by `riskAdjustedValue`, which discounts
  expected value for risk and for how long cash stays tied up. When the payload carried only
  `netValue` and `expectedValue`, the model correctly maximised expected value, landed on a
  different option, and the panel badged that as "differs from the calculated pick" — a
  disagreement that was never real, just an information gap presented to the manager as a
  second opinion. `buildAdvisorRequest` now sends `riskAdjustedValue` per option and the
  prompt names it as the ranking figure. If you add another term to the ranking, add it to
  the payload in the same commit, or spurious disagreements come straight back.
- **Figures shown to the model must round the way the UI rounds.** `hoursToDeadline` uses
  `Math.trunc`, not `Math.round`, because the cards render `untilText`, which floors — the
  assistant saying "19 hours" beside a card reading "18h overdue" looks like it is working
  from different data.
- **Free text in the payload is untrusted.** Buyer names, market names and option details are
  typed by staff, and they land inside the prompt. `SYSTEM_RULES` ends with an explicit
  data-not-instructions boundary; the option-id check is the backstop that keeps the blast
  radius to prose. Verified against injected "ignore all previous instructions" buyer and
  market names — the model held its pick, invented no figure and leaked no prompt.
- **Both ends have a deadline** — `AbortSignal.timeout` on the Gemini call (20s) and on the
  client fetch (25s), plus an `AbortController` the panel aborts on unmount. Without them a
  stalled call left the panel on "Thinking…" forever, on the one part of the screen that is
  meant to be optional. The route also caps options/rows and answers 413, so a malformed
  case can't bill an unbounded prompt.
- **A verdict is only valid for the figures it was written about.** The panel keeps the
  option signature it asked with and shows "the figures have changed" instead of stale prose
  once allocations or expiring signals move the numbers.

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

- **Never call `createClient(...)` at module scope in code that's part of the client
  bundle's import graph from the root layout down.** `src/lib/supabase/client.ts`
  exports a lazy `getSupabase()` (memoized, built on first call) instead of an eager
  `export const supabase = createClient(...)` for exactly this reason: an eager call
  sits in the module graph that `use-biofresh.ts` → every "use client" page pulls in,
  so if it throws during initial module evaluation, the entire client bundle fails to
  initialize — React never calls `hydrateRoot`, no error overlay appears, no console
  error is logged, every click silently no-ops, and the page looks like plain static
  HTML. This is *not* a Turbopack quirk, it's inherent to how a thrown top-level
  statement poisons everything that (transitively) imports that module. If a future
  Supabase-adjacent module addition ever needs to construct something at import time,
  wrap it in a function and call that function lazily instead — never let a network
  client construction happen as a side effect of `import`.

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
- **supabase-js query builders are `PromiseLike`, not `Promise`.** `.then(...)` works,
  but you can't push the resulting thenable into a typed `Promise<T>[]` array or
  `Promise.all` it without a type error. Just `await` each call in sequence instead of
  collecting a promise array — see `syncDiff`/`pushAll` in `src/lib/supabase/sync.ts`.
- **TS can't correlate a union-typed key used twice.** Looping `for (const key of
  Object.keys(TABLES))` and then indexing both `snapshot[key]` and `TABLES[key].toRow`
  with that same `key` does not let TypeScript prove they're the *same* member of the
  union — each access is checked independently. Cast through `unknown` at that one call
  site (see `syncCollection`'s caller in `sync.ts`) rather than fighting the generic.

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

If `.env` is missing or Supabase is unreachable, the app still runs on the local-only
fallback seed (see "Boot sequence" above) — don't mistake that for the sync layer
working. To verify sync for real, open the app in two tabs (or two browsers) and confirm
an action in one appears in the other without a manual refresh.

## Known debt

- **No dark mode.** The design skill wants both themes designed together; this touches
  every component and was deliberately deferred. Tokens are already in place for it.
- **The Decision Room coefficients are placeholders.** Transport costs, channel price
  factors and confidence values in `src/lib/domain/decisions.ts` are sample numbers, not
  the co-op's real ones. They must be replaced before demoing to real operators — the
  output looks authoritative and currently isn't.
- **Human-readable IDs can collide under real concurrent writes.** `addOrder` builds
  `DH-${1046 + orders.length}`, and `addSignal`/harvest-order/batch codes follow the same
  "prefix + current array length" pattern. Two devices creating an order in the same
  moment, before either has seen the other's latest count, can generate the same ID —
  the second `upsert` silently overwrites the first instead of erroring. `uid()` (used
  for allocations, activity, incidents) already avoids this with a time+counter suffix;
  the sequential-looking IDs don't, because that read­ability was a deliberate demo
  choice. A real fix needs a server-side atomic counter (a Postgres sequence or RPC), not
  a client-side change — left as-is because the collision window is small for a handful
  of co-op staff, but it is a real bug path, not a hypothetical one. If two orders ever
  show the same ID in practice, this is why.
- **RLS is fully open**, by design — see "Data layer: Supabase" above. Revisit if this
  app ever adds real authentication.
- **No live sync for `coop_config` or `activity`** while a tab stays open — see
  "Realtime" above. Catches up on the next reload.
