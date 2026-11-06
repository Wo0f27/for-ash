# The Pages Between Us — v8: fixed book binding and concealed letter

A birthday gift for a long-distance friend, hosted on GitHub Pages. This version replaces the scrolling chapters with a real book reader.

## How to experience it

- Tap the green cover to open the storybook. It **stays in place**—there is no scroll jump.
- Desktop (wide screens): two pages are visible at once, and turning a sheet swings it from right to left (or back from left to right).
- Phones: one large, readable page is visible; the page itself turns horizontally.
- Use the arrows below the book, keyboard left/right arrow keys, or swipe horizontally on touch screens.
- Each page scrolls **inside its own paper** when content is longer than the available screen. This is especially important for a personal letter.
- The memory-note cards reveal in place on first tap. The envelope opens into a paper letter on the same book page; tap the paper itself to put it back. The birthday cake candles extinguish and reveal the configured wish.
- Reduced-motion preferences skip the turning animation without losing content.

## Personalize

Edit **config.js**. The birthday message and letter paragraphs are placeholders that belong to the sender. `config.js` intentionally remains unchanged from earlier versions.

## Deployment

GitHub Pages uses the files in the root of the `main` branch: `index.html`, `styles.css`, `script.js`, `config.js`, `favicon.svg`, and `.nojekyll`.
No build tooling or services are needed. Enable or review GitHub Pages at **Settings → Pages → Deploy from a branch → main → /(root)**.

Published URL: https://wo0f27.github.io/for-ash/

**Privacy:** This public site should not contain sensitive private messages or contact information. The `noindex` meta tag is not access protection.

## V8 repair notes

- Portrait turns now use the same **left binding** going forward and backward. Previous-page animation returns from the left rather than swinging around the right edge.
- A page turn has one continuous hinge rotation, no keyframe pause at 50%, and completes on the matching page animation event.
- The letter is fully hidden under its envelope before opening; it is revealed after the flap starts moving.
- Evaluated MIT-licensed [StPageFlip](https://github.com/Nodlik/StPageFlip) and [grabfold](https://github.com/javocsoft/grabfold) as alternative engines. This scoped fix has no added runtime dependencies and preserves the existing inside-page interactive content.
