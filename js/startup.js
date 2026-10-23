/* Start core artwork requests in the head; reveal Home only after decoding. */
(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const ASSETS = [
    'icons/bag-organic-real.webp', 'icons/bag-mixed-real.webp',
    'icons/bag-recycle-real.webp', 'icons/glass-real.webp',
    'icons/card-botanical.svg', 'icons/card-recycling.svg',
    'icons/council-backdrop.svg', 'icons/bag-organic.svg',
    'icons/bag-mixed.svg', 'icons/bag-recycle.svg', 'icons/glass-carrier.svg', 'icons/reuse-free-stuff-v1.png'
  ];
  const MIN_MS = 650, MAX_MS = 10000, FADE_MS = 400;
  const started = performance.now(), loaded = new Set(), images = [];
  let settled = false, revealing = null;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  function within(promise, ms) {
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), Math.max(0, ms));
      Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); resolve(false); });
    });
  }
  function decode(image) {
    try { return typeof image.decode === 'function' ? image.decode().catch(() => false) : Promise.resolve(); }
    catch (_) { return Promise.resolve(false); }
  }
  function preload(path, index) {
    return new Promise(resolve => {
      const image = new Image(), url = new URL(path, root).href;
      images.push(image);
      image.decoding = 'async'; image.fetchPriority = index < 4 ? 'high' : 'auto';
      image.onload = async () => {
        const decoded = await decode(image);
        if (decoded !== false && image.naturalWidth > 0) loaded.add(url);
        resolve();
      };
      image.onerror = () => resolve();
      image.src = url;
    });
  }
  const ready = within(Promise.all(ASSETS.map(preload)), MAX_MS).then(() => { settled = true; });
  function imageURL(path, fallback) {
    return settled && !loaded.has(new URL(path, root).href) ? fallback : path;
  }
  function visibleImages(content) {
    return Promise.all([...content.querySelectorAll('img')].filter(image => image.getClientRects().length > 0).map(image => {
      if (image.complete) return image.naturalWidth > 0 ? decode(image) : Promise.resolve();
      return new Promise(resolve => {
        const finish = () => {
          image.removeEventListener('load', finish); image.removeEventListener('error', finish);
          decode(image).then(resolve);
        };
        image.addEventListener('load', finish, { once: true }); image.addEventListener('error', finish, { once: true });
      });
    }));
  }
  function reveal({ beforeReveal = () => {}, onComplete = () => {} } = {}) {
    if (revealing) return revealing;
    revealing = (async () => {
      const splash = document.getElementById('splashScreen'), content = document.getElementById('appContent');
      try {
        await ready;
        beforeReveal();
        await within(visibleImages(content), MAX_MS - (performance.now() - started));
        await delay(Math.max(0, MIN_MS - (performance.now() - started)));
      } finally {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        document.body.classList.remove('app-loading');
        splash.classList.add('splash-leaving');
        if (!reduced) await delay(FADE_MS);
        splash.hidden = true; content.inert = false;
        onComplete();
      }
    })();
    return revealing;
  }
  window.BAG_DAY_STARTUP = { ready, reveal, imageURL, assets: [...ASSETS] };
})();
