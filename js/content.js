// ==========================================================
// content.js — legge content/articoli.json, content/portfolio.json,
// content/scatti.json e content/impostazioni.json e costruisce
// dinamicamente le sezioni del sito. Questo è ciò che rende il
// pannello di amministrazione (Decap CMS) utile: un articolo o una
// voce pubblicati da lì compaiono qui automaticamente, senza
// toccare l'HTML.
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
// qualità "auto" e un limite di larghezza — così anche una foto pesante
// caricata dal telefono arriva al visitatore già ottimizzata, senza dover
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

// Piccola cache: gli articoli vengono scaricati una sola volta per
// visita, così la tendina dell'articolo si apre all'istante.
let articlesCache = null;

async function fetchArticles() {
  if (articlesCache) return articlesCache;
  const res = await fetch('content/articoli.json', { cache: 'no-store' });
  const data = await res.json();
  articlesCache = (data.articles || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  return articlesCache;
}

let settingsCache = null;
async function fetchSettings() {
  if (settingsCache) return settingsCache;
  try {
    const res = await fetch('content/impostazioni.json', { cache: 'no-store' });
    settingsCache = await res.json();
  } catch (e) {
    settingsCache = {};
  }
  return settingsCache;
}

async function fetchPortfolio() {
  const res = await fetch('content/portfolio.json', { cache: 'no-store' });
  const data = await res.json();
  return data.items || [];
}

function articleCardHtml(a) {
  return `
    <a class="article-card" data-article-slug="${a.slug}" href="articolo.html?slug=${encodeURIComponent(a.slug)}">
      <div class="article-thumb" style="background-image:url('${optimizeImage(a.image, 1100)}')"></div>
      <p class="article-meta">${formatDateIt(a.date)} / ${categoryLabel(a.category).toUpperCase()}</p>
      <h3 class="article-title">${a.title}</h3>
    </a>`;
}

function archiveItemHtml(a) {
  return `
    <a class="archive-item" data-article-slug="${a.slug}" data-category="${a.category}" href="articolo.html?slug=${encodeURIComponent(a.slug)}">
      <div class="archive-thumb" style="background-image:url('${optimizeImage(a.image, 200)}')"></div>
      <div class="archive-body">
        <p class="archive-meta">${formatDateIt(a.date)} / ${categoryLabel(a.category).toUpperCase()}</p>
        <h3 class="archive-title">${a.title}</h3>
      </div>
    </a>`;
}

// ---------------- Foto di sfondo (modificabili dal pannello) ----------------
// Hero, newsletter e footer possono avere una foto caricata dal pannello:
// viene sempre stesa sotto un velo scuro "pietra" per restare leggibile.
async function renderSiteImages() {
  const heroEl = document.querySelector('.hero');
  const newsletterEl = document.querySelector('.newsletter');
  const footerEl = document.querySelector('.site-footer');
  if (!heroEl && !newsletterEl && !footerEl) return;

  try {
    const res = await fetch('content/impostazioni.json', { cache: 'no-store' });
    const data = await res.json();

    if (heroEl) {
      if (data.hero_image) {
        const heroUrl = optimizeImage(data.hero_image, 2600);
        const revealTimeout = setTimeout(() => heroEl.classList.add('is-loaded'), 5000);
        const preload = new Image();
        preload.onload = () => {
          clearTimeout(revealTimeout);
          heroEl.style.backgroundImage =
            `linear-gradient(180deg, rgba(26,24,22,0.72) 0%, rgba(26,24,22,0.5) 45%, rgba(26,24,22,0.82) 100%), url('${heroUrl}')`;
          heroEl.classList.add('is-loaded');
        };
        preload.onerror = () => {
          clearTimeout(revealTimeout);
          heroEl.classList.add('is-loaded');
        };
        preload.src = heroUrl;
      } else {
        heroEl.classList.add('is-loaded'); // nessuna foto impostata: mostra subito
      }
    }
    if (newsletterEl && data.newsletter_image) {
      newsletterEl.style.backgroundImage =
        `linear-gradient(180deg, rgba(26,24,22,0.78) 0%, rgba(26,24,22,0.88) 100%), url('${optimizeImage(data.newsletter_image, 2600)}')`;
    }
    if (footerEl && data.footer_image) {
      footerEl.style.backgroundImage =
        `linear-gradient(180deg, rgba(26,24,22,0.82) 0%, rgba(26,24,22,0.94) 100%), url('${optimizeImage(data.footer_image, 2200)}')`;
    }
  } catch (e) {
    if (heroEl) heroEl.classList.add('is-loaded');
  }
}

// ---------------- HOMEPAGE: "Strati sedimentari" ----------------
// L'ultimo articolo in grande, poi gli altri come strati asimmetrici
// che si alternano a sinistra e destra, con la data verticale ai margini.
async function renderHomeLayers() {
  const featuredEl = document.getElementById('homeFeatured');
  const layersEl = document.getElementById('articlesLayers');
  if (!featuredEl && !layersEl) return;

  const articles = await fetchArticles();
  if (!articles.length) return;

  const [latest, ...rest] = articles;

  if (featuredEl && latest) {
    featuredEl.href = `articolo.html?slug=${encodeURIComponent(latest.slug)}`;
    featuredEl.setAttribute('data-article-slug', latest.slug);
    featuredEl.querySelector('.home-featured-media').style.backgroundImage =
      `url('${optimizeImage(latest.image, 1400)}')`;
    document.getElementById('homeFeaturedMeta').textContent =
      `${formatDateIt(latest.date)} / ${categoryLabel(latest.category).toUpperCase()}`;
    document.getElementById('homeFeaturedTitle').textContent = latest.title;
    document.getElementById('homeFeaturedExcerpt').textContent = computeExcerpt(latest.body, 150);
  }

  if (layersEl) {
    layersEl.innerHTML = rest.slice(0, 4).map((a, i) => `
      <a class="layer-card${i % 2 ? ' layer-card--reverse' : ''}" data-article-slug="${a.slug}" href="articolo.html?slug=${encodeURIComponent(a.slug)}">
        <span class="layer-date">${formatDateIt(a.date)}</span>
        <div class="layer-media" data-parallax>
          <div class="layer-media-inner" style="background-image:url('${optimizeImage(a.image, 1200)}')"></div>
        </div>
        <div class="layer-info">
          <p class="article-meta">${formatDateIt(a.date)} / ${categoryLabel(a.category).toUpperCase()}</p>
          <h3 class="layer-title">${a.title}</h3>
          <p class="layer-excerpt">${computeExcerpt(a.body, 130)}</p>
          <span class="layer-cta">Leggi &rarr;</span>
        </div>
      </a>`).join('');
  }

  window.initScrollReveal && window.initScrollReveal();
  window.initParallax && window.initParallax();
}

// ---------------- PAGINA ARTICOLI: in evidenza + successivi + archivio ----------------
async function renderArticoliPage() {
  const featuredEl = document.getElementById('featuredArticle');
  if (!featuredEl) return;
  const articles = await fetchArticles();
  if (!articles.length) return;

  const [latest, ...rest] = articles;

  featuredEl.href = `articolo.html?slug=${encodeURIComponent(latest.slug)}`;
  featuredEl.setAttribute('data-article-slug', latest.slug);
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
// Converte gli attributi di [stile=...] / [stile-blocco=...] in classi CSS.
// attr tipo "c:oro,f:classico" -> classi "t-oro t-font-classico"
// (o "blocco-oro blocco-font-classico" per i paragrafi interi).
function stileClassi(attrs, perBlocco) {
  const COLORI = ['avorio', 'sabbia', 'oro', 'terracotta'];
  const FONT = ['elegante', 'classico', 'macchina'];
  const classi = [];
  (attrs || '').split(',').forEach((parte) => {
    const [chiave, valore] = parte.split(':');
    if (chiave === 'c' && COLORI.includes(valore)) classi.push((perBlocco ? 'blocco-' : 't-') + valore);
    if (chiave === 'f' && FONT.includes(valore)) classi.push((perBlocco ? 'blocco-font-' : 't-font-') + valore);
  });
  return classi.join(' ');
}

function renderInline(text) {
  return text
    .replace(/\[stile=([^\]]+)\]([\s\S]*?)\[\/stile\]/g, (m, attrs, contenuto) => {
      const classi = stileClassi(attrs, false);
      return classi ? `<span class="${classi}">${contenuto}</span>` : contenuto;
    })
    // Formattazione fine dal pannello: [colore=oro]parola[/colore] e
    // [font=classico]parola[/font] — inserite dai pulsanti dell'editor,
    // mai scritte a mano. Vedi admin/index.html.
    .replace(/\[colore=(avorio|sabbia|oro|terracotta)\]([\s\S]*?)\[\/colore\]/g, '<span class="t-$1">$2</span>')
    .replace(/\[font=(elegante|classico|macchina)\]([\s\S]*?)\[\/font\]/g, '<span class="t-font-$1">$2</span>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) =>
      `<img class="article-inline-img" src="${optimizeImage(url.trim(), 1000)}" alt="${alt}">`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // il pannello scrive il corsivo anche con i trattini bassi: _così_
    .replace(/(?<![A-Za-z0-9])_([^_]+)_(?![A-Za-z0-9])/g, '<em>$1</em>');
}

function renderMarkdown(md) {
  // Piccolo motore markdown minimale: paragrafi, ## sottotitoli, > citazioni,
  // ![immagini](url) (a blocco intero o dentro al testo), più **grassetto**,
  // *corsivo* e [link](url).
  // Le righe vuote CONSECUTIVE non vengono buttate via: ogni riga vuota
  // oltre la prima diventa uno spaziatore visibile (.riga-vuota), così
  // gli spazi inseriti dal pannello si vedono anche nell'articolo finale.
  const pieces = md.split(/(\n\s*\n+)/);
  const blocks = [];
  pieces.forEach((piece, i) => {
    if (i % 2 === 0) {
      if (piece.trim()) blocks.push(piece);
    } else {
      const extra = piece.split('\n').length - 3; // newline oltre la separazione normale
      for (let k = 0; k < extra; k++) blocks.push('[riga-vuota]');
    }
  });
  return blocks.map(block => {
    if (block === '[riga-vuota]') return '<p class="riga-vuota" aria-hidden="true"></p>';
    const trimmed = block.trim();
    const soloImmagine = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (soloImmagine) {
      return `<img class="article-inline-img" src="${optimizeImage(soloImmagine[2].trim(), 1000)}" alt="${soloImmagine[1]}">`;
    }
    const stileBlocco = trimmed.match(/^\[stile-blocco=([^\]]+)\]([\s\S]*?)\[\/stile-blocco\]$/);
    if (stileBlocco) {
      const classi = stileClassi(stileBlocco[1], true);
      const contenuto = renderInline(stileBlocco[2]).replace(/\n/g, '<br>');
      return classi ? `<p class="${classi}">${contenuto}</p>` : `<p>${contenuto}</p>`;
    }
    const blocco = trimmed.match(/^\[blocco=(avorio|sabbia|oro|terracotta)\]([\s\S]*?)\[\/blocco\]$/);
    if (blocco) return `<p class="blocco-${blocco[1]}">${renderInline(blocco[2]).replace(/\n/g, '<br>')}</p>`;
    const bloccoFont = trimmed.match(/^\[blocco-font=(elegante|classico|macchina)\]([\s\S]*?)\[\/blocco-font\]$/);
    if (bloccoFont) return `<p class="blocco-font-${bloccoFont[1]}">${renderInline(bloccoFont[2]).replace(/\n/g, '<br>')}</p>`;
    if (trimmed.startsWith('### ')) return `<h3>${renderInline(trimmed.slice(4))}</h3>`;
    if (trimmed.startsWith('## ')) return `<h2>${renderInline(trimmed.slice(3))}</h2>`;
    if (trimmed.startsWith('> ')) return `<blockquote>${renderInline(trimmed.slice(2))}</blockquote>`;
    if (/^[-•] /.test(trimmed)) {
      const items = trimmed.split('\n')
        .map((l) => l.trim())
        .filter((l) => /^[-•] /.test(l))
        .map((l) => `<li>${renderInline(l.slice(2))}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }
    if (/^\d+\. /.test(trimmed)) {
      const items = trimmed.split('\n')
        .map((l) => l.trim())
        .filter((l) => /^\d+\. /.test(l))
        .map((l) => `<li>${renderInline(l.replace(/^\d+\. /, ''))}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    }
    return `<p>${renderInline(trimmed).replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}

function stripMarkdown(md) {
  return (md || '')
    .replace(/\[\/?(colore|font|blocco|blocco-font|stile|stile-blocco)(=[^\]]*)?\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/(?<![A-Za-z0-9])_([^_]+)_(?![A-Za-z0-9])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeExcerpt(md, maxLen) {
  const plain = stripMarkdown(md);
  const firstBlock = (md || '').split(/\n\s*\n/)[0] || '';
  const source = stripMarkdown(firstBlock) || plain;
  if (source.length <= maxLen) return source;
  return source.slice(0, maxLen).replace(/\s+\S*$/, '') + '\u2026';
}

// Font e colore del corpo articolo, scelti dal pannello: si traducono
// in classi CSS (vedi style-3.css). "predefinito" non aggiunge nulla.
function applyArticleBodyStyle(el, article, settings) {
  if (!el) return;
  el.classList.remove(
    'body-font-elegante', 'body-font-classico', 'body-font-macchina',
    'body-colore-avorio', 'body-colore-sabbia', 'body-colore-oro', 'body-colore-terracotta'
  );
  // Vince la scelta fatta sul singolo articolo; se è "predefinito"
  // si usa il default generale scelto nelle Impostazioni del sito.
  const pick = (perArticle, perSite) =>
    (perArticle && perArticle !== 'predefinito') ? perArticle
      : (perSite && perSite !== 'predefinito' ? perSite : null);
  const font = pick(article.font, settings && settings.default_font);
  const colore = pick(article.colore, settings && settings.default_colore);
  if (font) el.classList.add(`body-font-${font}`);
  if (colore) el.classList.add(`body-colore-${colore}`);
}

function computeReadingTime(md) {
  const words = stripMarkdown(md).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function relatedCardHtml(a) {
  return `
    <a class="article-card" data-article-slug="${a.slug}" href="articolo.html?slug=${encodeURIComponent(a.slug)}">
      <div class="article-thumb" style="background-image:url('${optimizeImage(a.image, 700)}')"></div>
      <p class="article-meta">${formatDateIt(a.date)} / ${categoryLabel(a.category).toUpperCase()}</p>
      <h3 class="article-title">${a.title}</h3>
    </a>`;
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
  document.getElementById('articleTitle').textContent = article.title;
  document.getElementById('articleExcerpt').textContent = computeExcerpt(article.body, 170);
  document.getElementById('articleMetaDate').textContent = formatDateIt(article.date);
  document.getElementById('articleMetaCategory').textContent = categoryLabel(article.category);
  document.getElementById('articleMetaReadTime').textContent = `${computeReadingTime(article.body)} min`;

  const heroImg = document.getElementById('articleHeroImg');
  const heroFrame = document.getElementById('articleHeroFrame');
  const revealEls = document.querySelectorAll('.article-reveal');
  revealEls.forEach((el) => el.classList.remove('is-loaded'));

  function revealNow() {
    revealEls.forEach((el) => el.classList.add('is-loaded'));
  }

  if (!hasImage(article.image)) {
    heroFrame.style.display = 'none';
    revealNow(); // niente foto da aspettare: mostra subito il testo
  } else {
    heroFrame.style.display = '';
    const fullUrl = optimizeImage(article.image, 2000);
    heroImg.alt = article.title;

    const revealTimeout = setTimeout(revealNow, 5000); // rete di sicurezza

    // Precarica la foto per intero: testo e foto compaiono insieme SOLO
    // quando è completamente arrivata, non prima.
    const preload = new Image();
    preload.onload = () => {
      clearTimeout(revealTimeout);
      heroImg.src = fullUrl;
      revealNow();
    };
    preload.onerror = () => {
      clearTimeout(revealTimeout);
      revealNow(); // la foto non c'è/non carica: mostra comunque il testo
    };
    preload.src = fullUrl;
  }
  const settings = await fetchSettings();
  bodyEl.innerHTML = renderMarkdown(article.body || '');
  applyArticleBodyStyle(bodyEl, article, settings);

  // Dissolvenza lenta anche per le immagini inserite nel corpo del testo
  bodyEl.querySelectorAll('.article-inline-img').forEach((img) => {
    if (img.complete) {
      img.classList.add('is-loaded');
    } else {
      img.onload = () => img.classList.add('is-loaded');
    }
  });

  // Autore (nome e bio dalle impostazioni del sito)
  const nameEl = document.getElementById('authorName');
  const bioEl = document.getElementById('authorBio');
  if (nameEl && settings.author_name) nameEl.textContent = settings.author_name;
  if (bioEl && settings.author_bio) bioEl.textContent = settings.author_bio;

  // Condivisione
  const pageUrl = window.location.href;
  const shareTwitter = document.getElementById('shareTwitter');
  const shareFacebook = document.getElementById('shareFacebook');
  const shareCopy = document.getElementById('shareCopy');
  const shareNote = document.getElementById('shareNote');
  if (shareTwitter) shareTwitter.addEventListener('click', () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(article.title)}`, '_blank', 'noopener');
  });
  if (shareFacebook) shareFacebook.addEventListener('click', () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, '_blank', 'noopener');
  });
  if (shareCopy) shareCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      if (shareNote) {
        shareNote.hidden = false;
        setTimeout(() => { shareNote.hidden = true; }, 2500);
      }
    } catch (e) { /* clipboard non disponibile: nessun problema bloccante */ }
  });

  // Articoli correlati
  const latestPanel = document.getElementById('latestArticlesList');
  if (latestPanel) {
    const others = articles.filter(a => a.slug !== article.slug).slice(0, 3);
    latestPanel.innerHTML = others.map(relatedCardHtml).join('');
  }
}

