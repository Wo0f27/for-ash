# The Pages Between Us — birthday site (v2)

A mobile-friendly, self-contained birthday storybook. There are **no frameworks, build steps, trackers, or paid dependencies**.

## Animated storybook interactions (v2)

- Tap the book cover or **Open the story**: the cover turns on its hinge and reveals chapter one.
- Use the **Turn to the next page** links or chapter navigation to trigger a paper-turn transition.
- Watch the typewriter note appear in the Wattpad-era chapter.
- Flip the memory cards, open the envelope and watch its letter peek out, and blow out the candles for smoke and confetti.
- Reduced-motion settings are respected. The site remains a scrollable story rather than a rigid slideshow.

## Edit your own words

Open **config.js** using VS Code or Notepad. Change:

- `recipientName`: displayed name (currently the provisional nickname "Ash")
- `senderName`: your signature
- `birthdayYear`: the year on the letter
- `letterParagraphs`: write your OWN letter; keep each paragraph inside quotes, separated by commas
- `birthdayWish`: a short line revealed after the candles go out
- `notes`: customize the four clickable memory notes
- `friendLocation` and `friendTimeZone`: the Italy details are provisional, so correct them if needed.

Please replace the visible bracketed placeholders before sending the link. The provided text is UI copy, **not** a drafted private letter.

## Preview before uploading

Double-click **index.html** to preview in a browser. Everything works without a web server. Test by clicking the notes, envelope, candles, and final surprise. For the best mobile preview in Chrome/Opera, press `F12`, then toggle the device toolbar.

## Publish to GitHub Pages

1. This repository has already been created. Repository: `Wo0f27/for-ash`.
2. Website files are already committed in the repository root. Further changes made here can be published automatically.
3. In that repository, open **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
5. Select `main` and `/ (root)`, then Save.
6. The site should appear at `https://wo0f27.github.io/for-ash/` after GitHub finishes deployment. In GitHub **Settings → Pages**, use **Visit site** to see your actual published address.

No build command or GitHub Actions workflow is required.

Official guide: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Privacy and other notes

- **GitHub Pages is publicly accessible.** Even with a private repository on an eligible plan, a published Pages site itself is publicly accessible. Avoid uploading private chats, contact details, or sensitive stories. `noindex` discourages search engines but is **not** privacy protection.
- The hidden surprise links to YouTube in a new tab; it does not embed or autoplay any copyrighted song.
- Do not add personal photographs without permission.
- No auto-playing audio is included; we can add an opt-in music toggle if you provide a permitted audio track.
- The two clocks use built-in browser `Intl` time-zone support and automatically account for daylight saving time.
- This is **version 2**, so all design/content may still be customized before publishing.