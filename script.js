(() => {
  "use strict";
  const config = window.BIRTHDAY_CONFIG || {};
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const name = config.recipientName || "friend";
  $$('[data-recipient]').forEach((el) => { el.textContent = name; });
  $$('[data-sender]').forEach((el) => { el.textContent = config.senderName || "Your friend"; });
  $$('[data-year]').forEach((el) => { el.textContent = config.birthdayYear || "2026"; });
  document.title = `The Pages Between Us · For ${name}`;

  // Gently reveal chapters; respect reduced-motion preferences.
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.09, rootMargin: '0px 0px 20px 0px' });
    $$('[data-reveal]').forEach((node) => observer.observe(node));
  } else {
    $$('[data-reveal]').forEach((node) => node.classList.add('visible'));
  }

  const progressBar = $('#reading-progress');
  let scrollTicking = false;
  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.max(0, Math.min(100, (window.scrollY / scrollable) * 100)) : 0;
    progressBar.style.width = `${progress}%`;
    scrollTicking = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateProgress);
      scrollTicking = true;
    }
  }, { passive: true });
  updateProgress();

  // The interactive cards are true buttons, usable by touch and keyboard.
  const defaultNotes = [
    { icon: '✳', title: 'A little note', subtitle: 'tap to discover', reveal: 'Replace this note in config.js!' }
  ];
  (Array.isArray(config.notes) && config.notes.length ? config.notes : defaultNotes).forEach((note, index) => {
    const button = document.createElement('button');
    button.className = `flip-note note-color-${index % 4}`;
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `Reveal ${note.title || 'a note'}`);
    const inner = document.createElement('span');
    inner.className = 'flip-note-inner';
    const front = document.createElement('span');
    front.className = 'flip-face flip-front';
    const back = document.createElement('span');
    back.className = 'flip-face flip-back';
    const icon = document.createElement('span');
    icon.className = 'note-icon';
    icon.textContent = note.icon || '✿';
    const title = document.createElement('strong');
    title.textContent = note.title || 'A note';
    const subtitle = document.createElement('small');
    subtitle.textContent = note.subtitle || 'tap to flip';
    const backMessage = document.createElement('span');
    backMessage.textContent = note.reveal || '';
    const backHint = document.createElement('small');
    backHint.textContent = 'tap to turn back ↶';
    front.append(icon, title, subtitle);
    back.append(backMessage, backHint);
    inner.append(front, back);
    button.append(inner);
    button.addEventListener('click', () => {
      const turned = button.classList.toggle('is-flipped');
      button.setAttribute('aria-pressed', String(turned));
      button.setAttribute('aria-label', `${turned ? 'Hide' : 'Reveal'} ${note.title || 'a note'}`);
    });
    $('#note-grid').append(button);
  });

  // Time-zone aware clocks (daylight-saving changes are handled automatically).
  $('#friend-city').textContent = config.friendLocation || 'Italy';
  function timeInZone(zone) {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).format(new Date());
    } catch (_) {
      return '--:--';
    }
  }
  function updateClocks() {
    $('#clock-ph').textContent = timeInZone(config.yourTimeZone || 'Asia/Manila');
    $('#clock-it').textContent = timeInZone(config.friendTimeZone || 'Europe/Rome');
  }
  updateClocks();
  setInterval(updateClocks, 30000);

  // Letter content is always supplied by the sender in config.js.
  const letterContainer = $('#letter-paragraphs');
  (Array.isArray(config.letterParagraphs) ? config.letterParagraphs : []).forEach((paragraph) => {
    const p = document.createElement('p');
    p.textContent = String(paragraph);
    letterContainer.append(p);
  });
  const letterButton = $('#open-letter');
  const letterContent = $('#letter-content');
  letterButton.addEventListener('click', () => {
    const open = !letterButton.classList.contains('is-open');
    letterButton.classList.toggle('is-open', open);
    letterButton.setAttribute('aria-expanded', String(open));
    letterButton.setAttribute('aria-label', open ? 'Close the birthday letter' : 'Open the birthday letter');
    $('#envelope-label').textContent = open ? 'Tap to close the envelope' : 'Tap to break the seal';
    letterContent.hidden = !open;
    if (open) {
      // The opened letter stays in the normal reading flow.
      setTimeout(() => letterContent.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' }), 120);
    }
  });

  // Candle blowing, tiny celebratory confetti, and an editable birthday wish.
  const candleButton = $('#blow-candles');
  const scene = $('#cake-scene');
  let candlesOut = false;
  candleButton.addEventListener('click', () => {
    candlesOut = !candlesOut;
    scene.classList.toggle('candles-out', candlesOut);
    candleButton.innerHTML = candlesOut ? 'Light the candles again <span aria-hidden="true">↺</span>' : 'Make a wish &amp; blow out the candles <span aria-hidden="true">✳</span>';
    const wish = $('#birthday-wish');
    wish.textContent = config.birthdayWish || '[Add your final wish in config.js.]';
    wish.hidden = !candlesOut;
    if (candlesOut && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const layer = $('#confetti-layer');
      layer.replaceChildren();
      const glyphs = ['✦', '✳', '♡', '•'];
      for (let i = 0; i < 30; i += 1) {
        const piece = document.createElement('span');
        piece.className = 'confetti';
        piece.textContent = glyphs[i % glyphs.length];
        piece.style.setProperty('--x', `${(Math.random() * 440 - 220).toFixed(0)}px`);
        piece.style.setProperty('--y', `${(Math.random() * -260 - 50).toFixed(0)}px`);
        piece.style.setProperty('--rotation', `${(Math.random() * 620 - 310).toFixed(0)}deg`);
        piece.style.setProperty('--delay', `${(Math.random() * 0.28).toFixed(2)}s`);
        piece.style.color = ['#a46b55', '#7e9b80', '#d7aa59', '#a58db0'][i % 4];
        layer.append(piece);
      }
      setTimeout(() => layer.replaceChildren(), 2500);
    }
  });


  // V2: opening the actual cover now turns it on its hinge before revealing chapter one.
  const cover = $('#storybook-cover');
  const heroArt = $('.hero-art');
  const turnOverlay = $('#page-turn-overlay');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let turning = false;
  let opening = false;
  function navigateTo(target, animate = true) {
    const destination = document.querySelector(target);
    if (!destination || turning) return;
    if (!animate || reduceMotion.matches) {
      destination.scrollIntoView({ behavior: 'instant', block: 'start' });
      history.pushState(null, '', target);
      return;
    }
    turning = true;
    turnOverlay.classList.remove('is-turning');
    void turnOverlay.offsetWidth; // Re-start CSS keyframes after consecutive turns.
    turnOverlay.classList.add('is-turning');
    setTimeout(() => {
      destination.scrollIntoView({ behavior: 'instant', block: 'start' });
      history.pushState(null, '', target);
    }, 460);
    setTimeout(() => {
      turnOverlay.classList.remove('is-turning');
      turning = false;
    }, 950);
  }
  function openTheBook(event) {
    if (event) event.preventDefault();
    if (opening) return;
    if (reduceMotion.matches) {
      navigateTo('#chapter-one', false);
      return;
    }
    opening = true;
    heroArt.classList.add('is-opening');
    cover.disabled = true;
    setTimeout(() => navigateTo('#chapter-one', true), 1330);
    setTimeout(() => {
      heroArt.classList.remove('is-opening');
      cover.disabled = false;
      opening = false;
    }, 2700);
  }
  cover.addEventListener('click', openTheBook);
  $('#begin-story').addEventListener('click', openTheBook);
  document.querySelectorAll('a[href^="#"]:not(.skip-link):not(#begin-story)').forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if (!hash || !document.querySelector(hash)) return;
      event.preventDefault();
      navigateTo(hash, true);
    });
  });

  // Typewriter note begins when its chapter enters the viewport, not before.
  const typedNote = $('#paper-typing');
  const noteText = 'Two writers. One unexpected friendship.';
  let typingStarted = false;
  function typeChapterNote() {
    if (typingStarted) return;
    typingStarted = true;
    if (reduceMotion.matches) {
      typedNote.textContent = noteText;
      return;
    }
    typedNote.classList.add('is-typing');
    let i = 0;
    const typer = setInterval(() => {
      i++;
      typedNote.textContent = noteText.slice(0, i);
      if (i >= noteText.length) {
        clearInterval(typer);
        typedNote.classList.remove('is-typing');
      }
    }, 49);
  }
  if ('IntersectionObserver' in window) {
    const typingObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        typeChapterNote();
        typingObserver.disconnect();
      }
    }, { threshold: 0.15 });
    typingObserver.observe($('#chapter-one'));
  } else {
    typeChapterNote();
  }

})();