// ---------------- PAGINA PORTFOLIO: "Sala di proiezione" ----------------
function getVideoEmbedUrl(link) {
  if (!link) return null;
  const yt = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = link.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

// Restituisce l'elenco dei contenuti (foto/video) di una voce di portfolio.
// Se la voce usa il nuovo campo "media" del pannello, usa quello; altrimenti
// ricade sulla singola immagine/video della scheda (compatibilità con le
// voci già esistenti).
function getPortfolioMedia(item) {
  // Campo "foto": selezione multipla dal pannello, elenco semplice di URL
  const fotoMultiple = (item.foto || [])
    .filter(f => f && String(f).trim())
    .map(f => ({ tipo: 'foto', file: String(f).trim(), titolo: '' }));
  // Campo "media": elementi singoli con tipo (foto/video) e didascalia
  const lista = (item.media || [])
    .filter(m => m && m.file && m.file.trim())
    .map(m => ({
      tipo: m.tipo === 'video' ? 'video' : 'foto',
      file: m.file.trim(),
      titolo: (m.titolo || '').trim()
    }));
  const tutti = fotoMultiple.concat(lista);
  if (tutti.length) return tutti;
  // Compatibilità con le voci senza galleria
  if (hasImage(item.image)) {
    return [{ tipo: item.medium === 'video' ? 'video' : 'foto', file: item.image, titolo: item.title || '' }];
  }
  return [];
}

// ---------------- Galleria portfolio: tendina + lightbox ----------------
// Aprendo una voce del portfolio si vede una griglia di miniature (stesso
// spirito della griglia "I miei scatti"); cliccando una miniatura si apre il
// contenuto a grandezza naturale con frecce per scorrere avanti/indietro.

let pfLightboxItems = [];
let pfLightboxIndex = 0;

function pfLightboxHtml() {
  return `
  <div class="pf-lightbox" id="pfLightbox" aria-hidden="true">
    <div class="pf-lightbox-backdrop" data-pf-lb-close></div>
    <button type="button" class="pf-lightbox-close" id="pfLightboxClose" aria-label="Chiudi">&times;</button>
    <button type="button" class="pf-lightbox-nav pf-lightbox-nav--prev" id="pfLightboxPrev" aria-label="Contenuto precedente">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </button>
    <figure class="pf-lightbox-figure">
      <div class="pf-lightbox-stage" id="pfLightboxStage"></div>
      <figcaption class="pf-lightbox-caption" id="pfLightboxCaption"></figcaption>
    </figure>
    <button type="button" class="pf-lightbox-nav pf-lightbox-nav--next" id="pfLightboxNext" aria-label="Contenuto successivo">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </button>
    <span class="pf-lightbox-counter" id="pfLightboxCounter"></span>
  </div>`;
}

function showPfLightboxItem(index) {
  if (!pfLightboxItems.length) return;
  pfLightboxIndex = (index + pfLightboxItems.length) % pfLightboxItems.length;
  const m = pfLightboxItems[pfLightboxIndex];
  const stage = document.getElementById('pfLightboxStage');
  if (m.tipo === 'video') {
    stage.innerHTML = `<video src="${m.file}" controls autoplay playsinline></video>`;
  } else {
    stage.innerHTML = `<img src="${optimizeImage(m.file, 2200)}" alt="${m.titolo.replace(/"/g, '&quot;') || 'Foto del portfolio'}">`;
  }
  const caption = document.getElementById('pfLightboxCaption');
  caption.textContent = m.titolo || '';
  caption.hidden = !m.titolo;
  document.getElementById('pfLightboxCounter').textContent = `${pfLightboxIndex + 1} / ${pfLightboxItems.length}`;
  const multi = pfLightboxItems.length > 1;
  document.getElementById('pfLightboxPrev').style.display = multi ? '' : 'none';
  document.getElementById('pfLightboxNext').style.display = multi ? '' : 'none';
  document.getElementById('pfLightboxCounter').style.display = multi ? '' : 'none';
}

function openPfLightbox(items, index) {
  let lb = document.getElementById('pfLightbox');
  if (!lb) {
    document.body.insertAdjacentHTML('beforeend', pfLightboxHtml());
    lb = document.getElementById('pfLightbox');
    lb.querySelectorAll('[data-pf-lb-close]').forEach(el => el.addEventListener('click', closePfLightbox));
    document.getElementById('pfLightboxClose').addEventListener('click', closePfLightbox);
    document.getElementById('pfLightboxPrev').addEventListener('click', () => showPfLightboxItem(pfLightboxIndex - 1));
    document.getElementById('pfLightboxNext').addEventListener('click', () => showPfLightboxItem(pfLightboxIndex + 1));
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closePfLightbox();
      if (e.key === 'ArrowLeft') showPfLightboxItem(pfLightboxIndex - 1);
      if (e.key === 'ArrowRight') showPfLightboxItem(pfLightboxIndex + 1);
    });
  }
  pfLightboxItems = items;
  showPfLightboxItem(index);
  lb.classList.add('is-open');
  lb.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closePfLightbox() {
  const lb = document.getElementById('pfLightbox');
  if (!lb) return;
  lb.classList.remove('is-open');
  lb.setAttribute('aria-hidden', 'true');
  document.getElementById('pfLightboxStage').innerHTML = '';
  // Se sotto c'è ancora la galleria aperta, il blocco dello scroll resta
  if (!document.getElementById('portfolioModal').classList.contains('is-open')) {
    document.body.classList.remove('modal-open');
  }
}

