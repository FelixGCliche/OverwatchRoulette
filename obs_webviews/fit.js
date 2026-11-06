// ========================================================================
// FIT CONTENT TO VIEWPORT
// Picks the largest --px (capped at the base.css default) for which the
// content of <main> fits the viewport. Layout stays responsive (wrapping
// follows the viewport width); only the unit size shrinks when needed.
// ========================================================================
(() => {
  const MIN_SCALE = 0.25; // never shrink below 25% of the default unit
  const root = document.documentElement;
  let main;
  let queued = false;
  let fittedSize = '';

  function overflows() {
    return main.scrollHeight > main.clientHeight || main.scrollWidth > main.clientWidth;
  }

  function contentSize() {
    return [...main.children].map((el) => `${el.offsetWidth}x${el.offsetHeight}`).join();
  }

  function setPx(value) {
    root.style.setProperty('--px', `${value}px`);
  }

  function fit() {
    queued = false;
    const designSize = parseFloat(getComputedStyle(root).getPropertyValue('--design-size')) || 1080;
    let hi = Math.min(innerWidth, innerHeight) / designSize;
    let lo = hi * MIN_SCALE;

    setPx(hi);
    if (overflows()) {
      // Bisect for the largest scale that fits; lo is the fallback floor.
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        setPx(mid);
        if (overflows()) hi = mid; else lo = mid;
      }
      setPx(lo);
    }
    fittedSize = contentSize();
  }

  function queueFit() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(fit);
  }

  // Refit only when content size changes for reasons other than our own
  // fit (images loading, font swap, new rows) — not on class/text updates.
  const resizeObserver = new ResizeObserver(() => {
    if (contentSize() !== fittedSize) queueFit();
  });

  function observeChildren() {
    resizeObserver.disconnect();
    [...main.children].forEach((el) => resizeObserver.observe(el));
    queueFit();
  }

  document.addEventListener('DOMContentLoaded', () => {
    main = document.querySelector('main');
    new MutationObserver(observeChildren).observe(main, { childList: true });
    addEventListener('resize', queueFit);
    observeChildren();
  });
})();
