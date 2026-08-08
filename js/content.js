// ==========================================================
// content.js — legge content/articoli.json e content/portfolio.json
// e costruisce dinamicamente le sezioni del sito. Questo è ciò che
// rende il pannello di amministrazione (Decap CMS) utile: un
// articolo o una voce di portfolio pubblicati da lì compaiono qui
// automaticamente, senza toccare l'HTML.
// ==========================================================

const CATEGORY_LABELS = {
  recensioni: 'Recensioni',
  cinema: 'Cinema',
  politica: 'Politica',
  riflessioni: 'Riflessioni',
};

const MONTHS_IT = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];

function formatDateIt(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d)) return isoDate;
  return `${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`;
}

function categoryLabel(cat) {
  return CATEGORY_LABELS[cat] || cat;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

// Se l'immagine viene da Cloudinary, inserisce automaticamente formato e
// qualit\u00e0 "auto" e un limite di larghezza \u2014 cos\u00ec anche una foto pesante
// caricata dal telefono arriva al visitatore gi\u00e0 ottimizzata, senza dover
// comprimere nulla a mano prima di caricarla. Le immagini che non vengono
// da Cloudinary (es. quelle segnaposto nel repository) restano invariate.
function optimizeImage(url, width) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  const marker = '/upload/';
  const i = url.indexOf(marker) + marker.length;
  const already = /\/upload\/[a-z0-9_,]*\b(f_auto|q_auto)\b/.test(url);
  if (already) return url;
  const transform = `f_auto,q_auto:good,w_${width || 1600}/`;
  return url.slice(0, i) + transform + url.slice(i);
}

function hasImage(url) {
  return !!(url && url.trim());
}