// Scheda di anteprima di un video caricato su Cloudinary: si ottiene
// chiedendo il primo fotogramma come immagine.
function videoPoster(url) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return null;
  return url.replace('/upload/', '/upload/so_0,f_auto,q_auto,w_800/').replace(/\.[a-zA-Z0-9]+$/, '.jpg');
}

function openPortfolioGallery(item, media) {
  const modal = document.getElementById('portfolioModal');
  if (!modal) return;
  modal.querySelector('.portfolio-modal-panel').classList.add('portfolio-modal-panel--gallery');
  const mediaEl = document.getElementById('portfolioModalMedia');

  const foto = media.filter(m => m.tipo === 'foto').length;
  const video = media.filter(m => m.tipo === 'video').length;
  const parti = [];
  if (foto) parti.push(`${foto} foto`);
  if (video) parti.push(`${video} video`);
  document.getElementById('portfolioModalTag').textContent =
    `${capitalize(item.category)} · ${parti.join(' + ')}`;
  document.getElementById('portfolioModalTitle').textContent = item.title;

  const descEl = document.getElementById('portfolioModalDesc');
  const hasDesc = item.description && item.description.trim();
  descEl.textContent = hasDesc ? item.description.trim() : '';
  descEl.hidden = !hasDesc;

  document.getElementById('portfolioModalExternal').hidden = true;

  mediaEl.innerHTML = `
    <div class="pf-gallery-grid">
      ${media.map((m, i) => `
      <button type="button" class="pf-thumb" data-i="${i}" aria-label="${m.tipo === 'video' ? 'Riproduci il video' : 'Apri la foto a grandezza naturale'}${m.titolo ? `: ${m.titolo}` : ''}">
        ${m.tipo === 'video'
          ? (videoPoster(m.file)
              ? `<img src="${videoPoster(m.file)}" alt="${m.titolo || 'Video'}" loading="lazy">`
              : `<video src="${m.file}" muted preload="metadata" playsinline></video>`)
            + '<span class="pf-thumb-play" aria-hidden="true"></span>'
          : `<img src="${optimizeImage(m.file, 800)}" alt="${m.titolo || 'Foto del portfolio'}" loading="lazy">`}
        ${m.titolo ? `<span class="pf-thumb-overlay"><span class="pf-thumb-title">${m.titolo}</span></span>` : ''}
      </button>`).join('')}
    </div>`;

  mediaEl.querySelectorAll('.pf-thumb').forEach(btn => {
    btn.addEventListener('click', () => openPfLightbox(media, Number(btn.dataset.i)));
  });

  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
}

