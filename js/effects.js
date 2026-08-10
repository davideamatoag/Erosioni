// ==========================================================
// effects.js — piccoli effetti condivisi per rendere il sito più
// dinamico: comparsa graduale degli elementi mentre si scorre la
// pagina, e un leggero effetto di parallasse sulla foto hero.
// Rispetta le preferenze di accessibilità (prefers-reduced-motion).
// ==========================================================

(function () {
  const REVEAL_SELECTOR = [
    '.section-title', '.page-title', '.page-intro', '.hero-title',
    '.featured-article', '.article-card', '.archive-item', '.masonry-item',
    '.category-block', '.timeline-entry', '.travel-item', '.comment-item',
    '.social-link', '.bio-text p', '.comment-form-section',
    '.latest-articles-panel', '.contact-block'
  ].join(', ');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let observer;

  function ensureObserver() {
    if (observer) return observer;
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    return observer;
  }

  // Esposta su window: content.js la richiama di nuovo dopo aver
  // iniettato schede/voci dinamiche, così vengono osservate anche loro.
  window.initScrollReveal = function initScrollReveal() {
    const items = document.querySelectorAll(REVEAL_SELECTOR);

    if (reduceMotion) {
      items.forEach((el) => el.classList.add('is-visible', 'reveal-skip'));
      return;
    }

    const obs = ensureObserver();
    items.forEach((el) => {
      if (!el.classList.contains('reveal-init')) {
        el.classList.add('reveal-init');
        obs.observe(el);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.initScrollReveal();

    // Leggero parallasse sulla foto hero della homepage.
    const hero = document.querySelector('.hero');
    if (hero && !reduceMotion) {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const shift = Math.min(window.scrollY * 0.18, 120);
          hero.style.backgroundPositionY = `calc(50% + ${shift}px)`;
          ticking = false;
        });
      }, { passive: true });
    }

    // Cambio del testo nell'header quando il sipario bianco copre il
    // titolo "Erosioni" nella hero (solo homepage).
    const heroBrand = document.getElementById('heroBrand');
    const heroTitle = document.getElementById('heroTitle');
    const curtain = document.getElementById('curtainContent');
    if (heroBrand && heroTitle && curtain) {
      let brandTicking = false;
      const updateBrand = () => {
        const titleBottom = heroTitle.getBoundingClientRect().bottom;
        const curtainTop = curtain.getBoundingClientRect().top;
        heroBrand.classList.toggle('is-scrolled', curtainTop <= titleBottom);
        brandTicking = false;
      };
      window.addEventListener('scroll', () => {
        if (brandTicking) return;
        brandTicking = true;
        requestAnimationFrame(updateBrand);
      }, { passive: true });
      updateBrand();
    }
  });
})();
