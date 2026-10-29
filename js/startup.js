/* Reveal Home immediately; progressively sharpen the same artwork. */
(() => {
  'use strict';
  // Keep the former splash available behind one release-config switch.
  const splashEnabled = window.BAG_DAY_CONFIG?.splashEnabled === true;
  document.documentElement.dataset.splashEnabled = String(splashEnabled);
  const artworkPaths = {
    organic: 'icons/bag-organic-real.webp', mixed: 'icons/bag-mixed-real.webp',
    recycle: 'icons/bag-recycle-real.webp', glass: 'icons/glass-real.webp'
  };
  const detailed = new Map(), cachedDetails = new Set();
  // Cache lookups never fetch artwork or delay Home. A cached original can be
  // selected directly on the first render, without flashing a preview.
  if (typeof caches !== 'undefined') {
    for (const path of Object.values(artworkPaths)) {
      caches.match(new URL(path, document.baseURI).href)
        .then(hit => { if (hit?.ok) cachedDetails.add(path); }).catch(() => {});
    }
  }
  function detailState(path) {
    const existing = detailed.get(path);
    if (existing) return existing;
    const photo = new Image(), state = { ready: false, photo, promise: null };
    detailed.set(path, state);
    state.promise = new Promise(resolve => {
      let finished = false;
      const finish = ok => {
        if (finished) return;
        finished = true; state.ready = ok;
        if (!ok) cachedDetails.delete(path);
        resolve(ok);
      };
      photo.decoding = 'async'; photo.fetchPriority = 'high';
      photo.onload = async () => {
        try { if (photo.decode) await photo.decode(); finish(photo.naturalWidth > 0); }
        catch (_) { finish(false); }
      };
      photo.onerror = () => finish(false);
      photo.src = path;
      // A browser-memory hit can be available synchronously when src is assigned.
      if (photo.complete && photo.naturalWidth > 0) finish(true);
    });
    return state;
  }
  function progressiveImage(type, alt) {
    const path = artworkPaths[type], state = detailState(path);
    const preview = path.replace('.webp', '-preview.webp');
    const initial = state.ready || cachedDetails.has(path) ? path : preview;
    const size = type === 'glass' ? 'width="1226" height="1283"' : 'width="1024" height="1536"';
    return `<img src="${initial}" data-detail-src="${path}" data-preview-src="${preview}" ${size} decoding="async" alt="${alt}">`;
  }
  function upgradeImages(container) {
    for (const image of container.querySelectorAll('img[data-detail-src]')) {
      const path = image.dataset.detailSrc, preview = image.dataset.previewSrc;
      delete image.dataset.detailSrc;
      const state = detailState(path);
      // A late preview load must never overwrite a completed clear image.
      image.onerror = () => {
        if (!image.isConnected) return;
        image.onerror = null;
        if (image.getAttribute('src') === path) image.src = preview;
      };
      if (state.ready) { image.src = path; continue; }
      state.promise.then(ok => {
        if (ok && image.isConnected) image.src = path;
        else if (!ok && image.isConnected && image.getAttribute('src') === path) image.src = preview;
      });
    }
  }
  if (!splashEnabled) {
    let revealed = false;
    window.BAG_DAY_STARTUP = {
      ready: Promise.resolve(), assets: [], imageURL: path => path,
      progressiveImage, upgradeImages,
      reveal({ beforeReveal = () => {}, onComplete = () => {} } = {}) {
        if (revealed) return Promise.resolve();
        revealed = true;
        try { beforeReveal(); }
        finally {
          document.getElementById('splashScreen').hidden = true;
          document.body.classList.remove('app-loading');
          document.getElementById('appContent').inert = false;
          onComplete();
        }
        return Promise.resolve();
      }
    };
    return;
  }
  document.addEventListener('DOMContentLoaded', () => {
    for (const image of document.querySelectorAll('[data-splash-src]')) image.src = image.dataset.splashSrc;
  }, { once: true });
  const root = new URL('../', document.currentScript.src);
  const returnKey='bag-day-return-home-v1';let returning=false;try{const at=Number(sessionStorage.getItem(returnKey));sessionStorage.removeItem(returnKey);returning=at>0&&Date.now()>=at&&Date.now()-at<30000}catch{}
  returning=returning||performance.getEntriesByType?.('navigation')?.[0]?.type==='back_forward';
  window.addEventListener('pageshow',()=>{try{sessionStorage.removeItem(returnKey)}catch{}});
  const settingsEntry = new URLSearchParams(location.search).get('panel') === 'settings';
  document.documentElement.dataset.entryScreen = settingsEntry ? 'settings' : returning ? 'return' : 'home';
  const SPLASH_ART='icons/splash-features-v1.png';let splashArtworkReadyAt=0;
  const ASSETS = [SPLASH_ART,
    'icons/bag-organic-real.webp', 'icons/bag-mixed-real.webp',
    'icons/bag-recycle-real.webp', 'icons/glass-real.webp',
    'icons/card-botanical.svg', 'icons/card-recycling.svg',
    'icons/council-backdrop.svg', 'icons/bag-organic.svg',
    'icons/bag-mixed.svg', 'icons/bag-recycle.svg', 'icons/glass-carrier.svg', 'icons/reuse-free-stuff-v1.png', 'icons/community-notices.png', 'icons/bag-day-malta-brand.svg'
  ];
  const MIN_MS = 2000, MAX_MS = 10000, FADE_MS = 400;
  const started = performance.now(), loaded = new Set(), images = [];
  let settled = false, revealing = null;
  // Count the minimum from the completed document, not the early head request.
  const splashVisible = new Promise(resolve => {
    const mark = () => resolve(performance.now());
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark, {once:true});
    else mark();
  });
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
        if (decoded !== false && image.naturalWidth > 0){loaded.add(url);if(path===SPLASH_ART)splashArtworkReadyAt=performance.now();}
        resolve();
      };
      image.onerror = () => resolve();
      image.src = url;
    });
  }
  const ready = within(Promise.all(ASSETS.filter(path=>!(settingsEntry||returning)||path!==SPLASH_ART).map(preload)), MAX_MS).then(() => { settled = true; });
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
        if (settingsEntry || returning) {
          beforeReveal();
        } else {
          const visibleAt = await splashVisible;
          await ready;
          beforeReveal();
          await within(visibleImages(content), MAX_MS - (performance.now() - started));
          await delay(Math.max(0, MIN_MS - (performance.now() - Math.max(visibleAt,splashArtworkReadyAt))));
        }
      } finally {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        document.body.classList.remove('app-loading');
        if (!settingsEntry && !returning) splash.classList.add('splash-leaving');
        if (!settingsEntry && !returning && !reduced) await delay(FADE_MS);
        splash.hidden = true; content.inert = false;
        onComplete();
      }
    })();
    return revealing;
  }
  window.BAG_DAY_STARTUP = { ready, reveal, imageURL, assets: [...ASSETS], progressiveImage, upgradeImages };
})();
