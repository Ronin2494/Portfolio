/* Footer-aware LinkedIn reveal; the link is not a persistent screen overlay. */
(() => {
  const banner = document.querySelector('.linkedin-float');
  const footer = document.querySelector('footer.footer');
  if (!banner || !footer) return;
  const reveal = visible => {
    banner.hidden = !visible;
    banner.classList.toggle('is-visible', visible);
  };
  reveal(false);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.target === footer) reveal(entry.isIntersecting);
    }, {rootMargin: '0px 0px 120px 0px', threshold: 0});
    observer.observe(footer);
  } else {
    let queued = false;
    const check = () => {
      queued = false;
      const rect = footer.getBoundingClientRect();
      reveal(rect.top < window.innerHeight + 120 && rect.bottom > 0);
    };
    const update = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(check);
      }
    };
    window.addEventListener('scroll', update, {passive:true});
    window.addEventListener('resize', update, {passive:true});
    update();
  }
})();
