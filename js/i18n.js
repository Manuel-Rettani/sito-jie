/* =====================================================================
   i18n.js — Motore di traduzione per sito statico (no framework)
   ---------------------------------------------------------------------
   Come funziona:
   - I testi vivono in /data/it.json e /data/zh.json.
   - Ogni elemento HTML traducibile ha l'attributo data-i18n="chiave.nidificata".
   - setLanguage(lang) carica il JSON, applica i testi al DOM e salva la
     scelta in localStorage (chiave "ygf_lang").
   - Per aggiungere/modificare un testo: basta editare i file JSON.
   - Per rendere traducibile un nuovo elemento: aggiungi data-i18n="..."
     nell'HTML e la relativa chiave nei due JSON.

   Espone l'oggetto globale window.I18N.
   ===================================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "ygf_lang";
  var DEFAULT_LANG = "it";
  var SUPPORTED = ["it", "zh"];
  var cache = {};          // { it: {...}, zh: {...} }
  var currentLang = DEFAULT_LANG;

  /* Risolve una chiave "a.b.c" dentro l'oggetto traduzioni */
  function resolve(dict, key) {
    return key.split(".").reduce(function (obj, part) {
      return obj && obj[part] != null ? obj[part] : null;
    }, dict);
  }

  /* Carica un file di lingua (con cache) */
  function load(lang) {
    if (cache[lang]) return Promise.resolve(cache[lang]);
    return fetch("data/" + lang + ".json")
      .then(function (res) {
        if (!res.ok) throw new Error("Impossibile caricare " + lang + ".json");
        return res.json();
      })
      .then(function (dict) {
        cache[lang] = dict;
        return dict;
      });
  }

  /* Applica le traduzioni a tutti gli elementi [data-i18n] */
  function apply(dict) {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var val = resolve(dict, key);
      if (val == null) return; // chiave mancante: lascia il testo esistente
      el.textContent = val;
    });

    // Attributi traducibili: data-i18n-attr="placeholder:chiave;title:chiave"
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var parts = pair.split(":");
        if (parts.length !== 2) return;
        var val = resolve(dict, parts[1].trim());
        if (val != null) el.setAttribute(parts[0].trim(), val);
      });
    });

    // Aggiorna l'attributo lang del documento
    document.documentElement.setAttribute(
      "lang",
      (dict.meta && dict.meta.htmlLang) || currentLang
    );
  }

  /* Aggiorna lo stato visivo dei pulsanti lingua */
  function updateButtons() {
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-lang") === currentLang);
    });
  }

  /* API pubblica: cambia lingua */
  function setLanguage(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    currentLang = lang;
    return load(lang).then(function (dict) {
      apply(dict);
      updateButtons();
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
      // Evento per consentire ad altri moduli di reagire (es. mappa)
      document.dispatchEvent(new CustomEvent("languagechange", {
        detail: { lang: lang, dict: dict }
      }));
      return dict;
    });
  }

  /* Restituisce un testo tradotto al volo (per contenuti generati via JS) */
  function t(key) {
    var dict = cache[currentLang];
    var val = dict ? resolve(dict, key) : null;
    return val != null ? val : key;
  }

  /* Lingua iniziale: localStorage -> lingua browser -> default */
  function initialLang() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    var nav = (navigator.language || "").toLowerCase();
    if (nav.indexOf("zh") === 0) return "zh";
    return DEFAULT_LANG;
  }

  window.I18N = {
    setLanguage: setLanguage,
    t: t,
    getLang: function () { return currentLang; },
    init: function () { return setLanguage(initialLang()); }
  };
})();
