// ==========================================================
// effects.js — gli effetti che danno al sito il suo carattere
// "geologico": polvere in sospensione nella hero, titolo che
// emerge come inciso nella pietra, comparsa graduale degli
// elementi mentre si scava nella pagina (scroll reveal con
// ritardo sfalsato), parallasse lenta sulle immagini, header
// che si opacizza allo scroll.
// Rispetta le preferenze di accessibilità (prefers-reduced-motion).
// ==========================================================

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------- Scroll reveal con ritardo sfalsato ----------------
  const REVEAL_SELECTOR = [
    '.section-title', '.section-eyebrow', '.page-title', '.page-intro',
    '.hero-title', '.featured-article', '.home-featured', '.article-card',
    '.layer-card', '.archive-item', '.masonry-item', '.shot',
    '.formation-block', '.travel-node', '.timeline-entry', '.comment-item',
    '.social-link', '.bio-text p', '.comment-form-section',
    '.latest-articles-panel', '.contact-block', '.newsletter-title',
    '.newsletter-form', '.cv-heading', '.section-more'
  ].join(', ');

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
    // Ritardo sfalsato: gli elementi "fratelli" entrano uno dopo l'altro
    const groups = new Map();
    items.forEach((el) => {
      if (el.classList.contains('reveal-init')) return;
      const parent = el.parentElement;
      const idx = groups.get(parent) || 0;
      groups.set(parent, idx + 1);
      el.style.transitionDelay = `${Math.min(idx * 90, 450)}ms`;
      el.classList.add('reveal-init');
      obs.observe(el);
    });
  };

  // ---------------- Parallasse lenta sulle immagini ----------------
  // Le immagini con [data-parallax] si muovono più lentamente dello
  // scroll, come se il contenuto "scivolasse" via più in fretta della
  // roccia sottostante.
  let parallaxEls = [];
  let parallaxTicking = false;

  function updateParallax() {
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const rect = el.parentElement.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > vh + 80) return;
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh; // -0.5 .. 0.5 circa
      el.style.transform = `translateY(${(progress * 34).toFixed(1)}px)`;
    });
    parallaxTicking = false;
  }

  window.initParallax = function initParallax() {
    if (reduceMotion) return;
    parallaxEls = Array.from(document.querySelectorAll('[data-parallax] .layer-media-inner'));
    updateParallax();
  };

  // ---------------- Hero: titolo inciso + polvere in sospensione ----------------
  function splitHeroTitle() {
    const title = document.getElementById('heroTitle');
    if (!title || title.dataset.split) return;
    title.dataset.split = 'true';
    const text = title.textContent;
    title.textContent = '';
    title.setAttribute('aria-label', text);
    text.split('').forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'hero-letter';
      span.style.setProperty('--i', i);
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.setAttribute('aria-hidden', 'true');
      title.appendChild(span);
    });
  }

  // Campo di particelle: polvere/sabbia che fluttua lentamente e
  // reagisce appena al passaggio del mouse, come smossa dall'aria.
  function initHeroParticles() {
    const canvas = document.getElementById('heroCanvas');
    const hero = document.querySelector('.hero');
    if (!canvas || !hero || reduceMotion) return;

    const ctx = canvas.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    let particles = [];
    const mouse = { x: -9999, y: -9999 };
    let rafId = null;

    const COLORS = [
      'rgba(168, 159, 148, ALPHA)',  // sabbia
      'rgba(212, 165, 116, ALPHA)',  // oro minerale
      'rgba(196, 112, 90, ALPHA)',   // terracotta
    ];

    function resize() {
      W = hero.clientWidth;
      H = hero.clientHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const count = Math.min(160, Math.floor((W * H) / 11000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.9,
        vx: (Math.random() - 0.5) * 0.16,
        vy: -0.04 - Math.random() * 0.14,
        drift: Math.random() * Math.PI * 2,
        driftSpeed: 0.002 + Math.random() * 0.006,
        alpha: 0.15 + Math.random() * 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.drift += p.driftSpeed;
        p.x += p.vx + Math.sin(p.drift) * 0.12;
        p.y += p.vy;

        // Reazione al mouse: un'onda lieve che allontana la polvere
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 12000) {
          const force = (1 - dist2 / 12000) * 0.55;
          const dist = Math.sqrt(dist2) || 1;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }

        if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
        if (p.x < -6) p.x = W + 6;
        if (p.x > W + 6) p.x = -6;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace('ALPHA', p.alpha.toFixed(2));
        ctx.fill();
      }
      rafId = requestAnimationFrame(frame);
    }

    // Ferma il disegno quando la hero è coperta dal contenuto (sipario):
    // inutile animare ciò che non si vede.
    const curtain = document.getElementById('curtainContent');
    function toggleByVisibility() {
      const covered = curtain && curtain.getBoundingClientRect().top <= 0;
      if (covered && rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!covered && !rafId) {
        rafId = requestAnimationFrame(frame);
      }
    }

    resize();
    frame();

    window.addEventListener('resize', resize);
    hero.addEventListener('pointermove', (e) => {
      const rect = hero.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    hero.addEventListener('pointerleave', () => { mouse.x = -9999; mouse.y = -9999; });
    window.addEventListener('scroll', toggleByVisibility, { passive: true });
  }

  // ---------------- Avvio ----------------
  document.addEventListener('DOMContentLoaded', () => {
    window.initScrollReveal();
    splitHeroTitle();
    initHeroParticles();

    // Header "fissile": trasparente in cima, blurato appena si scorre
    const header = document.getElementById('siteHeader');
    if (header) {
      const updateHeader = () => {
        header.classList.toggle('is-scrolled', window.scrollY > 40);
      };
      window.addEventListener('scroll', updateHeader, { passive: true });
      updateHeader();
    }

    // Sfocatura progressiva della hero mentre il sipario la copre
    // (più il contenuto sale, più lo strato superficiale si dissolve)
    const hero = document.querySelector('.hero');
    const curtain = document.getElementById('curtainContent');
    const MAX_BLUR_PX = 12;

    let scrollTicking = false;
    function onScroll() {
      if (curtain && hero) {
        const vh = window.innerHeight;
        const curtainTop = curtain.getBoundingClientRect().top;
        const coverage = Math.min(1, Math.max(0, (vh - curtainTop) / vh));
        const blur = coverage > 0.3 ? ((coverage - 0.3) / 0.7) * MAX_BLUR_PX : 0;
        hero.style.filter = blur > 0 ? `blur(${blur.toFixed(1)}px)` : '';
      }
      if (!reduceMotion && parallaxEls.length) updateParallax();
      scrollTicking = false;
    }
    window.addEventListener('scroll', () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(onScroll);
    }, { passive: true });
    onScroll();
  });
})();
