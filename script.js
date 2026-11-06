(() => {
  'use strict';
  const cfg = window.BIRTHDAY_CONFIG || {};
  const book = document.getElementById('book');
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pageDefs = [
    ['cover', 'The cover'],
    ['intro', 'A little dedication'],
    ['origin', 'Once upon a Wattpad'],
    ['notes', 'Familiar chaos'],
    ['scratch', 'Hidden keepsakes'],
    ['distance', 'Across the miles'],
    ['letter', 'A letter for you'],
    ['openwhen', 'Open when letters'],
    ['birthday', 'A birthday wish'],
    ['bloom', 'A little garden'],
    ['ending', 'To be continued'],
    ['back-cover', 'The back cover']
  ];
  let pageFlip = null;
  let fallbackPage = 0;
  const revealedNotes = new Set();
  let letterOpen = false;
  let letterExtracted = false;
  let letterFolding = false;
  let letterTimer = 0;
  let wishMade = false;
  let pointerStart = null;
  let pendingCenterTap = null;
  let letterPointer = null;
  let confettiTimer = 0;
  let lastTurn = 0;

  document.title = `The Pages Between Us · For ${cfg.recipientName || 'Ash'}`;
  const nameTargets = document.querySelectorAll('[data-recipient]');
  nameTargets.forEach(el => { el.textContent = cfg.recipientName || 'Ash'; });

  function populateNames(node) {
    $$('[data-recipient]', node).forEach(el => { el.textContent = cfg.recipientName || 'Ash'; });
    $$('[data-sender]', node).forEach(el => { el.textContent = cfg.senderName || 'Your friend'; });
    $$('[data-year]', node).forEach(el => { el.textContent = cfg.birthdayYear || '2026'; });
    $$('[data-friend-location]', node).forEach(el => { el.textContent = (cfg.friendLocation || 'Italy').toUpperCase(); });
  }

  function buildCards(node) {
    const grid = $('[data-memory-grid]', node);
    if (!grid) return;
    const notes = Array.isArray(cfg.notes) ? cfg.notes : [];
    notes.forEach((note, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'memory-card';
      card.dataset.card = String(index);
      card.setAttribute('aria-label', `Reveal ${note.title || 'a memory'}`);
      const front = document.createElement('span'); front.className = 'card-front';
      const icon = document.createElement('span'); icon.className = 'card-symbol'; icon.textContent = note.icon || '✿';
      const title = document.createElement('strong'); title.textContent = note.title || 'A little note';
      const subtitle = document.createElement('small'); subtitle.textContent = note.subtitle || 'tap to reveal';
      front.append(icon, title, subtitle);
      const back = document.createElement('span'); back.className = 'card-back';
      const message = document.createElement('span'); message.textContent = note.reveal || '';
      const hint = document.createElement('small'); hint.textContent = 'tap to turn back ↶';
      back.append(message, hint);
      card.append(front, back);
      grid.append(card);
    });
  }

  function buildLetter(node) {
    const prose = $('[data-letter-paragraphs]', node);
    if (!prose) return;
    (Array.isArray(cfg.letterParagraphs) ? cfg.letterParagraphs : []).forEach(paragraph => {
      const p = document.createElement('p');
      p.textContent = String(paragraph);
      prose.append(p);
    });
  }

  // Each page is a live HTML sheet. The StPageFlip library animates the paper.
  for (let index = 0; index < pageDefs.length; index++) {
    const [id] = pageDefs[index];
    const template = document.getElementById(`page-${id}`);
    const sheet = document.createElement('div');
    sheet.className = `book-sheet${index === 0 || index === pageDefs.length - 1 ? ' sheet-cover' : ''}`;
    sheet.dataset.pageIndex = String(index);
    if (index === 0 || index === pageDefs.length - 1) sheet.dataset.density = 'hard';
    if (index === 0 || index === pageDefs.length - 1) {
      sheet.append(template.content.cloneNode(true));
    } else {
      const inner = document.createElement('div'); inner.className = 'page-inner';
      const scroll = document.createElement('div'); scroll.className = 'page-scroll';
      scroll.append(template.content.cloneNode(true));
      inner.append(scroll);
      sheet.append(inner);
    }
    populateNames(sheet);
    buildCards(sheet);
    buildLetter(sheet);
    book.append(sheet);
  }

  // Seed the original birthday wish before the reusable typewriter indexes text.
  $$('[data-birthday-wish]',book).forEach(el => {
    el.textContent = cfg.birthdayWish || '[Add your final birthday wish in config.js.]';
  });

  // All extras live inside the existing StPageFlip HTML sheets.
  const extras = window.StorybookExtras?.init({ book, pageDefs, reducedMotion });

  function timeIn(zone) {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).format(new Date());
    } catch (_) { return '--:--'; }
  }
  function refreshClocks() {
    $$('[data-clock="ph"]', book).forEach(el => { el.textContent = timeIn(cfg.yourTimeZone || 'Asia/Manila'); });
    $$('[data-clock="it"]', book).forEach(el => { el.textContent = timeIn(cfg.friendTimeZone || 'Europe/Rome'); });
  }
  function syncCards() {
    $$('[data-card]', book).forEach(card => {
      const open = revealedNotes.has(Number(card.dataset.card));
      card.classList.toggle('is-revealed', open);
      $('.card-front', card).hidden = open;
      $('.card-back', card).hidden = !open;
      card.setAttribute('aria-pressed', String(open));
    });
  }
  function syncLetter() {
    $$('[data-letter-world]', book).forEach(world => {
      world.classList.toggle('is-open', letterOpen);
      world.classList.toggle('is-extracted', letterExtracted && letterOpen);
      world.classList.toggle('is-folding', letterFolding);
      const sheet = $('[data-letter-sheet]', world);
      sheet.tabIndex = letterOpen ? 0 : -1;
      sheet.setAttribute('aria-hidden', String(!letterOpen));
      const toggle = $('[data-letter-toggle]', world);
      toggle.setAttribute('aria-expanded', String(letterOpen));
      toggle.setAttribute('aria-label', letterOpen ? 'Return letter to envelope' : 'Open letter');
      if (!letterOpen) sheet.scrollTop = 0;
    });
  }
  function setLetter(open) {
    if (letterFolding) return;
    clearTimeout(letterTimer);
    if (open) {
      letterOpen = true;
      letterExtracted = false;
      syncLetter();
      letterTimer = setTimeout(() => {
        if (!letterOpen || letterFolding) return;
        letterExtracted = true; // The folded paper has cleared the pocket.
        syncLetter();           // It may now unfold in front without an overlap jump.
        extras?.startIn($('[data-letter-world]',book));
      }, reducedMotion.matches ? 0 : 980);
    } else {
      letterFolding = true;
      letterExtracted = false; // Fold first, without crossing the front pocket.
      syncLetter();
      letterTimer = setTimeout(() => {
        letterOpen = false;     // Then tuck the folded card into the envelope.
        letterFolding = false;
        syncLetter();
      }, reducedMotion.matches ? 0 : 475);
    }
  }
  function syncCake() {
    $$('[data-cake-scene]', book).forEach(scene => scene.classList.toggle('candles-out', wishMade));
    $$('[data-wish-button]', book).forEach(button => {
      button.textContent = wishMade ? 'Light the candles again ↺' : 'Make a wish & blow out the candles ✳';
    });
    $$('[data-birthday-wish]', book).forEach(el => {
      el.hidden = !wishMade;
      // Once wrapped in reserved-width glyphs, rewriting textContent would
      // destroy its characters and reset the slow reveal on every page flip.
      if (!el.classList.contains('tw-target'))
        el.textContent = cfg.birthdayWish || '[Add your final birthday wish in config.js.]';
    });
  }
  function confetti(root) {
    const layer = $('[data-confetti]', root);
    if (!layer || reducedMotion.matches) return;
    layer.replaceChildren();
    const glyphs = ['✧', '✦', '♡', '•'];
    for (let i = 0; i < 24; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.textContent = glyphs[i % glyphs.length];
      piece.style.color = ['#c3a071', '#b8797a', '#7e9c8a'][i % 3];
      piece.style.setProperty('--x', `${Math.round(Math.random() * 300 - 150)}px`);
      piece.style.setProperty('--y', `${Math.round(Math.random() * -210 - 25)}px`);
      piece.style.setProperty('--rot', `${Math.round(Math.random() * 450 - 225)}deg`);
      piece.style.setProperty('--delay', `${Math.random() * .24}s`);
      layer.append(piece);
    }
    clearTimeout(confettiTimer);
    confettiTimer = setTimeout(() => layer.replaceChildren(), 2200);
  }

  function currentIndex() {
    return pageFlip ? pageFlip.getCurrentPageIndex() : fallbackPage;
  }
  function updateProgress(index = currentIndex()) {
    index = Math.max(0, Math.min(index, pageDefs.length - 1));
    $('#progress-label').textContent = pageDefs[index][1];
    const dots = $('#progress-dots');
    dots.replaceChildren();
    pageDefs.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.classList.toggle('active', i === index);
      dots.append(dot);
    });
    refreshClocks();
    syncCards(); syncLetter(); syncCake();
    const orientation = pageFlip && typeof pageFlip.getOrientation === 'function'
      ? pageFlip.getOrientation() : 'portrait';
    extras?.showPage(index, orientation);
  }

  function flip(direction) {
    const index = currentIndex();
    if (direction > 0 && index >= pageDefs.length - 1) return;
    if (direction < 0 && index <= 0) return;
    if (Date.now() - lastTurn < 420) return;
    lastTurn = Date.now();
    if (pageFlip) {
      if (reducedMotion.matches) {
        if (direction > 0) pageFlip.turnToNextPage();
        else pageFlip.turnToPrevPage();
      } else if (direction > 0) pageFlip.flipNext('bottom');
      else pageFlip.flipPrev('bottom');
    } else {
      fallbackPage += direction;
      $$('.book-sheet', book).forEach((sheet, i) => sheet.classList.toggle('fallback-active', i === fallbackPage));
      updateProgress();
    }
  }

  // The sheet is never handed to StPageFlip when the user interacts with its content.
  // Avoid interpreting a vertical letter scroll as an attempt to flip the book.
  const interactiveSelector = 'button, a, [role="button"], input, textarea, select, [data-letter-world], [data-memory-grid], [data-cake-scene], .mystery-note, .ending-action';
  function interactive(target) {
    return !!target.closest(interactiveSelector) || !!extras?.isInteractive(target);
  }
  book.addEventListener('click', event => {
    if (extras?.handleClick(event)) return;
    const card = event.target.closest('[data-card]');
    if (card) {
      const id = Number(card.dataset.card);
      if (revealedNotes.has(id)) revealedNotes.delete(id); else revealedNotes.add(id);
      syncCards();
      if (revealedNotes.has(id)) extras?.startIn(card);
      return;
    }
    if (event.target.closest('[data-letter-toggle]')) {
      setLetter(!letterOpen);
      return;
    }
    if (event.target.closest('[data-letter-sheet]') && letterOpen) {
      if (letterPointer && Math.hypot(event.clientX - letterPointer.x, event.clientY - letterPointer.y) > 14) return;
      setLetter(false);
      return;
    }
    if (event.target.closest('[data-wish-button]')) {
      wishMade = !wishMade;
      syncCake();
      if (wishMade) {
        confetti(event.target.closest('.page-content'));
        extras?.startIn(event.target.closest('.page-content'));
      }
      return;
    }
    if (event.target.closest('[data-restart]')) {
      if (pageFlip) pageFlip.flip(0, 'bottom');
      else { fallbackPage = 0; updateProgress(); }
      return;
    }
  });
  book.addEventListener('pointerdown', event => {
    const sheet = event.target.closest('[data-letter-sheet]');
    letterPointer = sheet ? { x: event.clientX, y: event.clientY } : null;
    if (interactive(event.target) || event.button !== 0 || !event.isPrimary) { pointerStart = null; return; }
    const scroll = event.target.closest('.page-scroll');
    pointerStart = { x: event.clientX, y: event.clientY, scroll, scrollTop: scroll ? scroll.scrollTop : 0 };
  }, {passive:true});
  book.addEventListener('pointerup', event => {
    if (!pointerStart || interactive(event.target)) { pointerStart = null; return; }
    const {x, y, scroll, scrollTop} = pointerStart;
    pointerStart = null;
    if (scroll && Math.abs(scroll.scrollTop - scrollTop) > 2) return;
    const dx = event.clientX - x;
    const dy = event.clientY - y;
    if (Math.abs(dy) > 16 && Math.abs(dy) >= Math.abs(dx)) return;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.45) { flip(dx < 0 ? 1 : -1); return; }
    if (Math.abs(dx) > 15 || Math.abs(dy) > 15) return;
    const rect = book.getBoundingClientRect();
    const xFraction = (event.clientX - rect.left) / rect.width;
    const direction = xFraction >= .5 ? 1 : -1;
    // Center-only double tap: allow the second tap without triggering a flip.
    // Ordinary single center taps still navigate after the 340 ms gesture window.
    if (xFraction >= .36 && xFraction <= .64) {
      const now = performance.now();
      const existing = pendingCenterTap;
      if (existing && now - existing.at <= 340 &&
          existing.page === currentIndex() &&
          Math.hypot(event.clientX - existing.x, event.clientY - existing.y) <= 42) {
        clearTimeout(existing.timer);
        pendingCenterTap = null;
        extras?.finishVisible?.();
        return;
      }
      if (existing) {
        clearTimeout(existing.timer);
        pendingCenterTap = null;
        if (existing.page === currentIndex()) flip(existing.direction);
      }
      const tap = {at:now, x:event.clientX, y:event.clientY,
                   page:currentIndex(), direction, timer:null};
      pendingCenterTap = tap;
      tap.timer = setTimeout(() => {
        if (pendingCenterTap !== tap) return;
        pendingCenterTap = null;
        if (currentIndex() === tap.page) flip(tap.direction);
      }, 340);
      return;
    }
    if (pendingCenterTap) {
      clearTimeout(pendingCenterTap.timer);
      pendingCenterTap = null;
    }
    flip(direction);
  }, {passive:true});
  book.addEventListener('pointercancel', () => { pointerStart = null; });
  book.addEventListener('keydown', event => {
    if (event.target.matches('[data-letter-sheet]') && ['Enter',' '].includes(event.key)) {
      event.preventDefault();
      setLetter(false);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || interactive(event.target)) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); flip(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); flip(-1); }
  });

  // StPageFlip 2.0.7 (MIT) handles page curvature, gutter and bidirectional folds.
  // Its built-in click/touch navigation is disabled to protect nested scrollable content.
  if (window.St && St.PageFlip) {
    try {
      pageFlip = new St.PageFlip(book, {
        width: 430, height: 610, size: 'stretch',
        minWidth: 260, maxWidth: 530, minHeight: 390, maxHeight: 760,
        drawShadow: true, maxShadowOpacity: .25,
        flippingTime: 1050, usePortrait: true, showCover: true,
        mobileScrollSupport: false, autoSize: false,
        useMouseEvents: false, clickEventForward: true,
        disableFlipByClick: true
      });
      pageFlip.on('flip', event => updateProgress(event.data));
      pageFlip.on('changeOrientation', () => updateProgress());
      pageFlip.on('init', event => updateProgress(event.data.page));
      pageFlip.loadFromHTML($$('.book-sheet', book));
    } catch (error) {
      console.error('Page-flip engine initialization failed:', error);
      pageFlip = null;
    }
  }
  if (!pageFlip) {
    book.classList.add('flip-fallback');
    $$('.book-sheet',book).forEach((sheet,i)=>sheet.classList.toggle('fallback-active', i===0));
    $('#book-instructions').textContent = 'Tap the left or right side to read. Page animation is unavailable on this connection.';
  }
  updateProgress();
  setInterval(refreshClocks, 30000);

  // Original ambient harmonies, synthesized in-browser. No external audio track
  // and no autoplay. Visitors start or stop music with an explicit tap.
  const musicToggle = $('#music-toggle');
  const musicLabel = $('#music-label');
  const AC = window.AudioContext || window.webkitAudioContext;
  let playingMusic = false, audioContext = null, musicTimer = null, trackAudio = null, chordStep = 0;
  function playChord() {
    if (!audioContext || audioContext.state !== 'running') return;
    const chords = [
      [196, 246.94, 293.66, 369.99],   // G major add 9
      [174.61, 220, 261.63, 329.63],   // F major 7
      [164.81, 196, 246.94, 329.63],   // E minor 7
      [146.83, 196, 220, 293.66]       // D sus add 9
    ];
    const start = audioContext.currentTime + .06;
    const notes = chords[chordStep++ % chords.length];
    for (const frequency of notes) {
      const tone = audioContext.createOscillator();
      const gain = audioContext.createGain();
      tone.type = 'sine'; tone.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(.015, start + .85);
      gain.gain.setValueAtTime(.015, start + 1.6);
      gain.gain.exponentialRampToValueAtTime(.0001, start + 4.7);
      tone.connect(gain); gain.connect(audioContext.destination);
      tone.start(start); tone.stop(start + 4.8);
    }
  }
  async function setMusic(enabled) {
    if (enabled) {
      try {
        if (typeof cfg.musicUrl === 'string' && cfg.musicUrl.trim()) {
          trackAudio = new Audio(cfg.musicUrl.trim());
          trackAudio.loop = true; trackAudio.volume = .24;
          await trackAudio.play();
        } else {
          if (!AC) throw new Error('Web Audio unavailable');
          audioContext = new AC();
          await audioContext.resume();
          chordStep = 0; playChord();
          musicTimer = setInterval(playChord, 3600);
        }
        playingMusic = true;
      } catch (error) {
        console.warn('Music could not start:', error);
        playingMusic = false;
      }
    } else {
      playingMusic = false;
      clearInterval(musicTimer); musicTimer = null;
      if (trackAudio) {trackAudio.pause();trackAudio.currentTime=0;trackAudio=null;}
      if (audioContext) {audioContext.close().catch(()=>{});audioContext=null;}
    }
    musicToggle.setAttribute('aria-pressed', String(playingMusic));
    musicToggle.setAttribute('aria-label', playingMusic ? 'Pause background music' : 'Play background music');
    musicLabel.textContent = playingMusic ? 'Music on' : 'Music off';
  }
  musicToggle.addEventListener('click', () => setMusic(!playingMusic));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playingMusic) setMusic(false);
  });
})();
