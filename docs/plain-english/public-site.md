# The public page about Ledge

_Built on 21 November 2026._

## What it is

Until now, anyone who opened Ledge's web address without being signed in was sent straight to the sign-in page. Now they see a **public page** first: a page that explains what Ledge is, with moving pictures of the real app. People who are signed in still go straight to their Home page, exactly as before.

The page lives at `/welcome`. When a signed-out visitor opens the plain address (`/`), Ledge quietly shows them the same page without changing the address. Every other page of the app (Tasks, Expenses, Journal and so on) still sends a signed-out visitor to sign-in.

## Where the design came from

You designed the page yourself in Claude Design, after two drafts. The brief, the colours and fonts, and the reference pictures are in `docs/site designs/`. The page was then rebuilt by hand inside the app so it can be served from the same place.

## What is on it, from top to bottom

1. **The top.** The logo, three links (How it works, Voice, FAQ) and a Log in button. Clicking a link glides down to that section. On a phone the three links fold into a menu button. Then the headline, "One calm place to run your day.", with the word "calm" in a slanted serif letter style, and straight under it the phone, so the app is the first thing a visitor sees. The short pitch and the Open Ledge button sit below the phone.
2. **A working phone.** A phone showing four real screenshots of the app: Home, Today, the expense summary and a journal page. They were taken from the app itself with the demo account, by an automatic script (`tests/e2e/site-shots.spec.ts`), so they always look exactly like Ledge. If the app's look changes, run the script again to refresh them. You can tap the phone's own buttons, or the row of buttons under it, to switch screens. On a phone you can swipe. On its own it moves to the next screen every few seconds, and stops once you touch it. Small cards around the phone change with each screen.
3. **The problem.** "Your life is in four places." A grey "Before" card (a forgotten to-do app, a broken spreadsheet, an old notebook) next to a white "With Ledge" card (a journal page).
4. **How Ledge works.** A dark panel with four square boxes that follow one Friday: add a task in the morning, log ₹640 at lunch, tick tasks off in the evening, and find the day already written up in the journal at night.
5. **Say it, or type it.** A dark section with a pretend voice demo. It plays the real voice flow on its own: the ring fills, the words appear, cards show what Ledge understood, then "Added" with Undo. You can press the round button yourself, or pick one of three example sentences. The **Type** tab uses the app's real quick-add reader, so typing "pay rent tomorrow 5pm #home p1" shows exactly the chips the app would. No microphone is used and nothing is sent anywhere.
6. **In your pocket. At your desk.** A deep orange panel with a real screenshot of Ledge on a laptop (the Work list with a task open) and on a phone.
7. **Questions, answered.** Seven common questions. One opens at a time.
8. **The footer.** A dark panel with rounded top corners (like the other big panels, it no longer stretches edge to edge), the giant "Ledge." word, Get started and Log in buttons, and links to GitHub and your own site.

## Things to know

- **From the sign-in page.** Someone who lands on sign-in or sign-up first can find the public page too: a "New to Ledge? See what it does" link sits under the form on every screen size, the logo links to it, and on wide screens the dark cover panel has a "See what Ledge does" button.

- **Always light.** The page is always shown in its light colours, even when your phone or the app is set to dark mode (your choice, 21 November). The three dark panels (How it works, Say it, the footer) are part of the design and stay dark.
- **Movement.** The top of the page slides in when it opens, and the phone and its cards float gently. Each section further down slides or fades in the first time it scrolls into view: the scraps in the Before card drop into place, the four steps arrive one after another, the laptop and phone glide in, and the big "Ledge." word in the footer rises letter by letter. Questions open with a smooth slide.
- **Phones and tablets.** The layout was redone by hand for phones, small tablets, tablets and laptops. On a tablet the small phone picture sits over the corner of the laptop picture. On a phone (you picked these on 21 November):
  - the links become a menu;
  - **Before and With Ledge** show one card at a time, with a Before | With Ledge switch above them. It turns to With Ledge by itself once, and you can tap or swipe to switch;
  - **How it works** becomes a timeline from top to bottom: an orange line with a dot for each moment of the day;
  - **Say it, or type it** keeps the moving demo but smaller, without the list of example sentences;
  - **In your pocket** shows only the phone screenshot (a laptop picture is too small to read on a phone) and three short lines with icons.
- **Reduced motion.** If a visitor's device asks for less motion, nothing moves by itself: the phone stays on Home and the voice demo shows its finished cards.
- **The buttons.** "Open Ledge", "Get started" and "Log in" all go to the sign-in page. Once you turn sign-up off on the server, new visitors can look but cannot make an account. That is fine for a showcase, but you may want different wording later.
- **Your details.** The footer says "Built by Bhagya Charan Aela" and links to `https://abhagyacharan.xyz` and the GitHub repository. The site address was a guess: please check it. All of these live in one file, `src/modules/site/content.ts`.
- **Checked.** The page was looked at in a browser at desktop and phone sizes. Automatic tests check that signed-out visitors see it, that the phone and the Type demo work, that it stays light and has no accessibility problems on a light or a dark device, and that on a phone nothing scrolls sideways and the menu works.
