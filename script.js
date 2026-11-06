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

  // One continuous in-page letter: it starts tucked inside the envelope,
  // rises above the seal, and unfolds into a readable sheet in Chapter Four.
  // No fixed backdrop, modal, or page scroll lock.
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
  const closeLetterButton = $('#close-letter');
  let letterOpen = false;
  let letterBusy = false;
  let closedStageHeight = 0;

  // The animation starts at the physical opening, not in the screen center.
  // The sheet is the actual letter DOM node, not a second decorative copy.
  function paperStartTransform(returning = false) {
    const slot = envelope.getBoundingClientRect();
    const target = paper.getBoundingClientRect();
    const targetX = target.left + target.width / 2;
    const targetY = target.top;
    const slotX = slot.left + slot.width / 2;
    // The closed stage centers the envelope higher than the expanded stage.
    // Correct for that movement when the paper returns to its original slot.
    const centeringShift = returning ? Math.max(0, (letterStage.getBoundingClientRect().height - closedStageHeight) / 2) : 0;
    const slotY = slot.top + slot.height * .31 - centeringShift;
    const sx = Math.max(.26, Math.min(.78, slot.width * .67 / target.width));
    const sy = Math.max(.16, Math.min(.36, 125 / Math.max(target.height, 1)));
    // transform origin at paper center top, so the starting top is the slot.
    return `translate(${slotX - targetX}px, ${slotY - targetY}px) scale(${sx}, ${sy})`;
  }
  async function animatePaper(keyframes, ms, easing) {
    if (prefersReducedMotion.matches) return;
    const animation = paper.animate(keyframes, {duration:ms,easing,fill:'forwards'});
    try { await animation.finished; } finally { animation.cancel(); }
  }
  function setLetterState(isOpen) {
    letterStage.classList.toggle('letter-is-open',isOpen);
    envelopeButton.classList.toggle('is-open',isOpen);
    envelopeButton.setAttribute('aria-expanded',String(isOpen));
    envelopeButton.setAttribute('aria-label',isOpen ? 'Letter removed from envelope' : 'Remove the birthday letter from the envelope');
    $('#envelope-label').textContent = isOpen ? 'A letter, just for you' : 'Tap to break the seal';
  }
  async function openLetter() {
    if (letterBusy || letterOpen || changingPage) return;
    letterBusy = true;
    letterOpen = true;
    try {
      closedStageHeight = Math.ceil(letterStage.getBoundingClientRect().height);
      letterStage.style.height = `${closedStageHeight}px`;
      setLetterState(true);
      extraction.hidden = false;
      // The sheet is absolutely layered over the envelope, not laid out below it.
      await nextFrame();
      const naturalHeight = Math.ceil(paper.getBoundingClientRect().height + 86);
      const stageOpenHeight = Math.max(closedStageHeight, naturalHeight);
      const start = paperStartTransform();
      paper.style.transform = start;
      paper.style.opacity = '1';
      paper.classList.add('letter-in-motion');
      letterStage.classList.add('letter-extracting');
      await pause(duration(265)); // flap opens before the paper moves
      if (prefersReducedMotion.matches) {
        letterStage.style.height = `${stageOpenHeight}px`;
        paper.style.transform = '';
        paper.classList.remove('letter-in-motion');
        letterStage.classList.add('letter-on-top');
      } else {
        const growing = letterStage.animate([
          { height:`${closedStageHeight}px` },{ height:`${stageOpenHeight}px` }
        ], {duration:760,easing:'cubic-bezier(.22,.7,.24,1)',fill:'forwards'});
        const moving = paper.animate([
          {transform:start,offset:0},
          {transform:'translate(0,-45px) scale(.91,.93)',offset:.58},
          {transform:'none',offset:1}
        ], {duration:790,easing:'cubic-bezier(.22,.8,.26,1)',fill:'forwards'});
        // Once the top edge clears the envelope, place it in front of the flap.
        await pause(335);
        letterStage.classList.add('letter-on-top');
        await Promise.all([growing.finished,moving.finished]);
        growing.cancel(); moving.cancel();
        letterStage.style.height = `${stageOpenHeight}px`;
        paper.style.transform = '';
        paper.classList.remove('letter-in-motion');
      }
      paper.focus({preventScroll:true});
    } finally {
      letterStage.classList.remove('letter-extracting');
      letterBusy = false;
    }
  }
  async function closeLetter() {
    if (letterBusy || !letterOpen) return;
    letterBusy = true;
    letterStage.classList.add('letter-returning');
    try {
      await pause(duration(130)); // lettering fades before returning to the sleeve
      const start = paperStartTransform(true);
      const height = letterStage.getBoundingClientRect().height;
      if (!prefersReducedMotion.matches) {
        paper.classList.add('letter-in-motion');
        const shrinking = letterStage.animate([{height:`${height}px`},{height:`${closedStageHeight}px`}],{
          duration:690,easing:'cubic-bezier(.5,.02,.65,.2)',fill:'forwards'
        });
        const moving = paper.animate([
          {transform:'none',offset:0},
          {transform:'translate(0,-45px) scale(.91,.93)',offset:.45},
          {transform:start,offset:1}
        ], {duration:690,easing:'cubic-bezier(.5,.02,.65,.2)',fill:'forwards'});
        await pause(320);
        letterStage.classList.remove('letter-on-top');
        await Promise.all([shrinking.finished,moving.finished]);
        shrinking.cancel(); moving.cancel();
        paper.classList.remove('letter-in-motion');
      }
      extraction.hidden = true;
      letterStage.style.height = '';
      letterStage.classList.remove('letter-on-top');
      setLetterState(false);
      letterOpen = false;
      envelopeButton.focus({preventScroll:true});
    } finally { letterBusy = false; letterStage.classList.remove('letter-returning'); }
  }
  envelopeButton.addEventListener('click', () => { void openLetter(); });
  closeLetterButton.addEventListener('click', () => { void closeLetter(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && letterOpen && !letterBusy) {
      event.preventDefault(); void closeLetter();
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
