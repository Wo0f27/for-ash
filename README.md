# The Pages Between Us — birthday site (Version 4)

An interactive, mobile-first birthday storybook for Ash. It is a static GitHub Pages website: no framework, build step, accounts, trackers, or paid hosting required.

## What changed in Version 4

- **Opening cover:** the book is fully visible near the top on narrow phones. Tapping it reveals the inside page, then smoothly takes the reader to Chapter One. No unrelated wipe interrupts the opening.
- **Chapter transitions:** a single full-screen paper sheet covers the old chapter, navigation takes place behind the covered screen, and the sheet moves off to reveal the destination. These two stages are sequenced by animation completion rather than arbitrary fixed scroll timings.
- **Memory notes:** a two-part 2D turnover changes the visible face midway through the first tap, rather than relying on a brittle 3D backface repaint. Rapid taps during the short turnover are ignored to prevent desynchronization.
- **Letter:** the actual letter emerges from the envelope into an accessible scrollable overlay. There is no second paper that appears underneath. The close button, Escape key, and tapping the backdrop dismiss the letter, returning focus to the envelope.
- **Mobile layout:** larger text, more compact chapter spacing, visible opening book, and a **Chapters** menu at the top of the phone layout.
- **Accessibility:** minimum-size tap targets, keyboard support, readable contrast, and reduced-motion handling.

## Your words stay yours

Only edit `config.js` when you're ready:

- `recipientName`: currently uses provisional nickname `Ash`.
- `senderName`: your signature.
- `letterParagraphs`: your birthday message, one quoted paragraph per entry.
- `birthdayWish`: message shown after blowing out the candles.
- `notes`: four interactive inside-joke cards.
- `friendLocation` and `friendTimeZone`: confirm the provisional Italy details (`Europe/Rome`).

**The letter and birthday wish are intentionally placeholders.** Replace bracketed text before sharing the website.

## Where it's hosted

GitHub repository: https://github.com/Wo0f27/for-ash  
GitHub Pages: https://wo0f27.github.io/for-ash/

This repository is already configured for GitHub Pages. Commits to `main` should deploy automatically. To see deployment status, check the repository's **Actions** tab or **Settings → Pages**.

To preview locally, open `index.html` in a browser (or serve the folder with any static HTTP server). There is no build command.

## Testing and privacy

Version 4 was interaction-tested in headless Chromium mobile emulation at 320, 360, 390, and 430 px, plus 768 px tablet and 1440 px desktop widths. The opening cover, chapter navigation, note turnover in both directions, envelope dialog opening/closing, candles, and mobile menu passed. No runtime JavaScript errors or horizontal overflow were detected in these tests. Actual-device browser testing remains recommended.

The site and its repository are public. Never place private screenshots, passwords, addresses, sensitive stories, or other private information into this repository. The hidden birthday surprise links to YouTube only when clicked; it does not embed or autoplay a song.