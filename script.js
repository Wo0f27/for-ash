(() => {
  'use strict';
  const config = window.BIRTHDAY_CONFIG || {};
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = (ms) => prefersReducedMotion.matches ? 0 : ms;
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const recipient = config.recipientName || 'friend';
  $$('[data-recipient]').forEach((node) => { node.textContent = recipient; });
  $$('[data-sender]').forEach((node) => { node.textContent = config.senderName || 'Your friend'; });
  $$('[data-year]').forEach((node) => { node.textContent = config.birthdayYear || '2026'; });
  document.title = `The Pages Between Us · For ${recipient}`;

  // Sections stay legible even when the user scrolls quickly or uses back/forward.
  $$('[data-reveal]').forEach((node) => node.classList.add('visible'));
  const progressBar = $('#reading-progress');
  let scrollQueued = false;
  function updateProgress() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = `${maxScroll > 0 ? Math.max(0, Math.min(100, window.scrollY / maxScroll * 100)) : 0}%`;
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  updateProgress();

  // Chapter navigation: each half of the sheet completes before the next begins.
  // No timeout-initiated scroll underneath a partly transparent transition.
  const sheet = $('#page-turn-overlay');
  const transitionLabel = $('#transition-label');
  const chapterMenu = $('.chapter-menu');
  let changingPage = false;
  function jumpTo(node, behavior = 'instant') {
    const top = Math.max(0, window.scrollY + node.getBoundingClientRect().top);
    // Explicit behavior overrides the html smooth-scroll preference.
    window.scrollTo({ top, behavior });
  }
  async function animateSheet(from, to, ms, easing) {
    if (!ms) { sheet.style.transform = to; return; }
    const a = sheet.animate([{ transform: from }, { transform: to }], {
      duration: ms, easing, fill: 'forwards'
    });
    try { await a.finished; } finally { a.cancel(); sheet.style.transform = to; }
  }
  async function navigateTo(hash, style = 'paper') {
    const destination = $(hash);
    if (!destination || changingPage) return;
    chapterMenu?.removeAttribute('open');
    if (style === 'smooth' || prefersReducedMotion.matches) {
      jumpTo(destination, prefersReducedMotion.matches ? 'instant' : 'smooth');
      history.pushState(null, '', hash);
      return;
    }
    changingPage = true;
    sheet.classList.add('active');
    const label = destination.querySelector('.chapter-tag')?.textContent?.trim() || 'the next page';
    transitionLabel.textContent = label;
    try {
      sheet.style.transform = 'translateY(101%)';
      await animateSheet('translateY(101%)', 'translateY(0)', duration(340), 'cubic-bezier(.35,.0,.25,1)');
      jumpTo(destination);
      history.pushState(null, '', hash);
      destination.querySelectorAll('[data-reveal]').forEach((node) => node.classList.add('visible'));
      await nextFrame();
      await animateSheet('translateY(0)', 'translateY(-101%)', duration(400), 'cubic-bezier(.25,.0,.36,1)');
    } finally {
      sheet.classList.remove('active');
      sheet.style.transform = 'translateY(101%)';
      changingPage = false;
    }
  }

  const cover = $('#storybook-cover');
  const heroArt = $('.hero-art');
  let openingCover = false;
  function waitForCover() {
    if (prefersReducedMotion.matches) return Promise.resolve();
    return new Promise((resolve) => {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        cover.removeEventListener('transitionend', onTransitionEnd);
        clearTimeout(fallback);
        resolve();
      };
      const onTransitionEnd = (e) => { if (e.target === cover && e.propertyName === 'transform') done(); };
      const fallback = setTimeout(done, 1250);
      cover.addEventListener('transitionend', onTransitionEnd);
    });
  }
  async function openTheBook(event) {
    event?.preventDefault();
    if (openingCover || changingPage) return;
    openingCover = true;
    cover.disabled = true;
    heroArt.classList.add('is-opening');
    try {
      await waitForCover();
      // The reveal is the first page. Continue naturally down to its chapter,
      // without adding a second screen wipe on top of the opening cover.
      await navigateTo('#chapter-one', 'smooth');
      await pause(duration(1050));
    } finally {
      heroArt.classList.remove('is-opening');
      cover.disabled = false;
      openingCover = false;
    }
  }
  cover.addEventListener('click', openTheBook);
  $('#begin-story').addEventListener('click', openTheBook);
  $$('a[href^="#"]:not(.skip-link):not(#begin-story)').forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if (!hash || !$(hash)) return;
      event.preventDefault();
      void navigateTo(hash, 'paper');
    });
  });

  // Small typed sentence on the first chapter's stationery.
  const typedNode = $('#paper-typing');
  const typedText = 'Two writers. One unexpected friendship.';
  let typingStarted = false;
  function typeSentence() {
    if (typingStarted) return;
    typingStarted = true;
    if (prefersReducedMotion.matches) { typedNode.textContent = typedText; return; }
    typedNode.classList.add('is-typing');
    let offset = 0;
    const ticker = setInterval(() => {
      typedNode.textContent = typedText.slice(0, ++offset);
      if (offset >= typedText.length) { clearInterval(ticker); typedNode.classList.remove('is-typing'); }
    }, 44);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((item) => item.isIntersecting)) { typeSentence(); observer.disconnect(); }
    }, { threshold: .12 });
    observer.observe($('#chapter-one'));
  } else { typeSentence(); }

  // One face is in the layout at a time. A two-part 2D turnover swaps the
  // face at the edge-on midpoint; Android doesn't need a compositor repaint.
  const fallbackNotes = [{ icon:'✳', title:'A little note', subtitle:'tap to discover', reveal:'Edit config.js to write your note.' }];
  const notes = Array.isArray(config.notes) && config.notes.length ? config.notes : fallbackNotes;
  const grid = $('#note-grid');
  notes.forEach((note, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `flip-note note-color-${index % 4}`;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `Reveal ${note.title || 'a note'}`);
    const inner = document.createElement('span'); inner.className = 'flip-note-inner';
    const front = document.createElement('span'); front.className = 'flip-face flip-front';
    const back = document.createElement('span'); back.className = 'flip-face flip-back';
    const icon = document.createElement('span'); icon.className = 'note-icon'; icon.textContent = note.icon || '✿';
    const title = document.createElement('strong'); title.textContent = note.title || 'A note';
    const subtitle = document.createElement('small'); subtitle.textContent = note.subtitle || 'tap to turn';
    const message = document.createElement('span'); message.textContent = note.reveal || '';
    const hint = document.createElement('small'); hint.textContent = 'tap to turn back ↶';
    front.append(icon, title, subtitle); back.append(message, hint);
    back.hidden = true; inner.append(front, back); button.append(inner);
    let busy = false;
    let shown = false;
    button.addEventListener('click', async () => {
      if (busy) return;
      busy = true; button.classList.add('is-busy');
      const next = !shown;
      try {
        if (!prefersReducedMotion.matches) {
          const first = button.animate([{ transform:'scaleX(1)' }, { transform:'scaleX(.04)' }], {
            duration: 135, easing:'ease-in', fill:'forwards'
          });
          try { await first.finished; } finally { first.cancel(); }
        }
        shown = next;
        front.hidden = shown; back.hidden = !shown;
        button.classList.toggle('is-flipped', shown);
        button.setAttribute('aria-pressed', String(shown));
        button.setAttribute('aria-label', `${shown ? 'Hide' : 'Reveal'} ${note.title || 'a note'}`);
        if (!prefersReducedMotion.matches) {
          const second = button.animate([{ transform:'scaleX(.04)' }, { transform:'scaleX(1)' }], {
            duration: 160, easing:'cubic-bezier(.24,.74,.25,1)', fill:'forwards'
          });
          try { await second.finished; } finally { second.cancel(); }
        }
      } finally { button.classList.remove('is-busy'); busy = false; }
    });
    grid.append(button);
  });

  // These labels are deliberately neutral: the reader is in Italy, not PH.
  $('#friend-city').textContent = config.friendLocation || 'Italy';
  function timeInZone(zone) {
    try { return new Intl.DateTimeFormat('en-GB', { timeZone:zone, hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(new Date()); }
    catch (_) { return '--:--'; }
  }
  function updateClocks() {
    $('#clock-ph').textContent = timeInZone(config.yourTimeZone || 'Asia/Manila');
    $('#clock-it').textContent = timeInZone(config.friendTimeZone || 'Europe/Rome');
  }
  updateClocks(); setInterval(updateClocks, 30000);

  // The letter is one physical element. It flies out of its envelope into a
  // readable, scrollable panel with a close button and proper focus handling.
  const letterContainer = $('#letter-paragraphs');
  (Array.isArray(config.letterParagraphs) ? config.letterParagraphs : []).forEach((paragraph) => {
    const p = document.createElement('p'); p.textContent = String(paragraph); letterContainer.append(p);
  });
  const envelopeButton = $('#open-letter');
  const envelopeShape = envelopeButton.querySelector('.envelope');
  const backdrop = $('#letter-backdrop');
  const actualLetter = $('#letter-content');
  const closeLetterButton = $('#close-letter');
  let letterVisible = false;
  let letterBusy = false;
  let restoreFocus = envelopeButton;
  const getLetterStartTransform = () => {
    const from = envelopeShape.getBoundingClientRect();
    const to = actualLetter.getBoundingClientRect();
    const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
    const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${Math.max(.2, Math.min(.75, from.width / to.width * .72))}, ${Math.max(.15, Math.min(.5, from.height / to.height * .48))})`;
  };
  async function animateLetter(opening) {
    if (prefersReducedMotion.matches) return;
    const small = getLetterStartTransform();
    const keyframes = opening ? [
      { transform:small, opacity:.90 }, { transform:'translate(0,0) scale(1)', opacity:1 }
    ] : [
      { transform:'translate(0,0) scale(1)', opacity:1 }, { transform:small, opacity:.85 }
    ];
    const animation = actualLetter.animate(keyframes, {
      duration:opening ? 650 : 430,
      easing: opening ? 'cubic-bezier(.22,.79,.22,1)' : 'cubic-bezier(.5,0,.8,.2)',
      fill:'forwards'
    });
    try { await animation.finished; } finally { animation.cancel(); }
  }
  async function openLetter() {
    if (letterVisible || letterBusy || changingPage) return;
    letterBusy = true;
    restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : envelopeButton;
    envelopeButton.classList.add('is-open');
    $('#envelope-label').textContent = 'A letter, just for you';
    try {
      if (!prefersReducedMotion.matches) await pause(360); // let the envelope flap rise first
      backdrop.hidden = false;
      actualLetter.scrollTop = 0;
      document.documentElement.classList.add('letter-open');
      document.body.classList.add('letter-open');
      const backdropFade = prefersReducedMotion.matches ? null : backdrop.animate([{ opacity:0 }, { opacity:1 }], {duration:260,easing:'ease-out'});
      await animateLetter(true);
      await backdropFade?.finished;
      letterVisible = true;
      closeLetterButton.focus({ preventScroll:true });
    } finally { letterBusy = false; }
  }
  async function closeLetter() {
    if ((!letterVisible && !letterBusy) || letterBusy) return;
    letterBusy = true;
    try {
      await animateLetter(false);
      backdrop.hidden = true;
      envelopeButton.classList.remove('is-open');
      $('#envelope-label').textContent = 'Tap to break the seal';
      document.documentElement.classList.remove('letter-open');
      document.body.classList.remove('letter-open');
      letterVisible = false;
      restoreFocus.focus({ preventScroll:true });
    } finally { letterBusy = false; }
  }
  envelopeButton.addEventListener('click', () => { void openLetter(); });
  closeLetterButton.addEventListener('click', () => { void closeLetter(); });
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) void closeLetter(); });
  document.addEventListener('keydown', (event) => {
    if (backdrop.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); void closeLetter(); }
    if (event.key === 'Tab' && !letterBusy) {
      // Only the Close control is interactive inside the letter at present.
      event.preventDefault(); closeLetterButton.focus({ preventScroll:true });
    }
  });

  // Birthday cake: smoke and a short, bounded burst of confetti. No autoplay.
  const candleButton = $('#blow-candles');
  const scene = $('#cake-scene');
  let candlesOut = false;
  let confettiCleanup = null;
  candleButton.addEventListener('click', () => {
    candlesOut = !candlesOut;
    scene.classList.toggle('candles-out', candlesOut);
    candleButton.innerHTML = candlesOut ? 'Light the candles again <span aria-hidden="true">↺</span>' : 'Make a wish &amp; blow out the candles <span aria-hidden="true">✳</span>';
    const wish = $('#birthday-wish');
    wish.textContent = config.birthdayWish || '[Add your final wish in config.js.]';
    wish.hidden = !candlesOut;
    const layer = $('#confetti-layer');
    if (confettiCleanup) clearTimeout(confettiCleanup);
    layer.replaceChildren();
    if (candlesOut && !prefersReducedMotion.matches) {
      const glyphs = ['✦', '✳', '♡', '•'];
      for (let i = 0; i < 26; ++i) {
        const piece = document.createElement('span'); piece.className = 'confetti';
        piece.textContent = glyphs[i % glyphs.length];
        piece.style.setProperty('--x', `${Math.round(Math.random() * 350 - 175)}px`);
        piece.style.setProperty('--y', `${Math.round(Math.random() * -190 - 45)}px`);
        piece.style.setProperty('--rotation', `${Math.round(Math.random() * 550 - 275)}deg`);
        piece.style.setProperty('--delay', `${(Math.random() * .2).toFixed(2)}s`);
        piece.style.color = ['#a46b55','#7e9b80','#d7aa59','#a58db0'][i % 4];
        layer.append(piece);
      }
      confettiCleanup = setTimeout(() => layer.replaceChildren(), 2500);
    }
  });
})();