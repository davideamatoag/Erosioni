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
  if (e.defaultPrevented) return; // es. schede articolo: aprono la tendina, non una pagina
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

// ---------------------------------------------------------------
// PERSONALIZZAZIONI GLOBALI dal Pannello (content/impostazioni.json):
// colore accento del sito, email di contatto, link social e
// citazione del footer. Si applicano su tutte le pagine; i campi
// lasciati vuoti nel Pannello non cambiano nulla.
// ---------------------------------------------------------------
const ACCENT_COLORS = {
  oro: '#D4A574',
  muschio: '#8B9A7D',
  ruggine: '#A65A43',
  ardesia: '#6E8CA0',
};

(async function applySiteCustomizations() {
  let settings;
  try {
    const res = await fetch('content/impostazioni.json', { cache: 'no-store' });
    settings = await res.json();
  } catch (e) {
    return; // impostazioni non raggiungibili: resta tutto com'è
  }

  // Colore accento (terracotta di default): cambia bottoni, dettagli,
  // sottolineature e marker in tutto il sito, perché usano --terracotta
  const accent = ACCENT_COLORS[settings.accent_color];
  if (accent) document.documentElement.style.setProperty('--terracotta', accent);

  // Email di contatto: footer + pagina contatti
  if (settings.contact_email && settings.contact_email.trim()) {
    const email = settings.contact_email.trim();
    const footerEmail = document.querySelector('.footer-email');
    if (footerEmail) {
      footerEmail.textContent = email;
      footerEmail.href = `mailto:${email}`;
    }
    const contactEmail = document.querySelector('.contact-email');
    if (contactEmail) contactEmail.textContent = email;
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => { a.href = `mailto:${email}`; });
  }

  // Citazione del footer
  if (settings.footer_quote && settings.footer_quote.trim()) {
    const quoteEl = document.querySelector('.footer-quote');
    if (quoteEl) quoteEl.textContent = `«${settings.footer_quote.trim()}»`;
  }

  // Link social: footer (tutte le pagine) e pagina contatti
  const socialUrls = {
    instagram: settings.social_instagram,
    youtube: settings.social_youtube,
    linkedin: settings.social_linkedin,
  };
  document.querySelectorAll('.footer-social a, .social-list a').forEach((a) => {
    const label = (a.textContent || '').trim().split(/\s+/)[0].toLowerCase();
    const url = socialUrls[label];
    if (url && url.trim()) {
      a.href = url.trim();
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });
})();

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
