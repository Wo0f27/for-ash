# The Pages Between Us — Version 10

An interactive birthday book hosted on GitHub Pages. The **page curvature and turning** use [StPageFlip v2.0.7](https://github.com/Nodlik/StPageFlip) (MIT license, pinned to a specific jsDelivr bundle). On mobile it displays a single page, and on wider screens it can display a spread. The cover is now the first hard page within the same engine; the previous hand-coded 3D flip was removed.

The **envelope animation** uses a custom implementation of the pocket/flap/paper layering inspired by [zspxx/animated-envelope](https://github.com/zspxx/animated-envelope) (MIT), which itself credits Josh Nichols' [CSS base](https://codepen.io/MrBlank/pen/JjXxovL). Our layout, dimensions and interactions are adapted to fit the birthday book rather than copied wholesale.

## Interactions

- Tap the right or left half of the book to turn forward or back, or swipe; tapping a memory card, envelope, letter, link or birthday button won't change pages.
- The paper emerges **behind** the front pocket after the flap opens, then rises over it. Tap the paper again to return it. Long letters scroll inside the paper.
- Use the **Music off** control to enable an **original, quiet ambient instrumental** synthesized with the Web Audio API. It is off by default, never autoplays, and can be stopped at any time. It pauses when the tab is hidden. No commercial music or copyrighted recording is embedded.
- If you own or have permission to use a music file, you can add `musicUrl: "assets/music.mp3",` to the existing `window.BIRTHDAY_CONFIG` object in `config.js` and upload the file to the repository. The music control will then play that file, looping, instead of synthesized sounds. **Music still requires the visitor's tap** because phones block autoplay.
- If the page-flip bundle cannot load, a simplified (non-animated) book remains usable. The bundle is loaded from a pinned CDN URL; no frameworks or build tooling are required.

## Personalize

Edit `config.js` to provide your own letter paragraphs and birthday wish. The repository's existing `config.js` remains unchanged by this update.

## Deployment

GitHub Pages serves the files in the root of `main`. The site URL is https://wo0f27.github.io/for-ash/.

## License / attribution

- **StPageFlip** © Oleg Litovskiy, licensed MIT. Original source: https://github.com/Nodlik/StPageFlip . The website loads its official browser build via jsDelivr.
- **Animated Envelope** © its contributors, licensed MIT. Original source: https://github.com/zspxx/animated-envelope . It credits Josh Nichols' MIT CSS base. This website borrows the concept of layered envelope construction, not its content, color palette, or confetti assets.
- Original HTML, CSS, and JavaScript written for this personal birthday website, except the above attributed techniques and third-party page-flip engine.

**Privacy:** GitHub Pages is publicly accessible. The `noindex` meta tag discourages indexing but is not access control. Do not include private messages without consent.

## Version 11 — book-integrated interactive surprises

The original cover, chapters, main envelope, memory notes, cake, Rickroll,
StPageFlip page turning, music control and `config.js` are preserved.

- **Hidden keepsakes:** a new in-book page of scratchable canvases. Drag a finger,
  stylus or mouse across the surface. Once roughly 42% is erased, the rest fades
  away. Each card remembers being revealed for the current page visit/session.
  An accessible **Reveal without scratching** action is available.
- **Open When:** four independent miniature paper envelopes on a dedicated page.
  They open in the paper itself, not in a modal. Long content scrolls inside the
  mini letter. Tapping the same envelope header folds it closed.
- **A little garden:** a contained SVG bouquet whose stems, leaves, petals and
  fireflies bloom in sequence when the garden page becomes visible. It replays
  when returning to that page, or when **Let them bloom again** is tapped.
- **Slow typewriter:** narrative text is laid out at its final size before
  animating (no shifting reflows), then appears one grapheme at a time. It
  pauses between chapters, continues on revisits when incomplete, and remains
  visible once finished. **Show text now** finishes visible messages instantly without consuming
  taps meant for turning the book. Hidden letter/scratch messages do not
  type before being opened/revealed. Reduced-motion preferences reveal text
  immediately and show the flower garden without growth animation.

### Editing the new content

New optional messages and typewriter settings are in **`extras-config.js`**.
Keep your original `config.js` for your existing letter, memories and wish.
Replace the bracketed placeholders in `extras-config.js` with your own text.
For a slower/faster effect, adjust `typewriterSpeedMs` (default: 52).

### Credits / licensing

See **`THIRD_PARTY_NOTICES.md`** for MIT notices and project links for the
flowers and scratch cards. The animated garden is an original book-sized SVG
adaptation of the flower technique; the scratch card uses the reference's
canvas erasing principle. No new backend, package manager or external images
are needed. The existing StPageFlip CDN is unchanged.
