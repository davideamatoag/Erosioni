# Erosioni

> ⚠️ **IMPORTANTE — leggi prima di caricare qualunque aggiornamento**
> La cartella `content/` (`articoli.json`, `portfolio.json`, `impostazioni.json`)
> contiene le TUE scelte reali fatte dal pannello — foto, testi, ordine degli
> articoli. Ogni zip che ricevi da Claude include una versione di partenza di
> questi file: **se carichi l'intera cartella sovrascrivendo anche `content/`,
> perdi le modifiche fatte dal pannello**. Da ora in poi, quando aggiorni il
> sito con un nuovo zip: **escludi la cartella `content/` dal caricamento**,
> a meno che non ti venga detto esplicitamente il contrario per una modifica
> specifica.

Sito statico (HTML/CSS/JS) per il blog "Erosioni" — fotografia, filosofia e politica.
Ricalca fedelmente il layout del mockup PDF: header, hero, ultimi articoli, scatti recenti,
newsletter, dal portfolio, viaggi, contatti.

## Struttura del progetto

```
erosioni/
├── index.html          ← homepage
├── articoli.html        ← in evidenza + successivi + archivio filtrabile
├── articolo.html         ← modello unico per ogni articolo (?slug=...)
├── portfolio.html       ← portfolio a mosaico (eventi / lavori / viaggi)
├── bio.html             ← bio personale + curriculum
├── contatti.html         ← email e social
├── content/
│   ├── articoli.json    ← DATI degli articoli — editabile a mano o dal pannello admin
│   └── portfolio.json   ← DATI del portfolio — editabile a mano o dal pannello admin
├── admin/               ← pannello di amministrazione (Decap CMS)
│   ├── index.html
│   └── config.yml
├── cms-oauth-worker/
│   └── worker.js        ← proxy di login per il pannello (vedi sezione dedicata)
├── css/
│   └── style.css
├── js/
│   ├── content.js       ← legge i file in content/ e genera le pagine
│   └── script.js
├── images/              ← foto segnaposto, DA SOSTITUIRE con le tue
│   └── uploads/         ← qui finiscono le foto/video caricati dal pannello
└── README.md
```

Articoli e portfolio non sono più scritti a mano nell'HTML: `articoli.html`,
`articolo.html`, `portfolio.html` e il carosello della homepage leggono tutti
da `content/articoli.json` e `content/portfolio.json`. Per aggiungere un
nuovo articolo o una voce di portfolio puoi modificare direttamente questi
due file JSON (rispettando la struttura esistente), oppure — più comodo —
usare il pannello di amministrazione descritto più sotto.

## Pagine da completare a mano

- **content/articoli.json**: i 6 articoli d'esempio hanno testo segnaposto tra `[parentesi quadre]` — riscrivili con i tuoi contenuti (dal pannello admin o modificando il file).
- **content/portfolio.json**: 9 voci segnaposto (eventi, lavori, viaggi — sia foto che video). Sostituisci titoli e immagini con i tuoi progetti reali.
- **bio.html**: i paragrafi tra parentesi quadre `[...]` e le voci del curriculum sono segnaposto da riscrivere con i tuoi contenuti veri.
- **contatti.html**: i link social puntano a `#` — sostituiscili con gli URL reali dei tuoi profili (Instagram, YouTube, LinkedIn, ecc.).
- Il form commenti (in `articolo.html`) non è ancora collegato a un vero servizio: vedi nota nel file `js/script.js`.


## 1. Sostituisci le immagini

Nella cartella `images/` trovi delle immagini segnaposto generate automaticamente
(blocchi di colore con etichetta) al posto delle tue foto vere. Sostituiscile
mantenendo **lo stesso nome file** così non devi toccare l'HTML:

| File | Dove viene usata |
|---|---|
| `hero.jpg` | Foto di sfondo dell'header/hero "Erosioni" |
| `article-viaggio.jpg` | Copertina articolo "Una splendida giornata in montagna" |
| `article-recensione.jpg` | Copertina articolo su Lukács |
| `article-film.jpg` | Copertina recensione film |
| `article-politica.jpg` | Copertina articolo sulla crisi climatica |
| `article-ritratti.jpg` | Copertina articolo "Ritratti dal mare" |
| `article-recensione2.jpg` | Copertina sesto articolo (recensione) |
| `scatto-01.jpg` … `scatto-08.jpg` | Griglia "Scatti recenti" |
| `newsletter-bg.jpg` | Sfondo sezione newsletter |
| `portfolio-pandarei.jpg` | Sezione "Dal portfolio" — Pandarei |
| `portfolio-tennis.jpg` | Sezione "Dal portfolio" — Circolo Tennis |
| `viaggio-ragusa.jpg` | Sezione "Viaggi" — Ragusa Ibla |
| `viaggio-madonie.jpg` | Sezione "Viaggi" — Madonie |
| `footer-bg.jpg` | Sfondo del footer |

