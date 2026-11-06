/* In-book flower scene, scratch notes, tiny letters and shared typewriter.
   MIT implementation inspiration: FIQTOR and TH3-S4URAV (see THIRD_PARTY_NOTICES.md).
   No framework, external images, storage, network calls or modal overlays. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const defaults = {
    typewriterSpeedMs: 52, scratchThreshold: .42,
    scratchCards: [{label:'A little discovery',message:'[Write a scratch note here.]'}],
    openWhenLetters: [{label:'Open When You Need a Smile',message:'[Write your message here.]'}]
  };
  const splitChars = text => (typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(x => x.segment)
    : Array.from(text));

  function init({book, pageDefs, reducedMotion}) {
    const config = {...defaults, ...(window.STORYBOOK_EXTRAS_CONFIG || {})};
    const speed = clamp(Number(config.typewriterSpeedMs)||52, 16, 180);
    const threshold = clamp(Number(config.scratchThreshold)||.42, .22, .85);
    const pageIds = new Map(pageDefs.map(([id],i)=>[id,i]));
    const states = [];
    const visiblePages = new Set();
    const scratching = new Map();
    const scratched = new Set();
    const typeTimers = new Map();
    const baseRunners = new Map();
    let activeBloom = false;

    // Two layers: the reward remains rendered beneath the canvas so scratching
    // never creates a layout jump. Its TYPEWRITER is held until the coating goes.
    const scratchGrid = $('[data-scratch-grid]',book);
    if (scratchGrid) (Array.isArray(config.scratchCards)?config.scratchCards:[]).forEach((item,i)=>{
      const card=document.createElement('article'); card.className='scratch-card';
      card.dataset.scratchId=String(i); card.setAttribute('aria-label',String(item.label||`Scratch note ${i+1}`));
      const reward=document.createElement('div'); reward.className='scratch-reward';
      const title=document.createElement('h3'); title.textContent=String(item.label||`Note ${i+1}`);
      const message=document.createElement('p'); message.textContent=String(item.message||'');
      reward.append(title,message);
      const canvas=document.createElement('canvas'); canvas.className='scratch-coat';
      canvas.dataset.scratchCanvas=String(i); canvas.setAttribute('aria-label',`Scratch to reveal ${item.label||'a message'}`);
      const skip=document.createElement('button'); skip.type='button';skip.className='scratch-skip';
      skip.dataset.scratchReveal=String(i);skip.textContent='Reveal without scratching';
      card.append(reward,canvas,skip);scratchGrid.append(card);
    });

    const miniList=$('[data-openwhen-list]',book);
    if(miniList) (Array.isArray(config.openWhenLetters)?config.openWhenLetters:[]).forEach((item,i)=>{
      const card=document.createElement('article');card.className='mini-envelope';card.dataset.miniId=String(i);
      const button=document.createElement('button');button.type='button';button.className='mini-envelope-toggle';
      button.dataset.miniToggle=String(i);button.setAttribute('aria-expanded','false');
      button.setAttribute('aria-label',`Open ${String(item.label||'a note')}`);
      const icon=document.createElement('span');icon.className='mini-icon';icon.setAttribute('aria-hidden','true');
      const flap=document.createElement('span');flap.className='mini-flap';icon.append(flap);
      const label=document.createElement('span');label.className='mini-label';label.textContent=String(item.label||`A note for another day`);
      const chevron=document.createElement('span');chevron.className='mini-chevron';chevron.setAttribute('aria-hidden','true');chevron.textContent='⌄';
      button.append(icon,label,chevron);
      const holder=document.createElement('div');holder.className='mini-paper-holder';
      const clip=document.createElement('div');clip.className='mini-paper-clip';
      const paper=document.createElement('div');paper.className='mini-paper';
      const content=document.createElement('p');content.className='mini-message';content.textContent=String(item.message||'');
      const footer=document.createElement('small');footer.textContent='a note, just for you ♡';
      paper.append(content,footer);clip.append(paper);holder.append(clip);card.append(button,holder);miniList.append(card);
    });

    // Wrap only readable narrative targets. Inline emphasis/strong/line breaks are
    // untouched; each grapheme gets a visibility toggle while retaining its width.
    // The full accessible text is kept on each semantic target via aria-label.
    const selector = '.page-content h1, .page-content h2, .page-content h3, .page-content p, '+
      '.page-content .intro-bottom, .page-content .mystery-note > span, '+
      '.page-content .card-back > span:first-child';
    $$(selector,book).forEach((target,index)=>{
      if(target.closest('.cake-scene, .wattpad-note, .sky-postcard, .scratch-skip, .bloom-replay')) return;
      const full=target.textContent||'';
      if (!full.trim()) return;
      const sheet=target.closest('.book-sheet');if(!sheet)return;
      const pageIndex=Number(sheet.dataset.pageIndex);
      const category=target.closest('.card-back')?'memory':target.closest('.letter-sheet')?'letter':
        target.closest('.mini-paper')?'mini':target.closest('.scratch-reward')?'scratch':
        target.closest('.birthday-wish')?'wish':'main';
      const chunks=[];
      const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT);
      let node;while(node=walker.nextNode()) if(node.nodeValue) chunks.push(node);
      const chars=[];
      chunks.forEach(textNode=>{
        const fragment=document.createDocumentFragment();
        splitChars(textNode.nodeValue).forEach(character=>{
          const glyph=document.createElement('span');glyph.className='tw-char';glyph.textContent=character;
          glyph.setAttribute('aria-hidden','true');fragment.append(glyph);chars.push({el:glyph,char:character});
        });
        textNode.replaceWith(fragment);
      });
      target.classList.add('tw-target');target.setAttribute('aria-label',full.trim());
      const st={target,chars,cursor:0,done:false,pageIndex,category,index};
      states.push(st);
      if(reducedMotion.matches) complete(st);
    });

    function complete(st) {
      if(st.done)return;
      if(typeTimers.has(st)) { clearTimeout(typeTimers.get(st));typeTimers.delete(st); }
      for(let i=st.cursor;i<st.chars.length;i++)st.chars[i].el.classList.add('is-written');
      st.cursor=st.chars.length;st.done=true;
      st.target.dataset.twDone='true';
    }
    function allowed(st) {
      if(st.category==='main')return true;
      if(st.category==='memory')return !!st.target.closest('.memory-card')?.classList.contains('is-revealed');
      if(st.category==='letter')return !!st.target.closest('.letter-world')?.classList.contains('is-extracted');
      if(st.category==='scratch')return !!st.target.closest('.scratch-card')?.classList.contains('is-revealed');
      if(st.category==='mini')return !!st.target.closest('.mini-envelope')?.classList.contains('is-open');
      if(st.category==='wish')return !st.target.hidden;
      return false;
    }
    function advance(st,onDone=()=>{}) {
      if(st.done || !visiblePages.has(st.pageIndex) || !allowed(st))return;
      if(typeTimers.has(st))return;
      if(reducedMotion.matches) {complete(st);onDone();return;}
      const next=()=>{
        typeTimers.delete(st);
        if(!visiblePages.has(st.pageIndex)||!allowed(st))return;
        if(st.cursor>=st.chars.length) {st.done=true;st.target.dataset.twDone='true';onDone();return;}
        const {el,char}=st.chars[st.cursor++];el.classList.add('is-written');
        let delay=speed;
        if(/[.!?]/.test(char))delay+=210;
        else if(/[,:;—]/.test(char))delay+=95;
        else if(char==='\n')delay+=270;
        const t=setTimeout(next,delay);typeTimers.set(st,t);
      };
      next();
    }
    function runBase(pageIndex) {
      if(!visiblePages.has(pageIndex))return;
      if(baseRunners.get(pageIndex))return;
      baseRunners.set(pageIndex,true);
      const loop=()=>{
        if(!visiblePages.has(pageIndex)){baseRunners.delete(pageIndex);return;}
        const pending=states.find(st=>st.pageIndex===pageIndex&&st.category==='main'&&!st.done);
        if(!pending) {baseRunners.delete(pageIndex);return;}
        advance(pending,loop);
      };
      loop();
    }
    function startIn(node) {
      if(!node)return;
      for(const st of states)if(!st.done&&node.contains(st.target)&&st.category!=='main'&&allowed(st))advance(st,()=>{});
      const sheet=node.closest('.book-sheet');
    }
    function stopPage(index) {
      for(const st of states){
        if(st.pageIndex!==index)continue;
        if(typeTimers.has(st)){clearTimeout(typeTimers.get(st));typeTimers.delete(st);}
      }
      baseRunners.delete(index);
    }
    function finishPage(pageIndex) {
      for(const st of states)if(st.pageIndex===pageIndex&&!st.done&&allowed(st))complete(st);
      baseRunners.delete(pageIndex);
    }
    // A deliberate center double tap finishes only visible, already-unlocked text.
    function finishVisible() {
      for(const index of visiblePages)finishPage(index);
    }

    const scene=$('[data-bloom-scene]',book);
    function replayBloom() {
      if(!scene)return;
      scene.classList.remove('is-blooming');void scene.offsetWidth;
      scene.classList.add('is-blooming');
    }
    function showPage(index,orientation='portrait') {
      const newVisible=new Set([index]);
      if(orientation==='landscape'&&index>0&&index+1<pageDefs.length)newVisible.add(index+1);
      for(const old of visiblePages)if(!newVisible.has(old))stopPage(old);
      const newBloom=newVisible.has(pageIds.get('bloom'));
      if(scene && !newBloom)scene.classList.remove('is-blooming');
      const enteredBloom=newBloom&&!activeBloom;activeBloom=newBloom;
      visiblePages.clear();newVisible.forEach(x=>visiblePages.add(x));
      for(const n of visiblePages) {
        runBase(n);
        const sheet=$(`.book-sheet[data-page-index="${n}"]`,book);
        if(sheet) {
          initScratchOnPage(sheet);
          $$('.memory-card.is-revealed, .letter-world.is-extracted, .mini-envelope.is-open, .scratch-card.is-revealed, .birthday-wish:not([hidden])',sheet).forEach(startIn);
        }
      }
      if(enteredBloom)replayBloom();
    }

    // Coating drawing uses destination-out with pointer capture, as in the
    // referenced Pookie canvas mechanic. Progress is sampled instead of relying
    // on gesture length. Each card retains its state and strokes this visit.
    function initScratchOnPage(sheet) {
      $$('[data-scratch-canvas]',sheet).forEach(canvas=>{
        const id=Number(canvas.dataset.scratchCanvas),card=canvas.closest('.scratch-card');
        card.classList.toggle('is-revealed',scratched.has(id));
        if(scratched.has(id))return;
        if(!scratching.has(id))scratching.set(id,{strokes:[],w:0,h:0,cx:null,canvas,card,down:false,moves:0,last:null});
        const data=scratching.get(id);
        const rect=canvas.getBoundingClientRect();
        if(rect.width<40||rect.height<40)return;
        const width=Math.max(120,Math.round(rect.width)),height=Math.max(70,Math.round(rect.height));
        if(data.w===width&&data.h===height)return;
        data.w=width;data.h=height;
        const dpr=Math.min(devicePixelRatio||1,2);
        canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
        const ctx=canvas.getContext('2d',{willReadFrequently:true});data.cx=ctx;
        ctx.setTransform(dpr,0,0,dpr,0,0);
        const grad=ctx.createLinearGradient(0,0,width,height);grad.addColorStop(0,'#ded7c8');
        grad.addColorStop(.5,'#ead8c6');grad.addColorStop(1,'#c8c3be');
        ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
        ctx.textAlign='center';ctx.fillStyle='#746d72';ctx.font='600 13px Georgia, serif';
        ctx.fillText('✧  scratch to uncover  ✧',width/2,height/2);
        // Drawing recorded relative to the box survives a responsive resize.
        for(const stroke of data.strokes)erase(ctx,stroke.p,stroke.q,width,height);
        if(canvas.dataset.scratchBound==='yes')return;
        canvas.dataset.scratchBound='yes';
        canvas.addEventListener('pointerdown',e=>{
          if(scratched.has(id))return;
          e.preventDefault();e.stopPropagation();data.down=true;data.last=getPoint(e,canvas);
          canvas.setPointerCapture(e.pointerId);data.strokes.push({p:data.last,q:data.last});
          erase(ctx,data.last,data.last,data.w,data.h);
          if(reducedMotion.matches)revealScratch(id);
        });
        canvas.addEventListener('pointermove',e=>{
          if(!data.down||scratched.has(id))return;
          e.preventDefault();e.stopPropagation();const point=getPoint(e,canvas);
          erase(data.cx,data.last,point,data.w,data.h);
          data.strokes.push({p:data.last,q:point});data.last=point;
          if(++data.moves%6===0&&scratchFraction(data)>=threshold)revealScratch(id);
        });
        const end=e=>{if(!data.down)return;data.down=false;data.last=null;
          try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}catch(_){ }
          if(scratchFraction(data)>=threshold)revealScratch(id);
        };
        canvas.addEventListener('pointerup',end);
        canvas.addEventListener('pointercancel',end);
      });
    }
    function getPoint(e,canvas) {
      const r=canvas.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)};
    }
    function erase(ctx,p,q,w,h) {
      if(!ctx)return;ctx.save();ctx.globalCompositeOperation='destination-out';
      ctx.strokeStyle='rgba(0,0,0,1)';ctx.fillStyle='rgba(0,0,0,1)';
      ctx.lineWidth=Math.max(22,Math.min(w,h)*.29);ctx.lineCap='round';ctx.lineJoin='round';
      ctx.beginPath();ctx.moveTo(p.x*w,p.y*h);ctx.lineTo(q.x*w,q.y*h);ctx.stroke();
      ctx.beginPath();ctx.arc(q.x*w,q.y*h,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    function scratchFraction(data) {
      if(!data.cx)return 0;
      const {data:pixels,width,height}=data.cx.getImageData(0,0,data.canvas.width,data.canvas.height);
      let clear=0,total=0;
      const step=Math.max(6,Math.round(Math.min(width,height)/30));
      for(let y=step;y<height-step;y+=step)for(let x=step;x<width-step;x+=step){
        total++;if(pixels[(y*width+x)*4+3]<140)clear++;
      }
      return total?clear/total:0;
    }
    function revealScratch(id) {
      if(scratched.has(id))return;
      scratched.add(id);
      const card=$(`[data-scratch-id="${id}"]`,book);
      if(card){card.classList.add('is-revealed');
        const data=scratching.get(id);if(data)data.down=false;
        startIn(card);
      }
    }

    // Called at the top of the existing book click delegation. Returning true
    // means the interaction belongs to this feature, not to page navigation.
    function handleClick(event) {
      const mini=event.target.closest('[data-mini-toggle]');
      if(mini){
        const card=mini.closest('.mini-envelope');
        card.classList.toggle('is-open');const open=card.classList.contains('is-open');
        mini.setAttribute('aria-expanded',String(open));
        mini.setAttribute('aria-label',`${open?'Close':'Open'} ${$('.mini-label',mini).textContent}`);
        if(open)setTimeout(()=>startIn(card),reducedMotion.matches?0:480);
        return true;
      }
      const reveal=event.target.closest('[data-scratch-reveal]');
      if(reveal){revealScratch(Number(reveal.dataset.scratchReveal));return true;}
      if(event.target.closest('[data-bloom-replay]')) {replayBloom();return true;}
      return false;
    }

    // Allow the existing book navigation to distinguish typing/scratching from
    // a deliberate left/right page-tap. Text itself remains tappable to skip.
    function isInteractive(target) {
      return !!target.closest('.scratch-card,.mini-envelope,.garden-frame,[data-bloom-replay]');
    }
    window.addEventListener('resize',()=>{
      for(const n of visiblePages){const sheet=$(`.book-sheet[data-page-index="${n}"]`,book);if(sheet)initScratchOnPage(sheet);}
    },{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)for(const n of visiblePages)stopPage(n);
      else for(const n of visiblePages){runBase(n);const sheet=$(`.book-sheet[data-page-index="${n}"]`,book);if(sheet)$$('.mini-envelope.is-open,.scratch-card.is-revealed,.letter-world.is-extracted',sheet).forEach(startIn);}
    });
    return {showPage, handleClick, isInteractive, startIn, finishPage, finishVisible, replayBloom, revealScratch};
  }
  window.StorybookExtras={init};
})();
