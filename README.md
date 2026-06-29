# Yi Gao Fei · Italy Golf Concierge

Sito vetrina statico (HTML + CSS + JavaScript vanilla, nessun framework) per
promuovere pacchetti golf di lusso in Italia, rivolto a turisti cinesi.
Bilingue Italiano / Cinese (中文).

## Struttura dei file

```
index.html          Pagina unica: hero, mappa Italia, esperienza, pacchetti, contatti
css/style.css       Stile (mobile-first, palette del brand: verde / oro / avorio)
js/i18n.js          Motore traduzioni (carica i JSON, applica al DOM, salva la lingua)
js/main.js          Logica: menu, scroll, mappa interattiva, hook onRegionClick()
data/it.json        Testi in italiano
data/zh.json        Testi in cinese
assets/logo.jpeg    Logo Yi Gao Fei
assets/qr_code.jpeg QR WeChat (sezione Contatti)
```

## Come avviare in locale

I testi vengono caricati via `fetch()` dai file JSON: aprendo `index.html`
con doppio click (`file://`) alcuni browser (Chrome) bloccano il caricamento.
Avvia quindi un piccolo server locale dalla cartella del sito:

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

In hosting reale (Netlify, Vercel, GitHub Pages, ecc.) funziona senza accorgimenti.

## Multilingua — come modificare/aggiungere testi

- Ogni elemento traducibile nell'HTML ha `data-i18n="chiave.nidificata"`.
- Per cambiare un testo: modifica il valore in **entrambi** i file
  `data/it.json` e `data/zh.json` (stessa chiave).
- Per rendere traducibile un nuovo elemento: aggiungi `data-i18n="nuova.chiave"`
  nell'HTML e la chiave corrispondente nei due JSON.
- La lingua scelta viene salvata nel browser (localStorage).

Per aggiungere una terza lingua basta creare `data/xx.json` con le stesse
chiavi e aggiungere `"xx"` all'elenco `SUPPORTED` in `js/i18n.js`.

## Mappa interattiva — 20 regioni + placeholder Toscana

La mappa mostra le **20 regioni italiane** con i confini reali (dati ISTAT
semplificati). I poligoni vengono generati dinamicamente da `js/main.js`
leggendo `data/italy-map.json` (campo `d` = path SVG, `c` = punto etichetta).

- **Hover** su una regione: evidenziazione + nome mostrato nel pannello.
- Solo la **Toscana** è cliccabile → `onRegionClick("toscana")`.
- Dopo la selezione si può **deselezionare** con il pulsante "Indietro".
- Per attivare altre regioni in futuro: aggiungile all'array `ACTIVE_REGIONS`
  in `js/main.js` (e gestiscile nello `switch` di `onRegionClick`).

➡️ L'azione definitiva della Toscana si implementa in **un solo punto**:
la funzione `onRegionClick()` in `js/main.js` (vedi il commento
`>>> AZIONE TOSCANA — da implementare <<<`). Es. reindirizzare a una pagina
dedicata: `window.location.href = "toscana.html";`

I colori pastello per regione sono in `REGION_COLORS` (in `js/main.js`).
La fonte dei confini: openpolis / mcortella (ISTAT, licenza CC-BY).

## Placeholder ancora da definire

- **Azione Toscana**: oggi apre un pannello informativo (segnaposto).
- **QR WeChat**: l'immagine `assets/qr_code.jpeg` è già caricata; sostituiscila
  con quella definitiva quando disponibile.
- **Email contatto**: in `index.html` è impostata `info@yigaofei.com` (da aggiornare).
