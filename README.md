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