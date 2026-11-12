# Product

Read by design tooling (the `impeccable` skill). Facts come from `CLAUDE.md` and `docs/design.md`; when they disagree, those files win.

## Register

product

## Users

One person (O), the owner, who runs Ledge on a home server and uses it every day for a year or more. Often on a phone, one-handed, in short bursts: logging an expense right after paying, checking what is due, ticking off a task. Also at a desk on a laptop for longer reviews of the month.

## Product Purpose

An everyday ledger: one calm book for the things you keep track of. The name comes from ledger, the book where you write things down. Today it holds tasks (lists, views, quick add) and an expense tracker that replaces O's Google Sheet (income, EMIs and loans, expenses, investments, with a monthly and yearly summary). Success is O preferring it to the sheet and to Todoist: fast capture, numbers that are always right, nothing in the way. Later it grows into an app for life's essentials (a blog, a journal, reminders, health), and O means to let other people use it too, so the product copy no longer talks about self-hosting.

## Brand Personality

Calm, quick, exact. The voice is short, plain and human, in sentence case. Closer to Linear, Things and Notion than to a busy finance dashboard. Delight comes from things feeling instant and well made, not from decoration.

## Anti-references

- Cluttered admin dashboards: boxes inside boxes, a button on every row, many places to look.
- "Vibe-coded" MVP looks: stock shadcn grey, default selects everywhere, generic hero metrics.
- Fintech clichés: navy and gold, neon gradients, glassmorphism.

## Design Principles

1. One clear thing per block: one big number, one list, one breakdown.
2. Phone first: thumb-reachable actions, 44px targets, sheets that swipe, no sideways scroll.
3. Instant feel: optimistic updates, skeletons with the real shape, motion only to explain change.
4. Exact and honest: money in integer minor units, state shown by word and icon, never colour alone.
5. Earned familiarity: standard patterns done carefully rather than invented ones.

## Accessibility & Inclusion

WCAG 2.1 AA in light and dark (axe audit in the test suite), full keyboard operation with visible focus, `prefers-reduced-motion` respected everywhere, tap targets of at least 44px on phones, no information by colour alone.
