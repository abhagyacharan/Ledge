# Logo design prompt: Ledge

Paste everything below the line into a session with the **SVG Logo Designer** skill (`.agents/skills/svg-logo-designer`), or give it to a designer. The brand facts come from `PRODUCT.md` and `docs/design.md`; if those change, update this prompt.

---

Design a logo for **Ledge**, using the SVG Logo Designer skill. I want a mark with real meaning behind it, made to a professional standard: something that would sit comfortably next to Linear, Things or Stripe, not a template icon.

## What Ledge is

Ledge is a self-hosted personal life-management app. One person runs it on a home server and opens it every day, mostly on a phone, in short bursts: logging an expense right after paying, checking what is due, ticking off a task. It has two parts today:

- **Expense Tracker**: income, EMIs and loans, expenses and investments, with monthly and yearly totals. It replaced a Google Sheet.
- **Tasks**: lists, today, upcoming, quick add.

More modules (notes, goals, a calendar) may come later, so the logo must stand for the whole app, not only money or only tasks.

**Personality:** calm, quick, exact. Short, plain, human. Delight comes from things feeling well made, not from decoration.

## The meaning to build on

The name carries three ideas. A strong concept uses at least two of them in a single shape, not a collage.

1. **A ledge is a place to set things down.** A narrow, flat shelf where you put what you are carrying so your hands are free. This is the app's job: get a task or an expense out of your head and somewhere safe, in two seconds.
2. **A ledge is a foothold.** On a climb, a ledge is where you stand, rest and look at how far you have come. Daily small steps (a task done, a month saved) add up to height. It suggests steady progress without hype.
3. **Ledge is "ledger" without the last letter.** An account book. Accountants draw a **double rule** under a final total: the bottom line, settled and correct. It stands for numbers that are always right.

The current placeholder mark is a capital **L** standing on a double rule (the stem plus two horizontal lines). It points the right way. Improve on it, or beat it, but keep its plainness.

## Concepts to explore (3 to 4)

Give each concept a name and a two-sentence rationale saying which meanings it carries and how.

- **A. The shelf L.** The L's foot is the ledge itself, with something small and square resting on it (a task, an entry, a coin). Set down, safe, done.
- **B. The bottom line.** A refined L-over-double-rule: tune the proportions, stroke weight, gap and terminals until it reads as a deliberate symbol at 16px and at 512px.
- **C. The foothold.** Two or three ascending ledges (stepped horizontals) that also read as an abstract L or as rows in a ledger. Progress, one step at a time.
- **D. Your own idea**, if you find a stronger metaphor that is still honest to the three meanings above.

## Visual rules

- **Geometric and minimal.** Straight lines, square or slightly rounded terminals, built on a grid (design on a 32 × 32 or 24 × 24 grid, with whole or half-unit coordinates). It must look sharp as a 16px favicon.
- **Works in one colour first.** Every concept must hold up in solid near-black and in solid white. Colour is an extra, not a crutch.
- **Palette (from the app, use these exact values):**
  - Ink `#111214` (light backgrounds), `#f2f4f1` (dark backgrounds)
  - Orange accent `#f26b21`, for a single small detail at most (the item on the shelf, or one rule). Never put text on it.
  - Deep green-black `#121514`, the colour of the sign-in cover panel, good as an app-icon background.
- **Wordmark:** "Ledge" in sentence case (capital L, the rest lower case). The app's display face is **Bricolage Grotesque** (semi-bold, slightly tight tracking). Use it, or convert it to outlined paths so the SVG needs no font. Kern "Le" and "dg" by eye.
- **No:** gradients, glows, shadows, 3D, glassmorphism, navy and gold, coins with currency symbols, check-mark clichés, clipboards, piggy banks, mountains with flags, colour emoji, anything that reads as a bank or a crypto app.
- Must not resemble any existing well-known logo.

## Deliverables

For each concept:

1. **Icon only** (square, 32 × 32 viewBox): the favicon and app icon.
2. **Horizontal lockup**: icon left, wordmark right, icon height matched to the wordmark's cap height or x-height (say which, and why).
3. **Colour versions:** ink on light, light on dark, and one with the orange accent.

Then, for the concept I pick:

4. **App icon**: the mark centred on a `#121514` rounded square, with safe padding for iOS and Android masks, at 512 × 512.
5. **Small-size check**: show the icon at 16, 24, 32 and 64px side by side, and adjust strokes if the 16px version clogs.
6. **Short usage notes**: clear space, minimum size, and do's and don'ts.

## Technical

- Clean, hand-written SVG: `viewBox` only (no fixed width or height), grouped as `#icon` and `#wordmark`, two decimal places at most, no editor metadata.
- Icon-only SVGs use `currentColor`, so the app can colour them for light and dark mode.
- Include `<title>Ledge</title>` and `role="img"` in standalone files.
- Save files to `public/brand/` named `ledge-<concept>-<layout>-<colour>.svg`, for example `ledge-shelf-icon-ink.svg`.
- Show all concepts on one comparison page (light and dark halves) so I can choose.

Finish by recommending one concept and saying why it is the strongest for an app I will open every day for years.