async function fetchArticles() {
  const res = await fetch('content/articoli.json', { cache: 'no-store' });
  const data = await res.json();
  return (data.articles || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
}

async function fetchPortfolio() {
  const res = await fetch('content/portfolio.json', { cache: 'no-store' });
  const data = await res.json();
  return data.items || [];
}

function articleCardHtml(a) {
  return `
    <a class="article-card" href="articolo.html?slug=${encodeURIComponent(a.slug)}">
      <div class="article-thumb" style="background-image:url('${optimizeImage(a.image, 1100)}')"></div>
      <p class="article-meta">${formatDateIt(a.date)} / ${categoryLabel(a.category).toUpperCase()}</p>
      <h3 class="article-title">${a.title}</h3>
    </a>`;
}

function archiveItemHtml(a) {
  return `
    <a class="archive-item" data-category="${a.category}" href="articolo.html?slug=${encodeURIComponent(a.slug)}">
      <div class="archive-thumb" style="background-image:url('${optimizeImage(a.image, 200)}')"></div>
      <div class="archive-body">
        <p class="archive-meta">${formatDateIt(a.date)} / ${categoryLabel(a.category).toUpperCase()}</p>
        <h3 class="archive-title">${a.title}</h3>
      </div>
    </a>`;
}

// ---------------- HOMEPAGE: foto di sfondo (modificabili dal pannello) ----------------
async function renderSiteImages() {
  const heroEl = document.querySelector('.hero');
  const newsletterEl = document.querySelector('.newsletter');
  const footerEl = document.querySelector('.site-footer');
  if (!heroEl && !newsletterEl && !footerEl) return;

  try {
    const res = await fetch('content/impostazioni.json', { cache: 'no-store' });
    const data = await res.json();

    if (heroEl && data.hero_image) {
      heroEl.style.backgroundImage =
        `linear-gradient(180deg, rgba(44,62,80,0.55) 0%, rgba(44,62,80,0.15) 35%, rgba(44,62,80,0.1) 100%), url('${optimizeImage(data.hero_image, 2600)}')`;
    }
    if (newsletterEl && data.newsletter_image) {
      newsletterEl.style.backgroundImage =
        `linear-gradient(180deg, rgba(44,62,80,0.35) 0%, rgba(44,62,80,0.75) 100%), url('${optimizeImage(data.newsletter_image, 2600)}')`;
    }
    if (footerEl && data.footer_image) {
      footerEl.style.backgroundImage =
        `linear-gradient(180deg, rgba(44,62,80,0.5) 0%, rgba(44,62,80,0.85) 100%), url('${optimizeImage(data.footer_image, 2200)}')`;
    }
  } catch (e) {
    // in caso di errore restano le immagini gi\u00e0 impostate nell'HTML
  }
}

// ---------------- HOMEPAGE: carosello "Ultimi articoli" ----------------
async function renderHomeCarousel() {
  const track = document.getElementById('articlesTrack');
  if (!track) return;
  const articles = await fetchArticles();
  track.innerHTML = articles.slice(0, 6).map(articleCardHtml).join('');
  window.initArticlesCarousel && window.initArticlesCarousel();
  window.initScrollReveal && window.initScrollReveal();
}

// ---------------- PAGINA ARTICOLI: in evidenza + successivi + archivio ----------------
async function renderArticoliPage() {
  const featuredEl = document.getElementById('featuredArticle');
  if (!featuredEl) return;
  const articles = await fetchArticles();
  if (!articles.length) return;

  const [latest, ...rest] = articles;

  featuredEl.href = `articolo.html?slug=${encodeURIComponent(latest.slug)}`;
  featuredEl.innerHTML = `
    <div class="featured-thumb" style="background-image:url('${optimizeImage(latest.image, 1800)}')"></div>
    <p class="featured-meta">${formatDateIt(latest.date)} / ${categoryLabel(latest.category).toUpperCase()}</p>
    <h2 class="featured-title">${latest.title}</h2>`;

  const row3 = document.getElementById('articlesRow3');
  if (row3) row3.innerHTML = rest.slice(0, 3).map(articleCardHtml).join('');

  const archiveList = document.getElementById('archiveList');
  if (archiveList) {
    archiveList.innerHTML = articles.map(archiveItemHtml).join('');
    window.initArchiveFilters && window.initArchiveFilters();
  }
  window.initScrollReveal && window.initScrollReveal();
}

// ---------------- PAGINA SINGOLO ARTICOLO ----------------
function renderInline(text) {
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) =>
      `<img class="article-inline-img" src="${optimizeImage(url.trim(), 1000)}" alt="${alt}">`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function renderMarkdown(md) {
  // Piccolo motore markdown minimale: paragrafi, ## sottotitoli, > citazioni,
  // ![immagini](url) (a blocco intero o dentro al testo), pi\u00f9 **grassetto**,
  // *corsivo* e [link](url).
  const blocks = md.split(/\n\s*\n/);
  return blocks.map(block => {
    const trimmed = block.trim();
    const soloImmagine = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (soloImmagine) {
      return `<img class="article-inline-img" src="${optimizeImage(soloImmagine[2].trim(), 1000)}" alt="${soloImmagine[1]}">`;
    }
    if (trimmed.startsWith('## ')) return `<h2>${renderInline(trimmed.slice(3))}</h2>`;
    if (trimmed.startsWith('> ')) return `<blockquote>${renderInline(trimmed.slice(2))}</blockquote>`;
    return `<p>${renderInline(trimmed).replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}

async function renderArticlePage() {
  const bodyEl = document.getElementById('articleBody');
  if (!bodyEl) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const articles = await fetchArticles();
  const article = articles.find(a => a.slug === slug) || articles[0];

  if (!article) {
    bodyEl.innerHTML = '<p>Articolo non trovato.</p>';
    return;
  }

  document.title = `${article.title} — Erosioni`;
  document.getElementById('articleEyebrow').textContent = categoryLabel(article.category).toUpperCase();
  document.getElementById('articleTitle').textContent = article.title;
  document.getElementById('articleMeta').textContent = formatDateIt(article.date);
  const heroImg = document.getElementById('articleHeroImg');

  if (!hasImage(article.image)) {
    heroImg.style.display = 'none';
  } else {
    heroImg.style.display = '';
    const fullUrl = optimizeImage(article.image, 2000);
    const tinyUrl = optimizeImage(article.image, 40);

    heroImg.classList.remove('is-loaded');
    heroImg.classList.add('is-tiny');
    heroImg.alt = article.title;
    heroImg.onload = () => heroImg.classList.add('is-loaded');
    heroImg.src = tinyUrl; // pesa pochissimo: compare quasi subito, sfocata

    const preload = new Image();
    preload.onload = () => {
      heroImg.src = fullUrl; // già in cache grazie al preload: nessuna nuova attesa
      heroImg.classList.remove('is-tiny'); // la sfocatura sparisce con una dissolvenza
    };
    preload.src = fullUrl;
  }
  bodyEl.innerHTML = renderMarkdown(article.body || '');

  // Dissolvenza lenta anche per le immagini inserite nel corpo del testo
  bodyEl.querySelectorAll('.article-inline-img').forEach((img) => {
    if (img.complete) {
      img.classList.add('is-loaded');
    } else {
      img.onload = () => img.classList.add('is-loaded');
    }
  });

  const latestPanel = document.getElementById('latestArticlesList');
  if (latestPanel) {
    const others = articles.filter(a => a.slug !== article.slug).slice(0, 4);
    latestPanel.innerHTML = others.map(archiveItemHtml).join('');
  }
}

// ---------------- PAGINA PORTFOLIO: mosaico ----------------
function getVideoEmbedUrl(link) {
  if (!link) return null;
  const yt = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = link.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function openPortfolioModal(item) {
  const modal = document.getElementById('portfolioModal');
  if (!modal) return;

  const mediaEl = document.getElementById('portfolioModalMedia');
  const embedUrl = item.medium === 'video' ? getVideoEmbedUrl(item.link) : null;

  mediaEl.innerHTML = embedUrl
    ? `<iframe src="${embedUrl}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
    : hasImage(item.image)
      ? `<img src="${optimizeImage(item.image, 2000)}" alt="${item.title}">`
      : `<div class="masonry-media--empty" style="width:100%;height:100%;"></div>`;

  document.getElementById('portfolioModalTag').textContent =
    `${capitalize(item.category)} · ${item.medium === 'video' ? 'Video' : 'Foto'}`;
  document.getElementById('portfolioModalTitle').textContent = item.title;

  const descEl = document.getElementById('portfolioModalDesc');
  const hasDesc = item.description && item.description.trim();
  descEl.textContent = hasDesc ? item.description.trim() : '';
  descEl.hidden = !hasDesc;

  const externalEl = document.getElementById('portfolioModalExternal');
  const externalHref = item.link && item.link.trim() ? item.link.trim() : item.image;
  externalEl.href = externalHref;
  externalEl.textContent = item.medium === 'video' && embedUrl ? 'Apri su YouTube/Vimeo'
    : item.medium === 'video' ? 'Guarda il video'
    : 'Apri la foto originale';

  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
}

function closePortfolioModal() {
  const modal = document.getElementById('portfolioModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.getElementById('portfolioModalMedia').innerHTML = '';
  document.body.classList.remove('modal-open');
}

function initPortfolioModal() {
  const modal = document.getElementById('portfolioModal');
  if (!modal || modal.dataset.wired) return;
  modal.dataset.wired = 'true';

  modal.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', closePortfolioModal));
  document.getElementById('portfolioModalClose').addEventListener('click', closePortfolioModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closePortfolioModal();
  });
}

async function renderPortfolioPage() {
  const grid = document.getElementById('portfolioMasonry');
  if (!grid) return;
  const items = await fetchPortfolio();

  grid.innerHTML = items.map((item, idx) => `
    <button type="button" class="masonry-item" data-idx="${idx}">
      ${hasImage(item.image)
        ? `<img class="masonry-media" src="${optimizeImage(item.image, 1100)}" alt="${item.title}" loading="lazy" onerror="this.closest('.masonry-item').classList.add('is-broken')">`
        : `<div class="masonry-media masonry-media--empty"></div>`}
      <div class="masonry-caption">
        <h3>${item.title}</h3>
        <span class="masonry-tag">${capitalize(item.category)} · ${item.medium === 'video' ? 'Video' : 'Foto'}</span>
      </div>
    </button>`).join('');

  grid.querySelectorAll('.masonry-item').forEach(el => {
    el.addEventListener('click', () => openPortfolioModal(items[Number(el.dataset.idx)]));
  });

  initPortfolioModal();
  window.initScrollReveal && window.initScrollReveal();
}

document.addEventListener('DOMContentLoaded', () => {
  renderSiteImages();
  renderHomeCarousel();
  renderArticoliPage();
  renderArticlePage();
  renderPortfolioPage();
});
