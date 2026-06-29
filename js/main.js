/* =====================================================================
   main.js — Logica del sito Yi Gao Fei
   - Inizializzazione lingua
   - Selettore lingua, menu mobile, header allo scroll
   - Mappa interattiva delle 20 regioni (render da data/italy-map.json)
     · hover: evidenzia la regione e mostra il nome nel pannello
     · SOLO la Toscana e' cliccabile -> onRegionClick('toscana')
     · selezione con possibilita' di deselezionare ("Indietro")
   ===================================================================== */
(function () {
  "use strict";

  // Regioni attualmente attive (cliccabili). Aggiungere qui in futuro.
  var ACTIVE_REGIONS = ["toscana"];

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
      mainNav.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          mainNav.classList.remove("is-open");
          navToggle.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
          document.body.classList.remove("nav-open");
        });
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

        // 3) Pin animato sulla Toscana
        var tos = data.regions["toscana"];
        if (tos && tos.c) {
          var g = document.createElementNS(SVGNS, "g");
          g.setAttribute("class", "region-pin");
          g.setAttribute("pointer-events", "none");
          g.innerHTML =
            '<circle cx="' + tos.c[0] + '" cy="' + (tos.c[1] + 12) + '" r="5"></circle>' +
            '<circle cx="' + tos.c[0] + '" cy="' + (tos.c[1] + 12) + '" r="11" class="region-pin-ring"></circle>';
          svg.appendChild(g);
        }
      })
      .catch(function (e) { console.error("[map] caricamento fallito:", e); });

    // Aggiorna il pannello quando cambia lingua (se una regione e' selezionata)
    document.addEventListener("languagechange", function () {
      if (selectedRegion) renderRegionPanel(selectedRegion);
      else resetPanel();
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
    switch (region) {
      case "toscana":
        // >>> AZIONE TOSCANA — da implementare <<<
        // Esempio futuro: window.location.href = "toscana.html";
        selectRegion("toscana");
        renderRegionPanel("toscana");
        console.log("[onRegionClick] Toscana selezionata — placeholder attivo.");
        break;
      default:
        console.log("[onRegionClick] Regione non attiva:", region);
    }
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

  /* Pannello: dettagli regione selezionata (Toscana) + pulsante Indietro */
  function renderRegionPanel(region) {
    var panel = document.getElementById("mapPanel");
    if (!panel || !window.I18N) return;
    var t = window.I18N.t;
    if (region === "toscana") {
      panel.setAttribute("data-region", "toscana");
      panel.innerHTML =
        '<button type="button" class="map-panel-back" id="mapBack">&larr; ' + escapeHtml(t("map.panel.back")) + '</button>' +
        '<span class="map-panel-tag">' + escapeHtml(t("map.regions.toscana")) + '</span>' +
        '<h3 class="map-panel-title">' + escapeHtml(t("map.panel.toscanaTitle")) + '</h3>' +
        '<p class="map-panel-text">' + escapeHtml(t("map.panel.toscanaText")) + '</p>' +
        '<a href="#packages" class="btn btn-outline map-panel-cta">' + escapeHtml(t("map.panel.toscanaCta")) + '</a>';
      var back = document.getElementById("mapBack");
      if (back) back.addEventListener("click", deselectRegion);
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
})();