function openPortfolioModal(item) {
  const modal = document.getElementById('portfolioModal');
  if (!modal) return;

  // Se la voce ha una galleria di contenuti (campo "media" del pannello),
  // mostra la griglia di miniature con lightbox; altrimenti la vista singola.
  const galleria = (item.media || []).filter(m => m && m.file && m.file.trim())
    .concat((item.foto || []).filter(f => f && String(f).trim()));
  if (galleria.length) {
    openPortfolioGallery(item, getPortfolioMedia(item));
    return;
  }

  const mediaEl = document.getElementById('portfolioModalMedia');
  modal.querySelector('.portfolio-modal-panel').classList.remove('portfolio-modal-panel--gallery');
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
  externalEl.hidden = false;
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
  const list = document.getElementById('portfolioWorks');
  if (!list) return;
  const items = await fetchPortfolio();

  list.innerHTML = items.map((item, idx) => {
    const isLead = idx === 0;
    const isVideo = item.medium === 'video';
    const hasDesc = item.description && item.description.trim();
    const galleria = (item.media || []).filter(m => m && m.file && m.file.trim());
    const nFoto = galleria.filter(m => m.tipo !== 'video').length;
    const nVideo = galleria.filter(m => m.tipo === 'video').length;
    const tag = galleria.length
      ? [nFoto ? `${nFoto} foto` : '', nVideo ? `${nVideo} video` : ''].filter(Boolean).join(' + ')
      : (isVideo ? 'Video' : 'Foto');
    return `
    <button type="button" class="work-row${isLead ? ' work-row--lead' : (idx % 2 ? ' work-row--reverse' : '')}" data-idx="${idx}" aria-label="Apri il progetto: ${item.title}">
      <span class="work-index" aria-hidden="true">${String(idx + 1).padStart(2, '0')}</span>
      <span class="work-media">
        ${hasImage(item.image)
          ? `<img src="${optimizeImage(item.image, isLead ? 2000 : 1200)}" alt="${item.title}" loading="lazy">`
          : `<span class="work-media work-media--empty"><span>Immagine in arrivo</span></span>`}
        ${isVideo && !galleria.length ? '<span class="work-play" aria-hidden="true"></span>' : ''}
      </span>
      <span class="work-info">
        <span class="work-tag" style="display:block;">${capitalize(item.category)} · ${tag}</span>
        <span class="work-title" style="display:block;">${item.title}</span>
        ${hasDesc ? `<span class="work-desc" style="display:block;">${item.description.trim()}</span>` : ''}
        <span class="work-cta" style="display:inline-block;">${galleria.length ? 'Sfoglia la galleria' : (isVideo ? 'Guarda il video' : 'Guarda il progetto')} &rarr;</span>
      </span>
    </button>`;
  }).join('');

  list.querySelectorAll('.work-row').forEach(el => {
    el.addEventListener('click', () => openPortfolioModal(items[Number(el.dataset.idx)]));
  });

  initPortfolioModal();
  window.initScrollReveal && window.initScrollReveal();
}

