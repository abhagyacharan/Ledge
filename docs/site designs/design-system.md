# Ledge site: design system

For the public showcase page of Ledge (not the app). Feed this file to Claude Design together with `claude-design-prompt.md`. It starts from the app's own tokens (`docs/new_design.md` §2), so product screenshots sit on the page without a colour clash, and adds what a marketing page needs: bigger type, a serif accent, more orange, dark sections.

---

## 1. Personality

Calm, quick, exact. A well-made notebook, not a fintech dashboard. Confident big type, lots of air, real product UI as the illustration. Orange is the one loud thing, and it shows up often enough to feel like the brand (about 8 to 10% of any screenful), never as a neon wash.

Avoid: navy and gold, neon gradients, glassmorphism, stock 3D blobs, emoji, fake ratings or user counts, "AI-powered" badges, boxes inside boxes.

---

## 2. Colour

Every colour is a CSS custom property on `:root` / `[data-theme="light"]`, redefined under `[data-theme="dark"]`. Dark sections on a light page set `data-theme="dark"` on the section, so the same tokens flip inside it.

### Core (same values as the app)

| Token                  | Light                          | Dark                  | Use                                               |
| ---------------------- | ------------------------------ | --------------------- | ------------------------------------------------- |
| `--canvas`             | `#eef0ec`                      | `#121514`             | Page background; dark sections                    |
| `--card`               | `#ffffff`                      | `#1d211f`             | Cards, phone screens, FAQ items                   |
| `--well`               | `#f4f4f2`                      | `#282d2a`             | Inputs, chips, icon circles, fact rows            |
| `--track`              | `#dde1da`                      | `#282d2a`             | Quiet panels (the "Before" card), bar tracks      |
| `--edge`               | `#e6e7e3`                      | `#ffffff1a`           | 1px outlines and dividers                         |
| `--ink`                | `#111214`                      | `#f2f4f1`             | Text, primary buttons                             |
| `--soft`               | `#5b5f66`                      | `#aeb4ae`             | Secondary text (passes 4.5:1)                     |
| `--on-ink`             | `#ffffff`                      | `#111214`             | Text on `--ink`                                   |
| `--good` / `--good-bg` | `#166534` / `#dcfce7`          | `#86efac` / `#14532d` | Done, saved, paid                                 |
| `--bad` / `--bad-bg`   | `#b42318` / `#fee4e2`          | `#fca5a5` / `#7f1d1d` | Overdue, high priority                            |
| `--warn` / `--warn-bg` | `#92400e` / `#fef3c7`          | `#fcd34d` / `#713f12` | Medium priority, delayed                          |
| `--shadow`             | `0 1px 2px rgba(17,18,20,.06)` | `none`                | Card lift                                         |
| `--cover`              | `#121514`                      | `#121514`             | Phone bezels, the always-dark footer and sections |

### Orange (the brand)

| Token             | Light     | Dark      | Use                                                                                                                                                     |
| ----------------- | --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--accent`        | `#f26b21` | `#f58445` | Fills: highlighter bar under a headline word, step numbers on dark, CTA arrow circle, caret, dots, progress bars, the logo's second rule, open FAQ icon |
| `--accent-text`   | `#b83a08` | `#f58445` | Orange **text** on light backgrounds: mono eyebrows, small labels (5.0:1 on canvas). Never put `#f26b21` text on light, it fails contrast               |
| `--accent-deep`   | `#cc420b` | `#cc420b` | Start of the toned-down orange panel gradient                                                                                                           |
| `--accent-deeper` | `#a63409` | `#a63409` | End of that gradient                                                                                                                                    |
| `--on-accent`     | `#fff4ec` | `#fff4ec` | Text on the deep orange panel (4.8:1 or better)                                                                                                         |
| `--accent-soft`   | `#fde3d2` | `#3a2418` | Peach wash: glow behind the hero phone, hover tint, the light variant of the orange panel (ink text on it is 15:1)                                      |

**Where orange goes on this site** (more than in the app, on purpose):

- One word per big headline gets the orange highlighter bar or the orange serif italic (not both in the same headline).
- Every section eyebrow (the small mono label above a headline) is orange.
- Primary CTA: ink pill with an orange arrow circle at its right end.
- Step numbers in "How Ledge works", the caret in input demos, the voice ring, toast "Undo", list bullets as small orange dots.
- One full orange section: "In your pocket. At your desk." on the deep gradient (`--accent-deep` → `--accent-deeper`, 135deg), not flat `#f26b21`.
- The final "." in the big footer wordmark.

**Never:** orange body text, orange on orange, orange as the only signal of a state, more than one full orange section.

---

## 3. Type

Four faces. The first three are the app's; the fourth is a marketing-only accent.

| Token     | Font                | Job                                                                            |
| --------- | ------------------- | ------------------------------------------------------------------------------ |
| `--fig`   | Bricolage Grotesque | Headlines, big figures, card titles, the wordmark                              |
| `--serif` | Instrument Serif    | One or two words inside a headline, set italic, at 1.08em of the headline size |
| `--ui`    | Geist               | Body, buttons, nav, FAQ                                                        |
| `--mono`  | IBM Plex Mono       | Eyebrows, money, dates, times, keyboard keys, "Understood as" labels           |