Consiglio: esporta le foto già ottimizzate per il web (JPG, lato lungo max ~1800px,
qualità 80%) così il sito resta veloce.

## 2. Pubblica su GitHub Pages

1. Crea un nuovo repository su GitHub (es. `erosioni`), pubblico.
2. Carica tutto il contenuto di questa cartella nella root del repository:
   ```bash
   cd erosioni
   git init
   git add .
   git commit -m "Primo commit sito Erosioni"
   git branch -M main
   git remote add origin https://github.com/TUO-USERNAME/erosioni.git
   git push -u origin main
   ```
   (In alternativa puoi trascinare i file direttamente su github.com tramite
   "Add file → Upload files", senza usare il terminale.)
3. Su GitHub vai su **Settings → Pages**.
4. In "Build and deployment" scegli **Source: Deploy from a branch**, poi
   **Branch: main**, cartella **/ (root)** → **Save**.
5. Dopo 1-2 minuti il sito sarà online su:
   `https://TUO-USERNAME.github.io/erosioni/`

## 3. Modificare i testi

Tutti i testi (titoli articoli, date, descrizioni portfolio e viaggi, email di
contatto) sono direttamente nell'`index.html`, cercabili per sezione:
`<!-- ULTIMI ARTICOLI -->`, `<!-- SCATTI RECENTI -->`, `<!-- DAL PORTFOLIO -->`, ecc.

## 4. Form newsletter

Il form nella sezione newsletter è collegato a un semplice handler JS
(`js/script.js`) che al momento mostra solo un messaggio di conferma, senza
inviare davvero i dati da nessuna parte. Per farlo funzionare collegalo a un
servizio come Mailchimp, Buttondown o ConvertKit (basta sostituire l'azione
del form con l'endpoint del servizio scelto, oppure integrare la loro API
nel punto segnato `TODO` nel file `js/script.js`).

## Palette e tipografia

- Floral White `#fff8f0` — sfondo principale
- Warm Peach `#ffcf99` — accenti
- Deep Slate `#2c3e50` — testo, sezioni scure
- Deep Red `#cc2936` — accenti, call to action
- Titoli: **Bebas Neue** — corpo testo: **Roboto Condensed**

## Pubblicare articoli e caricare foto/video senza scrivere codice

Il sito ora legge articoli e portfolio da due file di dati (`content/articoli.json`
e `content/portfolio.json`) invece di averli scritti a mano nell'HTML. Questo
permette di usare **Decap CMS**, un pannello di amministrazione gratuito che
gira nel browser: da lì puoi scrivere nuovi articoli, modificarli, caricare
foto e video, e tutto si pubblica automaticamente sul sito con un commit su
GitHub — senza toccare codice.

Il pannello è già pronto nel sito, alla pagina `/admin/`. Per attivarlo
mancano due cose una tantum:

### 1. Crea una GitHub OAuth App

Serve per permettere al pannello di accedere al tuo repository.

