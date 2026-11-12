# Ledge logo: usage notes

The chosen logo is **B, the bottom line** (O, 2026-11-12): a capital L standing on the double rule an accountant draws under a final total. The visual sheet is [`logo.html`](logo.html); open it in a browser. The other three concepts are kept for reference in [`concepts.html`](concepts.html); the brief is [`logo-prompt.md`](logo-prompt.md).

## Files (`public/brand/`)

| File                                | Use                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `ledge-horizontal-ink.svg`          | Default logo on light backgrounds (headers, documents)                       |
| `ledge-horizontal-light.svg`        | Default logo on dark backgrounds                                             |
| `ledge-horizontal-accent.svg`       | With the orange second rule, on light, where one orange detail is welcome    |
| `ledge-horizontal-accent-dark.svg`  | The same, on dark                                                            |
| `ledge-icon-ink.svg` / `-light.svg` | The mark alone, one colour                                                   |
| `ledge-icon-accent.svg` / `-dark`   | The mark alone with the orange rule                                          |
| `ledge-favicon.svg`                 | Browser tab icon: ink and orange; light and lighter orange in dark mode      |
| `ledge-app-icon.svg`                | 512 × 512, rounded square on the cover green-black (web, desktop, PWA "any") |
| `ledge-app-icon-maskable.svg`       | 512 × 512, full-bleed square for Android and iOS, which cut their own shape  |

Inside the app, use the components in `src/components/shell/brand.tsx` (`Brand`, `LedgeMark`, `BrandTile`, `Wordmark`). They draw the L and the word in `currentColor` and the second rule with `fill-dash-accent`, so both follow light and dark mode:

```tsx
<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden>
  <path d="M6 4h4v12h16v4H6z" />
  <path d="M6 24h20v4H6z" className="fill-dash-accent" />
</svg>
```

## Construction

- Drawn on a 32 × 32 grid. One stroke, **s**, is 4 units. The stem, both rules and both gaps are each one stroke. The mark is 5 s wide and 6 s tall, centred on the grid (x 6 to 26, y 4 to 28).
- The L is 24 units tall, the same as the wordmark's cap height, so in the lockup the icon's L and the word's L match.
- Wordmark: "Ledge" in Bricolage Grotesque, weight 600, optical size 96, width 100, tracking −10 units, with the font's own kerning. It is outlined to paths, so the files need no font.
- Lockup gap: 9 units (about 2.25 s) from the end of the rules to the stem of the word's L.

## Clear space and minimum size

- Keep **2 s** of empty space on every side of the mark or lockup (at 32px that is 8px). Nothing else inside it.
- Smallest icon: **16px**. Best pixel sizes are multiples of 16 (16, 32, 48, 64): every edge lands on a whole pixel. At 16px each bar is exactly 2px wide, checked with no blurred pixels. At 24px a few edges fall between pixels and soften slightly; that is fine, but prefer 16 or 32 where you choose.
- Smallest lockup: a cap height of **12px** (about 75px wide), where the bars are 2px.

## Colours

| Name         | Hex       | Use                                              |
| ------------ | --------- | ------------------------------------------------ |
| Ink          | `#111214` | Mark and word on light backgrounds               |
| Light        | `#f2f4f1` | Mark and word on dark backgrounds                |
| Orange       | `#f26b21` | The second rule only, on light. Never under text |
| Orange, dark | `#f58445` | The second rule only, on dark                    |
| Cover        | `#121514` | App icon background                              |

**The orange second rule is the default everywhere** (O, 2026-11-12): web, phone, sign-in, favicon and app icons. The one-colour files are only for places that cannot show orange, such as one-colour printing. The logo's orange does not count against the app's one-orange-tile-per-screen rule (`docs/design.md`); it is part of the logo, not a highlight.

## Do

- Use the files as they are, at any size from the minimum up, scaled evenly.
- Use ink on light and light on dark, with enough contrast (at least 3 to 1 for the mark).
- Use the icon alone where space is tight; use the lockup where there is room for the name.

## Don't

- Stretch, squash, rotate, slant or outline the mark.
- Change the spacing between the bars, or make the rules thinner than the stem.
- Colour the L orange, or both rules orange. Only the second rule may be orange.
- Add shadows, glows, gradients or 3D.
- Retype the wordmark in another font, or set "Ledge" in capitals.
- Put the logo on busy photos or patterns without a plain panel behind it. One exception: on the phone sign-in page the wordmark sits on the grain gradient under the tile, with a soft shadow so it stays readable.

## In the app (since 2026-11-12)

- `Brand` in `src/components/shell/brand.tsx` draws the full lockup inline (sidebar 90 × 27px with 3px strokes; sign-in cover 120 × 36px with 4px strokes). `LedgeMark` is the mark alone. All of them use the orange rule.
- Phones: app pages carry no logo (a logo row was tried and removed; the page title comes first). Search moved from the header's round button into the bottom tab bar there; the round button shows from tablet width up.
- Phone sign-in and sign-up: `BrandTile` (the app icon as a 48px tile, 4px strokes) with `Wordmark` beside it (92×32, capitals 24px tall like the mark in the tile), centred above the card. Wide screens keep the lockup on the cover panel.
- Always-dark places (the sign-in cover, the tile) set `--dash-accent` to the dark orange `#f58445`.
- `src/app/icon.svg` is `ledge-favicon.svg` (ink and `#f26b21`; light and `#f58445` in dark mode).
- `src/app/favicon.ico` (16, 32, 48) is the light mark with the orange rule on a dark rounded tile, for browsers that ignore SVG icons; an `.ico` cannot follow the theme, so it brings its own background.
- `src/app/apple-icon.png` is 180 × 180, full bleed, with the orange rule; every edge lands on a whole pixel (3.5px per grid unit).
- `src/proxy.ts` lets `apple-icon.png` through without sign-in, like the other two icons.

## Not done yet

- No web app manifest, so no 192 and 512 PNGs; Android falls back to the Apple icon or the favicon. Add one only if O wants "install as an app".
