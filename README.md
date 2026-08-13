# BioFresh OS — Minimum Viable Product

Post-harvest operations software for a co-operative handling perishable produce.
This release covers exactly two things: **the four information breakdowns** and
**surplus decision support**.

> Buyers are **not** users of BioFresh. They keep sending orders and specs the way
> they already do — Zalo, email, phone. Sales enters that into the system. The only
> thing a buyer ever sees is the **Process Passport**, opened by scanning a QR code,
> read-only.

## The four breakdowns this solves

| Breakdown | How the product handles it |
| --- | --- |
| Market blindness | Sales records every order and market signal in one place |
| Sales cannot see real inventory | The packhouse confirms grading, and sellable inventory updates immediately |
| Buyer standards never reach the field | The spec becomes a visual picking guide for the field automatically |
| Surplus is handled too late | Unallocated sub-lots enter the Decision Room with comparable options |

## Four roles, one database

| Role | Screen | Primary actions |
| --- | --- | --- |
| Sales | `/sales` | Enter orders and specs, record market signals, allocate batches |
| Field Supervisor | `/field` | Read the picking guide, update picked weight, report incidents |
| Packhouse / QC | `/packhouse` | Confirm intake, enter real grades, log the six protocol steps |
| Manager / Co-op Director | `/manager` | Decide how to clear surplus, watch operations, tune configuration |

The active role follows the screen in view — standing on the packhouse screen means
working as the packhouse, so every action is attributed to the right person.

Also: `/batches` batch list, `/batches/[id]` full batch record with its QR code, and
`/p/[id]` the public Process Passport for buyers.

## A batch's journey

```
PLANNED → HARVESTING → RECEIVED → GRADED
   → ALLOCATED / UNALLOCATED → DECISION PENDING → PROCESSING/PACKING
   → SHIPPED → CLOSED
```

A source batch splits into **sub-lots by grade** (Grade A / Grade B / Processing /
Reject) the moment the packhouse confirms the grading result.

## BioFresh Field Protocol — six mandatory steps

`Sorting → Solution prep → Dip/Spray → Drying → Packing → Data sync`

Steps must be logged in order, each with a timestamp and the person who logged it.
**A batch cannot be marked "processing complete" until all six are recorded.** This is
the only content a buyer sees when they scan the QR code.

## Alert rules

All of them are explicit rules — there is **no forecasting model**:

- **Order shortage** — available inventory is below what a confirmed order still needs.
- **Over-allocated** — more has been allocated than the order asked for.
- **Surplus** — graded but unallocated weight exceeds the co-op's configured threshold.
- **Batch at risk** — the action deadline is close (deadline = grading time + the
  product's configured action window, set by a person).
- **Specification updated** — when Sales edits a spec, the picking guide updates itself
  and the field is notified.
- **Protocol incomplete** — a batch is in processing without all six steps logged.

The surplus threshold and the urgency window are editable at `/manager` → Configuration.

## Decision Room

Every unallocated sub-lot produces five options: **sell now / switch channel / preserve /
send to processing / hold**. Each option shows:

- **Expected value** = net value × confidence.
- Net value, extra cost, days to cash, risk level.
- **Data source** — always traceable back to an order, a market signal entered by Sales,
  or the internal reference price.

Confidence reflects whether a confirmed buyer exists. That is what stops "hold" from
looking like the best option merely because nobody has bid yet. The **Explain** button
writes out the reasoning for any option and compares it against the strongest one.

Once a decision is confirmed, the system creates the matching allocation and generates
**follow-up tasks** assigned to the right role.

## Out of scope for this release — deliberately NOT built

- A buyer app or buyer accounts.
- Computer vision for automatic fruit grading.
- Satellite, disease or yield forecasting.
- An AI model predicting remaining freshness.
- Direct data integration with supermarket systems.
- Full farm management and payroll.

## Running the project

```bash
npm install
npm run dev
```

Open http://localhost:3000. Demo data loads automatically and lives in the browser's
`localStorage` — no server and no environment variables required. **Reset data** at the
bottom of the sidebar reloads the original dataset.

```bash
npm run build     # production build
npx eslint src    # lint
npx tsc --noEmit  # typecheck
```

## Design system

The interface follows the `ui-ux-pro-max` skill's rules: no emoji as icons (products are
marked with a coloured two-letter chip), a single Lucide icon family, 44px touch targets
on phones tightening to a dense layout on desktop, one motion rhythm (150–200ms, ease-out)
that respects `prefers-reduced-motion`, a four-step elevation scale, semantic colour tokens
rather than raw hex, and tabular figures everywhere numbers line up in columns.

To reinstall the skill:

```bash
npx ui-ux-pro-max-cli init --ai claude
```

## Code layout

```
src/
  app/(app)/          role screens plus the batch list and batch record
  app/p/[id]/         public Process Passport (never exposes internal data)
  lib/domain/         pure business rules: inventory, alerts, decisions,
                      picking guide, the six-step protocol
  store/use-biofresh  shared state (zustand + persist)
  components/         role-specific UI and shared building blocks
```

Business rules live in `lib/domain` and depend on nothing in the UI — swapping
`localStorage` for a real database leaves that layer untouched.