1. Vai su [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**.
2. Compila così:
   - **Application name**: Erosioni CMS
   - **Homepage URL**: `https://davideamatoag.github.io/Erosioni/`
   - **Authorization callback URL**: `https://IL-TUO-WORKER.workers.dev/callback` (lo saprai al passo 2 — puoi tornare a modificarlo dopo)
3. Clicca **Register application**.
4. Copia il **Client ID** e genera un **Client Secret** (tienili da parte, servono al passo 2).

### 2. Attiva il proxy di login (Cloudflare Worker, gratuito)

GitHub Pages non può gestire da solo il login: serve un piccolo intermediario.
Nella cartella `cms-oauth-worker/` trovi già il codice pronto (`worker.js`).

1. Vai su [dash.cloudflare.com](https://dash.cloudflare.com) e crea un account gratuito, se non ne hai già uno.
2. Nel menu **Workers & Pages** → **Create** → **Create Worker**.
3. Dai un nome al worker (es. `erosioni-cms-auth`) e clicca **Deploy**.
4. Clicca **Edit code**, cancella il contenuto di default e incolla tutto il contenuto del file `cms-oauth-worker/worker.js`, poi **Deploy**.
5. Vai su **Settings → Variables and Secrets** del worker, e aggiungi due secret:
   - `GITHUB_CLIENT_ID` → il Client ID del passo 1
   - `GITHUB_CLIENT_SECRET` → il Client Secret del passo 1
6. Copia l'URL del worker (tipo `https://erosioni-cms-auth.tuonome.workers.dev`).
7. Torna sulla GitHub OAuth App creata al passo 1 e aggiorna la **Authorization callback URL** con `https://erosioni-cms-auth.tuonome.workers.dev/callback` (con l'URL vero del tuo worker).
8. Apri `admin/config.yml` nel repository e sostituisci `base_url: https://IL-TUO-OAUTH-WORKER.workers.dev` con l'URL vero del tuo worker (senza `/callback` finale).

### 3. Usa il pannello

Vai su `https://davideamatoag.github.io/Erosioni/admin/`, clicca "Login with GitHub",
autorizza l'app. Da lì potrai:

- **Impostazioni sito**: la foto principale (hero) della homepage — cambiala dal pannello, senza toccare GitHub.
- **I miei scatti**: carica quante foto vuoi (nessun limite nel pannello). Il sito le organizza da solo in un mosaico "bento" nella homepage, riconoscendo automaticamente se ogni foto è verticale o orizzontale e mettendola nel riquadro giusto. Una volta al giorno la combinazione cambia da sola, scegliendo a caso tra tutte quelle caricate — cambia in automatico, non serve fare nulla.
- **Articoli**: aggiungere/modificare voci nell'elenco — titolo, categoria, data,
  immagine di copertina, testo (con un editor che supporta **grassetto**,
  *corsivo*, link, sottotitoli e citazioni).
- **Portfolio**: aggiungere/modificare voci — titolo, categoria (eventi/lavori/viaggi),
  tipo (foto/video), immagine, link facoltativo.
- **Caricare foto e video**: qualunque campo "immagine" nel pannello apre una libreria
  media dove puoi trascinare i file direttamente dal computer — vengono salvati in
  `images/uploads/` e collegati automaticamente, senza rinominare nulla a mano.

Ogni salvataggio nel pannello crea un commit sul repository: il sito si
aggiorna da solo in 1-2 minuti, esattamente come quando pubblichi tu da
GitHub.

## Caricare centinaia di foto e decine di video senza appesantire il sito

Il repository GitHub non è pensato per ospitare grandi quantità di media
(consigliato restare sotto 1 GB totale, e ogni singolo file caricato dal
pannello non può superare 25 MB). Per questo, foto e video vanno gestiti
diversamente dal resto del sito:

### Foto → Cloudinary (gratuito, con ottimizzazione automatica)

1. Crea un account gratuito su [cloudinary.com](https://cloudinary.com) (piano free: 25 GB/mese, ampiamente sufficiente per centinaia di foto).
2. Nella dashboard di Cloudinary, subito visibili, trovi **Cloud name** e **API Key** (non l'API Secret, quello non serve e va tenuto privato).
3. Apri `admin/config.yml` nel repository e sostituisci `IL-TUO-CLOUD-NAME` e `LA-TUA-API-KEY` nella sezione `media_library` con i tuoi valori veri.
4. Da quel momento, ogni volta che clicchi su un campo immagine nel pannello, si aprirà la libreria di Cloudinary invece che quella del repository: puoi caricare (o trascinare) le foto lì, quante ne vuoi.
5. Il sito ottimizza automaticamente ogni immagine che arriva da Cloudinary (formato e qualità adattati al browser di chi visita il sito, dimensione limitata) — non serve comprimere nulla a mano prima di caricare.

### Video → YouTube (gratuito, illimitato per uso pratico)

Per i video niente caricamento diretto: nel pannello, alla voce "Link" di
ogni elemento del portfolio, incolla il link del video caricato su YouTube
(puoi impostarlo come "Non in elenco/Unlisted" se non vuoi che compaia
nella ricerca pubblica di YouTube — resterà comunque raggiungibile da chi
clicca sul tuo sito). Il sito aprirà quel link in una nuova scheda quando
qualcuno clicca sulla voce.

