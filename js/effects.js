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

    // Effetti legati allo scroll sulla hero della homepage: cambio del
    // testo nell'header quando il sipario copre il titolo "Erosioni", e
    // sfocatura progressiva della foto quando il sipario supera metà
    // dell'altezza dello schermo (più sale, più la sfocatura aumenta).
    const hero = document.querySelector('.hero');
    const heroBrand = document.getElementById('heroBrand');
    const heroTitle = document.getElementById('heroTitle');
    const curtain = document.getElementById('curtainContent');
    const MAX_BLUR_PX = 14;

    if (curtain && (heroBrand || hero)) {
      let scrollTicking = false;
      const updateHeroScrollEffects = () => {
        const curtainTop = curtain.getBoundingClientRect().top;

        if (heroBrand && heroTitle) {
          const titleBottom = heroTitle.getBoundingClientRect().bottom;
          heroBrand.classList.toggle('is-scrolled', curtainTop <= titleBottom);
        }

        if (hero) {
          const vh = window.innerHeight;
          const coverage = Math.min(1, Math.max(0, (vh - curtainTop) / vh));
          const blur = coverage > 0.5 ? ((coverage - 0.5) / 0.5) * MAX_BLUR_PX : 0;
          hero.style.filter = blur > 0 ? `blur(${blur.toFixed(1)}px)` : '';
        }

        scrollTicking = false;
      };
      window.addEventListener('scroll', () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(updateHeroScrollEffects);
      }, { passive: true });
      updateHeroScrollEffects();
    }
  });
})();
