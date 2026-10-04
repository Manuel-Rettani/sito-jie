/* =====================================================================
   main.js — Logica del sito Yi Gao Fei
   - Inizializzazione lingua
   - Selettore lingua, menu mobile, header allo scroll
   - Mappa interattiva delle 20 regioni (render da data/italy-map.json)
     · hover: evidenzia la regione e mostra il nome nel pannello
     · solo le regioni in ACTIVE_REGIONS sono cliccabili -> onRegionClick(regione)
     · selezione con possibilita' di deselezionare ("Indietro")
   ===================================================================== */
(function () {
  "use strict";

  // Regioni attualmente attive (cliccabili). Aggiungere qui in futuro.
  var ACTIVE_REGIONS = ["toscana", "trentino-altoadige"];

  // Colori pastello per regione (stile mappa di riferimento)
  var REGION_COLORS = {
    "valledaosta": "#e7c6e0", "piemonte": "#e9b7c4", "lombardia": "#cfe0cf",
    "trentino-altoadige": "#d9c9ec", "veneto": "#f3dca8", "friuli-venezia-giulia": "#f6e7b0",
    "liguria": "#cfe6df", "emilia-romagna": "#bfe0d2", "toscana": "#d8b27a",
    "umbria": "#bfe6c9", "marche": "#f2c0c8", "lazio": "#bfe3cf", "abruzzo": "#f5e3ad",
    "molise": "#c9d9f0", "campania": "#f4c9d8", "puglia": "#e9aeb8", "basilicata": "#d6ead0",
    "calabria": "#bcd3f0", "sardegna": "#f5e6b8", "sicilia": "#d8c7ed"
  };
  var SVGNS = "http://www.w3.org/2000/svg";
  var selectedRegion = null;

  // Stato vista campi da golf (mappa statica Toscana)
  var golfData = null, regionMaps = {}, golfActive = false, golfRegion = null;
  var currentCourse = null, galIdx = 0, currentModal = null, modalIdx = 0;

  document.addEventListener("DOMContentLoaded", function () {
    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Inizializza traduzioni, POI costruisci la mappa (servono i testi tradotti)
    if (window.I18N) {
      window.I18N.init().then(initMap);
    } else {
      initMap();
    }

    // ---- Selettore lingua ----
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (window.I18N) window.I18N.setLanguage(btn.getAttribute("data-lang"));
      });
    });

    // ---- Menu mobile ----
    var navToggle = document.getElementById("navToggle");
    var mainNav = document.getElementById("mainNav");
    if (navToggle && mainNav) {
      navToggle.addEventListener("click", function () {
        var open = mainNav.classList.toggle("is-open");
        navToggle.classList.toggle("is-open", open);
        navToggle.setAttribute("aria-expanded", String(open));
        document.body.classList.toggle("nav-open", open);
      });
      function closeNav() {
        mainNav.classList.remove("is-open");
        navToggle.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      }
      // Chiudi cliccando una voce
      mainNav.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", closeNav);
      });
      // Chiudi toccando fuori dal menu (area di pagina visibile a sinistra)
      document.addEventListener("click", function (e) {
        if (!mainNav.classList.contains("is-open")) return;
        if (mainNav.contains(e.target) || navToggle.contains(e.target)) return;
        closeNav();
      });
      // Chiudi con il tasto ESC
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeNav();
      });
    }

    // ---- Header allo scroll ----
    var header = document.getElementById("siteHeader");
    function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 40); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  });

  /* ===================================================================
     MAPPA — carica i confini reali e genera l'SVG dinamicamente
     =================================================================== */
  function initMap() {
    var svg = document.getElementById("italyMap");
    if (!svg) return;

    fetch("data/italy-map.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        svg.setAttribute("viewBox", data.viewBox);
        var t = window.I18N ? window.I18N.t : function (k) { return k; };
        var order = data.order || Object.keys(data.regions);

        // 1) Path delle regioni
        order.forEach(function (name) {
          var info = data.regions[name];
          if (!info) return;
          var active = ACTIVE_REGIONS.indexOf(name) !== -1;
          var path = document.createElementNS(SVGNS, "path");
          path.setAttribute("d", info.d);
          path.setAttribute("class", "region" + (active ? " region--active" : " region--inactive"));
          path.setAttribute("data-region", name);
          path.style.fill = REGION_COLORS[name] || "#d8e0d4";
          path.setAttribute("role", active ? "button" : "img");
          path.setAttribute("aria-label", t("map.regions." + name));
          if (active) path.setAttribute("tabindex", "0");
          bindRegion(path, name, active);
          svg.appendChild(path);
        });

        // 2) Etichette dei nomi (tradotte, aggiornate al cambio lingua)
        order.forEach(function (name) {
          var info = data.regions[name];
          if (!info || !info.c) return;
          var label = document.createElementNS(SVGNS, "text");
          label.setAttribute("x", info.c[0]);
          label.setAttribute("y", info.c[1]);
          label.setAttribute("text-anchor", "middle");
          label.setAttribute("class", "region-label" + (ACTIVE_REGIONS.indexOf(name) !== -1 ? " region-label--active" : ""));
          label.setAttribute("data-i18n", "map.regions." + name);
          label.textContent = t("map.regions." + name);
          label.style.pointerEvents = "none";
          svg.appendChild(label);
        });

        // 3) Pin animato su ogni regione attiva
        ACTIVE_REGIONS.forEach(function (name) {
          var reg = data.regions[name];
          if (!reg || !reg.c) return;
          var g = document.createElementNS(SVGNS, "g");
          g.setAttribute("class", "region-pin");
          g.setAttribute("pointer-events", "none");
          // reg.pin (opzionale) sposta il pin se il nome della regione e' lungo e lo coprirebbe
          var pin = reg.pin || [reg.c[0], reg.c[1] + 12];
          g.innerHTML =
            '<circle cx="' + pin[0] + '" cy="' + pin[1] + '" r="5"></circle>' +
            '<circle cx="' + pin[0] + '" cy="' + pin[1] + '" r="11" class="region-pin-ring"></circle>';
          svg.appendChild(g);
        });
      })
      .catch(function (e) { console.error("[map] caricamento fallito:", e); });

    // Pulsante "Torna all'Italia" della vista campi da golf
    var golfBack = document.getElementById("golfBack");
    if (golfBack) golfBack.addEventListener("click", backToItaly);

    // Modale programma pacchetto: chiusura con X, click sullo sfondo, ESC
    initLightbox();
    var modalClose = document.getElementById("pkgModalClose");
    if (modalClose) modalClose.addEventListener("click", closeModal);
    var pkgModal = document.getElementById("pkgModal");
    if (pkgModal) pkgModal.addEventListener("click", function (e) {
      if (e.target === pkgModal || e.target.hasAttribute("data-close")) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { if (!closeLightbox()) closeModal(); }
      else if (e.key === "ArrowLeft") stepModalImage(-1);
      else if (e.key === "ArrowRight") stepModalImage(1);
    });

    // Aggiorna i contenuti al cambio lingua
    document.addEventListener("languagechange", function () {
      if (golfActive) {
        if (regionMaps[golfRegion] && golfData) {
          setGolfTitle(golfRegion);
          renderGolfMap(golfRegion, regionMaps[golfRegion], golfData);
          if (currentCourse) {
            var activePin = document.querySelector('.golf-pin[data-id="' + currentCourse.id + '"]');
            if (activePin) activePin.classList.add("is-active");
          }
        }
        if (golfData) renderPackages(golfRegion, golfData);
        if (currentCourse) renderCourseDetails(currentCourse);
      } else if (selectedRegion) {
        renderRegionPanel(selectedRegion);
      } else {
        resetPanel();
      }
      if (currentModal) renderModalContent();
    });
  }

  /* Collega gli eventi a una regione */
  function bindRegion(el, name, active) {
    // Hover: evidenzia e mostra il nome nel pannello (se nessuna selezione attiva)
    el.addEventListener("mouseenter", function () {
      el.classList.add("is-hover");
      if (!selectedRegion) showRegionName(name, active);
    });
    el.addEventListener("mouseleave", function () {
      el.classList.remove("is-hover");
      if (!selectedRegion) resetPanel();
    });
    if (active) {
      el.addEventListener("click", function () { onRegionClick(name); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRegionClick(name); }
      });
    }
  }

  /* ===================================================================
     onRegionClick(region) — HOOK PRINCIPALE
     PLACEHOLDER ISOLATO: qui implementeremo l'azione vera per la Toscana
     (es. apertura pagina dedicata). Per ora seleziona e mostra il pannello.
     =================================================================== */
  function onRegionClick(region) {
    if (ACTIVE_REGIONS.indexOf(region) === -1) {
      console.log("[onRegionClick] Regione non attiva:", region);
      return;
    }
    // La mappa passa alla vista regionale con i campi da golf.
    selectRegion(region);
    showGolfView(region);
  }

  /* Seleziona/evidenzia una regione sulla mappa */
  function selectRegion(region) {
    selectedRegion = region;
    document.querySelectorAll(".region").forEach(function (r) {
      r.classList.toggle("is-selected", r.getAttribute("data-region") === region);
    });
  }

  /* Deseleziona e torna allo stato iniziale */
  function deselectRegion() {
    selectedRegion = null;
    document.querySelectorAll(".region.is-selected").forEach(function (r) {
      r.classList.remove("is-selected");
    });
    resetPanel();
  }

  /* Pannello: hint iniziale */
  function resetPanel() {
    var panel = document.getElementById("mapPanel");
    if (!panel || !window.I18N) return;
    panel.removeAttribute("data-region");
    panel.innerHTML = '<p class="map-panel-hint" data-i18n="map.panel.hint">' +
      escapeHtml(window.I18N.t("map.panel.hint")) + '</p>';
  }

  /* Pannello: nome regione su hover */
  function showRegionName(region, active) {
    var panel = document.getElementById("mapPanel");
    if (!panel || !window.I18N) return;
    var t = window.I18N.t;
    panel.removeAttribute("data-region");
    panel.innerHTML =
      '<span class="map-panel-tag">' + (active ? escapeHtml(t("hero.eyebrow")) : escapeHtml(t("map.panel.comingSoon"))) + '</span>' +
      '<h3 class="map-panel-title">' + escapeHtml(t("map.regions." + region)) + '</h3>';
  }

  /* Pannello: dettagli regione selezionata + pulsante Indietro */
  function renderRegionPanel(region) {
    var panel = document.getElementById("mapPanel");
    if (!panel || !window.I18N) return;
    var t = window.I18N.t;
    if (ACTIVE_REGIONS.indexOf(region) !== -1) {
      var key = "map.panel.regions." + region;
      panel.setAttribute("data-region", region);
      panel.innerHTML =
        '<button type="button" class="map-panel-back" id="mapBack">&larr; ' + escapeHtml(t("map.panel.back")) + '</button>' +
        '<span class="map-panel-tag">' + escapeHtml(t("map.regions." + region)) + '</span>' +
        '<h3 class="map-panel-title">' + escapeHtml(t(key + ".title")) + '</h3>' +
        '<p class="map-panel-text">' + escapeHtml(t(key + ".text")) + '</p>' +
        '<a href="#contact" class="btn btn-outline map-panel-cta">' + escapeHtml(t(key + ".cta")) + '</a>';
      var back = document.getElementById("mapBack");
      if (back) back.addEventListener("click", deselectRegion);
    }
  }

  /* ===================================================================
     VISTA CAMPI DA GOLF — immagine statica della regione con i pin.
     Dati: data/golf-courses.json (campi, per regione) + data/<regione>-map.json (geometria).
     =================================================================== */
  function loadGolfData() {
    if (golfData) return Promise.resolve(golfData);
    return fetch("data/golf-courses.json").then(function (r) { return r.json(); })
      .then(function (d) { golfData = d; return d; });
  }
  function loadRegionMap(region) {
    if (regionMaps[region]) return Promise.resolve(regionMaps[region]);
    return fetch("data/" + region + "-map.json").then(function (r) { return r.json(); })
      .then(function (d) { regionMaps[region] = d; return d; });
  }

  // Titolo della vista regionale (cambia per regione e lingua)
  function setGolfTitle(region) {
    var el = document.getElementById("golfTitle");
    if (!el) return;
    var key = "map.golf.titles." + region;
    el.setAttribute("data-i18n", key);
    if (window.I18N) el.textContent = window.I18N.t(key);
  }

  // Pallina da golf su tee rosso (ispirata all'icona fornita: pallina bianca
  // con fossette, contorni marcati, tee rosso). Il punto esatto (tip del tee)
  // è a (16,40) nel sistema locale del gruppo.
  var INK = "#14352a"; // contorno scuro (quasi nero, on-brand)
  function golfPinSVG() {
    var dimples = [[16, 8], [12, 10], [20, 10], [9.5, 13.5], [14, 13], [18, 13], [22.5, 13.5], [12, 17], [16, 18], [20, 17]]
      .map(function (d) { return '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="1.3" fill="' + INK + '"/>'; }).join("");
    return '<ellipse cx="16" cy="40" rx="5.5" ry="1.6" fill="#000000" opacity="0.15"/>' +
      // tee rosso: coppa + stelo che termina a punta in basso
      '<path d="M9.5 22.5 H22.5 L20 27 H12 Z" fill="#d33b2c" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M13 27 H19 L16.6 39.5 H15.4 Z" fill="#d33b2c" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
      // pallina bianca con contorno marcato
      '<circle cx="16" cy="13" r="11.5" fill="#ffffff" stroke="' + INK + '" stroke-width="1.6"/>' +
      dimples;
  }

  // Pannello campo: torna al messaggio iniziale (nessun campo selezionato)
  function resetGolfPanel() {
    var panel = document.getElementById("golfPanel");
    if (!panel) return;
    var t = window.I18N ? window.I18N.t : function (k) { return k; };
    panel.innerHTML = '<p class="golf-panel-hint" data-i18n="map.golf.pick">' + escapeHtml(t("map.golf.pick")) + '</p>';
  }

  function showGolfView(region) {
    var wrapper = document.getElementById("mapWrapper");
    var view = document.getElementById("golfView");
    if (!wrapper || !view) return;
    golfActive = true; golfRegion = region; currentCourse = null; galIdx = 0;
    resetGolfPanel();
    wrapper.classList.add("golf-active");
    view.hidden = false;
    setGolfTitle(region);
    Promise.all([loadRegionMap(region), loadGolfData()])
      .then(function (res) { renderGolfMap(region, res[0], res[1]); renderPackages(region, res[1]); })
      .catch(function (e) { console.error("[golf] caricamento fallito:", e); backToItaly(); renderRegionPanel(region); });
  }

  // Disegna l'immagine statica della regione + i pin dei campi
  function renderGolfMap(region, map, data) {
    var host = document.getElementById("golfMap");
    var courses = (data && data[region] && data[region].courses) || [];
    var p = map.proj;
    function project(coords) { // coords = [lat, lon]
      return [ p.offx + (coords[1] - p.lon0) * p.sx, p.offy + (p.lat1 - coords[0]) * p.sy ];
    }
    var color = REGION_COLORS[region] || "#d8b27a";
    var lang = window.I18N ? window.I18N.getLang() : "it";
    var svg = '<svg class="golf-svg" viewBox="' + map.viewBox + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + escapeHtml(window.I18N ? window.I18N.t("map.regions." + region) : region) + '">';
    svg += '<path class="golf-region" d="' + map.path + '" fill="' + color + '"/>';
    (map.cities || []).forEach(function (city) {
      if (!city.coords) return;
      var xy = project(city.coords);
      // labelOffset: scostamento puramente grafico (px) SOLO per l'etichetta,
      // per evitare sovrapposizioni con altri elementi della mappa (es. pin
      // vicini). Il pallino resta sempre sulla posizione geografica vera.
      var lxy = city.labelOffset ? [xy[0] + city.labelOffset[0], xy[1] + city.labelOffset[1]] : xy;
      var name = lget(city.name, lang);
      svg += '<g class="city-marker" pointer-events="none">' +
             '<text x="' + lxy[0] + '" y="' + (lxy[1] - 10) + '" text-anchor="middle" class="city-label">' + escapeHtml(name) + '</text>' +
             '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="6"></circle>' +
             '</g>';
    });
    courses.forEach(function (c) {
      if (!c.coords) return;
      var xy = project(c.coords);
      // mapOffset: scostamento puramente grafico (px) per evitare che il pin si
      // sovrapponga ad altri elementi della mappa. Le coordinate reali del campo
      // restano invariate.
      if (c.mapOffset) { xy[0] += c.mapOffset[0]; xy[1] += c.mapOffset[1]; }
      svg += '<g class="golf-pin" data-id="' + escapeHtml(c.id) + '" tabindex="0" role="button" ' +
             'aria-label="' + escapeHtml(c.name) + '" ' +
             'transform="translate(' + (xy[0] - 16) + ',' + (xy[1] - 40) + ')">' +
             '<title>' + escapeHtml(c.name) + '</title>' + golfPinSVG() + '</g>';
    });
    svg += '</svg>';
    host.innerHTML = svg;

    // eventi sui pin
    host.querySelectorAll(".golf-pin").forEach(function (pin) {
      var id = pin.getAttribute("data-id");
      var course = courses.filter(function (c) { return c.id === id; })[0];
      function open() { selectCourse(course, pin); }
      pin.addEventListener("click", open);
      pin.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
    });
  }

  function selectCourse(course, pin) {
    currentCourse = course; galIdx = 0;
    document.querySelectorAll(".golf-pin").forEach(function (p) { p.classList.remove("is-active"); });
    if (pin) pin.classList.add("is-active");
    renderCourseDetails(course);
    scrollPanelIntoViewIfNeeded();
  }

  /* Su mobile mappa e pannello sono impilati: dopo la selezione di un campo,
     se il pannello non e' comodamente visibile lo si porta in vista.
     Su desktop (mappa e pannello affiancati) la condizione non scatta quasi mai. */
  function scrollPanelIntoViewIfNeeded() {
    var panel = document.getElementById("golfPanel");
    if (!panel) return;
    var rect = panel.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.4) return;
    var header = document.getElementById("siteHeader");
    var headerH = header ? header.offsetHeight : 0;
    window.scrollTo({ top: window.scrollY + rect.top - headerH - 16, behavior: "smooth" });
  }

  // Pannello dettagli campo + galleria foto scorrevole
  function renderCourseDetails(course) {
    var panel = document.getElementById("golfPanel");
    if (!panel) return;
    var lang = window.I18N ? window.I18N.getLang() : "it";
    var t = window.I18N ? window.I18N.t : function (k) { return k; };
    var desc = (course.desc && (course.desc[lang] || course.desc.it)) || "";
    var photos = course.photos || [];
    if (galIdx >= photos.length) galIdx = 0;
    var meta = escapeHtml(course.location || "") +
      (course.holes ? " · " + course.holes + " " + escapeHtml(t("map.golf.holes")) : "");

    var gallery = "";
    if (photos.length) {
      // photoFit (opzionale, per campo): "contain" = foto mai ritagliate, con sfondo sfocato
      var contain = course.photoFit === "contain";
      gallery = '<div class="golf-gallery' + (contain ? ' golf-gallery--contain' : '') + '">' +
        (contain ? '<img class="golf-gallery-bg" id="golfBg" src="' + escapeHtml(photos[galIdx]) + '" alt="" aria-hidden="true">' : '') +
        '<img class="golf-gallery-img" id="golfImg" src="' + escapeHtml(photos[galIdx]) + '" alt="' + escapeHtml(course.name) + '" onerror="this.classList.add(\'is-broken\')">';
      if (photos.length > 1) {
        gallery +=
          '<button type="button" class="golf-gal-nav golf-gal-prev" id="golfPrev" aria-label="Foto precedente">&lsaquo;</button>' +
          '<button type="button" class="golf-gal-nav golf-gal-next" id="golfNext" aria-label="Foto successiva">&rsaquo;</button>' +
          '<span class="golf-gal-count" id="golfCount">' + (galIdx + 1) + ' / ' + photos.length + '</span>';
      }
      gallery += '</div>';
    }

    var moreBtn = (course.details) ?
      '<button type="button" class="golf-more" id="golfMore">' + escapeHtml(t("map.golf.more")) + ' &rarr;</button>' : "";

    panel.innerHTML = gallery +
      '<div class="golf-info">' +
        '<h4 class="golf-info-name">' + escapeHtml(course.name) + '</h4>' +
        '<p class="golf-info-meta">' + meta + '</p>' +
        '<p class="golf-info-desc">' + escapeHtml(desc) + '</p>' +
        moreBtn +
      '</div>';

    var more = document.getElementById("golfMore");
    if (more) more.addEventListener("click", function () { openCourseModal(course); });

    if (photos.length > 1) {
      var img = document.getElementById("golfImg");
      var count = document.getElementById("golfCount");
      function show(i) {
        galIdx = (i + photos.length) % photos.length;
        img.classList.remove("is-broken");
        img.src = photos[galIdx];
        var bg = document.getElementById("golfBg");
        if (bg) bg.src = photos[galIdx];
        count.textContent = (galIdx + 1) + " / " + photos.length;
      }
      document.getElementById("golfPrev").addEventListener("click", function () { show(galIdx - 1); });
      document.getElementById("golfNext").addEventListener("click", function () { show(galIdx + 1); });
      // swipe orizzontale su touch (sui telefoni le frecce sono nascoste)
      var gal = img.parentNode, x0 = null;
      gal.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      gal.addEventListener("touchend", function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        x0 = null;
        if (Math.abs(dx) > 40) show(galIdx + (dx < 0 ? 1 : -1));
      });
    }
  }

  function backToItaly() {
    var wrapper = document.getElementById("mapWrapper");
    var view = document.getElementById("golfView");
    golfActive = false; currentCourse = null;
    closeModal();
    if (view) view.hidden = true;
    if (wrapper) wrapper.classList.remove("golf-active");
    deselectRegion();
  }

  /* ===================================================================
     PACCHETTI — elenco sotto la mappa + modale con programma (markdown)
     =================================================================== */
  function lget(obj, lang) { return obj ? (obj[lang] || obj.it || "") : ""; }

  function renderPackages(region, data) {
    var host = document.getElementById("golfPackages");
    if (!host) return;
    var t = window.I18N ? window.I18N.t : function (k) { return k; };
    var lang = window.I18N ? window.I18N.getLang() : "it";
    var pkgs = (data && data[region] && data[region].packages) || [];
    if (!pkgs.length) { host.innerHTML = ""; return; }

    var html = '<h4 class="golf-packages-title" data-i18n="map.golf.packages">' +
      escapeHtml(t("map.golf.packages")) + '</h4><div class="pkg2-grid">';
    pkgs.forEach(function (p) {
      var days = p.days ? '<span class="pkg2-days">' + p.days + ' ' + escapeHtml(t("map.golf.days")) + '</span>' : "";
      html += '<button type="button" class="pkg2-card" data-id="' + escapeHtml(p.id) + '">' +
        days +
        '<h5 class="pkg2-name">' + escapeHtml(lget(p.name, lang)) + '</h5>' +
        '<p class="pkg2-summary">' + escapeHtml(lget(p.summary, lang)) + '</p>' +
        '<span class="pkg2-cta">' + escapeHtml(t("map.golf.viewProgram")) + ' &rarr;</span>' +
        '</button>';
    });
    html += '</div>';
    host.innerHTML = html;
    host.querySelectorAll(".pkg2-card").forEach(function (card) {
      card.addEventListener("click", function () { openPackage(card.getAttribute("data-id")); });
    });
  }

  function openPackage(id) {
    var pkgs = (golfData && golfData[golfRegion] && golfData[golfRegion].packages) || [];
    var p = pkgs.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    openModal(p.name, p.program, p.images);
  }

  // Apre la modale con i dettagli di un campo (markdown)
  function openCourseModal(course) {
    if (!course || !course.details) return;
    openModal(course.name, course.details);
  }

  // Modale generica: name = stringa o {it,en,zh}; body = {it,en,zh} markdown;
  // images (opzionale) = elenco di immagini del programma, mostrate come galleria scorrevole
  function openModal(name, body, images) {
    currentModal = { name: name, body: body, images: images || [] };
    modalIdx = 0;
    renderModalContent();
    var modal = document.getElementById("pkgModal");
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    var closeBtn = document.getElementById("pkgModalClose");
    if (closeBtn) closeBtn.focus();
  }

  function renderModalContent() {
    var content = document.getElementById("pkgModalContent");
    if (!content || !currentModal) return;
    var lang = window.I18N ? window.I18N.getLang() : "it";
    var name = (typeof currentModal.name === "string") ? currentModal.name : lget(currentModal.name, lang);
    var dialog = content.parentNode;
    var images = currentModal.images;
    dialog.classList.toggle("modal-dialog--gallery", images.length > 0);
    var html = '<h3 class="modal-title">' + escapeHtml(name) + '</h3>';
    if (images.length) {
      html += '<div class="modal-gallery" id="modalGallery">' +
        '<img class="modal-gallery-img" id="modalImg" src="' + escapeHtml(images[modalIdx]) + '" alt="' +
          escapeHtml(name) + ' — ' + (modalIdx + 1) + '">' +
        '<button type="button" class="modal-gal-full" id="modalFull" aria-label="Fullscreen">' +
          '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>';
      if (images.length > 1) {
        html +=
          '<button type="button" class="golf-gal-nav golf-gal-prev" id="modalPrev" aria-label="Previous">&lsaquo;</button>' +
          '<button type="button" class="golf-gal-nav golf-gal-next" id="modalNext" aria-label="Next">&rsaquo;</button>' +
          '<span class="golf-gal-count" id="modalCount">' + (modalIdx + 1) + ' / ' + images.length + '</span>';
      }
      html += '</div>';
    }
    var md = lget(currentModal.body, lang);
    if (md) html += '<div class="modal-md">' + mdToHtml(md) + '</div>';
    content.innerHTML = html;

    if (images.length) {
      document.getElementById("modalFull").addEventListener("click", openLightbox);
      document.getElementById("modalImg").addEventListener("click", openLightbox);
    }
    if (images.length > 1) {
      document.getElementById("modalPrev").addEventListener("click", function () { stepModalImage(-1); });
      document.getElementById("modalNext").addEventListener("click", function () { stepModalImage(1); });
      // swipe orizzontale su touch
      var gal = document.getElementById("modalGallery"), x0 = null;
      gal.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      gal.addEventListener("touchend", function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        x0 = null;
        if (Math.abs(dx) > 40) stepModalImage(dx < 0 ? 1 : -1);
      });
    }
  }

  function stepModalImage(delta) {
    if (!currentModal || !currentModal.images || currentModal.images.length < 2) return;
    var images = currentModal.images;
    modalIdx = (modalIdx + delta + images.length) % images.length;
    var img = document.getElementById("modalImg");
    var count = document.getElementById("modalCount");
    if (!img) return;
    img.src = images[modalIdx];
    img.alt = img.alt.replace(/\d+$/, modalIdx + 1);
    if (count) count.textContent = (modalIdx + 1) + " / " + images.length;
    var box = document.getElementById("lightbox");
    if (box && !box.hidden) updateLightbox();
  }

  // Immagine a schermo intero (condivide l'indice modalIdx con la galleria della modale)
  function updateLightbox() {
    var images = currentModal.images, multi = images.length > 1;
    var img = document.getElementById("lightboxImg");
    img.src = images[modalIdx];
    img.alt = document.getElementById("modalImg").alt;
    document.getElementById("lightboxCount").textContent = multi ? (modalIdx + 1) + " / " + images.length : "";
    document.getElementById("lightboxPrev").hidden = !multi;
    document.getElementById("lightboxNext").hidden = !multi;
  }

  function openLightbox() {
    if (!currentModal || !currentModal.images.length) return;
    updateLightbox();
    document.getElementById("lightbox").hidden = false;
    document.getElementById("lightboxClose").focus();
  }

  // Ritorna true se era aperto (cosi' ESC chiude prima lui e poi la modale)
  function closeLightbox() {
    var box = document.getElementById("lightbox");
    if (!box || box.hidden) return false;
    box.hidden = true;
    return true;
  }

  function initLightbox() {
    var box = document.getElementById("lightbox");
    if (!box) return;
    document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
    document.getElementById("lightboxPrev").addEventListener("click", function () { stepModalImage(-1); });
    document.getElementById("lightboxNext").addEventListener("click", function () { stepModalImage(1); });
    box.addEventListener("click", function (e) { if (e.target === box) closeLightbox(); });
    var x0 = null;
    box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) stepModalImage(dx < 0 ? 1 : -1);
    });
  }

  function closeModal() {
    var modal = document.getElementById("pkgModal");
    if (!modal || modal.hidden) return;
    closeLightbox();
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    currentModal = null;
  }

  /* Mini-renderer Markdown (sottoinsieme sicuro: intestazioni, liste, grassetto).
     Il testo viene prima sanificato con escapeHtml, quindi non c'e' rischio XSS. */
  function mdToHtml(md) {
    var lines = escapeHtml(String(md || "")).split(/\r?\n/);
    var out = "", inList = false, para = [];
    function inline(s) {
      return s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
              .replace(/\*([^*]+)\*/g, "<em>$1</em>");
    }
    function flushPara() { if (para.length) { out += "<p>" + para.join("<br>") + "</p>"; para = []; } }
    function closeList() { if (inList) { out += "</ul>"; inList = false; } }
    lines.forEach(function (raw) {
      var line = raw.trim();
      if (line === "") { flushPara(); closeList(); return; }
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flushPara(); closeList(); var lvl = Math.min(h[1].length + 2, 6); out += "<h" + lvl + ' class="md-h">' + inline(h[2]) + "</h" + lvl + ">"; return; }
      var li = line.match(/^[-*]\s+(.*)$/);
      if (li) { flushPara(); if (!inList) { out += '<ul class="md-ul">'; inList = true; } out += "<li>" + inline(li[1]) + "</li>"; return; }
      para.push(inline(line));
    });
    flushPara(); closeList();
    return out;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
})();
