# The public page about Ledge

_Built on 21 November 2026._

## What it is

Until now, anyone who opened Ledge's web address without being signed in was sent straight to the sign-in page. Now they see a **public page** first: a page that explains what Ledge is, with moving pictures of the real app. People who are signed in still go straight to their Home page, exactly as before.

The page lives at `/welcome`. When a signed-out visitor opens the plain address (`/`), Ledge quietly shows them the same page without changing the address. Every other page of the app (Tasks, Expenses, Journal and so on) still sends a signed-out visitor to sign-in.

## Where the design came from

You designed the page yourself in Claude Design, after two drafts. The brief, the colours and fonts, and the reference pictures are in `docs/site designs/`. The page was then rebuilt by hand inside the app so it can be served from the same place.

## What is on it, from top to bottom

1. **The top.** The word "Ledge." with an orange full stop, like the giant one in the footer (it replaced the logo tile on 22 November), four links (The problem, How it works, Capture, FAQ; Capture is the Say it, or type it section) and a Log in button. Clicking a link glides down to that section. On a phone the links fold into a menu button. Further down the page the same links follow you: scroll up a little and a slim white bar with them slides in at the top; scroll down to read and it slides away again. The section you are in is shaded in that bar. On a laptop the top is split in two halves (22 November, so it takes less height): on the left the headline, "One calm place to run your day.", with the word "calm" in a slanted serif letter style, the short pitch and the Open Ledge button; on the right the phone with its row of screen buttons under it. On a tablet or phone the headline comes first, then the phone, then the pitch and buttons, so the app is the first thing a visitor sees.
2. **A working phone.** A phone showing four real screenshots of the app: Home, Today, the expense summary and a journal page. They were taken from the app itself with the demo account, by an automatic script (`tests/e2e/site-shots.spec.ts`), so they always look exactly like Ledge. If the app's look changes, run the script again to refresh them. You can tap the phone's own buttons, or the row of buttons under it, to switch screens (the chosen one has a light grey background, like the tab bar in the app). On a phone you can swipe. On its own it moves to the next screen every few seconds, and stops once you touch it. Small cards around the phone change with each screen. On a phone and a small tablet there are no cards, only the phone, with its screen buttons under it.
3. **The problem.** "Your life is in four places." A grey "Before" card (a forgotten to-do app, a broken spreadsheet, an old notebook) next to a white "With Ledge" card (a journal page).
4. **How Ledge works.** A dark panel with four square boxes that follow one Friday: add a task in the morning, log ₹640 at lunch, tick tasks off in the evening, and find the day already written up in the journal at night.
5. **Say it, or type it.** A dark section with a pretend voice demo. It plays the real voice flow on its own: the ring fills, the words appear, cards show what Ledge understood, then "Added" with Undo. You can press the round button yourself, or pick one of three example sentences. The **Type** tab uses the app's real quick-add reader, so typing "pay rent tomorrow 5pm #home p1" shows exactly the chips the app would. No microphone is used and nothing is sent anywhere.
6. **In your pocket. At your desk.** A deep orange panel with a real screenshot of Ledge on a laptop (the Work list with a task open) and on a phone.
7. **Questions, answered.** Seven common questions. One opens at a time.
8. **The footer.** A dark panel with rounded top corners (like the other big panels, it no longer stretches edge to edge), the giant "Ledge." word, the line "Start today. Thank yourself / tomorrow." starting above the top of the big word, Get started and Log in buttons, a small "Built by Bhagya Charan Aela · © 2026" line (linking to your site) and links to How it works, the FAQ and GitHub. On a phone everything in the footer is centred.

## Things to know

- **From the sign-in page.** Someone who lands on sign-in or sign-up first can find the public page too: a "New to Ledge? See what it does" link sits under the form on every screen size, and the logo links to it. (The wide-screen cover panel used to have a "See what Ledge does" button too; it was removed on 2026-11-23 at O's request.)

- **Widths and padding.** The hero, the three dark panels, the orange panel and the footer all share one width, a little wider than before (22 November). Inside each panel the space is the same on the top, the bottom and the sides, on every screen size. The top of the page now starts right at the top of the window: a thin strip above it used to look like a shadow over the links.
- **Always light.** The page is always shown in its light colours, even when your phone or the app is set to dark mode (your choice, 21 November). The three dark panels (How it works, Say it, the footer) are part of the design and stay dark.
- **Movement.** The top of the page slides in when it opens, and the phone and its cards float gently. Each section further down slides or fades in the first time it scrolls into view: the scraps in the Before card drop into place, the four steps arrive one after another, the laptop and phone glide in, and the big "Ledge." word in the footer rises letter by letter. Questions open with a smooth slide.
- **Phones and tablets.** The layout was redone by hand for phones, small tablets, tablets and laptops. On a tablet the small phone picture sits over the corner of the laptop picture. On a phone (you picked these on 21 November):
  - the links become a menu;
  - **Before and With Ledge** show one card at a time, with a Before | With Ledge switch above them. It turns to With Ledge by itself once, and you can tap or swipe to switch;
  - **How it works** becomes a timeline from top to bottom: an orange line with a dot for each moment of the day;
  - **Say it, or type it** keeps the moving demo but smaller, without the list of example sentences;
  - **In your pocket** shows no pictures, just the text and three short lines with icons (a laptop picture is too small to read on a phone, and a phone picture alone says nothing about the laptop; 22 November).
  - the phone in the top section is smaller, so the headline, the whole phone and its screen buttons fit on the first screen with room around them (checked at Galaxy S24 Ultra size).
- **Reduced motion.** If a visitor's device asks for less motion, nothing moves by itself: the phone stays on Home and the voice demo shows its finished cards.
- **The buttons.** "Open Ledge", "Get started" and "Log in" all go to the sign-in page. Sign-up is open (23 November), so anyone who finds the page can make their own account and try the app; there is no shared demo account. Each account gets about 15 voice commands a day (see Phase 12). If you ever turn sign-up off, new visitors can look but cannot make an account, and you may want different wording on these buttons.
- **Your details.** The footer says "Built by Bhagya Charan Aela" and links to `https://abhagyacharan.xyz` and the GitHub repository. Both links were checked on 23 November and work. All of these live in one file, `src/modules/site/content.ts`.
- **Checked.** The page was looked at in a browser at desktop and phone sizes. Automatic tests check that signed-out visitors see it, that the phone and the Type demo work, that it stays light and has no accessibility problems on a light or a dark device, and that on a phone nothing scrolls sideways and the menu works.
