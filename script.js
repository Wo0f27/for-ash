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
  const revealPage = $('.book-reveal');
  let openingCover = false;
  const paperPortal = document.createElement('div');
  paperPortal.className = 'book-opening-portal';
  paperPortal.setAttribute('aria-hidden', 'true');
  paperPortal.hidden = true;
  paperPortal.innerHTML = '<div class="portal-ornament">✧ ❀ ✧</div><div class="portal-caption">Chapter One</div><div class="portal-title">Once upon a Wattpad…</div>';
  document.body.append(paperPortal);

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
      const onTransitionEnd = (e) => {
        if (e.target === cover && e.propertyName === 'transform') done();
      };
      const fallback = setTimeout(done, 1350);
      cover.addEventListener('transitionend', onTransitionEnd);
    });
  }
  function moveToFirstChapterWithoutScrolling() {
    // A real, instant scroll *under an opaque paper page*, never a visible smooth scroll.
    const target = $('#chapter-one');
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    jumpTo(target, 'instant');
    document.documentElement.style.scrollBehavior = previous;
    history.pushState(null, '', '#chapter-one');
    updateProgress();
  }
  async function openTheBook(event) {
    event?.preventDefault();
    if (openingCover || changingPage) return;
    openingCover = true;
    changingPage = true; // Navigation taps cannot interrupt the cover choreography.
    cover.disabled = true;
    if (prefersReducedMotion.matches) {
      moveToFirstChapterWithoutScrolling();
      cover.disabled = false;
      changingPage = false;
      openingCover = false;
      return;
    }
    try {
      heroArt.classList.add('is-opening');
      await waitForCover();
      const box = revealPage.getBoundingClientRect();
      const origin = {
        left: box.left + 'px', top: box.top + 'px',
        width: box.width + 'px', height: box.height + 'px', borderRadius: '7px'
      };
      const full = {
        left: '0px', top: '0px', width: window.innerWidth + 'px',
        height: window.innerHeight + 'px', borderRadius: '0px'
      };
      paperPortal.hidden = false;
      Object.assign(paperPortal.style, origin);
      await nextFrame();
      const opening = paperPortal.animate([origin, full], {
        duration: 530, easing: 'cubic-bezier(.25,.7,.22,1)', fill: 'forwards'
      });
      await opening.finished;
      opening.cancel();
      Object.assign(paperPortal.style, full);
      // Only switch sections after the expanded paper completely fills the viewport.
      moveToFirstChapterWithoutScrolling();
      await nextFrame();
      const reveal = paperPortal.animate([{ opacity:1 }, { opacity:0 }], {
        duration:380, easing:'ease-out', fill:'forwards'
      });
      await reveal.finished;
      reveal.cancel();
    } finally {
      paperPortal.hidden = true;
      paperPortal.style.opacity = '';
      heroArt.classList.remove('is-opening');
      cover.disabled = false;
      openingCover = false;
      changingPage = false;
    }
  }
  cover.addEventListener('click', (event) => { void openTheBook(event); });
  $('#begin-story').addEventListener('click', (event) => { void openTheBook(event); });
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

  // A single piece of paper, animated between the envelope and the reading position.
  // The paper itself (or the envelope) toggles the state. No modal and no close button.
  const letterContainer = $('#letter-paragraphs');
  (Array.isArray(config.letterParagraphs) ? config.letterParagraphs : []).forEach((paragraph) => {
    const p = document.createElement('p');
    p.textContent = String(paragraph);
    letterContainer.append(p);
  });
  const envelopeButton = $('#open-letter');
  const envelope = envelopeButton.querySelector('.envelope');
  const letterStage = $('#envelope-stage');
  const extraction = $('#letter-extraction');
  const paper = $('#letter-content');
  let letterOpen = false;
  let letterBusy = false;
  let requestedOpen = false;
  const closedHeight = () => window.innerWidth <= 500 ? 255 : 312;

  function updateLetterUI(open) {
    letterStage.classList.toggle('letter-is-open', open);
    envelopeButton.classList.toggle('is-open', open);
    envelopeButton.setAttribute('aria-expanded', String(open));
    envelopeButton.setAttribute('aria-label', open ? 'Return the birthday letter to the envelope' : 'Remove the birthday letter from the envelope');
    $('#envelope-label').textContent = open ? 'Tap the letter to return it' : 'Tap to break the seal';
  }
  function foldedPosition() {
    const env = envelope.getBoundingClientRect();
    const page = paper.getBoundingClientRect();
    const centerDelta = (env.left + env.width / 2) - (page.left + page.width / 2);
    const yDelta = (env.top + env.height * .31) - page.top;
    const xScale = Math.min(.72, (env.width * .67) / page.width);
    const yScale = Math.min(.32, (env.height * .47) / page.height);
    return {
      folded:`translate(${centerDelta}px, ${yDelta}px) scale(${xScale}, ${yScale})`,
      lifted:`translate(${centerDelta * .4}px, ${yDelta - 74}px) scale(${Math.min(.85,xScale+0.12)}, ${Math.min(.72,yScale+0.15)})`
    };
  }
  async function playLetter(open) {
    const initialHeight = Math.ceil(letterStage.getBoundingClientRect().height);
    if (open) {
      extraction.hidden = false;
      letterStage.style.height = initialHeight + 'px';
      await nextFrame();
    }
    const endHeight = Math.max(closedHeight(), Math.ceil(paper.offsetHeight + 64));
    const transforms = foldedPosition();
    if (prefersReducedMotion.matches) {
      letterStage.style.height = open ? endHeight + 'px' : '';
      letterStage.classList.toggle('letter-on-top', open);
      extraction.hidden = !open;
      letterStage.classList.toggle('letter-words-visible', open);
      updateLetterUI(open);
      return;
    }
    const durationMs = open ? 900 : 760;
    const frames = open ? [
      {transform:transforms.folded,offset:0},
      {transform:transforms.lifted,offset:.41},
      {transform:'none',offset:1}
    ] : [
      {transform:'none',offset:0},
      {transform:transforms.lifted,offset:.57},
      {transform:transforms.folded,offset:1}
    ];
    paper.style.transform = open ? transforms.folded : 'none';
    paper.classList.add('letter-in-motion');
    if (open) {
      letterStage.classList.remove('letter-words-visible');
      letterStage.classList.add('letter-pulling');
      updateLetterUI(true);
      await pause(265); // Open the flap first so the paper can emerge from behind it.
    } else {
      letterStage.classList.remove('letter-words-visible');
      letterStage.classList.add('letter-tucking');
      await pause(175); // Hide the text before folding the sheet.
    }
    const fromH = open ? initialHeight : initialHeight;
    const toH = open ? endHeight : closedHeight();
    const grow = letterStage.animate([{height:fromH+'px'},{height:toH+'px'}], {
      duration:durationMs, easing:'cubic-bezier(.22,.72,.24,1)',fill:'forwards'
    });
    const move = paper.animate(frames, {
      duration:durationMs, easing:'cubic-bezier(.22,.72,.24,1)', fill:'forwards'
    });
    const layerSwap = pause(open ? 310 : 485).then(() => {
      letterStage.classList.toggle('letter-on-top', open);
    });
    await Promise.all([grow.finished,move.finished,layerSwap]);
    grow.cancel(); move.cancel();
    paper.style.transform = '';
    paper.classList.remove('letter-in-motion');
    letterStage.style.height = open ? toH + 'px' : '';
    letterStage.classList.remove('letter-pulling','letter-tucking');
    if (open) {
      letterStage.classList.add('letter-words-visible');
      paper.focus({preventScroll:true});
    } else {
      extraction.hidden = true;
      letterStage.classList.remove('letter-on-top','letter-words-visible');
      updateLetterUI(false);
      envelopeButton.focus({preventScroll:true});
    }
  }
  async function syncLetter() {
    if (letterBusy) return;
    letterBusy = true;
    try {
      while (letterOpen !== requestedOpen) {
        const target = requestedOpen;
        await playLetter(target);
        letterOpen = target;
      }
    } finally { letterBusy = false; }
  }
  function toggleLetter() {
    requestedOpen = !requestedOpen;
    void syncLetter();
  }
  envelopeButton.addEventListener('click', toggleLetter);
  paper.addEventListener('click', toggleLetter);
  paper.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); toggleLetter();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && requestedOpen) {
      event.preventDefault(); requestedOpen = false; void syncLetter();
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
