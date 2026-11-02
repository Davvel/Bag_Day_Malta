/* One compact sponsor placement, shared by Home and REUSE. */
(() => {
  'use strict';
  const INTERVAL_MS = 10000, SLIDE_MS = 350;
  const STATE_KEY = 'bag-day-sponsor-carousel-v1';
  const START_KEY = 'bag-day-sponsor-start-v1';
  const read = (storage, key) => { try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; } };
  const write = (storage, key, value) => { try { storage.setItem(key, JSON.stringify(value)); } catch {} };
  const session = { getItem: key => sessionStorage.getItem(key), setItem: (key, value) => sessionStorage.setItem(key, value) };
  const local = { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) };

  function mount(panel, links, key, headingText, config = {}) {
    const stateKey = config.channel === 'community' ? STATE_KEY + '-community' : STATE_KEY;
    const word = config.label || 'sponsor';
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const count = links.length;
    let index = 0, remaining = INTERVAL_MS, deadline = 0, timer = 0;
    let paused = media.matches, hovered = false, gesture = null, transition = 0;
    let animations = [], destroyed = false, suppressClickUntil = 0;
    function storedState(){const value=read(session,stateKey);return value?.states?.[key]||value?.latest||value}
    const saved = storedState();
    if (saved && Date.now() - saved.at < 30 * 60 * 1000 && links.some(a => a.dataset.sponsorId === saved.sponsorId)) {
      index = links.findIndex(a => a.dataset.sponsorId === saved.sponsorId);
      remaining = Math.max(0, Math.min(INTERVAL_MS, Number(saved.remaining) || INTERVAL_MS));
      paused = media.matches || saved.paused === true;
    } else {
      const starts = read(local, START_KEY) || {};
      const startsCount = config.startCount || count;
      index = config.initialIndex ? config.initialIndex() : (Number.isInteger(starts[key]) ? starts[key] % startsCount : 0);
      write(local, START_KEY, { ...starts, [key]: (index + 1) % startsCount });
    }

    const header = document.createElement('div'); header.className = 'sponsor-carousel-header';
    const heading = document.createElement('div'); heading.className = 'sponsor-heading'; heading.textContent = headingText;
    const controls = document.createElement('div'); controls.className = 'sponsor-controls'; controls.hidden = count < 2;
    const dots = [];
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'sponsor-rotation-toggle';
    toggle.addEventListener('click', () => { freeze(); paused = !paused; remaining = INTERVAL_MS; updateControls(); save(); sync(); });
    controls.append(toggle); header.append(heading, controls);
    const viewport = document.createElement('div'); viewport.className = 'sponsor-viewport';
    if(count>1){viewport.setAttribute('role','group');viewport.tabIndex=0;viewport.setAttribute('aria-label','Advert carousel. Swipe or use Left and Right arrow keys.');}
    const keyboard=event=>{if(count<2||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();event.stopPropagation();go(choice(event.key==='ArrowLeft'?-1:1),true,event.key==='ArrowLeft'?-1:1)};
    viewport.addEventListener('keydown',keyboard);
    const slides = links.map((link, i) => {
      link.draggable = false; link.querySelectorAll('img').forEach(image => image.draggable = false);
      const slide = document.createElement('div'); slide.className = 'sponsor-slide';
      slide.setAttribute('role', 'group'); slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', (i + 1) + ' of ' + count); slide.append(link); viewport.append(slide); return slide;
    });
    const status = document.createElement('span'); status.className = 'sponsor-status'; status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
    panel.setAttribute('aria-roledescription', count > 1 ? 'carousel' : '');
    panel.dataset.carouselCount = String(count); panel.replaceChildren(header, viewport, status);

    function save() {
      const state = { key, sponsorId: links[index].dataset.sponsorId, remaining: timer ? Math.max(0, deadline - Date.now()) : remaining, paused, at: Date.now() };
      const previous=read(session,stateKey),states={...(previous?.states||{}),[key]:state};
      write(session,stateKey,{latest:state,states:Object.fromEntries(Object.entries(states).slice(-12))});
    }
    function freeze() {
      if (timer) { remaining = Math.max(0, deadline - Date.now()); clearTimeout(timer); timer = 0; }
    }
    function canRun() {
      if (window.BAG_DAY_VIEWPORT?.gesturesBlocked() || destroyed || count < 2 || paused || hovered || gesture || document.hidden || panel.closest('[hidden],[inert]') || document.querySelector('dialog[open]')) return false;
      const r = viewport.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && Math.max(0, Math.min(innerWidth, r.right) - Math.max(0, r.left)) * Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) >= r.width * r.height * .5;
    }
    function sync() {
      if (!canRun()) { if (timer) { freeze(); save(); } return; }
      if (!timer && !transition) {
        deadline = Date.now() + remaining;
        timer = setTimeout(() => { timer = 0; remaining = INTERVAL_MS; if (canRun()) go(choice(1), false, 1); else save(); }, remaining);
      }
    }
    function choice(direction) { return config.nextIndex ? config.nextIndex(index, direction) : index + direction; }
    function updateControls() {
      viewport.dataset.activeIndex=String(index);
      heading.textContent = config.heading ? config.heading(links[index]) : headingText;
      dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === index)));
      toggle.textContent = paused ? '▶' : 'Ⅱ';
      toggle.setAttribute('aria-label', paused ? 'Start sponsor rotation' : 'Pause sponsor rotation');
      toggle.title = toggle.getAttribute('aria-label');
    }
    function settle() {
      clearTimeout(transition); transition = 0;
      animations.forEach(animation => animation.cancel()); animations = [];
      slides.forEach((slide, i) => { slide.hidden = i !== index; slide.inert = i !== index; slide.setAttribute('aria-hidden', String(i !== index)); });
    }
    function go(next, manual, direction) {
      freeze(); settle();
      next = (next + count) % count;
      if (next === index) { remaining = INTERVAL_MS; save(); sync(); return; }
      const previous = slides[index]; index = next; remaining = INTERVAL_MS; config.onSelect?.(index);
      const current = slides[index], started = Date.now();
      updateControls(); save();
      if (manual) status.textContent = (word === 'sponsor' ? 'Sponsor ' : 'Advert ') + (index + 1) + ' of ' + count;
      if (media.matches || document.hidden) { settle(); sync(); return; }
      previous.hidden = false; previous.inert = true; previous.setAttribute('aria-hidden', 'true');
      current.hidden = false; current.inert = true; current.setAttribute('aria-hidden', 'true');
      const animationOptions = { duration: SLIDE_MS, easing: 'ease-in-out', fill: 'both' };
      animations = [previous.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-direction * 100}%)` }], animationOptions), current.animate([{ transform: `translateX(${direction * 100}%)` }, { transform: 'translateX(0)' }], animationOptions)];
      transition = setTimeout(() => { settle(); if (canRun()) remaining = Math.max(0, INTERVAL_MS - (Date.now() - started)); save(); sync(); }, SLIDE_MS);
    }
    function focus(event) {
      if (count < 2 || event.target === toggle) return;
      freeze(); paused = true; updateControls(); save();
    }
    function enter(event) { if (event.pointerType === 'mouse') { hovered = true; sync(); } }
    function leave(event) { if (event.pointerType === 'mouse') { hovered = false; sync(); } }
    function down(event) {
      if (window.BAG_DAY_VIEWPORT?.gesturesBlocked() || event.isPrimary === false || count < 2 || event.button !== 0) return;
      freeze(); gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null }; save();
    }
    function move(event) {
      if (window.BAG_DAY_VIEWPORT?.gesturesBlocked()) { cancel(); return; }
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 12) gesture.axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'x' : 'y';
      if (gesture.axis === 'x') { event.preventDefault(); viewport.setPointerCapture(event.pointerId); suppressClickUntil = performance.now() + 700; }
    }
    function up(event) {
      if (window.BAG_DAY_VIEWPORT?.gesturesBlocked()) { cancel(); return; }
      if (!gesture || event.pointerId !== gesture.id) return;
      const g = gesture; gesture = null;
      if (g.axis === 'x' && Math.abs(event.clientX - g.x) >= 40) go(choice(event.clientX < g.x ? 1 : -1), true, event.clientX < g.x ? 1 : -1);
      else sync();
    }
    function cancel() {
      const previous=gesture;gesture=null;
      if(previous && viewport.hasPointerCapture(previous.id))viewport.releasePointerCapture(previous.id);
      sync();
    }
    // Touch pointers begin with implicit capture on the link/image. Transferring
    // that capture to the viewport must not cancel the swipe as it bubbles up.
    function lostCapture(event) { if (event.target === viewport) cancel(); }
    function click(event) { if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); } }
    function visibility() { if (document.hidden) { freeze(); settle(); save(); } else sync(); }
    function pagehide() { freeze(); settle(); save(); }
    function pageshow(event) {
      if (event.persisted) {
        const current = storedState(), i = current ? links.findIndex(a => a.dataset.sponsorId === current.sponsorId) : -1;
        if (i >= 0) { freeze(); index = i; remaining = Math.max(0, Math.min(INTERVAL_MS, Number(current.remaining) || INTERVAL_MS)); paused = media.matches || current.paused === true; settle(); updateControls(); }
      }
      hovered = false; sync();
    }
    function motion() { if (media.matches) { freeze(); settle(); paused = true; updateControls(); save(); } sync(); }
    panel.addEventListener('focusin', focus);
    panel.addEventListener('pointerenter', enter); panel.addEventListener('pointerleave', leave);
    viewport.addEventListener('pointerdown', down); viewport.addEventListener('pointermove', move);
    viewport.addEventListener('pointerup', up); viewport.addEventListener('pointercancel', cancel);
    viewport.addEventListener('lostpointercapture', lostCapture); viewport.addEventListener('click', click, true);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', pagehide); window.addEventListener('pageshow', pageshow);
    window.addEventListener('bag-day-gesture-cancel',cancel);window.addEventListener('bag-day-gestures-ready',sync);
    window.addEventListener('resize', sync); window.addEventListener('scroll', sync, true); media.addEventListener('change', motion);
    const observer = new MutationObserver(sync); observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['hidden', 'inert', 'open'] });
    const intersection = new IntersectionObserver(sync, { threshold: [0, .5, 1] }); intersection.observe(viewport);
    config.onSelect?.(index); settle(); updateControls(); save(); sync();
    return { destroy() {
      freeze(); save(); destroyed = true; settle(); observer.disconnect(); intersection.disconnect();
      viewport.removeEventListener('keydown', keyboard);
      viewport.removeEventListener('pointerdown',down);viewport.removeEventListener('pointermove',move);
      viewport.removeEventListener('pointerup',up);viewport.removeEventListener('pointercancel',cancel);
      viewport.removeEventListener('lostpointercapture',lostCapture);viewport.removeEventListener('click',click,true);
      window.removeEventListener('bag-day-gesture-cancel',cancel);window.removeEventListener('bag-day-gestures-ready',sync);
      panel.removeEventListener('focusin', focus); panel.removeEventListener('pointerenter', enter); panel.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', pagehide); window.removeEventListener('pageshow', pageshow);
      window.removeEventListener('resize', sync); window.removeEventListener('scroll', sync, true); media.removeEventListener('change', motion);
    } };
  }
  window.BAG_DAY_SPONSOR_CAROUSEL = { mount };
})();