// ==========================================================
// TENDINA ARTICOLO — l'articolo si apre in una finestra
// "bianco caldo" sopra la pagina (sfondo sfocato), senza
// cambiare pagina. Mentre la tendina è aperta l'indirizzo nella
// barra del browser diventa ?slug=...: il link si può copiare
// e condividere, e il pulsante "indietro" richiude la tendina.
// La pagina dedicata articolo.html?slug=... resta comunque
// raggiungibile per i link diretti/condivisi.
// ==========================================================

// true quando l'apertura della tendina ha AGGIUNTO una voce nella
// cronologia (click su una scheda): in quel caso la chiusura torna
// indietro nella cronologia invece di riscrivere l'indirizzo.
let articleModalPushed = false;

function articleUrl(slug) {
  return `${window.location.pathname}?slug=${encodeURIComponent(slug)}`;
}

function initArticleModal() {
  const modal = document.getElementById('articleModal');
  if (!modal || modal.dataset.wired) return;
  modal.dataset.wired = 'true';

  modal.querySelectorAll('[data-article-modal-close]').forEach((el) =>
    el.addEventListener('click', () => closeArticleModal()));
  document.getElementById('articleModalClose').addEventListener('click', () => closeArticleModal());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeArticleModal();
  });

  // Il form commenti dentro la tendina (placeholder come l'altro)
  const modalCommentForm = document.getElementById('modalCommentForm');
  const modalCommentNote = document.getElementById('modalCommentNote');
  if (modalCommentForm) {
    modalCommentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      modalCommentForm.reset();
      if (modalCommentNote) modalCommentNote.hidden = false;
    });
  }
}

