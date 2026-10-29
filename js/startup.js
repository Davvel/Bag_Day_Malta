/* Home never waits for artwork. The optional app splash remains disabled. */
(() => {
  'use strict';
  const splashEnabled = window.BAG_DAY_CONFIG?.splashEnabled === true;
  document.documentElement.dataset.splashEnabled = String(splashEnabled);
  const returnKey = 'bag-day-return-home-v1';
  let returning = false;
  try {
    const at = Number(sessionStorage.getItem(returnKey));
    sessionStorage.removeItem(returnKey);
    returning = at > 0 && Date.now() >= at && Date.now() - at < 30000;
  } catch (_) {}
  returning = returning || performance.getEntriesByType?.('navigation')?.[0]?.type === 'back_forward';
  const settingsEntry = new URLSearchParams(location.search).get('panel') === 'settings';
  document.documentElement.dataset.entryScreen = settingsEntry ? 'settings' : returning ? 'return' : 'home';
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  let revealing = null;
  function reveal({ beforeReveal = () => {}, onComplete = () => {} } = {}) {
    if (revealing) return revealing;
    revealing = (async () => {
      const splash = document.getElementById('splashScreen');
      const content = document.getElementById('appContent');
      const showSplash = splashEnabled && !settingsEntry && !returning;
      try {
        beforeReveal();
        if (showSplash) {
          splash.hidden = false;
          for (const image of splash.querySelectorAll('[data-splash-src]')) image.src = image.dataset.splashSrc;
          await delay(2000);
          splash.classList.add('splash-leaving');
          if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) await delay(400);
        }
      } finally {
        splash.hidden = true;
        document.body.classList.remove('app-loading');
        content.inert = false;
        onComplete();
      }
    })();
    return revealing;
  }
  window.BAG_DAY_STARTUP = { reveal };
})();
