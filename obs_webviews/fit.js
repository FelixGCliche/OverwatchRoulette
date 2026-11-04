// ========================================================================
// FIT CONTENT TO VIEWPORT
// Picks the largest --px (capped at the 1080p-based default) for which the
// content of <main> fits the viewport. Layout stays responsive (wrapping
// follows the viewport width); only the unit size shrinks when needed.
// ========================================================================
(() => {
  const root = document.documentElement;
  let main;
  let queued = false;

  function overflows() {
    return main.scrollHeight > main.clientHeight || main.scrollWidth > main.clientWidth;
  }

  function fit() {
    queued = false;
    let lo = 0;
    let hi = Math.min(innerWidth, innerHeight) / 1080;

    root.style.setProperty('--px', `${hi}px`);
    if (!overflows()) return;

    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      root.style.setProperty('--px', `${mid}px`);
      if (overflows()) hi = mid; else lo = mid;
    }
    root.style.setProperty('--px', `${lo}px`);
  }

  function queueFit() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(fit);
  }

  document.addEventListener('DOMContentLoaded', () => {
    main = document.querySelector('main');
    new MutationObserver(queueFit).observe(main, { childList: true, subtree: true });
    addEventListener('resize', queueFit);
    document.addEventListener('load', queueFit, true); // images finishing loading
    document.fonts.ready.then(queueFit);
    queueFit();
  });
})();