// historyMode:
//  'push'    — click su una scheda: nuova voce in cronologia
//  'replace' — apertura automatica da link ?slug=...: l'indirizzo c'è già
//  'none'    — navigazione avanti/indietro: la voce è già quella giusta
async function openArticleModal(slug, historyMode = 'push') {
  const modal = document.getElementById('articleModal');
  if (!modal) return; // pagina senza tendina: si naviga normalmente
  initArticleModal();

  const articles = await fetchArticles();
  const article = articles.find((a) => a.slug === slug);
  if (!article) return;

  const panel = modal.querySelector('.article-modal-panel');

  // Meta in una riga sola: DATA · CATEGORIA · TEMPO DI LETTURA
  document.getElementById('modalArticleMeta').textContent =
    `${formatDateIt(article.date)} · ${categoryLabel(article.category)} · ${computeReadingTime(article.body)} min di lettura`;
  document.getElementById('modalArticleTitle').textContent = article.title;
  document.getElementById('modalArticleExcerpt').textContent = computeExcerpt(article.body, 170);

  const heroImg = document.getElementById('modalArticleImg');
  if (hasImage(article.image)) {
    heroImg.hidden = false;
    heroImg.alt = article.title;
    heroImg.src = optimizeImage(article.image, 1600);
  } else {
    heroImg.hidden = true;
    heroImg.removeAttribute('src');
  }

  const settings = await fetchSettings();
  const bodyEl = document.getElementById('modalArticleBody');
  bodyEl.innerHTML = renderMarkdown(article.body || '');
  applyArticleBodyStyle(bodyEl, article, settings);

  // Dissolvenza lenta anche per le immagini nel corpo
  bodyEl.querySelectorAll('.article-inline-img').forEach((img) => {
    if (img.complete) img.classList.add('is-loaded');
    else img.onload = () => img.classList.add('is-loaded');
  });

  // Autore dalle impostazioni del sito
  const nameEl = document.getElementById('modalAuthorName');
  const bioEl = document.getElementById('modalAuthorBio');
  if (nameEl && settings.author_name) nameEl.textContent = settings.author_name;
  if (bioEl && settings.author_bio) bioEl.textContent = settings.author_bio;

  // Condivisione: punta sempre alla pagina dedicata, così il link
  // copiato/condiviso resta valido e apribile da chiunque.
  const shareUrl = new URL(`articolo.html?slug=${encodeURIComponent(article.slug)}`, window.location.href).href;
  const shareTwitter = document.getElementById('modalShareTwitter');
  const shareFacebook = document.getElementById('modalShareFacebook');
  const shareCopy = document.getElementById('modalShareCopy');
  const shareNote = document.getElementById('modalShareNote');
  if (shareTwitter) shareTwitter.onclick = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`, '_blank', 'noopener');
  };
  if (shareFacebook) shareFacebook.onclick = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener');
  };
  if (shareCopy) shareCopy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      if (shareNote) {
        shareNote.hidden = false;
        setTimeout(() => { shareNote.hidden = true; }, 2500);
      }
    } catch (e) { /* clipboard non disponibile */ }
  };

  // Articoli correlati dentro la tendina: cliccandone uno il
  // contenuto della finestra si sostituisce (vedi delega globale).
  const relatedEl = document.getElementById('modalRelatedList');
  if (relatedEl) {
    const others = articles.filter((a) => a.slug !== article.slug).slice(0, 3);
    relatedEl.innerHTML = others.map(relatedCardHtml).join('');
  }

  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
  if (panel) panel.scrollTop = 0;

  // L'indirizzo nella barra segue l'articolo aperto
  if (historyMode === 'push') {
    history.pushState({ erosioniArticle: article.slug }, '', articleUrl(article.slug));
    articleModalPushed = true;
  } else if (historyMode === 'replace') {
    history.replaceState({ erosioniArticle: article.slug }, '', articleUrl(article.slug));
    articleModalPushed = false;
  } else {
    // 'none': la voce di cronologia corrente è già quella dell'articolo
    articleModalPushed = true;
  }
}

// fromHistory: la chiusura arriva dal pulsante indietro/avanti del
// browser — l'indirizzo è già cambiato, basta chiudere la finestra.
function closeArticleModal(fromHistory) {
  const modal = document.getElementById('articleModal');
  if (!modal || !modal.classList.contains('is-open')) return;
  modal.classList.remove('is-open');
  document.body.classList.remove('modal-open');

  if (fromHistory) {
    articleModalPushed = false;
    return;
  }
  if (articleModalPushed) {
    // la voce ?slug= l'abbiamo aggiunta noi: torniamo indietro
    articleModalPushed = false;
    history.back();
  } else {
    // aperta da un link diretto: ripulisce l'indirizzo senza navigare
    history.replaceState({}, '', window.location.pathname);
  }
}

// Avanti/indietro del browser mentre la tendina è aperta:
// se la voce di cronologia porta un articolo, lo mostra; altrimenti chiude.
window.addEventListener('popstate', (e) => {
  const modal = document.getElementById('articleModal');
  if (!modal || !modal.classList.contains('is-open')) return;
  const slug = e.state && e.state.erosioniArticle;
  if (slug) {
    openArticleModal(slug, 'none');
  } else {
    closeArticleModal(true);
  }
});

// Delega globale: qualunque scheda articolo (home, archivio,
// correlati) apre la tendina invece di cambiare pagina.
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-article-slug]');
  if (!link) return;
  if (!document.getElementById('articleModal')) return; // fallback: pagina dedicata
  e.preventDefault();
  openArticleModal(link.getAttribute('data-article-slug'));
});

// Link diretto: se qualcuno arriva su index/articoli/portfolio con
// ?slug=... nell'indirizzo, la tendina si apre da sola appena la pagina
// è pronta. Sulla pagina dedicata articolo.html no: lì l'articolo è
// già mostrato dalla pagina stessa.
async function openArticleFromUrl() {
  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug || !document.getElementById('articleModal')) return;
  if (document.getElementById('articleBody')) return; // pagina articolo dedicata
  openArticleModal(slug, 'replace');
}

document.addEventListener('DOMContentLoaded', () => {
  renderSiteImages();
  renderHomeLayers();
  renderArticoliPage();
  renderArticlePage();
  renderPortfolioPage();
  renderScattiGrid();
  openArticleFromUrl();
});

// ---------------- HOMEPAGE: "I miei scatti" — Galleria minerale ----------------
// Griglia masonry con una selezione casuale ma stabile per tutta la
// giornata (cambia una volta al giorno) tra le foto caricate nel pannello.

function seededRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededShuffle(arr, seed) {
  const rand = seededRandom(seed);
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function renderScattiGrid() {
  const grid = document.getElementById('scattiGrid');
  if (!grid) return;

  let shots = [];
  try {
    const res = await fetch('content/scatti.json', { cache: 'no-store' });
    const data = await res.json();
    shots = (data.shots || []).filter((shot) => hasImage(shot.image));
  } catch (e) { /* niente scatti caricati: restano le cornici vuote */ }

  if (!shots.length) {
    grid.innerHTML = Array.from({ length: 6 }, () =>
      `<button type="button" class="shot shot--empty" disabled></button>`).join('');
    return;
  }

  const shuffled = seededShuffle(shots, todaySeed()).slice(0, 9);

  grid.innerHTML = shuffled.map((shot) => {
    const title = (shot.title || '').trim();
    return `
    <button type="button" class="shot" data-full="${optimizeImage(shot.image, 2200)}" data-title="${title.replace(/"/g, '&quot;')}" aria-label="Apri lo scatto a grandezza originale${title ? `: ${title}` : ''}">
      <img class="shot-img" src="${optimizeImage(shot.image, 800)}" alt="${title || 'Scatto fotografico'}" loading="lazy">
      ${title ? `<span class="shot-overlay"><span class="shot-title">${title}</span></span>` : ''}
    </button>`;
  }).join('');

  grid.querySelectorAll('.shot[data-full]').forEach((btn) => {
    btn.addEventListener('click', () => openShotModal(btn.dataset.full, btn.dataset.title));
  });
  initShotModal();

  window.initScrollReveal && window.initScrollReveal();
}

// ---------------- TENDINA per vedere uno scatto a grandezza originale ----------------
function openShotModal(url, title) {
  const modal = document.getElementById('shotModal');
  if (!modal) return;
  document.getElementById('shotModalImg').src = url;
  const captionEl = document.getElementById('shotModalCaption');
  if (captionEl) {
    captionEl.textContent = title || '';
    captionEl.hidden = !title;
  }
  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
}

function closeShotModal() {
  const modal = document.getElementById('shotModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.getElementById('shotModalImg').src = '';
  document.body.classList.remove('modal-open');
}

function initShotModal() {
  const modal = document.getElementById('shotModal');
  if (!modal || modal.dataset.wired) return;
  modal.dataset.wired = 'true';

  modal.querySelectorAll('[data-shot-modal-close]').forEach((el) => el.addEventListener('click', closeShotModal));
  document.getElementById('shotModalClose').addEventListener('click', closeShotModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeShotModal();
  });
}
