// Dissolvenza in ingresso (per le pagine che la usano: vedi CSS
// body.page-enter). Il doppio requestAnimationFrame garantisce che il
// browser disegni prima lo stato opacity:0, così la transizione si vede.
if (document.body.classList.contains('page-enter')) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.remove('page-enter'));
  });
}

// Dissolvenza veloce prima di caricare un'altra pagina del sito, per
// evitare stacchi bruschi quando si clicca un link (menu, articoli, ecc.)
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;
  if (link.target === '_blank' || link.hasAttribute('download')) return;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

  let destination;
  try {
    destination = new URL(link.href, window.location.href);
  } catch (err) {
    return;
  }
  if (destination.origin !== window.location.origin) return; // link esterno
  if (destination.href.split('#')[0] === window.location.href.split('#')[0]) return; // stessa pagina

  e.preventDefault();
  document.body.classList.add('page-fade-out');
  setTimeout(() => {
    window.location.href = link.href;
  }, 480);
});

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');

if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Newsletter form (placeholder handler — collega qui il tuo servizio di
// newsletter preferito, es. Mailchimp, Buttondown, ConvertKit...)
const newsletterForm = document.getElementById('newsletterForm');
const newsletterNote = document.getElementById('newsletterNote');

if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // TODO: sostituire con una vera chiamata API al servizio newsletter
    newsletterForm.reset();
    if (newsletterNote) newsletterNote.hidden = false;
  });
}

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Pagina articolo — form commento (placeholder, nessun invio reale)
const commentForm = document.getElementById('commentForm');
const commentNote = document.getElementById('commentNote');

if (commentForm) {
  commentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // TODO: collegare a un vero servizio di commenti (es. Giscus, Disqus,
    // o un backend proprio) quando deciderai come gestirli.
    commentForm.reset();
    if (commentNote) commentNote.hidden = false;
  });
}

// ---------------------------------------------------------------
// Filtro per categoria dell'archivio (pagina articoli.html).
// Esposta su window perché content.js la richiama DOPO aver
// popolato l'elenco con i dati letti da content/articoli.json.
// ---------------------------------------------------------------
window.initArchiveFilters = function initArchiveFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const archiveItems = document.querySelectorAll('.archive-item');
  if (!filterButtons.length || !archiveItems.length) return;

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const filter = btn.dataset.filter;
      archiveItems.forEach(item => {
        const show = filter === 'tutti' || item.dataset.category === filter;
        item.classList.toggle('is-hidden', !show);
      });
    });
  });
};

// ---------------------------------------------------------------
// Carosello articoli (homepage). Esposta su window perché
// content.js la richiama DOPO aver popolato #articlesTrack con i
// dati letti da content/articoli.json.
// ---------------------------------------------------------------
window.initArticlesCarousel = function initArticlesCarousel() {
  const viewport = document.querySelector('.articles-viewport');
  const track = document.getElementById('articlesTrack');
  const prevBtn = document.getElementById('articlesPrev');
  const nextBtn = document.getElementById('articlesNext');
  const dots = Array.from(document.querySelectorAll('.carousel-dot'));

  if (!(viewport && track && prevBtn && nextBtn && track.children.length)) return;

  const cards = Array.from(track.children);
  let index = 0;

  function cardsPerPage() {
    const w = window.innerWidth;
    if (w <= 640) return 1;
    if (w <= 860) return 2;
    return 3;
  }

  function cardStep() {
    const first = cards[0];
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
    return first.getBoundingClientRect().width + gap;
  }

  function maxIndex() {
    return Math.max(0, cards.length - cardsPerPage());
  }

  function updateDots() {
    if (!dots.length) return;
    const visibleEnd = index + cardsPerPage() - 1;
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i >= index && i <= visibleEnd);
    });
  }

  function update() {
    const clampedMax = maxIndex();
    if (index > clampedMax) index = clampedMax;
    if (index < 0) index = 0;
    track.style.transform = `translateX(-${index * cardStep()}px)`;
    updateDots();
  }

  prevBtn.addEventListener('click', () => {
    const clampedMax = maxIndex();
    index = index <= 0 ? clampedMax : index - 1;
    update();
  });

  nextBtn.addEventListener('click', () => {
    const clampedMax = maxIndex();
    index = index >= clampedMax ? 0 : index + 1;
    update();
  });

  window.addEventListener('resize', update);

  update();
};