All four are on Google Fonts. Bricolage has a width and optical-size axis; use `opsz` 96 for display sizes.

### The variation rule (what made site 2 feel rich)

Headlines mix weights and faces inside one line: **Bricolage 700, tight tracking** for most words, then **one word in Instrument Serif italic** (or one word with the orange highlighter bar). Examples: "Every day, _accounted_ for." · "Say it. Or _type_ it." · "In your pocket. _At your desk._" Body text never mixes faces.

### Scale

| Role              | Font, weight           | Size (fluid)                | Line height | Tracking |
| ----------------- | ---------------------- | --------------------------- | ----------- | -------- |
| Hero headline     | Bricolage 700          | `clamp(52px, 8vw, 120px)`   | 0.92        | −0.045em |
| Section headline  | Bricolage 700          | `clamp(40px, 5.4vw, 80px)`  | 0.95        | −0.04em  |
| Card / step title | Bricolage 600          | 22 to 26px                  | 1.15        | −0.02em  |
| Big figure        | Bricolage 600          | 30 to 52px                  | 1           | −0.02em  |
| Lead paragraph    | Geist 400              | `clamp(17px, 1.5vw, 20px)`  | 1.55        | 0        |
| Body              | Geist 400              | 15 to 16px                  | 1.6         | 0        |
| FAQ question      | Geist 600              | 17 to 18px                  | 1.35        | 0        |
| Eyebrow           | Plex Mono 500          | 12 to 13px, sentence case   | 1           | 0        |
| Money, time       | Plex Mono 500, tabular | inherits                    |             | 0        |
| Footer wordmark   | Bricolage 700          | `clamp(120px, 24vw, 360px)` | 0.8         | −0.06em  |

Copy is sentence case everywhere. Money uses lakh grouping (`₹1,23,456`) and a true minus (`−₹640`). Dates read "Fri, 13 Nov".

---

## 4. Space, radius, size

- Spacing scale: 4, 8, 12, 16, 20, 24, 28, 40, 56, 72, 96, 120, 140 (px). Sections: 96 to 140px top and bottom on desktop, 72px on phones.
- Content width: 1160 to 1280px max, side padding `clamp(16px, 5vw, 88px)`. Phone gutter 16px. No sideways scroll.
- Radius: 999px pills, chips, buttons · **28px feature boxes and big cards** · 40px dark and orange section panels (inset 12px from the page edge, so the light canvas shows as a frame) · 20px FAQ items, floating cards · 16px inputs, list cards · 52px / 42px phone bezel / screen.
- Tap targets 44px or more. Primary CTA 56 to 60px tall.
- Icons: Lucide line icons, 1.75px stroke. No emoji anywhere, including the product mockups.

---

## 5. Components

- **Nav**: logo left (the L tile with the orange second rule, plus "Ledge" in Bricolage 600), a centred frosted pill holding 3 or 4 links (white at 72% with 12px blur, 1px edge), an ink "Log in" pill on the right. On phones the pill collapses to a menu button; Log in stays.
- **Primary CTA**: ink pill, 60px, Geist 600 17px, then a 42px orange circle with an up-right arrow inside the pill's right end.
- **Secondary CTA**: text plus icon, or a 1.5px ink outline pill.
- **Eyebrow chip**: frosted pill with a small icon and one short line (hero only); elsewhere just orange mono text.
- **Phone mockup**: `--cover` bezel 10px, 52px outer radius, real Ledge screens inside, status bar 9:41, the floating pill tab bar (Home, Tasks, Expenses, Journal) plus the round + button.
- **Floating card**: white, 20px radius, edge ring plus a long soft shadow, mono eyebrow, one fact. Used around the hero phone.
- **Feature box** (How Ledge works): a square card, 28px radius, `--card` on the dark section, with one cropped piece of real UI centred inside. Below it: orange mono step number, Bricolage title, one Geist sentence.
- **Chip**: 32 to 44px pill, `--well` fill or 1px edge ring, icon plus label; selected = ink fill.
- **FAQ item**: separate white card per question, 20px radius, 64px min height, round 32px icon button on the right (`--well` with plus; `--accent` with minus when open). One open at a time.
- **Dark panel**: `data-theme="dark"` section on `--canvas` dark, 40px radius, 12px inset.
- **Toast**: ink pill with a check, short text, and "Undo" in orange.

---

## 6. Motion

- 150 to 250ms for UI, `cubic-bezier(.2,.8,.2,1)`. Scroll reveals: 12px rise plus fade, once, 60ms stagger, no bounce.
- Hero phone: screens cross-fade and slide 8px when switching; auto-advance every 4.5s, pause on hover, focus or tap, and stop after the first user interaction.
- Voice ring: grows around the + button over 0.5s, then a live level meter.
- Respect `prefers-reduced-motion`: no auto-advance, no marquee, no parallax; switches become instant.

---

## 7. Accessibility

WCAG AA in both themes (orange text only via `--accent-text`), visible focus rings (2px, offset 2px), every interactive mockup also works by keyboard (tabs are real buttons with `aria-selected`), headline words in serif or with the highlighter are still plain text, and the giant footer wordmark is `aria-hidden`.
