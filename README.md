# The Pages Between Us — birthday storybook (v5)

A responsive, single-page birthday story for Ash, hosted from the public GitHub repository `Wo0f27/for-ash`. Built with HTML, CSS and JavaScript. No app framework, paid hosting, tracking, login, or server is required.

## What's interactive

- Open the illustrated book cover to begin the story.
- Move between chapters using the story links or **Chapters** navigation.
- Discover the typed Wattpad-era note, four turning memory cards, and Philippines/Italy clocks.
- **Take the letter out of the envelope.** The actual letter sheet slides up from its envelope and unfolds over it **in Chapter Four**. It is not a modal, and the website remains scrollable. Select **Put it back** to return the paper; Escape also closes it.
- Blow out the birthday candles and reveal the final wish.
- Open the final surprise (a traditional birthday Rickroll) only by clicking its link.

Animations respect `prefers-reduced-motion`, and touch controls have accessible labels.

## Personalize the birthday messages

Edit **`config.js`**. All personalized content is maintained there; you do not need to edit the HTML:

- `recipientName`: currently "Ash", used provisionally based on the nickname in the shared conversation.
- `senderName`: your signature.
- `letterParagraphs`: your original birthday letter; each string appears as a paragraph.
- `birthdayWish`: the final line revealed after blowing out the candles.
- `notes`: four inside-joke cards; replace or add cards as desired.
- `friendLocation`, `friendTimeZone`, `yourTimeZone`: the Italy location/timezone is provisional. Correct it if necessary.

**The letter and birthday wish contain obvious placeholders until you write them.** No private messages were copied into the site.

## GitHub Pages

Repository: https://github.com/Wo0f27/for-ash

Published URL (once Pages deployment finishes): https://wo0f27.github.io/for-ash/

GitHub Pages must be configured to deploy from `main` at the repository root. Subsequent commits normally trigger deployments automatically. If changes are not immediately visible, reopen the website or hard-refresh.

## Privacy

GitHub Pages is a public site. Keep private conversations, identifying details, and unconsented photos out of `config.js`. The `noindex,nofollow` hint does not make a public webpage private.

## Development notes

Version 5 replaces the previous full-screen letter dialog with a single letter component rendered inside the chapter. It animates from the opening of the envelope to an expanded stationery surface, and animates back into the envelope. No backdrop or document-level scroll lock is used. Letter content is unchanged.
