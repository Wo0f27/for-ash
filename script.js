(() => {
  'use strict';
  const cfg = window.BIRTHDAY_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const pages = [
    { id: 'intro', name: 'The beginning' },
    { id: 'origin', name: 'Once upon a Wattpad' },
    { id: 'notes', name: 'Familiar chaos' },
    { id: 'distance', name: 'Across the miles' },
    { id: 'letter', name: 'A letter for you' },
    { id: 'birthday', name: 'A birthday wish' },
    { id: 'ending', name: 'To be continued' }
  ];
  const book = $('#book');
  const cover = $('#book-cover');
  const leaf = $('#turn-leaf');
  const leafFront = $('#leaf-front');
  const leafBack = $('#leaf-back');
  const left = $('#page-left');
  const right = $('#page-right');
  const progress = $('#progress-label');
  const dots = $('#progress-dots');
  const instructions = $('#book-instructions');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = window.matchMedia('(max-width: 850px)');

  let current = 0;
  let isOpen = false;
  let turning = false;
  let isMobile = smallScreen.matches;
  let lastPointer = null;
  let letterPointer = null;
  let confettiTimer = null;
  let resizeTimer = null;
  let tapPointer = null;
  let suppressPageTap = false;
  const revealedNotes = new Set();
  let letterOpen = false;
  let wishMade = false;

  document.title = `The Pages Between Us · For ${cfg.recipientName || 'Ash'}`;

  function applyNames(root) {
    $$('[data-recipient]', root).forEach(el => { el.textContent = cfg.recipientName || 'Ash'; });
    $$('[data-sender]', root).forEach(el => { el.textContent = cfg.senderName || 'Your friend'; });
    $$('[data-year]', root).forEach(el => { el.textContent = cfg.birthdayYear || '2026'; });
    $$('[data-friend-location]', root).forEach(el => { el.textContent = (cfg.friendLocation || 'Italy').toUpperCase(); });
  }
  applyNames(document);

  function makeMemoryCards(root) {
    const grid = $('[data-memory-grid]', root);
    if (!grid) return;
    const notes = Array.isArray(cfg.notes) && cfg.notes.length ? cfg.notes : [{icon:'✦',title:'A little note',subtitle:'tap to reveal',reveal:'A story worth keeping.'}];
    grid.replaceChildren();
    notes.forEach((note, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'memory-card';
      button.dataset.card = String(index);
      button.setAttribute('aria-pressed', String(revealedNotes.has(index)));
      button.setAttribute('aria-label', `${revealedNotes.has(index) ? 'Hide' : 'Reveal'}: ${note.title || 'a note'}`);
      const front = document.createElement('span');
      front.className = 'card-front';
      const icon = document.createElement('span'); icon.className = 'card-symbol'; icon.textContent = String(note.icon || '✿');
      const name = document.createElement('strong'); name.textContent = String(note.title || 'A note');
      const hint = document.createElement('small'); hint.textContent = String(note.subtitle || 'tap to reveal');
      front.append(icon,name,hint);
      const back = document.createElement('span'); back.className = 'card-back';
      const message = document.createElement('span'); message.textContent = String(note.reveal || '');
      const returnHint = document.createElement('small'); returnHint.textContent = 'tap to turn back ↶';
      back.append(message,returnHint);
      button.classList.toggle('is-revealed',revealedNotes.has(index));
      front.hidden = revealedNotes.has(index);
      back.hidden = !revealedNotes.has(index);
      button.append(front,back);
      grid.append(button);
    });
  }

  function prepareLetter(root) {
    const prose = $('[data-letter-paragraphs]', root);
    if (!prose) return;
    const paragraphs = Array.isArray(cfg.letterParagraphs) ? cfg.letterParagraphs : [];
    paragraphs.forEach(text => {
      const p = document.createElement('p');
      p.textContent = String(text);
      prose.append(p);
    });
    const world = $('[data-letter-world]', root);
    const sheet = $('[data-letter-sheet]', world);
    world.classList.toggle('is-open',letterOpen);
    sheet.setAttribute('aria-hidden',String(!letterOpen));
    sheet.tabIndex = letterOpen ? 0 : -1;
    const toggle = $('[data-letter-toggle]', root);
    toggle.setAttribute('aria-expanded',String(letterOpen));
    toggle.setAttribute('aria-label',letterOpen ? 'Put the birthday letter back' : 'Open the birthday letter');
  }

  function prepareCake(root) {
    const scene = $('[data-cake-scene]',root);
    if (!scene) return;
    scene.classList.toggle('candles-out',wishMade);
    const button = $('[data-wish-button]',root);
    button.textContent = wishMade ? 'Light the candles again ↺' : 'Make a wish & blow out the candles ✳';
    const wish = $('[data-birthday-wish]',root);
    wish.hidden = !wishMade;
    wish.textContent = cfg.birthdayWish || '[Add your final birthday wish in config.js.]';
  }

  function renderInto(index, holder) {
    holder.replaceChildren();
    const pageData = pages[index] || { id:'blank', name:'' };
    const template = $(`#page-${pageData.id}`);
    if (!template) return;
    const inner = document.createElement('div');
    inner.className = 'page-inner';
    const scroll = document.createElement('div');
    scroll.className = 'page-scroll';
    scroll.append(template.content.cloneNode(true));
    inner.append(scroll);
    holder.append(inner);
    applyNames(holder);
    makeMemoryCards(holder);
    prepareLetter(holder);
    prepareCake(holder);
  }

  function renderStationary(index) {
    if (isMobile) {
      left.replaceChildren();
      renderInto(index,right);
    } else {
      renderInto(index,left);
      renderInto(index+1,right);
    }
    tickClocks();
  }

  function renderControls() {
    const step = isMobile ? 1 : 2;
    const total = isMobile ? pages.length : Math.ceil(pages.length / 2);
    const position = isMobile ? current : Math.floor(current/2);
    const last = current + step >= pages.length;
    progress.textContent = isOpen ? `Page ${position + 1} of ${total}` : 'A story for you';
    instructions.textContent = isOpen ? 'Tap the left half to go back · tap the right half to go forward · or swipe.' : 'Tap the cover to open your book.';
    dots.replaceChildren();
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('span');
      dot.classList.toggle('active',i===position);
      dots.append(dot);
    }
  }

  function finishOpen() {
    book.classList.remove('is-opening','is-closed');
    isOpen = true;
    turning = false;
    renderControls();
    cover.blur();
  }

  function openBook() {
    if (isOpen || turning) return;
    turning = true;
    book.classList.add('is-opening');
    renderStationary(0);
    if (prefersReducedMotion.matches) { finishOpen(); return; }
    let done = false;
    const complete = () => { if (done) return; done = true; finishOpen(); };
    cover.addEventListener('animationend',e => { if (e.animationName === 'coverOpen') complete(); },{once:true});
    setTimeout(complete,1350);
  }

  // The paper's back is a real second face. The static destination underneath
  // is prepared BEFORE animation, then committed only once the turn finishes.
  function turnPage(direction) {
    if (!isOpen || turning) return;
    const step = isMobile ? 1 : 2;
    const target = current + direction*step;
    if (target < 0 || target >= pages.length) return;
    if (prefersReducedMotion.matches) {
      current = target;
      renderStationary(current);
      renderControls();
      return;
    }
    turning = true;
    renderControls();
    leaf.className = 'turn-leaf';
    leafFront.replaceChildren();
    leafBack.replaceChildren();

    if (direction > 0) {
      if (isMobile) {
        renderInto(current,leafFront);
        renderInto(target,leafBack);
        renderInto(target,right);
      } else {
        renderInto(current+1,leafFront);
        renderInto(target,leafBack);
        renderInto(target+1,right);
      }
    } else if (isMobile) {
      /* Reverse in portrait restores a page FROM the left binding.
         The destination is on the FRONT of the returning sheet; the current
         page remains underneath until the full 180° turn completes. */
      renderInto(target,leafFront);
      renderInto(current,leafBack);
      // Do not replace the visible page early (it would flash at mid-turn).
    } else {
      renderInto(current,leafFront);
      renderInto(target+1,leafBack);
      renderInto(target,left);
    }
    tickClocks();
    book.classList.add('is-turning');
    const cls = direction > 0 ? 'is-forward' : 'is-backward';
    void leaf.offsetWidth;
    leaf.classList.add(cls);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      current = target;
      renderStationary(current);
      leaf.className = 'turn-leaf';
      leafFront.replaceChildren();
      leafBack.replaceChildren();
      book.classList.remove('is-turning');
      turning = false;
      renderControls();
    };
    let safetyTimeout = null;
    const onEnd = event => {
      if (event.target !== leaf || !['turnForward','turnBackward','turnBackwardPortrait'].includes(event.animationName)) return;
      leaf.removeEventListener('animationend',onEnd);
      clearTimeout(safetyTimeout);
      finish();
    };
    leaf.addEventListener('animationend',onEnd);
    /* Safety net only; finish on the actual leaf animation, not its child
       shading or an arbitrary half-way timer. */
    safetyTimeout = setTimeout(() => {
      leaf.removeEventListener('animationend',onEnd);
      finish();
    }, 1500);
  }

  function timeIn(zone) {
    try { return new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()); }
    catch { return '--:--'; }
  }
  function tickClocks() {
    $$('[data-clock="ph"]',book).forEach(el => { el.textContent = timeIn(cfg.yourTimeZone || 'Asia/Manila'); });
    $$('[data-clock="it"]',book).forEach(el => { el.textContent = timeIn(cfg.friendTimeZone || 'Europe/Rome'); });
  }

  function updateLetter() {
    $$('[data-letter-world]',book).forEach(world => {
      world.classList.toggle('is-open',letterOpen);
      const paper = $('[data-letter-sheet]',world);
      const toggle = $('[data-letter-toggle]',world);
      paper.tabIndex = letterOpen ? 0 : -1;
      paper.setAttribute('aria-hidden',String(!letterOpen));
      toggle.setAttribute('aria-expanded',String(letterOpen));
      toggle.setAttribute('aria-label',letterOpen ? 'Put the letter back' : 'Open the birthday letter');
      if (!letterOpen) paper.scrollTop = 0;
    });
  }

  function makeConfetti(root) {
    const layer = $('[data-confetti]',root);
    if (!layer || prefersReducedMotion.matches) return;
    layer.replaceChildren();
    const chars=['✧','✦','♡','•'];
    for(let i=0;i<24;i++) {
      const piece=document.createElement('span');
      piece.className='confetti-piece';
      piece.textContent=chars[i%chars.length];
      piece.style.color=['#c3a071','#b8797a','#7e9c8a'][i%3];
      piece.style.setProperty('--x',`${Math.floor(Math.random()*300-150)}px`);
      piece.style.setProperty('--y',`${Math.floor(Math.random()*-210-25)}px`);
      piece.style.setProperty('--rot',`${Math.floor(Math.random()*450-225)}deg`);
      piece.style.setProperty('--delay',`${Math.random()*.24}s`);
      layer.append(piece);
    }
    clearTimeout(confettiTimer);
    confettiTimer=setTimeout(()=>layer.replaceChildren(),1900);
  }

  // Delegation survives page re-rendering and guarantees one-tap card updates.
  book.addEventListener('click',event=>{
    if (turning || suppressPageTap || !isOpen) return;
    const card=event.target.closest('[data-card]');
    if(card) {
      const id=Number(card.dataset.card);
      if(revealedNotes.has(id)) revealedNotes.delete(id); else revealedNotes.add(id);
      $$(`[data-card="${id}"]`,book).forEach(button=>{
        const open=revealedNotes.has(id);
        button.classList.toggle('is-revealed',open);
        $('.card-front',button).hidden=open;
        $('.card-back',button).hidden=!open;
        button.setAttribute('aria-pressed',String(open));
      });
      return;
    }
    if(event.target.closest('[data-letter-toggle]')) { letterOpen=!letterOpen; updateLetter(); return; }
    const letter=event.target.closest('[data-letter-sheet]');
    if(letter && letterOpen) {
      if(letterPointer && (Math.abs(event.clientX-letterPointer.x)>15 || Math.abs(event.clientY-letterPointer.y)>15)) return;
      letterOpen=false; updateLetter(); return;
    }
    const wish=event.target.closest('[data-wish-button]');
    if(wish) {
      wishMade=!wishMade;
      $$('[data-cake-scene]',book).forEach(scene=>scene.classList.toggle('candles-out',wishMade));
      $$('[data-wish-button]',book).forEach(button=>{button.textContent=wishMade?'Light the candles again ↺':'Make a wish & blow out the candles ✳';});
      $$('[data-birthday-wish]',book).forEach(el=>{el.hidden=!wishMade;el.textContent=cfg.birthdayWish||'[Add your final birthday wish in config.js.]';});
      if(wishMade) makeConfetti(event.target.closest('.page-content'));
      return;
    }
    if(event.target.closest('[data-restart]')) {
      current=0; isOpen=false; turning=false;
      book.classList.add('is-closed');
      book.classList.remove('is-opening','is-turning');
      renderStationary(0);renderControls();
      return;
    }
    // Page clicks only; never steal interactions from links, memory cards,
    // scrollable letters, cake controls or a selected text passage.
    if (event.target.closest('button,a,[role="button"],input,textarea,select,[contenteditable]')) return;
    if (event.detail === 0 || (window.getSelection && !window.getSelection().isCollapsed)) return;
    const bounds = book.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right) return;
    turnPage(event.clientX < bounds.left + bounds.width / 2 ? -1 : 1);
  });

  book.addEventListener('pointerdown',event=>{
    const sheet=event.target.closest('[data-letter-sheet]');
    letterPointer=sheet ? {x:event.clientX,y:event.clientY} : null;
    tapPointer={x:event.clientX,y:event.clientY,time:performance.now(),pointerId:event.pointerId};
    suppressPageTap=false;
    if(!isOpen || turning || event.target.closest('button,a,[role="button"]')) { lastPointer=null;return; }
    lastPointer={x:event.clientX,y:event.clientY,time:performance.now()};
  },{passive:true});
  book.addEventListener('pointerup',event=>{
    if (tapPointer && event.pointerId === tapPointer.pointerId) {
      const moved = Math.hypot(event.clientX-tapPointer.x,event.clientY-tapPointer.y)>15;
      const held = performance.now()-tapPointer.time>850;
      suppressPageTap = moved || held;
      tapPointer=null;
      if (suppressPageTap) setTimeout(()=>{suppressPageTap=false;},180);
    }
    if(!lastPointer || !isOpen || turning) return;
    const dx=event.clientX-lastPointer.x;
    const dy=event.clientY-lastPointer.y;
    lastPointer=null;
    if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.45) turnPage(dx<0?1:-1);
  },{passive:true});
  book.addEventListener('pointercancel',()=>{lastPointer=null;tapPointer=null;suppressPageTap=true;setTimeout(()=>{suppressPageTap=false;},180);});
  book.addEventListener('keydown',event=>{
    if(event.target.matches('[data-letter-sheet]') && (event.key==='Enter'||event.key===' ')) {
      event.preventDefault();letterOpen=false;updateLetter();
    }
  });
  document.addEventListener('keydown',event=>{
    if(!isOpen || turning || event.altKey || event.ctrlKey || event.metaKey) return;
    if(event.key==='ArrowRight' && !event.target.closest('[data-letter-sheet]')) {event.preventDefault();turnPage(1);}
    if(event.key==='ArrowLeft' && !event.target.closest('[data-letter-sheet]')) {event.preventDefault();turnPage(-1);}
  });

  cover.addEventListener('click',openBook);
  smallScreen.addEventListener('change',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      if(turning) return;
      const previouslyMobile=isMobile;
      isMobile=smallScreen.matches;
      if(previouslyMobile===isMobile) return;
      if(!isMobile) current=Math.floor(current/2)*2;
      renderStationary(current);renderControls();
    },120);
  });
  setInterval(tickClocks,30000);
  renderStationary(0);
  renderControls();
  tickClocks();
})();
